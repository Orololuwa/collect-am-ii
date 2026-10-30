import { beforeEach, describe, expect, test, vi } from "vitest";

import { action as dealAction } from "../_authenticated-routes+/organizations_+/$organizationSlug+/deals+/$dealId";
import { action, loader } from "./$token";
import { createPopulatedCustomer } from "~/features/customers/customers-factories.server";
import {
  resetDealShareLink,
  sendDealDocument,
  startDeal,
} from "~/features/deals/deal-engine.server";
import type { DealLineItem } from "~/features/deals/deal-items";
import { DEAL_ROOM_ACTION_LIMIT } from "~/features/deals/deal-room-action.server";
import { createDealShareToken } from "~/features/deals/deal-share-link.server";
import {
  ACCEPT_DOCUMENT_INTENT,
  APPROVE_PROPOSAL_INTENT,
  POST_MESSAGE_INTENT,
  PROPOSE_CHANGES_INTENT,
} from "~/features/deals/deals-constants";
import { createPopulatedProduct } from "~/features/products/products-factories.server";
import { WORKFLOW_SAMPLES } from "~/features/workflows/workflow-samples";
import { saveWorkflowWithStepsToDatabase } from "~/features/workflows/workflows-model.server";
import { auth0Handlers } from "~/test/mocks/handlers/auth0";
import { resendHandlers } from "~/test/mocks/handlers/resend";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { setupUserWithOrgAndAddAsMember } from "~/test/server-test-utils";
import {
  createAuthenticatedRequest,
  createOrganizationMembershipTestContextProvider,
  createTestContextProvider,
} from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { consumeRateLimit, resetRateLimits } from "~/utils/rate-limit.server";
import { toFormData } from "~/utils/to-form-data";

vi.mock("~/features/templates/shared/utils/pdf-generator.server", () => ({
  generatePDF: vi.fn().mockResolvedValue(Buffer.from("mock-pdf-content")),
}));

setupMockServerLifecycle(...auth0Handlers, ...resendHandlers);

beforeEach(() => {
  resetRateLimits();
});

const pattern = "/d/:token";

const items: DealLineItem[] = [
  {
    description: "",
    discountBps: 0,
    name: "Design",
    productId: null,
    quantity: 10,
    taxRateBps: 0,
    unit: "hour",
    unitPriceMinor: 1_000_000,
  },
  {
    description: "",
    discountBps: 0,
    name: "Printing",
    productId: null,
    quantity: 1,
    taxRateBps: 0,
    unit: "job",
    unitPriceMinor: 500_000,
  },
];

/** A deal on the services workflow with its estimate sent to the customer. */
async function setupSentDeal({ send = true } = {}) {
  const { user, organization } = await setupUserWithOrgAndAddAsMember();
  const customer = await prisma.customer.create({
    data: createPopulatedCustomer({ organizationId: organization.id }),
  });
  const workflow = await saveWorkflowWithStepsToDatabase({
    description: "",
    name: "Services with deposit",
    organizationId: organization.id,
    sampleKey: "servicesDeposit",
    steps: WORKFLOW_SAMPLES.servicesDeposit.map(
      ({ stepName, ...settings }) => ({
        ...settings,
        name: stepName,
        templateId: null,
      }),
    ),
  });
  const { result: started } = await startDeal({
    actor: { party: "business", userId: user.id },
    currency: "NGN",
    customerId: customer.id,
    items,
    organizationId: organization.id,
    title: "Brand refresh",
    workflowId: workflow.id,
  });
  const document = await prisma.dealDocument.findFirstOrThrow({
    where: { dealId: started.id },
  });
  if (send) {
    await sendDealDocument({
      actor: { party: "business", userId: user.id },
      dealId: started.id,
      documentId: document.id,
      organizationId: organization.id,
    });
  }
  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id: started.id },
  });
  return {
    customer,
    deal,
    document,
    organization,
    token: createDealShareToken(deal),
    user,
  };
}

async function load(token: string) {
  const request = new Request(`http://localhost:3000/d/${token}`);
  const params = { token };
  return await loader({
    context: await createTestContextProvider({ params, pattern, request }),
    params,
    request,
    unstable_pattern: pattern,
  });
}

async function act(token: string, body: Record<string, string>) {
  const request = new Request(`http://localhost:3000/d/${token}`, {
    body: toFormData(body),
    headers: { "user-agent": "vitest", "x-forwarded-for": "198.51.100.4" },
    method: "POST",
  });
  const params = { token };
  return await action({
    context: await createTestContextProvider({ params, pattern, request }),
    params,
    request,
    unstable_pattern: pattern,
  });
}

function currentVersion(documentId: string) {
  return prisma.dealDocumentVersion.findFirstOrThrow({
    where: { dealDocumentId: documentId, state: "current" },
  });
}

describe("deal room (/d/:token)", () => {
  test("given: a valid link, should: show the sent estimate and tell the business it was viewed", async () => {
    const { token, document, organization } = await setupSentDeal();

    const response = await load(token);

    expect(response.init?.headers).toMatchObject({
      "X-Robots-Tag": "noindex, nofollow",
    });
    const room = response.data.room;
    expect(room.title).toEqual("Brand refresh");
    expect(room.steps[0]?.document).toMatchObject({
      id: document.id,
      number: "EST-0001",
      status: "viewed",
    });
    const notification = await prisma.notification.findFirst({
      where: { organizationId: organization.id },
    });
    expect(notification?.content).toMatchObject({
      text: expect.stringContaining("viewed Estimate EST-0001"),
    });
  });

  test("given: a draft the business hasn't sent, should: keep it hidden", async () => {
    const { token } = await setupSentDeal({ send: false });

    const response = await load(token);

    expect(response.data.room.steps[0]).toMatchObject({
      document: null,
      preparing: true,
    });
  });

  test("given: a forged or reset link, should: throw a 404", async () => {
    expect.assertions(2);
    const { token, deal, organization, user } = await setupSentDeal();

    try {
      await load(`${deal.id}.forged`);
    } catch (error) {
      expect(error).toMatchObject({ init: { status: 404 } });
    }
    await resetDealShareLink({
      actor: { party: "business", userId: user.id },
      dealId: deal.id,
      organizationId: organization.id,
    });
    try {
      await load(token);
    } catch (error) {
      expect(error).toMatchObject({ init: { status: 404 } });
    }
  });

  test("given: the customer accepts the current version, should: record it and send the deposit invoice", async () => {
    const { token, deal, document } = await setupSentDeal();
    const version = await currentVersion(document.id);

    const response = await act(token, {
      acceptedByName: "Ada Obi",
      agree: "on",
      documentId: document.id,
      intent: ACCEPT_DOCUMENT_INTENT,
      versionId: version.id,
    });

    expect(response).toMatchObject({ data: { ok: true } });
    const documents = await prisma.dealDocument.findMany({
      orderBy: { createdAt: "asc" },
      where: { dealId: deal.id },
    });
    expect(documents.map((d) => [d.type, d.status])).toEqual([
      ["estimate", "accepted"],
      ["invoice", "sent"],
    ]);
    const event = await prisma.dealEvent.findFirstOrThrow({
      where: { dealId: deal.id, type: "documentAccepted" },
    });
    expect(event).toMatchObject({
      actor: "customer",
      ip: "198.51.100.4",
      userAgent: "vitest",
    });
  });

  test("given: an outdated version or no agreement, should: refuse to accept", async () => {
    const { token, document } = await setupSentDeal();
    const version = await currentVersion(document.id);

    const stale = await act(token, {
      acceptedByName: "Ada Obi",
      agree: "on",
      documentId: document.id,
      intent: ACCEPT_DOCUMENT_INTENT,
      versionId: "an-older-version",
    });
    const unticked = await act(token, {
      acceptedByName: "Ada Obi",
      documentId: document.id,
      intent: ACCEPT_DOCUMENT_INTENT,
      versionId: version.id,
    });

    expect(stale).toMatchObject({
      data: { error: "versionChanged" },
      init: { status: 409 },
    });
    expect(unticked).toMatchObject({ init: { status: 400 } });
    expect(
      (
        await prisma.dealDocument.findUniqueOrThrow({
          where: { id: document.id },
        })
      ).status,
    ).toEqual("sent");
  });

  test("given: suggested figures, should: keep the customer's own price, tax and discount", async () => {
    const { token, document, organization, deal, user } = await setupSentDeal();
    const product = await prisma.product.create({
      data: createPopulatedProduct({
        currency: "NGN",
        organizationId: organization.id,
        taxRateBps: 750,
        unitPriceMinor: 200_000,
      }),
    });
    const { organization: other } = await setupUserWithOrgAndAddAsMember();
    const otherProduct = await prisma.product.create({
      data: createPopulatedProduct({
        currency: "NGN",
        organizationId: other.id,
        unitPriceMinor: 1,
      }),
    });

    const response = await act(token, {
      changes: JSON.stringify({
        additions: [
          { productId: product.id, quantity: 2, unitPriceMinor: 150_000 },
          { productId: otherProduct.id, quantity: 5 },
        ],
        lines: {
          "0": { discountBps: 1000, quantity: 8, unitPriceMinor: 900_000 },
          "1": { quantity: 0 },
        },
      }),
      documentId: document.id,
      intent: PROPOSE_CHANGES_INTENT,
      note: "Fewer hours at a better rate, no printing",
    });

    expect(response).toMatchObject({ data: { ok: true } });
    const proposal = await prisma.dealDocumentVersion.findFirstOrThrow({
      where: { dealDocumentId: document.id, state: "proposed" },
    });
    // Design: 8 × 9,000.00 = 72,000.00, less 10% = 64,800.00.
    // Added product at their 1,500.00: 2 × 1,500.00 = 3,000.00 + 7.5% tax.
    // Another organization's product is ignored.
    expect(proposal).toMatchObject({
      discountMinor: 720_000,
      note: "Fewer hours at a better rate, no printing",
      proposedBy: "customer",
      subtotalMinor: 7_500_000,
      taxMinor: 22_500,
      totalMinor: 6_802_500,
      version: 2,
    });
    expect(proposal.items).toMatchObject([
      { discountBps: 1000, name: "Design", unitPriceMinor: 900_000 },
      { productId: product.id, taxRateBps: 750, unitPriceMinor: 150_000 },
    ]);
    expect(
      (
        await prisma.dealDocument.findUniqueOrThrow({
          where: { id: document.id },
        })
      ).status,
    ).toEqual("changesRequested");

    // The business approves: the suggestion goes back out for acceptance.
    const params = { dealId: deal.id, organizationSlug: organization.slug };
    const request = await createAuthenticatedRequest({
      formData: toFormData({
        intent: APPROVE_PROPOSAL_INTENT,
        versionId: proposal.id,
      }),
      method: "POST",
      url: `http://localhost:3000/organizations/${organization.slug}/deals/${deal.id}`,
      user,
    });
    const dealPattern = "/organizations/:organizationSlug/deals/:dealId";
    await dealAction({
      context: await createOrganizationMembershipTestContextProvider({
        params,
        pattern: dealPattern,
        request,
      }),
      params,
      request,
      unstable_pattern: dealPattern,
    } as never);

    expect((await currentVersion(document.id)).id).toEqual(proposal.id);
    expect(
      (
        await prisma.dealDocument.findUniqueOrThrow({
          where: { id: document.id },
        })
      ).status,
    ).toEqual("sent");
  });

  test("given: a message, should: add it to the conversation as the customer", async () => {
    const { token, deal } = await setupSentDeal();

    await act(token, {
      body: "Can we start next week?",
      intent: POST_MESSAGE_INTENT,
    });

    const message = await prisma.dealMessage.findFirstOrThrow({
      where: { dealId: deal.id },
    });
    expect(message).toMatchObject({
      author: "customer",
      body: "Can we start next week?",
      userId: null,
    });
  });

  test("given: a filled honeypot, should: reject the request", async () => {
    expect.assertions(1);
    const { token } = await setupSentDeal();

    try {
      await act(token, {
        body: "Buy cheap watches",
        intent: POST_MESSAGE_INTENT,
        name__confirm: "spam",
      });
    } catch (error) {
      expect((error as Response).status).toEqual(400);
    }
  });

  test("given: too many requests from one address, should: answer 429", async () => {
    const { token, deal } = await setupSentDeal();
    for (let i = 0; i < DEAL_ROOM_ACTION_LIMIT; i++) {
      consumeRateLimit({
        key: `deal-room:${deal.id}:198.51.100.4`,
        limit: DEAL_ROOM_ACTION_LIMIT,
        windowMs: 10 * 60 * 1000,
      });
    }

    const response = await act(token, {
      body: "Hello?",
      intent: POST_MESSAGE_INTENT,
    });

    expect(response).toMatchObject({ init: { status: 429 } });
  });
});
