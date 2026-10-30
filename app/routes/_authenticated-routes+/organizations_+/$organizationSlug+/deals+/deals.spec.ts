import { describe, expect, test, vi } from "vitest";

import { action as dealAction, loader as dealLoader } from "./$dealId";
import { action as newDealAction } from "./new";
import { createPopulatedCustomer } from "~/features/customers/customers-factories.server";
import type { DealLineItem } from "~/features/deals/deal-items";
import {
  ACCEPT_DOCUMENT_INTENT,
  CLOSE_DEAL_INTENT,
  RECORD_PAYMENT_INTENT,
  REVISE_DOCUMENT_INTENT,
  SEND_DOCUMENT_INTENT,
  START_DEAL_INTENT,
} from "~/features/deals/deals-constants";
import type { WorkflowSampleKey } from "~/features/workflows/workflow-samples";
import { WORKFLOW_SAMPLES } from "~/features/workflows/workflow-samples";
import { saveWorkflowWithStepsToDatabase } from "~/features/workflows/workflows-model.server";
import type { Organization, UserAccount } from "~/generated/client";
import { auth0Handlers } from "~/test/mocks/handlers/auth0";
import { resendHandlers } from "~/test/mocks/handlers/resend";
import { readEmail } from "~/test/mocks/utils";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { setupUserWithOrgAndAddAsMember } from "~/test/server-test-utils";
import {
  createAuthenticatedRequest,
  createOrganizationMembershipTestContextProvider,
} from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { toFormData } from "~/utils/to-form-data";

vi.mock("~/features/templates/shared/utils/pdf-generator.server", () => ({
  generatePDF: vi.fn().mockResolvedValue(Buffer.from("mock-pdf-content")),
}));

setupMockServerLifecycle(...auth0Handlers, ...resendHandlers);

const dealPattern = "/organizations/:organizationSlug/deals/:dealId";

const items: DealLineItem[] = [
  {
    description: "",
    discountBps: 0,
    name: "Kitchen fit-out",
    productId: null,
    quantity: 1,
    taxRateBps: 0,
    unit: "job",
    unitPriceMinor: 100_000_000,
  },
  {
    description: "Per hour",
    discountBps: 0,
    name: "Site visits",
    productId: null,
    quantity: 4,
    taxRateBps: 750,
    unit: "hour",
    unitPriceMinor: 2_500_000,
  },
];
// 1,000,000.00 + 100,000.00 + 7.5% of 100,000.00
const total = 100_000_000 + 10_000_000 + 750_000;

async function setup(sampleKey: WorkflowSampleKey = "servicesDeposit") {
  const { user, organization } = await setupUserWithOrgAndAddAsMember();
  const customer = await prisma.customer.create({
    data: createPopulatedCustomer({ organizationId: organization.id }),
  });
  const workflow = await saveWorkflowWithStepsToDatabase({
    description: "",
    name: "Services with deposit",
    organizationId: organization.id,
    sampleKey,
    steps: WORKFLOW_SAMPLES[sampleKey].map(({ stepName, ...settings }) => ({
      ...settings,
      name: stepName,
      templateId: null,
    })),
  });
  return { customer, organization, user, workflow };
}

async function call<T>(
  handler: (args: never) => Promise<T>,
  {
    user,
    organization,
    dealId,
    formData,
  }: {
    user: UserAccount;
    organization: Organization;
    dealId?: string;
    formData?: Record<string, string>;
  },
) {
  const params: Record<string, string> = {
    organizationSlug: organization.slug,
    ...(dealId ? { dealId } : {}),
  };
  const url = `http://localhost:3000/organizations/${organization.slug}/deals/${dealId ?? "new"}`;
  const request = await createAuthenticatedRequest({
    formData: formData ? toFormData(formData) : undefined,
    method: formData ? "POST" : "GET",
    url,
    user,
  });
  const pattern = dealId
    ? dealPattern
    : "/organizations/:organizationSlug/deals/new";
  return await handler({
    context: await createOrganizationMembershipTestContextProvider({
      params,
      pattern,
      request,
    }),
    params,
    request,
    unstable_pattern: pattern,
  } as never);
}

async function startDeal(context: Awaited<ReturnType<typeof setup>>) {
  const response = (await call(newDealAction, {
    ...context,
    formData: {
      currency: "NGN",
      customerId: context.customer.id,
      intent: START_DEAL_INTENT,
      items: JSON.stringify(items),
      title: "Kitchen for Ada",
      workflowId: context.workflow.id,
    },
  })) as Response;
  const deal = await prisma.deal.findFirstOrThrow({
    where: { organizationId: context.organization.id },
  });
  return { deal, response };
}

function loadDeal(dealId: string) {
  return prisma.deal.findUniqueOrThrow({
    include: {
      events: { orderBy: { createdAt: "asc" } },
      steps: {
        include: {
          document: { include: { versions: { orderBy: { version: "asc" } } } },
        },
        orderBy: { position: "asc" },
      },
    },
    where: { id: dealId },
  });
}

describe("deals", () => {
  test("given: a workflow and customer, should: start the deal with a draft first document", async () => {
    const context = await setup();
    const { deal, response } = await startDeal(context);

    expect(response.status).toEqual(302);
    expect(response.headers.get("Location")).toEqual(
      `/organizations/${context.organization.slug}/deals/${deal.id}`,
    );
    const loaded = await loadDeal(deal.id);
    expect(loaded).toMatchObject({
      currency: "NGN",
      status: "open",
      title: "Kitchen for Ada",
      workflowName: "Services with deposit",
    });
    expect(loaded.steps.map((step) => [step.kind, step.status])).toEqual([
      ["document", "active"],
      ["document", "pending"],
      ["payment", "pending"],
      ["receipt", "pending"],
      ["document", "pending"],
      ["payment", "pending"],
      ["receipt", "pending"],
    ]);
    const first = loaded.steps[0]?.document;
    expect(first).toMatchObject({
      number: null,
      status: "draft",
      type: "estimate",
    });
    expect(first?.versions).toHaveLength(1);
    expect(first?.versions[0]).toMatchObject({
      proposedBy: "business",
      state: "current",
      subtotalMinor: 110_000_000,
      taxMinor: 750_000,
      totalMinor: total,
    });
    expect(loaded.events.map((event) => event.type)).toEqual([
      "dealCreated",
      "documentPrepared",
    ]);
  });

  // Walks seven steps, so it gets more time than the default.
  test(
    "given: the services workflow, should: run from estimate to final invoice",
    { timeout: 30_000 },
    async () => {
      const context = await setup();
      const { deal } = await startDeal(context);
      const estimate = (await loadDeal(deal.id)).steps[0]?.document;

      // Send the estimate: numbered, snapshotted and emailed.
      const sent = await call(dealAction, {
        ...context,
        dealId: deal.id,
        formData: {
          documentId: estimate?.id ?? "",
          intent: SEND_DOCUMENT_INTENT,
        },
      });
      expect(sent).toMatchObject({ data: { ok: true } });
      let loaded = await loadDeal(deal.id);
      expect(loaded.steps[0]?.document).toMatchObject({
        number: "EST-0001",
        status: "sent",
      });
      expect(loaded.steps[0]?.document?.versions[0]?.sections).not.toBeNull();
      const email = await readEmail(context.customer.email);
      expect(email?.subject).toContain("Estimate EST-0001");

      // The customer accepts: the deposit invoice is sent automatically.
      await call(dealAction, {
        ...context,
        dealId: deal.id,
        formData: {
          acceptedByName: "Ada Obi",
          documentId: estimate?.id ?? "",
          intent: ACCEPT_DOCUMENT_INTENT,
        },
      });
      loaded = await loadDeal(deal.id);
      expect(loaded.steps[0]).toMatchObject({ status: "done" });
      expect(loaded.steps[0]?.document).toMatchObject({
        acceptedByName: "Ada Obi",
        status: "accepted",
      });
      expect(loaded.steps[1]?.document).toMatchObject({
        number: "INV-0001",
        status: "sent",
      });
      expect(loaded.steps[1]?.document?.versions[0]?.totalMinor).toEqual(
        Math.round(total / 2),
      );
      expect(loaded.steps[2]).toMatchObject({
        amountDueMinor: Math.round(total / 2),
        status: "active",
      });

      // The deposit comes in: receipt issued, final invoice prepared for the rest.
      await call(dealAction, {
        ...context,
        dealId: deal.id,
        formData: {
          intent: RECORD_PAYMENT_INTENT,
          method: "bankTransfer",
          reference: "TRF-1",
          stepId: loaded.steps[2]?.id ?? "",
        },
      });
      loaded = await loadDeal(deal.id);
      expect(loaded.steps[2]).toMatchObject({
        amountPaidMinor: Math.round(total / 2),
        paymentReference: "TRF-1",
        status: "done",
      });
      expect(loaded.steps[3]?.document).toMatchObject({
        number: "RCP-0001",
        status: "sent",
        type: "receipt",
      });
      expect(loaded.steps[4]).toMatchObject({ status: "active" });
      expect(loaded.steps[4]?.document).toMatchObject({
        status: "draft",
        type: "invoice",
      });
      expect(loaded.steps[4]?.document?.versions[0]?.totalMinor).toEqual(
        total - Math.round(total / 2),
      );
    },
  );

  test("given: a sent document, should: revise it into a new draft version", async () => {
    const context = await setup();
    const { deal } = await startDeal(context);
    const documentId = (await loadDeal(deal.id)).steps[0]?.document?.id ?? "";
    await call(dealAction, {
      ...context,
      dealId: deal.id,
      formData: { documentId, intent: SEND_DOCUMENT_INTENT },
    });

    await call(dealAction, {
      ...context,
      dealId: deal.id,
      formData: {
        documentId,
        intent: REVISE_DOCUMENT_INTENT,
        items: JSON.stringify(items.slice(0, 1)),
        note: "Dropped the site visits",
      },
    });

    const document = (await loadDeal(deal.id)).steps[0]?.document;
    expect(document).toMatchObject({ number: "EST-0001", status: "draft" });
    expect(
      document?.versions.map((version) => [version.version, version.state]),
    ).toEqual([
      [1, "superseded"],
      [2, "current"],
    ]);
    expect(document?.versions[1]).toMatchObject({
      note: "Dropped the site visits",
      totalMinor: 100_000_000,
    });
  });

  test("given: a draft, should: refuse to record acceptance", async () => {
    const context = await setup();
    const { deal } = await startDeal(context);
    const documentId = (await loadDeal(deal.id)).steps[0]?.document?.id ?? "";

    const response = await call(dealAction, {
      ...context,
      dealId: deal.id,
      formData: {
        acceptedByName: "Ada",
        documentId,
        intent: ACCEPT_DOCUMENT_INTENT,
      },
    });

    expect(response).toMatchObject({
      data: { error: "documentNotAwaitingAnswer" },
      init: { status: 409 },
    });
  });

  test("given: an open deal, should: close it as lost and refuse further changes", async () => {
    const context = await setup();
    const { deal } = await startDeal(context);
    const documentId = (await loadDeal(deal.id)).steps[0]?.document?.id ?? "";

    await call(dealAction, {
      ...context,
      dealId: deal.id,
      formData: { intent: CLOSE_DEAL_INTENT, status: "lost" },
    });
    const response = await call(dealAction, {
      ...context,
      dealId: deal.id,
      formData: { documentId, intent: SEND_DOCUMENT_INTENT },
    });

    expect((await loadDeal(deal.id)).status).toEqual("lost");
    expect(response).toMatchObject({
      data: { error: "dealClosed" },
      init: { status: 409 },
    });
  });

  test("given: another organization's customer, should: return a field error", async () => {
    const context = await setup();
    const other = await setup();

    const response = await call(newDealAction, {
      ...context,
      formData: {
        currency: "NGN",
        customerId: other.customer.id,
        intent: START_DEAL_INTENT,
        items: JSON.stringify(items),
        title: "Not mine",
        workflowId: context.workflow.id,
      },
    });

    expect(response).toMatchObject({ init: { status: 400 } });
    expect(
      await prisma.deal.count({
        where: { organizationId: context.organization.id },
      }),
    ).toEqual(0);
  });

  test("given: another organization's deal, should: throw a 404", async () => {
    expect.assertions(1);
    const context = await setup();
    const other = await setup();
    const { deal } = await startDeal(other);

    try {
      await call(dealLoader, { ...context, dealId: deal.id });
    } catch (error) {
      expect(error).toMatchObject({ init: { status: 404 } });
    }
  });
});
