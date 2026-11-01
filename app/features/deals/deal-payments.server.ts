import { init } from "@paralleldrive/cuid2";
import type Stripe from "stripe";

import { deliverDealEffects } from "./deal-emails.server";
import { applyOnlinePaymentToDeal } from "./deal-engine.server";
import { notifyDealMembers } from "./deal-room.server";
import { createDealShareToken } from "./deal-share-link.server";
import { stripeAdmin } from "~/features/billing/stripe-admin.server";
import { initializePaystackTransaction } from "~/features/checkout/paystack.server";
import translation from "~/features/localization/locales/en/translation";
import { formatMoney } from "~/features/organizations/dashboard/dashboard-format";
import { prisma } from "~/utils/database.server";

const cuid = init({ length: 12 });

export const DEAL_PAYMENT_PROVIDERS = ["paystack", "stripe"] as const;
export type DealPaymentProvider = (typeof DEAL_PAYMENT_PROVIDERS)[number];

/** Currencies Paystack can charge in. */
const PAYSTACK_CURRENCIES = new Set([
  "NGN",
  "GHS",
  "ZAR",
  "KES",
  "USD",
  "XOF",
  "EGP",
]);

/** The ways a customer can pay online in this currency, from the keys set up. */
export function getDealPaymentProviders(
  currency: string,
): DealPaymentProvider[] {
  const providers: DealPaymentProvider[] = [];
  if (
    process.env.PAYSTACK_SECRET_KEY &&
    PAYSTACK_CURRENCIES.has(currency.toUpperCase())
  ) {
    providers.push("paystack");
  }
  if (process.env.STRIPE_SECRET_KEY) {
    providers.push("stripe");
  }
  return providers;
}

export class DealPaymentError extends Error {
  constructor(
    readonly code: "notPayable" | "providerUnavailable" | "providerFailed",
  ) {
    super(code);
    this.name = "DealPaymentError";
  }
}

/**
 * Starts paying the deal's current payment step with Stripe or Paystack and
 * returns where to send the customer. The amount always comes from the step.
 */
export async function startDealOnlinePayment({
  dealId,
  provider,
}: {
  dealId: string;
  provider: DealPaymentProvider;
}) {
  const deal = await prisma.deal.findUnique({
    include: {
      customer: { select: { email: true, name: true } },
      steps: { where: { status: "active" } },
    },
    where: { id: dealId },
  });
  const step = deal?.steps[0];
  const amountMinor = step?.amountDueMinor ?? 0;
  if (
    !deal ||
    deal.status !== "open" ||
    !step ||
    (step.kind !== "payment" && step.kind !== "caution") ||
    step.paidAt ||
    amountMinor <= 0
  ) {
    throw new DealPaymentError("notPayable");
  }
  if (!getDealPaymentProviders(deal.currency).includes(provider)) {
    throw new DealPaymentError("providerUnavailable");
  }

  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const roomUrl = `${appUrl}/d/${createDealShareToken(deal)}`;
  const metadata = {
    customerEmail: deal.customer.email,
    dealId: deal.id,
    dealStepId: step.id,
    organizationId: deal.organizationId,
    source: "deal_payment",
  };
  const description = `${step.name} · ${deal.title}`;

  if (provider === "stripe") {
    let session: Stripe.Checkout.Session;
    try {
      session = await stripeAdmin.checkout.sessions.create({
        cancel_url: roomUrl,
        customer_email: deal.customer.email,
        line_items: [
          {
            price_data: {
              currency: deal.currency.toLowerCase(),
              product_data: { name: description },
              unit_amount: amountMinor,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        payment_intent_data: {
          description,
          metadata,
          receipt_email: deal.customer.email,
        },
        success_url: `${roomUrl}?payment=processing`,
      });
    } catch (error) {
      console.error("Stripe Checkout failed for deal", deal.id, error);
      throw new DealPaymentError("providerFailed");
    }
    if (!session.url) {
      throw new DealPaymentError("providerFailed");
    }
    return session.url;
  }

  const reference = `deal_${cuid()}`;
  let authorizationUrl: string;
  try {
    ({ authorizationUrl } = await initializePaystackTransaction({
      amountMinor,
      callbackUrl: `${roomUrl}?payment=processing`,
      currency: deal.currency,
      email: deal.customer.email,
      metadata,
      reference,
    }));
  } catch (error) {
    console.error("Paystack initialization failed for deal", deal.id, error);
    throw new DealPaymentError("providerFailed");
  }
  await prisma.payment.create({
    data: {
      amountMinor,
      currency: deal.currency,
      customerEmail: deal.customer.email,
      customerName: deal.customer.name,
      dealId: deal.id,
      dealStepId: step.id,
      items: [{ description, quantity: 1, unitPriceMinor: amountMinor }],
      metadata: { paystack: { reference } },
      organizationId: deal.organizationId,
      provider: "paystack",
      providerPaymentId: reference,
      purpose: step.kind === "caution" ? "caution" : "sale",
      status: "pending",
    },
  });
  return authorizationUrl;
}

/**
 * Stripe Checkout only creates the PaymentIntent once the customer pays, so a
 * deal payment's row is made from the PaymentIntent's metadata when Stripe
 * reports it. Returns the row, or null when the metadata doesn't check out.
 */
export async function upsertDealPaymentFromStripePaymentIntent(
  pi: Stripe.PaymentIntent,
) {
  const { dealId, dealStepId, organizationId } = pi.metadata ?? {};
  if (pi.metadata?.source !== "deal_payment" || !dealId || !dealStepId) {
    return null;
  }
  const step = await prisma.dealStep.findFirst({
    include: { deal: { include: { customer: true } } },
    where: { deal: { id: dealId, organizationId }, id: dealStepId },
  });
  if (!step) {
    return null;
  }
  const description = `${step.name} · ${step.deal.title}`;
  return await prisma.payment.upsert({
    create: {
      amountMinor: pi.amount,
      currency: pi.currency.toUpperCase(),
      customerEmail: step.deal.customer.email,
      customerName: step.deal.customer.name,
      dealId,
      dealStepId,
      items: [{ description, quantity: 1, unitPriceMinor: pi.amount }],
      metadata: { stripe: { paymentIntentId: pi.id } },
      organizationId: step.deal.organizationId,
      provider: "stripe",
      providerCustomerId: typeof pi.customer === "string" ? pi.customer : null,
      providerPaymentId: pi.id,
      purpose: step.kind === "caution" ? "caution" : "sale",
      status: "pending",
    },
    update: {},
    where: {
      provider_providerPaymentId: {
        provider: "stripe",
        providerPaymentId: pi.id,
      },
    },
  });
}

/**
 * After a provider confirms a deal payment: completes the payment step, sends
 * whatever that triggers (the receipt) and tells the business.
 */
export async function finishDealOnlinePayment(paymentId: string) {
  const { applied, effects } = await applyOnlinePaymentToDeal({ paymentId });
  const payment = await prisma.payment.findUnique({
    include: { deal: { include: { customer: { select: { name: true } } } } },
    where: { id: paymentId },
  });
  if (!payment?.deal) {
    return;
  }
  const amount = formatMoney({
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    locale: "en",
  });
  await notifyDealMembers({
    dealId: payment.deal.id,
    organizationId: payment.organizationId,
    text: applied
      ? `${payment.deal.customer.name} paid ${amount} online for ${payment.deal.title}`
      : `${payment.deal.customer.name} paid ${amount} for ${payment.deal.title}, but that step was already settled. Check whether to refund it.`,
  });
  if (applied) {
    const failed = await deliverDealEffects(effects, {
      appName: translation.appName,
    });
    if (failed > 0) {
      console.error(
        `Deal ${payment.deal.id}: ${failed} document email(s) failed`,
      );
    }
  }
}
