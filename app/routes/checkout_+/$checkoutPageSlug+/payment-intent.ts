import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/payment-intent";
import { stripeAdmin } from "~/features/billing/stripe-admin.server";
import { retrieveCheckoutPageFromDatabaseBySlug } from "~/features/checkout/checkout-pages-model.server";
import {
  computeCheckoutPagePayment,
  getHasCheckoutPaymentAccess,
  getIsCheckoutPageOpenForPayment,
  getIsClientAmountMatching,
} from "~/features/checkout/checkout-payment-start.server";
import { upsertPaymentToDatabaseByProviderAndProviderPaymentId } from "~/features/checkout/payments-model.server";
import type { Prisma } from "~/generated/client";
import { notFound } from "~/utils/http-responses.server";

const schema = z.object({
  provider: z.literal("stripe"),
  /** What the customer saw; only checked against the server total, never charged. */
  amountMajor: z.string().optional(),
  currency: z.string().min(3),
  customerEmail: z.string().email(),
  customerName: z.string().optional().default(""),
});

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ message: "Method Not Allowed" }, { status: 405 });
  }

  const checkoutPage = await retrieveCheckoutPageFromDatabaseBySlug({
    slug: params.checkoutPageSlug,
  });
  if (!checkoutPage || !getIsCheckoutPageOpenForPayment(checkoutPage)) {
    throw notFound();
  }
  if (!(await getHasCheckoutPaymentAccess({ checkoutPage, request }))) {
    return data(
      { error: "Enter the checkout password before paying" },
      { status: 403 },
    );
  }
  if (!checkoutPage.paymentProviders.includes("stripe")) {
    return data(
      { error: "Stripe is not enabled for this checkout page" },
      { status: 400 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = await schema.safeParseAsync(payload);
  if (!parsed.success) {
    return data({ error: parsed.error.flatten() }, { status: 400 });
  }

  const currency = parsed.data.currency.toUpperCase();
  if (!checkoutPage.allowedCurrencies.includes(currency)) {
    return data({ error: "Currency not allowed" }, { status: 400 });
  }

  const payment = computeCheckoutPagePayment({ checkoutPage, currency });
  if (!payment) {
    return data(
      { error: "This checkout has no payable total" },
      { status: 400 },
    );
  }
  if (
    parsed.data.amountMajor !== undefined &&
    !getIsClientAmountMatching({
      amountMajor: parsed.data.amountMajor,
      amountMinor: payment.amountMinor,
      currency,
    })
  ) {
    return data(
      { error: "The order total has changed. Reload the page and try again." },
      { status: 400 },
    );
  }
  const { amountMinor, items } = payment;

  const paymentIntent = await stripeAdmin.paymentIntents.create({
    amount: amountMinor,
    currency: currency.toLowerCase(),
    metadata: {
      checkoutPageId: checkoutPage.id,
      organizationId: checkoutPage.organizationId,
      customerEmail: parsed.data.customerEmail,
    },
    automatic_payment_methods: { enabled: true },
    receipt_email: parsed.data.customerEmail,
  });

  await upsertPaymentToDatabaseByProviderAndProviderPaymentId({
    provider: "stripe",
    providerPaymentId: paymentIntent.id,
    create: {
      amountMinor,
      checkoutPage: { connect: { id: checkoutPage.id } },
      currency,
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName || null,
      customerPhone: null,
      items: items as unknown as Prisma.InputJsonValue,
      metadata: {
        stripe: { paymentIntentId: paymentIntent.id },
      } as unknown as Prisma.InputJsonValue,
      provider: "stripe",
      providerCustomerId:
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : null,
      providerPaymentId: paymentIntent.id,
      status: "pending",
    },
    update: {
      amountMinor,
      currency,
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName || null,
      items: items as unknown as Prisma.InputJsonValue,
      status: "pending",
    },
  });

  return data({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}
