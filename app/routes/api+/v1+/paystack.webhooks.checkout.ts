import type { Route } from "./+types/paystack.webhooks.checkout";
import { updatePaymentStatusInDatabaseByProviderAndProviderPaymentId } from "~/features/checkout/payments-model.server";
import {
  getIsPaystackTransactionMatchingPayment,
  verifyPaystackSignature,
  verifyPaystackTransaction,
} from "~/features/checkout/paystack.server";
import {
  generateReceiptForPaymentInDatabaseById,
  sendReceiptEmailForReceiptInDatabaseById,
} from "~/features/checkout/receipt-generation.server";
import { prisma } from "~/utils/database.server";
import { getErrorMessage } from "~/utils/get-error-message";

const json = (payload: unknown, init?: ResponseInit) =>
  Response.json(payload, { status: 200, ...init });

const notAllowed = () =>
  json({ message: "Method Not Allowed" }, { status: 405 });
const badRequest = (payload?: { message?: string; error?: string }) =>
  json({ message: "Bad Request", ...payload }, { status: 400 });

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function referenceFromPaystackWebhookPayload(
  body: unknown,
): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") return undefined;
  const d = data as {
    reference?: unknown;
    transaction?: { reference?: unknown };
  };
  if (typeof d.reference === "string") return d.reference;
  if (
    d.transaction &&
    typeof d.transaction === "object" &&
    typeof d.transaction.reference === "string"
  ) {
    return d.transaction.reference;
  }
  return undefined;
}

export const loader = () => notAllowed();

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return notAllowed();

  const payload = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  try {
    if (!verifyPaystackSignature({ payload, signature })) {
      return badRequest({ message: "Invalid signature" });
    }

    const body = JSON.parse(payload) as { event?: string; data?: unknown };
    const eventType = body.event;

    if (!eventType) {
      return badRequest({ message: "Missing event" });
    }

    if (eventType !== "charge.success" && eventType !== "charge.failed") {
      return json({ message: "OK" });
    }

    const reference = referenceFromPaystackWebhookPayload(body);
    if (!reference) {
      return badRequest({ message: "Missing reference in webhook payload" });
    }

    if (eventType === "charge.success") {
      const payment = await prisma.payment.findUnique({
        where: {
          provider_providerPaymentId: {
            provider: "paystack",
            providerPaymentId: reference,
          },
        },
        select: {
          id: true,
          amountMinor: true,
          checkoutPageId: true,
          currency: true,
          metadata: true,
          status: true,
        },
      });

      if (!payment) {
        return json({ message: "OK" });
      }

      if (payment.status === "succeeded") {
        await prisma.checkoutPage.update({
          data: { isActive: false },
          where: { id: payment.checkoutPageId },
        });
        return json({ message: "OK" });
      }

      const verified = await verifyPaystackTransaction({ reference });
      if (verified.status !== "success") {
        await updatePaymentStatusInDatabaseByProviderAndProviderPaymentId({
          provider: "paystack",
          providerPaymentId: reference,
          status: "failed",
        });
        return json({ message: "OK" });
      }

      if (
        !getIsPaystackTransactionMatchingPayment({
          payment,
          transaction: verified,
        })
      ) {
        // Leave the payment pending and the page open, and keep what Paystack
        // reported so the business can follow up. A 200 stops Paystack retrying
        // an event that can never become valid.
        console.error(
          `Paystack charge ${reference} does not match its payment: expected ${payment.amountMinor} ${payment.currency}, got ${verified.amount} ${verified.currency}`,
        );
        await prisma.payment.update({
          data: {
            metadata: {
              ...(isRecord(payment.metadata) ? payment.metadata : {}),
              paystackMismatch: {
                amount: verified.amount,
                currency: verified.currency,
              },
            },
          },
          where: { id: payment.id },
        });
        return json({ message: "Ignored: amount or currency mismatch" });
      }

      await updatePaymentStatusInDatabaseByProviderAndProviderPaymentId({
        provider: "paystack",
        providerPaymentId: reference,
        status: "succeeded",
        data: {
          providerCustomerId: verified.customer?.email ?? null,
        },
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

      return json({ message: "OK" });
    }

    if (eventType === "charge.failed") {
      const row = await prisma.payment.findUnique({
        where: {
          provider_providerPaymentId: {
            provider: "paystack",
            providerPaymentId: reference,
          },
        },
        select: { id: true },
      });
      if (row) {
        await updatePaymentStatusInDatabaseByProviderAndProviderPaymentId({
          provider: "paystack",
          providerPaymentId: reference,
          status: "failed",
        });
      }
      return json({ message: "OK" });
    }
  } catch (error) {
    return badRequest({ error: getErrorMessage(error) });
  }
}
