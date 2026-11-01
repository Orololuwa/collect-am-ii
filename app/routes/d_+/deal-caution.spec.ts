import { beforeEach, describe, expect, test, vi } from "vitest";

import { action as dealAction } from "../_authenticated-routes+/organizations_+/$organizationSlug+/deals+/$dealId";
import { action, loader } from "./$token";
import { createPopulatedCustomer } from "~/features/customers/customers-factories.server";
import {
  DealTransitionError,
  markCautionRefunded,
  recordDealPayment,
  sendCautionSettlement,
  sendDealDocument,
  startDeal,
} from "~/features/deals/deal-engine.server";
import type { DealLineItem } from "~/features/deals/deal-items";
import { createDealShareToken } from "~/features/deals/deal-share-link.server";
import {
  GIVE_REFUND_ACCOUNT_INTENT,
  MARK_CAUTION_REFUNDED_INTENT,
  SEND_CAUTION_SETTLEMENT_INTENT,
  UPLOAD_CAUTION_EVIDENCE_INTENT,
} from "~/features/deals/deals-constants";
import { WORKFLOW_SAMPLES } from "~/features/workflows/workflow-samples";
import { saveWorkflowWithStepsToDatabase } from "~/features/workflows/workflows-model.server";
import type { UserAccount } from "~/generated/client";
import { auth0Handlers } from "~/test/mocks/handlers/auth0";
import { cloudinaryHandlers } from "~/test/mocks/handlers/cloudinary";
import { resendHandlers } from "~/test/mocks/handlers/resend";
import { readEmail } from "~/test/mocks/utils";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { setupUserWithOrgAndAddAsMember } from "~/test/server-test-utils";
import {
  createAuthenticatedRequest,
  createOrganizationMembershipTestContextProvider,
  createTestContextProvider,
} from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { resetRateLimits } from "~/utils/rate-limit.server";
import { toFormData } from "~/utils/to-form-data";

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

const items: DealLineItem[] = [
  {
    description: "",
    discountBps: 0,
    name: "Two nights, Lekki apartment",
    productId: null,
    quantity: 2,
    taxRateBps: 0,
    unit: "night",
    unitPriceMinor: 8_000_000,
  },
  // The organization adds the caution as a line of its own.
  {
    description: "Refundable after check-out",
    discountBps: 0,
    name: "Caution fee",
    productId: null,
    quantity: 1,
    taxRateBps: 0,
    unit: "item",
    unitPriceMinor: 20_000_000,
  },
];
const CAUTION = 20_000_000;
const REFUND_STEP = 3;

/** A short-let deal paid up to its caution step. */
async function setupStay() {
  const { user, organization } = await setupUserWithOrgAndAddAsMember();
  const customer = await prisma.customer.create({
    data: createPopulatedCustomer({ organizationId: organization.id }),
  });
  const workflow = await saveWorkflowWithStepsToDatabase({
    description: "",
    name: "Short-let",
    organizationId: organization.id,
    sampleKey: "shortLetStay",
    steps: WORKFLOW_SAMPLES.shortLetStay.map(({ stepName, ...settings }) => ({
      ...settings,
      name: stepName,
      templateId: null,
    })),
  });
  const business = { party: "business" as const, userId: user.id };
  const { result: started } = await startDeal({
    actor: business,
    cautionSettleAfter: new Date("2026-11-20T12:00:00Z"),
    currency: "NGN",
    customerId: customer.id,
    items,
    organizationId: organization.id,
    title: "Stay, 18–20 Nov",
    workflowId: workflow.id,
  });
  const target = { dealId: started.id, organizationId: organization.id };
  const invoice = await prisma.dealDocument.findFirstOrThrow({
    where: { dealId: started.id },
  });
  await sendDealDocument({
    ...target,
    actor: business,
    documentId: invoice.id,
  });
  const steps = () =>
    prisma.dealStep.findMany({
      include: { cautionSettlement: true, document: true },
      orderBy: { position: "asc" },
      where: { dealId: started.id },
    });
  const pay = async (position: number) => {
    const step = (await steps())[position];
    await recordDealPayment({
      ...target,
      actor: business,
      method: "bankTransfer",
      reference: "",
      stepId: step?.id ?? "",
    });
  };
  await pay(1);
  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id: started.id },
  });
  return {
    business,
    deal,
    organization,
    steps,
    target,
    token: createDealShareToken(deal),
    user,
  };
}

async function giveAccount(token: string, stepId: string) {
  const request = new Request(`http://localhost:3000/d/${token}`, {
    body: toFormData({
      accountName: "Ada Obi",
      accountNumber: "0123456789",
      bankName: "GTBank",
      intent: GIVE_REFUND_ACCOUNT_INTENT,
      stepId,
    }),
    headers: { "x-forwarded-for": "198.51.100.20" },
    method: "POST",
  });
  const params = { token };
  return await action({
    context: await createTestContextProvider({
      params,
      pattern: "/d/:token",
      request,
    }),
    params,
    request,
    unstable_pattern: "/d/:token",
  });
}

describe("caution fees", () => {
  test("given: a paid booking invoice with a caution line, should: open the refund for the business to fill in", async () => {
    const { deal, steps } = await setupStay();

    const payment = await prisma.payment.findFirstOrThrow({
      where: { dealId: deal.id },
    });
    expect(payment).toMatchObject({ amountMinor: 36_000_000, purpose: "sale" });
    expect(deal.cautionSettleAfter).toEqual(new Date("2026-11-20T12:00:00Z"));

    const refund = (await steps())[REFUND_STEP];
    expect(refund).toMatchObject({ kind: "cautionRefund", status: "active" });
    expect(refund?.cautionSettlement).toMatchObject({
      heldMinor: 0,
      sentAt: null,
    });
  });

  test("given: a deduction, the customer's account and the refund sent, should: settle the caution and win the deal", async () => {
    const { business, deal, steps, target, token } = await setupStay();
    const refund = (await steps())[REFUND_STEP];

    await sendCautionSettlement({
      ...target,
      actor: business,
      heldMinor: CAUTION,
      deductions: [{ amountMinor: 1_500_000, reason: "Broken lamp" }],
      stepId: refund?.id ?? "",
    });
    await expect(
      markCautionRefunded({
        ...target,
        actor: business,
        reference: "",
        stepId: refund?.id ?? "",
      }),
    ).rejects.toThrow(new DealTransitionError("refundAccountMissing"));

    const response = await giveAccount(token, refund?.id ?? "");
    expect(response).toMatchObject({ data: { ok: true } });

    await markCautionRefunded({
      ...target,
      actor: business,
      reference: "TRF-7781",
      stepId: refund?.id ?? "",
    });

    const settlement = await prisma.dealCautionSettlement.findUniqueOrThrow({
      where: { stepId: refund?.id ?? "" },
    });
    expect(settlement).toMatchObject({
      accountName: "Ada Obi",
      accountNumber: "0123456789",
      bankName: "GTBank",
      refundMinor: CAUTION - 1_500_000,
      refundReference: "TRF-7781",
    });
    expect(settlement.refundedAt).not.toBeNull();
    expect(
      await prisma.deal.findUniqueOrThrow({ where: { id: deal.id } }),
    ).toMatchObject({ status: "won" });
    const events = await prisma.dealEvent.findMany({
      orderBy: { createdAt: "asc" },
      where: {
        dealId: deal.id,
        type: {
          in: [
            "cautionSettlementSent",
            "refundAccountGiven",
            "cautionRefunded",
          ],
        },
      },
    });
    expect(events.map((event) => [event.type, event.actor])).toEqual([
      ["cautionSettlementSent", "business"],
      ["refundAccountGiven", "customer"],
      ["cautionRefunded", "business"],
    ]);
  });

  test("given: deductions that keep the whole caution, should: settle at once with nothing to refund", async () => {
    const { business, deal, steps, target } = await setupStay();
    const refund = (await steps())[REFUND_STEP];

    await sendCautionSettlement({
      ...target,
      actor: business,
      heldMinor: CAUTION,
      deductions: [{ amountMinor: CAUTION, reason: "Smoke damage" }],
      stepId: refund?.id ?? "",
    });

    expect(
      await prisma.deal.findUniqueOrThrow({ where: { id: deal.id } }),
    ).toMatchObject({ status: "won" });
  });

  test("given: deductions above the caution, should: refuse them", async () => {
    const { business, steps, target } = await setupStay();
    const refund = (await steps())[REFUND_STEP];

    await expect(
      sendCautionSettlement({
        ...target,
        actor: business,
        heldMinor: CAUTION,
        deductions: [{ amountMinor: CAUTION + 1, reason: "Too much" }],
        stepId: refund?.id ?? "",
      }),
    ).rejects.toThrow(new DealTransitionError("deductionsTooHigh"));
  });

  test("given: no caution held, should: refuse to send the settlement", async () => {
    const { business, steps, target } = await setupStay();
    const refund = (await steps())[REFUND_STEP];

    await expect(
      sendCautionSettlement({
        ...target,
        actor: business,
        deductions: [],
        heldMinor: 0,
        stepId: refund?.id ?? "",
      }),
    ).rejects.toThrow(new DealTransitionError("cautionHeldRequired"));
  });

  test("given: an account before the settlement is sent, should: refuse it", async () => {
    const { steps, token } = await setupStay();
    const refund = (await steps())[REFUND_STEP];

    await giveAccount(token, refund?.id ?? "");

    const settlement = await prisma.dealCautionSettlement.findUniqueOrThrow({
      where: { stepId: refund?.id ?? "" },
    });
    expect(settlement.accountGivenAt).toBeNull();
  });

  async function uploadEvidence({
    user,
    organizationSlug,
    dealId,
    stepId,
    files,
  }: {
    user: UserAccount;
    organizationSlug: string;
    dealId: string;
    stepId: string;
    files: File[];
  }) {
    const formData = new FormData();
    formData.set("intent", UPLOAD_CAUTION_EVIDENCE_INTENT);
    formData.set("stepId", stepId);
    for (const file of files) formData.append("files", file);
    const params = { dealId, organizationSlug };
    const pattern = "/organizations/:organizationSlug/deals/:dealId";
    const request = await createAuthenticatedRequest({
      formData,
      method: "POST",
      url: `http://localhost:3000/organizations/${organizationSlug}/deals/${dealId}`,
      user,
    });
    return (await dealAction({
      context: await createOrganizationMembershipTestContextProvider({
        params,
        pattern,
        request,
      }),
      params,
      request,
      unstable_pattern: pattern,
    } as never)) as unknown as {
      data: {
        error: string | null;
        evidence: Array<{
          id: string;
          kind: string;
          name: string;
          url: string;
        }>;
      };
    };
  }

  describe("caution evidence", () => {
    test("given: a photo and a video, should: store them for the deal and attach them to the deduction", async () => {
      const { business, deal, organization, steps, target, token, user } =
        await setupStay();
      const refund = (await steps())[REFUND_STEP];

      const uploaded = await uploadEvidence({
        dealId: deal.id,
        files: [
          new File(["jpg"], "lamp.jpg", { type: "image/jpeg" }),
          new File(["mp4"], "lamp.mp4", { type: "video/mp4" }),
        ],
        organizationSlug: organization.slug,
        stepId: refund?.id ?? "",
        user,
      });

      expect(uploaded.data.error).toBeNull();
      expect(
        uploaded.data.evidence.map((item) => [item.kind, item.name]),
      ).toEqual([
        ["image", "lamp.jpg"],
        ["video", "lamp.mp4"],
      ]);
      for (const item of uploaded.data.evidence) {
        expect(item.id).toMatch(
          new RegExp(
            `^CollectAm/caution-evidence/${organization.id}/${deal.id}/`,
          ),
        );
        expect(item.url).toContain("/authenticated/");
      }

      await sendCautionSettlement({
        ...target,
        actor: business,
        heldMinor: CAUTION,
        deductions: [
          {
            amountMinor: 1_500_000,
            evidence: [
              ...uploaded.data.evidence.map(({ id, kind, name }) => ({
                id,
                kind: kind as "image" | "video",
                name,
              })),
              // Someone else's file can't be slipped in.
              {
                id: "CollectAm/caution-evidence/other/deal/x",
                kind: "image",
                name: "x.jpg",
              },
            ],
            reason: "Broken lamp",
          },
        ],
        stepId: refund?.id ?? "",
      });

      const params = { token };
      const request = new Request(`http://localhost:3000/d/${token}`);
      const room = (await loader({
        context: await createTestContextProvider({
          params,
          pattern: "/d/:token",
          request,
        }),
        params,
        request,
        unstable_pattern: "/d/:token",
      })) as unknown as {
        data: {
          room: {
            steps: Array<{
              kind: string;
              settlement: {
                deductions: Array<{
                  evidence: Array<{ name: string; url: string }>;
                }>;
              } | null;
            }>;
          };
        };
      };
      const shown = room.data.room.steps.find(
        (step) => step.kind === "cautionRefund",
      );
      expect(
        shown?.settlement?.deductions[0]?.evidence.map((item) => item.name),
      ).toEqual(["lamp.jpg", "lamp.mp4"]);
    });

    test("given: a file that isn't a photo or video, should: refuse it", async () => {
      const { deal, organization, steps, user } = await setupStay();
      const refund = (await steps())[REFUND_STEP];

      const uploaded = await uploadEvidence({
        dealId: deal.id,
        files: [new File(["text"], "notes.txt", { type: "text/plain" })],
        organizationSlug: organization.slug,
        stepId: refund?.id ?? "",
        user,
      });

      expect(uploaded.data).toEqual({ error: "evidenceFile", evidence: [] });
    });
  });

  describe("caution emails", () => {
    async function businessAct({
      user,
      organizationSlug,
      dealId,
      fields,
    }: {
      user: UserAccount;
      organizationSlug: string;
      dealId: string;
      fields: Record<string, string>;
    }) {
      const params = { dealId, organizationSlug };
      const pattern = "/organizations/:organizationSlug/deals/:dealId";
      const request = await createAuthenticatedRequest({
        formData: toFormData(fields),
        method: "POST",
        url: `http://localhost:3000/organizations/${organizationSlug}/deals/${dealId}`,
        user,
      });
      return await dealAction({
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

    test("given: a settlement and then the refund from the deal page, should: email the customer both times", async () => {
      const { deal, organization, steps, token, user } = await setupStay();
      const refund = (await steps())[REFUND_STEP];
      const { email } = await prisma.customer.findUniqueOrThrow({
        where: { id: deal.customerId },
      });

      await businessAct({
        dealId: deal.id,
        fields: {
          deductions: JSON.stringify([
            { amountMinor: 1_500_000, evidence: [], reason: "Broken lamp" },
          ]),
          heldMinor: String(CAUTION),
          intent: SEND_CAUTION_SETTLEMENT_INTENT,
          stepId: refund?.id ?? "",
        },
        organizationSlug: organization.slug,
        user,
      });
      const settlementEmail = await readEmail(email);
      expect(settlementEmail?.subject).toContain("where should");
      expect(settlementEmail?.text).toContain("Broken lamp");

      await giveAccount(token, refund?.id ?? "");
      await businessAct({
        dealId: deal.id,
        fields: {
          intent: MARK_CAUTION_REFUNDED_INTENT,
          reference: "TRF-7781",
          stepId: refund?.id ?? "",
        },
        organizationSlug: organization.slug,
        user,
      });
      const refundEmail = await readEmail(email);
      expect(refundEmail?.subject).toContain("sent your caution refund");
      expect(refundEmail?.text).toContain("TRF-7781");
    });
  });
});
