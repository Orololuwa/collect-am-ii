import { beforeEach, describe, expect, test, vi } from "vitest";

import { action } from "./$token";
import { createPopulatedCustomer } from "~/features/customers/customers-factories.server";
import {
  sendDealDocument,
  startDeal,
} from "~/features/deals/deal-engine.server";
import type { DealLineItem } from "~/features/deals/deal-items";
import { createDealShareToken } from "~/features/deals/deal-share-link.server";
import {
  ACCEPT_DOCUMENT_INTENT,
  PROPOSE_CHANGES_INTENT,
} from "~/features/deals/deals-constants";
import { WORKFLOW_SAMPLES } from "~/features/workflows/workflow-samples";
import { saveWorkflowWithStepsToDatabase } from "~/features/workflows/workflows-model.server";
import { auth0Handlers } from "~/test/mocks/handlers/auth0";
import { cloudinaryHandlers } from "~/test/mocks/handlers/cloudinary";
import { resendHandlers } from "~/test/mocks/handlers/resend";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { setupUserWithOrgAndAddAsMember } from "~/test/server-test-utils";
import { createTestContextProvider } from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { resetRateLimits } from "~/utils/rate-limit.server";

vi.mock("~/features/templates/shared/utils/pdf-generator.server", () => ({
  generatePDF: vi.fn().mockResolvedValue(Buffer.from("mock-pdf-content")),
}));

setupMockServerLifecycle(
  ...auth0Handlers,
  ...resendHandlers,
  ...cloudinaryHandlers,
);

beforeEach(() => {
  resetRateLimits();
});

const pattern = "/d/:token";

const items: DealLineItem[] = [
  {
    description: "",
    discountBps: 0,
    name: "Office chairs",
    productId: null,
    quantity: 20,
    taxRateBps: 750,
    unit: "chair",
    unitPriceMinor: 8_500_000,
  },
];

/** A deal on a sample workflow, its first document sent to the customer. */
async function setupQuotedDeal(
  sampleKey: "purchaseOrderSupply" | "retailOrder" = "purchaseOrderSupply",
) {
  const { user, organization } = await setupUserWithOrgAndAddAsMember();
  const customer = await prisma.customer.create({
    data: createPopulatedCustomer({ organizationId: organization.id }),
  });
  const workflow = await saveWorkflowWithStepsToDatabase({
    description: "",
    name: "Supplying businesses",
    organizationId: organization.id,
    sampleKey,
    steps: WORKFLOW_SAMPLES[sampleKey].map(({ stepName, ...settings }) => ({
      ...settings,
      name: stepName,
      templateId: null,
    })),
  });
  const business = { party: "business" as const, userId: user.id };
  const { result: started } = await startDeal({
    actor: business,
    currency: "NGN",
    customerId: customer.id,
    items,
    organizationId: organization.id,
    title: "Office fit-out",
    workflowId: workflow.id,
  });
  const quote = await prisma.dealDocument.findFirstOrThrow({
    where: { dealId: started.id },
  });
  await sendDealDocument({
    actor: business,
    dealId: started.id,
    documentId: quote.id,
    organizationId: organization.id,
  });
  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id: started.id },
  });
  const version = await prisma.dealDocumentVersion.findFirstOrThrow({
    where: { dealDocumentId: quote.id, state: "current" },
  });
  return { deal, quote, token: createDealShareToken(deal), version };
}

async function accept(
  token: string,
  fields: Record<string, string>,
  file?: File,
) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    body.set(key, value);
  }
  if (file) {
    body.set("purchaseOrderFile", file);
  }
  const request = new Request(`http://localhost:3000/d/${token}`, {
    body,
    headers: { "user-agent": "vitest", "x-forwarded-for": "198.51.100.9" },
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

describe("purchase orders on the share link", () => {
  test("given: a step that asks for a PO and none given, should: refuse to accept", async () => {
    const { token, quote, version } = await setupQuotedDeal();

    await accept(token, {
      acceptedByName: "Ada Obi",
      agree: "on",
      documentId: quote.id,
      intent: ACCEPT_DOCUMENT_INTENT,
      versionId: version.id,
    });

    const stored = await prisma.dealDocument.findUniqueOrThrow({
      where: { id: quote.id },
    });
    expect(stored.status).toEqual("sent");
  });

  test("given: a PO number and file, should: store them and quote the number on the next document", async () => {
    const { token, deal, quote, version } = await setupQuotedDeal();

    const response = await accept(
      token,
      {
        acceptedByName: "Ada Obi",
        agree: "on",
        documentId: quote.id,
        intent: ACCEPT_DOCUMENT_INTENT,
        purchaseOrderNumber: " PO-77812 ",
        versionId: version.id,
      },
      new File(["%PDF-1.4 order"], "PO-77812.pdf", {
        type: "application/pdf",
      }),
    );

    expect(response).toMatchObject({ data: { ok: true } });
    const stored = await prisma.deal.findUniqueOrThrow({
      where: { id: deal.id },
    });
    expect(stored).toMatchObject({
      purchaseOrderFileName: "PO-77812.pdf",
      purchaseOrderNumber: "PO-77812",
    });
    expect(stored.purchaseOrderFileId).toMatch(
      new RegExp(`^CollectAm/purchase-orders/${deal.organizationId}/`),
    );
    expect(
      await prisma.dealEvent.findFirstOrThrow({
        where: { dealId: deal.id, type: "purchaseOrderReceived" },
      }),
    ).toMatchObject({
      actor: "customer",
      payload: { fileName: "PO-77812.pdf", number: "PO-77812" },
    });

    // The order confirmation goes out on its own, quoting their PO.
    const confirmation = await prisma.dealDocument.findFirstOrThrow({
      include: { versions: true },
      where: { dealId: deal.id, type: "orderConfirmation" },
    });
    expect(confirmation.status).toEqual("sent");
    const header = (
      confirmation.versions[0]?.sections as Array<{
        type: string;
        data: Record<string, unknown>;
      }>
    ).find((section) => section.type === "order-confirmation-header");
    expect(header?.data.customerPoNumber).toEqual("PO-77812");
  });

  test("given: a PO number without a file, should: accept and keep just the number", async () => {
    const { token, deal, quote, version } = await setupQuotedDeal();

    await accept(token, {
      acceptedByName: "Ada Obi",
      agree: "on",
      documentId: quote.id,
      intent: ACCEPT_DOCUMENT_INTENT,
      purchaseOrderNumber: "4500012345",
      versionId: version.id,
    });

    expect(
      await prisma.deal.findUniqueOrThrow({ where: { id: deal.id } }),
    ).toMatchObject({
      purchaseOrderFileId: null,
      purchaseOrderFileName: "",
      purchaseOrderNumber: "4500012345",
    });
  });

  describe("negotiable steps on the share link", () => {
    // Samples start with negotiation off.
    test("given: a step that isn't negotiable, should: refuse suggested changes", async () => {
      const { token, quote, version } = await setupQuotedDeal("retailOrder");

      await accept(token, {
        changes: JSON.stringify({
          additions: [],
          lines: { "0": { quantity: 5 } },
        }),
        documentId: quote.id,
        intent: PROPOSE_CHANGES_INTENT,
        note: "",
        versionId: version.id,
      });

      expect(
        await prisma.dealDocumentVersion.count({
          where: { dealDocumentId: quote.id, state: "proposed" },
        }),
      ).toEqual(0);
    });
  });
});
