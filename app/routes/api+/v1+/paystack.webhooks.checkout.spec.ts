import crypto from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { HttpResponse, http } from "msw";
import { describe, expect, test } from "vitest";

import { action } from "./paystack.webhooks.checkout";
import { setupCheckoutPageWithOrganization } from "~/features/checkout/checkout-factories.server";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { createTestContextProvider } from "~/test/test-utils";
import { prisma } from "~/utils/database.server";

const url = "http://localhost:3000/api/v1/paystack/webhooks/checkout";
const pattern = "/api/v1/paystack/webhooks/checkout";

async function sendRequest(request: Request) {
  const params = {};
  const response = await action({
    context: await createTestContextProvider({ params, pattern, request }),
    params,
    request,
    unstable_pattern: pattern,
  });
  if (!response) throw new Error("The webhook action returned no response");
  return response;
}

async function sendSignedWebhook(body: unknown) {
  const payload = JSON.stringify(body);
  const signature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY ?? "")
    .update(payload, "utf8")
    .digest("hex");
  const request = new Request(url, {
    body: payload,
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": signature,
    },
    method: "POST",
  });
  return await sendRequest(request);
}

const server = setupMockServerLifecycle();

function mockVerifiedTransaction(transaction: {
  amount: number;
  currency: string;
  status?: string;
}) {
  server.use(
    http.get(
      "https://api.paystack.co/transaction/verify/:reference",
      ({ params }) =>
        HttpResponse.json({
          data: {
            customer: { email: "customer@example.com" },
            reference: params.reference,
            status: "success",
            ...transaction,
          },
          message: "Verification successful",
          status: true,
        }),
    ),
  );
}

async function setupPendingPaystackPayment() {
  const { checkoutPage } = await setupCheckoutPageWithOrganization();
  const reference = `chk_${createId()}`;
  const payment = await prisma.payment.create({
    data: {
      amountMinor: 2550,
      checkoutPageId: checkoutPage.id,
      currency: "NGN",
      organizationId: checkoutPage.organizationId,
      customerEmail: "customer@example.com",
      items: [],
      metadata: { paystack: { reference } },
      provider: "paystack",
      providerPaymentId: reference,
      status: "pending",
    },
  });
  return { checkoutPage, payment, reference };
}

async function readState({
  checkoutPageId,
  paymentId,
}: {
  checkoutPageId: string;
  paymentId: string;
}) {
  const [payment, checkoutPage] = await Promise.all([
    prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }),
    prisma.checkoutPage.findUniqueOrThrow({ where: { id: checkoutPageId } }),
  ]);
  return { checkoutPage, payment };
}

describe("/api/v1/paystack/webhooks/checkout route action", () => {
  test("given: a charge.success whose verified amount matches the payment, should: mark it succeeded and close the page", async () => {
    const { checkoutPage, payment, reference } =
      await setupPendingPaystackPayment();
    mockVerifiedTransaction({ amount: 2550, currency: "NGN" });

    const response = await sendSignedWebhook({
      data: { reference },
      event: "charge.success",
    });

    expect(response.status).toBe(200);
    const state = await readState({
      checkoutPageId: checkoutPage.id,
      paymentId: payment.id,
    });
    expect(state.payment.status).toBe("succeeded");
    expect(state.checkoutPage).toMatchObject({
      isActive: false,
      paymentCount: 1,
      totalRevenueMinor: 2550,
    });
  });

  test.each([
    {
      given: "a lower verified amount",
      transaction: { amount: 100, currency: "NGN" },
    },
    {
      given: "a different verified currency",
      transaction: { amount: 2550, currency: "USD" },
    },
  ])("given: a charge.success with $given, should: leave the payment pending and the page open", async ({
    transaction,
  }) => {
    const { checkoutPage, payment, reference } =
      await setupPendingPaystackPayment();
    mockVerifiedTransaction(transaction);

    const response = await sendSignedWebhook({
      data: { reference },
      event: "charge.success",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Ignored: amount or currency mismatch",
    });
    const state = await readState({
      checkoutPageId: checkoutPage.id,
      paymentId: payment.id,
    });
    expect(state.payment.status).toBe("pending");
    expect(state.payment.metadata).toEqual({
      paystack: { reference },
      paystackMismatch: transaction,
    });
    expect(state.checkoutPage).toMatchObject({
      isActive: true,
      paymentCount: 0,
      totalRevenueMinor: 0,
    });
  });

  test("given: an invalid signature, should: return a 400", async () => {
    const request = new Request(url, {
      body: JSON.stringify({ data: {}, event: "charge.success" }),
      headers: { "x-paystack-signature": "0".repeat(128) },
      method: "POST",
    });

    const response = await sendRequest(request);

    expect(response.status).toBe(400);
  });
});
