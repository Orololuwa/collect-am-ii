import type Stripe from "stripe";

import {
  updatePaymentStatusInDatabaseByProviderAndProviderPaymentId,
  upsertPaymentToDatabaseByProviderAndProviderPaymentId,
} from "~/features/checkout/payments-model.server";
import {
  generateReceiptForPaymentInDatabaseById,
  sendReceiptEmailForReceiptInDatabaseById,
} from "~/features/checkout/receipt-generation.server";
import {
  finishDealOnlinePayment,
  upsertDealPaymentFromStripePaymentIntent,
} from "~/features/deals/deal-payments.server";
import type { Prisma } from "~/generated/client";
import { prisma } from "~/utils/database.server";

/**
 * Checkout Session does not create a Payment row up front (only after PI
 * succeeds). Payment Element flow creates the row when the PI is created.
 */
export async function upsertPaymentRecordFromStripePaymentIntentIfMissing(
  pi: Stripe.PaymentIntent,
) {
  const checkoutPageId = pi.metadata?.checkoutPageId;
  if (!checkoutPageId) return;

  const existing = await prisma.payment.findUnique({
    where: {
      provider_providerPaymentId: {
        provider: "stripe",
        providerPaymentId: pi.id,
      },
    },
  });
  if (existing) return;

  if (pi.metadata?.source !== "stripe_checkout_session") return;

  const checkoutPage = await prisma.checkoutPage.findUnique({
    where: { id: checkoutPageId },
  });
  if (!checkoutPage?.isActive) return;

  if (
    pi.metadata.organizationId &&
    pi.metadata.organizationId !== checkoutPage.organizationId
  ) {
    return;
  }

  let items: unknown[] = [];
  if (pi.metadata.itemsJson) {
    try {
      items = JSON.parse(pi.metadata.itemsJson) as unknown[];
    } catch {
      items = [];
    }
  }

  const customerEmail = pi.metadata.customerEmail ?? pi.receipt_email ?? "";
  if (!customerEmail) return;

  const customerName = pi.metadata.customerName || null;

  await upsertPaymentToDatabaseByProviderAndProviderPaymentId({
    provider: "stripe",
    providerPaymentId: pi.id,
    create: {
      amountMinor: pi.amount,
      checkoutPage: { connect: { id: checkoutPage.id } },
      organization: { connect: { id: checkoutPage.organizationId } },
      currency: pi.currency.toUpperCase(),
      customerEmail,
      customerName,
      customerPhone: null,
      items: items as unknown as Prisma.InputJsonValue,
      metadata: {
        stripe: { paymentIntentId: pi.id },
      } as unknown as Prisma.InputJsonValue,
      provider: "stripe",
      providerCustomerId: typeof pi.customer === "string" ? pi.customer : null,
      providerPaymentId: pi.id,
      status: "pending",
    },
    update: {
      amountMinor: pi.amount,
      currency: pi.currency.toUpperCase(),
      customerEmail,
      customerName,
      customerPhone: null,
      items: items as unknown as Prisma.InputJsonValue,
      status: "pending",
    },
  });
}

export async function handleStripeCheckoutPaymentIntentSucceeded(
  pi: Stripe.PaymentIntent,
): Promise<void> {
  const providerPaymentId = pi.id;

  if (pi.metadata?.source === "deal_payment") {
    const payment = await upsertDealPaymentFromStripePaymentIntent(pi);
    if (!payment || payment.status === "succeeded") return;
    await updatePaymentStatusInDatabaseByProviderAndProviderPaymentId({
      provider: "stripe",
      providerPaymentId,
      status: "succeeded",
    });
    await finishDealOnlinePayment(payment.id);
    return;
  }

  await upsertPaymentRecordFromStripePaymentIntentIfMissing(pi);

  const payment = await prisma.payment.findUnique({
    where: {
      provider_providerPaymentId: {
        provider: "stripe",
        providerPaymentId,
      },
    },
    select: {
      amountMinor: true,
      checkoutPageId: true,
      id: true,
      status: true,
    },
  });

  if (!payment) return;

  if (!payment.checkoutPageId) return;

  if (payment.status === "succeeded") {
    await prisma.checkoutPage.update({
      data: { isActive: false },
      where: { id: payment.checkoutPageId },
    });
    return;
  }

  await updatePaymentStatusInDatabaseByProviderAndProviderPaymentId({
    provider: "stripe",
    providerPaymentId,
    status: "succeeded",
  });

  await prisma.checkoutPage.update({
    data: {
      isActive: false,
      paymentCount: { increment: 1 },
      totalRevenueMinor: { increment: payment.amountMinor },
    },
    where: { id: payment.checkoutPageId },
  });

  const receipt = await generateReceiptForPaymentInDatabaseById({
    paymentId: payment.id,
  });
  if (receipt) {
    await sendReceiptEmailForReceiptInDatabaseById({
      receiptId: receipt.id,
    });
  }
}

export async function handleStripeCheckoutPaymentIntentFailed(
  pi: Stripe.PaymentIntent,
): Promise<void> {
  const row = await prisma.payment.findUnique({
    where: {
      provider_providerPaymentId: {
        provider: "stripe",
        providerPaymentId: pi.id,
      },
    },
    select: { id: true },
  });
  if (row) {
    await updatePaymentStatusInDatabaseByProviderAndProviderPaymentId({
      provider: "stripe",
      providerPaymentId: pi.id,
      status: "failed",
    });
  }
}

export async function handleStripeCheckoutPaymentIntentCanceled(
  pi: Stripe.PaymentIntent,
): Promise<void> {
  const row = await prisma.payment.findUnique({
    where: {
      provider_providerPaymentId: {
        provider: "stripe",
        providerPaymentId: pi.id,
      },
    },
    select: { id: true },
  });
  if (row) {
    await updatePaymentStatusInDatabaseByProviderAndProviderPaymentId({
      provider: "stripe",
      providerPaymentId: pi.id,
      status: "canceled",
    });
  }
}
