import crypto from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { action as paystackWebhook } from "../api+/v1+/paystack.webhooks.checkout";
import { action as payAction } from "./$token_.pay";
import { handleStripeCheckoutPaymentIntentSucceeded } from "~/features/checkout/stripe-checkout-webhook.server";
import { createPopulatedCustomer } from "~/features/customers/customers-factories.server";
import {
  acceptDealDocument,
  proposeDealChanges,
  recordDealPayment,
  sendDealDocument,
  startDeal,
} from "~/features/deals/deal-engine.server";
import type { DealLineItem } from "~/features/deals/deal-items";
import { createDealShareToken } from "~/features/deals/deal-share-link.server";
import { getDashboardData } from "~/features/organizations/dashboard/dashboard-helpers.server";
import type { WorkflowSampleKey } from "~/features/workflows/workflow-samples";
import { WORKFLOW_SAMPLES } from "~/features/workflows/workflow-samples";
import { saveWorkflowWithStepsToDatabase } from "~/features/workflows/workflows-model.server";
import { auth0Handlers } from "~/test/mocks/handlers/auth0";
import { paystackHandlers } from "~/test/mocks/handlers/paystack";
import { resendHandlers } from "~/test/mocks/handlers/resend";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { setupUserWithOrgAndAddAsMember } from "~/test/server-test-utils";
import { createTestContextProvider } from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { resetRateLimits } from "~/utils/rate-limit.server";
import { toFormData } from "~/utils/to-form-data";

vi.mock("~/features/templates/shared/utils/pdf-generator.server", () => ({
  generatePDF: vi.fn().mockResolvedValue(Buffer.from("mock-pdf-content")),
}));

setupMockServerLifecycle(
  ...auth0Handlers,
  ...resendHandlers,
  ...paystackHandlers,
);

beforeEach(() => {
  resetRateLimits();
});

const items: DealLineItem[] = [
  {
    description: "",
    discountBps: 0,
    name: "Party pack",
    productId: null,
    quantity: 2,
    taxRateBps: 750,
    unit: "box",
    unitPriceMinor: 5_000_000,
  },
];
// 2 × 50,000.00 + 7.5% tax
const total = 10_750_000;

/**
 * A deal on the retail workflow whose order confirmation has been accepted,
 * so it waits on its payment step.
 */
async function setupDealAwaitingPayment(
  sampleKey: WorkflowSampleKey = "retailOrder",
  { accept = true } = {},
) {
  const { user, organization } = await setupUserWithOrgAndAddAsMember();
  const customer = await prisma.customer.create({
    data: createPopulatedCustomer({ organizationId: organization.id }),
  });
  const workflow = await saveWorkflowWithStepsToDatabase({
    description: "",
    name: "Retail",
    organizationId: organization.id,
    sampleKey,
    steps: WORKFLOW_SAMPLES[sampleKey].map(({ stepName, ...settings }) => ({
      ...settings,
      name: stepName,
      templateId: null,
    })),
  });
  const business = { party: "business" as const, userId: user.id };
  const { result: deal } = await startDeal({
    actor: business,
    currency: "NGN",
    customerId: customer.id,
    items,
    organizationId: organization.id,
    title: "Party order",
    workflowId: workflow.id,
  });
  const document = await prisma.dealDocument.findFirstOrThrow({
    where: { dealId: deal.id },
  });
  const target = { dealId: deal.id, organizationId: organization.id };
  await sendDealDocument({
    ...target,
    actor: business,
    documentId: document.id,
  });
  if (accept) {
    await acceptDealDocument({
      ...target,
      acceptedByName: customer.name,
      actor: { party: "customer", userId: null },
      documentId: document.id,
    });
  }
  const loaded = await prisma.deal.findUniqueOrThrow({
    include: { steps: { orderBy: { position: "asc" } } },
    where: { id: deal.id },
  });
  return {
    customer,
    deal: loaded,
    document,
    organization,
    paymentStep: loaded.steps[1],
    token: createDealShareToken(loaded),
    user,
  };
}

async function pay(token: string, provider: string) {
  const request = new Request(`http://localhost:3000/d/${token}/pay`, {
    body: toFormData({ provider }),
    method: "POST",
  });
  const params = { token };
  const pattern = "/d/:token/pay";
  return (await payAction({
    context: await createTestContextProvider({ params, pattern, request }),
    params,
    request,
    unstable_pattern: pattern,
  })) as Response;
}

async function sendPaystackWebhook(reference: string) {
  const payload = JSON.stringify({
    data: { reference },
    event: "charge.success",
  });
  const request = new Request(
    "http://localhost:3000/api/v1/paystack/webhooks/checkout",
    {
      body: payload,
      headers: {
        "x-paystack-signature": crypto
          .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY ?? "")
          .update(payload, "utf8")
          .digest("hex"),
      },
      method: "POST",
    },
  );
  const params = {};
  const pattern = "/api/v1/paystack/webhooks/checkout";
  return await paystackWebhook({
    context: await createTestContextProvider({ params, pattern, request }),
    params,
    request,
    unstable_pattern: pattern,
  });
}

function stripePaymentIntent(metadata: Record<string, string>, amount = total) {
  return {
    amount,
    currency: "ngn",
    customer: null,
    id: `pi_${crypto.randomUUID()}`,
    metadata,
    receipt_email: null,
  } as never;
}

function loadSteps(dealId: string) {
  return prisma.dealStep.findMany({
    include: { document: true },
    orderBy: { position: "asc" },
    where: { dealId },
  });
}

describe("deal payments", () => {
  test("given: Paystack on the share link, should: start a payment for the amount due and finish the deal when it succeeds", async () => {
    const { token, deal, paymentStep } = await setupDealAwaitingPayment();

    const response = await pay(token, "paystack");

    expect(response.status).toEqual(302);
    expect(response.headers.get("Location")).toMatch(
      /^https:\/\/checkout\.paystack\.com\/deal_/,
    );
    const payment = await prisma.payment.findFirstOrThrow({
      where: { dealId: deal.id },
    });
    expect(payment).toMatchObject({
      amountMinor: total,
      checkoutPageId: null,
      dealStepId: paymentStep?.id,
      organizationId: deal.organizationId,
      provider: "paystack",
      status: "pending",
    });

    await sendPaystackWebhook(payment.providerPaymentId);
    // A repeated webhook changes nothing.
    await sendPaystackWebhook(payment.providerPaymentId);

    const steps = await loadSteps(deal.id);
    expect(steps.map((step) => step.status)).toEqual(["done", "done", "done"]);
    expect(steps[1]).toMatchObject({
      amountPaidMinor: total,
      paymentMethod: "paystack",
      paymentReference: payment.providerPaymentId,
    });
    expect(steps[2]?.document).toMatchObject({
      number: "RCP-0001",
      status: "sent",
      type: "receipt",
    });
    expect(
      (await prisma.deal.findUniqueOrThrow({ where: { id: deal.id } })).status,
    ).toEqual("won");
    expect(await prisma.payment.count({ where: { dealId: deal.id } })).toEqual(
      1,
    );
    const notification = await prisma.notification.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
      where: { organizationId: deal.organizationId },
    });
    expect(notification.content).toMatchObject({
      text: expect.stringContaining("paid ₦107,500.00 online"),
    });
  });

  test("given: a Stripe payment for the deal, should: record it once and complete the step", async () => {
    const { deal, paymentStep, organization } =
      await setupDealAwaitingPayment();
    const pi = stripePaymentIntent({
      dealId: deal.id,
      dealStepId: paymentStep?.id ?? "",
      organizationId: organization.id,
      source: "deal_payment",
    });

    await handleStripeCheckoutPaymentIntentSucceeded(pi);
    await handleStripeCheckoutPaymentIntentSucceeded(pi);

    const payments = await prisma.payment.findMany({
      where: { dealId: deal.id },
    });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      amountMinor: total,
      currency: "NGN",
      provider: "stripe",
      status: "succeeded",
    });
    const steps = await loadSteps(deal.id);
    expect(steps[1]).toMatchObject({ paymentMethod: "stripe", status: "done" });
  });

  test("given: Stripe metadata naming another organization's deal, should: ignore it", async () => {
    const { deal, paymentStep } = await setupDealAwaitingPayment();
    const { organization: other } = await setupUserWithOrgAndAddAsMember();

    await handleStripeCheckoutPaymentIntentSucceeded(
      stripePaymentIntent({
        dealId: deal.id,
        dealStepId: paymentStep?.id ?? "",
        organizationId: other.id,
        source: "deal_payment",
      }),
    );

    expect(await prisma.payment.count({ where: { dealId: deal.id } })).toEqual(
      0,
    );
    expect((await loadSteps(deal.id))[1]?.status).toEqual("active");
  });

  test("given: nothing to pay yet, should: send the customer back with an error", async () => {
    const { token, deal } = await setupDealAwaitingPayment("retailOrder", {
      accept: false,
    });

    const response = await pay(token, "paystack");

    expect(response.status).toEqual(302);
    expect(response.headers.get("Location")).toEqual(`/d/${token}`);
    expect(await prisma.payment.count({ where: { dealId: deal.id } })).toEqual(
      0,
    );
  });

  test("given: a payment recorded by hand, should: keep it as a payment for the dashboard", async () => {
    const { deal, paymentStep, user } = await setupDealAwaitingPayment();

    await recordDealPayment({
      actor: { party: "business", userId: user.id },
      dealId: deal.id,
      method: "bankTransfer",
      organizationId: deal.organizationId,
      reference: "TRF-9",
      stepId: paymentStep?.id ?? "",
    });

    expect(
      await prisma.payment.findFirstOrThrow({ where: { dealId: deal.id } }),
    ).toMatchObject({
      amountMinor: total,
      metadata: { method: "bankTransfer", reference: "TRF-9" },
      provider: "manual",
      status: "succeeded",
    });
    const dashboard = await getDashboardData({
      organizationId: deal.organizationId,
      period: 30,
      requestedCurrency: "NGN",
    });
    expect(dashboard).toMatchObject({
      recentPayments: [
        { source: { id: deal.id, kind: "deal", name: "Party order" } },
      ],
      // The retail workflow sends its receipt straight after the payment.
      stats: { receipts: { sent: 1, total: 1 } },
    });
  });

  test("given: a customer's suggested changes, should: list the deal as needing attention", async () => {
    const { deal, document } = await setupDealAwaitingPayment("retailOrder", {
      accept: false,
    });
    await proposeDealChanges({
      actor: { party: "customer", userId: null },
      changes: { additions: [], lines: { 0: { quantity: 1 } } },
      dealId: deal.id,
      documentId: document.id,
      note: "",
      organizationId: deal.organizationId,
    });
    // Skip the setup guide, which replaces the dashboard for new organizations.
    await prisma.organization.update({
      data: { setupGuideDismissedAt: new Date() },
      where: { id: deal.organizationId },
    });

    const dashboard = await getDashboardData({
      organizationId: deal.organizationId,
      period: 30,
      requestedCurrency: "NGN",
    });

    expect(dashboard).toMatchObject({
      attention: [{ attention: { reason: "proposal" }, id: deal.id }],
    });
  });
});
