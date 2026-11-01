import { createId } from "@paralleldrive/cuid2";

import type { CautionDeduction } from "./deal-caution";
import { cautionEvidenceFolder } from "./deal-caution";
import type { DealDocumentType } from "./deal-documents";
import { formatDocumentNumber, paymentMethodName } from "./deal-documents";
import type { DealLineItem } from "./deal-items";
import {
  calculateDealTotals,
  parseDealItems,
  percentOfMinor,
} from "./deal-items";
import type { DealEventType } from "./deals-constants";
import {
  buildDocumentGlobalStyles,
  buildDocumentSections,
  resolveDocumentTemplate,
} from "./document-mapping.server";
import type {
  DealDocument,
  DealDocumentVersion,
  DealParty,
  DealStep,
  Prisma,
} from "~/generated/client";
import { prisma } from "~/utils/database.server";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type DealErrorCode =
  | "dealNotFound"
  | "dealClosed"
  | "workflowNotFound"
  | "customerNotFound"
  | "notCurrentStep"
  | "documentNotDraft"
  | "documentNotSent"
  | "documentNotAwaitingAnswer"
  | "documentAccepted"
  | "notPaymentStep"
  | "versionChanged"
  | "proposalNotFound"
  | "noItems"
  | "purchaseOrderRequired"
  | "changesNotAllowed"
  | "cautionAmountRequired"
  | "notCautionRefundStep"
  | "deductionsTooHigh"
  | "refundAccountMissing";

/** A transition that isn't allowed in the deal's current state. */
export class DealTransitionError extends Error {
  constructor(readonly code: DealErrorCode) {
    super(code);
    this.name = "DealTransitionError";
  }
}

export type Actor = {
  party: DealParty;
  userId: string | null;
  ip?: string;
  userAgent?: string;
};

/** Work to do once the transaction has committed. */
export type DealEffects = {
  /** Documents to email to the customer, with the email's idempotency key. */
  emails: Array<{ documentId: string; idempotencyKey?: string }>;
  /** Caution settlement updates to email to the customer. */
  notices: Array<{
    kind: "cautionSettlement" | "cautionRefunded";
    stepId: string;
  }>;
};

type DocumentWithVersions = DealDocument & { versions: DealDocumentVersion[] };
type StepWithDocument = DealStep & { document: DocumentWithVersions | null };

async function recordEvent(
  tx: Tx,
  dealId: string,
  type: DealEventType,
  actor: Actor,
  details: { documentId?: string; payload?: Prisma.InputJsonValue } = {},
) {
  await tx.dealEvent.create({
    data: {
      actor: actor.party,
      dealId,
      documentId: details.documentId,
      ip: actor.ip ?? "",
      payload: details.payload ?? {},
      type,
      userAgent: actor.userAgent?.slice(0, 500) ?? "",
      userId: actor.userId,
    },
  });
}

/** The version a document stands on: the accepted one, else the current one. */
export function finalVersion(document: DocumentWithVersions) {
  return (
    document.versions.find(
      (version) => version.id === document.acceptedVersionId,
    ) ?? document.versions.find((version) => version.state === "current")
  );
}

/**
 * Loads an open deal of the organization and locks it, so two transitions on
 * the same deal run one after the other.
 */
async function loadDealForUpdate(
  tx: Tx,
  organizationId: string,
  dealId: string,
) {
  await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${dealId} FOR UPDATE`;
  const deal = await tx.deal.findFirst({
    include: {
      customer: true,
      organization: {
        select: { billingEmail: true, imageUrl: true, name: true },
      },
      steps: {
        include: {
          document: { include: { versions: { orderBy: { version: "asc" } } } },
        },
        orderBy: { position: "asc" },
      },
    },
    where: { id: dealId, organizationId },
  });
  if (!deal) {
    throw new DealTransitionError("dealNotFound");
  }
  return deal;
}

type LoadedDeal = Awaited<ReturnType<typeof loadDealForUpdate>>;

function activeStep(deal: LoadedDeal) {
  if (deal.status !== "open") {
    throw new DealTransitionError("dealClosed");
  }
  const step = deal.steps.find((candidate) => candidate.status === "active");
  if (!step) {
    throw new DealTransitionError("notCurrentStep");
  }
  return step;
}

function activeDocument(deal: LoadedDeal, documentId: string) {
  const step = activeStep(deal);
  if (!step.document || step.document.id !== documentId) {
    throw new DealTransitionError("notCurrentStep");
  }
  return { document: step.document, step };
}

/** The latest earlier step whose document lists items (not a deposit or balance). */
function baseStepBefore(steps: StepWithDocument[], position: number) {
  return steps
    .filter(
      (step) =>
        step.position < position &&
        step.kind === "document" &&
        step.carryForward === "items" &&
        step.document,
    )
    .at(-1);
}

/** The latest earlier document of any kind except receipts. */
function documentBefore(steps: StepWithDocument[], position: number) {
  return steps
    .filter(
      (step) =>
        step.position < position && step.kind === "document" && step.document,
    )
    .at(-1)?.document;
}

function itemsOf(document: DocumentWithVersions | null | undefined) {
  const version = document ? finalVersion(document) : undefined;
  return version ? parseDealItems(version.items) : [];
}

function totalOf(document: DocumentWithVersions | null | undefined) {
  const version = document ? finalVersion(document) : undefined;
  return version?.totalMinor ?? 0;
}

function referenceOf(document: DocumentWithVersions | undefined) {
  return document?.number ? `For ${document.number}` : "";
}

/** The lines a step's document starts with. */
function buildStepItems(
  deal: LoadedDeal,
  step: StepWithDocument,
  initialItems: DealLineItem[] | undefined,
): DealLineItem[] {
  if (step.kind === "receipt") {
    const payment = deal.steps.find(
      (candidate) => candidate.position === step.position - 1,
    );
    if (payment?.kind === "caution") {
      return [
        {
          description: "Held until the booking is settled",
          discountBps: 0,
          name: "Caution fee (refundable)",
          productId: null,
          quantity: 1,
          taxRateBps: 0,
          unit: "item",
          unitPriceMinor: payment.amountPaidMinor ?? 0,
        },
      ];
    }
    return itemsOf(documentBefore(deal.steps, payment?.position ?? 0));
  }
  if (step.position === 0) {
    return initialItems ?? [];
  }

  const baseStep = baseStepBefore(deal.steps, step.position);
  const base = baseStep?.document ?? undefined;
  if (step.carryForward === "items") {
    return itemsOf(base);
  }

  const baseTotal = totalOf(base);
  const amountMinor =
    step.carryForward === "deposit"
      ? percentOfMinor(baseTotal, step.depositPercentBps ?? 0)
      : Math.max(
          0,
          baseTotal -
            deal.steps
              .filter(
                (candidate) =>
                  candidate.kind === "payment" &&
                  candidate.position > (baseStep?.position ?? -1),
              )
              .reduce(
                (sum, candidate) => sum + (candidate.amountPaidMinor ?? 0),
                0,
              ),
        );
  const percent = (step.depositPercentBps ?? 0) / 100;
  return [
    {
      description: referenceOf(base),
      discountBps: 0,
      name:
        step.carryForward === "deposit" ? `Deposit (${percent}%)` : "Balance",
      productId: null,
      quantity: 1,
      taxRateBps: 0,
      unit: "item",
      unitPriceMinor: amountMinor,
    },
  ];
}

function versionTotals(items: DealLineItem[]) {
  const totals = calculateDealTotals(items);
  return {
    items: items as unknown as Prisma.InputJsonValue,
    discountMinor: totals.discountMinor,
    subtotalMinor: totals.subtotalMinor,
    taxMinor: totals.taxMinor,
    totalMinor: totals.totalMinor,
  };
}

async function allocateDocumentNumber(
  tx: Tx,
  organizationId: string,
  type: DealDocumentType,
) {
  const sequence = await tx.documentSequence.upsert({
    create: { next: 2, organizationId, type },
    update: { next: { increment: 1 } },
    where: { organizationId_type: { organizationId, type } },
  });
  return formatDocumentNumber(type, sequence.next - 1);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function dueDateFor(step: DealStep, issuedAt: Date) {
  if (step.validityDays !== null) {
    return addDays(issuedAt, step.validityDays);
  }
  if (step.paymentTermsDays !== null) {
    return addDays(issuedAt, step.paymentTermsDays);
  }
  return null;
}

async function reload(tx: Tx, deal: LoadedDeal) {
  return await loadDealForUpdate(tx, deal.organizationId, deal.id);
}

async function completeStep(
  tx: Tx,
  deal: LoadedDeal,
  stepId: string,
  actor: Actor,
  effects: DealEffects,
) {
  const step = await tx.dealStep.update({
    data: { completedAt: new Date(), status: "done" },
    where: { id: stepId },
  });
  const next = (await reload(tx, deal)).steps.find(
    (candidate) => candidate.position === step.position + 1,
  );
  if (next) {
    await activateStep(tx, deal, next.id, actor, effects);
    return;
  }
  await tx.deal.update({
    data: { closedAt: new Date(), status: "won" },
    where: { id: deal.id },
  });
  await recordEvent(tx, deal.id, "dealWon", { party: "system", userId: null });
}

async function sendDocumentInTransaction(
  tx: Tx,
  deal: LoadedDeal,
  stepId: string,
  actor: Actor,
  effects: DealEffects,
) {
  const fresh = await reload(tx, deal);
  const step = fresh.steps.find((candidate) => candidate.id === stepId);
  const document = step?.document;
  const version = document
    ? document.versions.find((candidate) => candidate.state === "current")
    : undefined;
  if (!step || !document || !version) {
    throw new DealTransitionError("notCurrentStep");
  }
  if (document.status !== "draft") {
    throw new DealTransitionError("documentNotDraft");
  }

  const type = document.type as DealDocumentType;
  const number =
    document.number ??
    (await allocateDocumentNumber(tx, fresh.organizationId, type));
  const issuedAt = document.issuedAt ?? new Date();
  const dueAt = document.dueAt ?? dueDateFor(step, issuedAt);
  const paymentStep = fresh.steps.find(
    (candidate) => candidate.position === step.position - 1,
  );

  const template = await resolveDocumentTemplate({
    organizationId: fresh.organizationId,
    templateId: step.templateId,
    type,
  });
  const items = parseDealItems(version.items);
  const sections = buildDocumentSections({
    content: {
      currency: fresh.currency,
      dueAt,
      issuedAt,
      items,
      number,
      payment:
        type === "receipt" && paymentStep
          ? {
              method: paymentMethodName(paymentStep.paymentMethod),
              reference: paymentStep.paymentReference,
            }
          : undefined,
      paymentTermsDays: step.paymentTermsDays,
      purchaseOrderNumber: fresh.purchaseOrderNumber,
      totals: calculateDealTotals(items),
      type,
    },
    parties: { customer: fresh.customer, organization: fresh.organization },
    template,
  });

  await tx.dealDocumentVersion.update({
    data: {
      colorPalette: template.colorPalette,
      globalStyles: buildDocumentGlobalStyles(template, fresh.currency),
      sections: sections as unknown as Prisma.InputJsonValue,
    },
    where: { id: version.id },
  });
  await tx.dealDocument.update({
    data: { dueAt, issuedAt, number, sentAt: new Date(), status: "sent" },
    where: { id: document.id },
  });
  await recordEvent(tx, fresh.id, "documentSent", actor, {
    documentId: document.id,
    payload: { number, version: version.version },
  });
  effects.emails.push({
    documentId: document.id,
    idempotencyKey: `deal-document-${version.id}`,
  });

  if (!step.requiresAcceptance) {
    await completeStep(tx, fresh, step.id, actor, effects);
  }
}

async function activateStep(
  tx: Tx,
  deal: LoadedDeal,
  stepId: string,
  actor: Actor,
  effects: DealEffects,
  initialItems?: DealLineItem[],
) {
  const fresh = await reload(tx, deal);
  const step = fresh.steps.find((candidate) => candidate.id === stepId);
  if (!step) {
    throw new DealTransitionError("notCurrentStep");
  }

  if (step.kind === "payment" || step.kind === "caution") {
    await tx.dealStep.update({
      data: {
        amountDueMinor:
          step.kind === "caution"
            ? (fresh.cautionAmountMinor ?? 0)
            : totalOf(documentBefore(fresh.steps, step.position)),
        startedAt: new Date(),
        status: "active",
      },
      where: { id: step.id },
    });
    return;
  }

  if (step.kind === "cautionRefund") {
    // Everything held so far starts out as the refund; deductions come later.
    const heldMinor = fresh.steps
      .filter((candidate) => candidate.kind === "caution")
      .reduce((sum, candidate) => sum + (candidate.amountPaidMinor ?? 0), 0);
    await tx.dealStep.update({
      data: { startedAt: new Date(), status: "active" },
      where: { id: step.id },
    });
    await tx.dealCautionSettlement.upsert({
      create: { heldMinor, refundMinor: heldMinor, stepId: step.id },
      update: {},
      where: { stepId: step.id },
    });
    return;
  }

  await tx.dealStep.update({
    data: { startedAt: new Date(), status: "active" },
    where: { id: step.id },
  });
  const document = await tx.dealDocument.create({
    data: {
      dealId: fresh.id,
      stepId: step.id,
      type:
        step.kind === "receipt" ? "receipt" : (step.documentType ?? "quote"),
      versions: {
        create: {
          proposedBy: "business",
          state: "current",
          version: 1,
          ...versionTotals(buildStepItems(fresh, step, initialItems)),
          createdById: actor.party === "business" ? actor.userId : null,
        },
      },
    },
  });
  await recordEvent(tx, fresh.id, "documentPrepared", actor, {
    documentId: document.id,
  });

  // The first step always waits, so the business can check it before sending.
  if (step.advanceMode === "automatic" && step.position > 0) {
    await sendDocumentInTransaction(
      tx,
      fresh,
      step.id,
      { party: "system", userId: null },
      effects,
    );
  }
}

function runTransition<T>(
  work: (tx: Tx, effects: DealEffects) => Promise<T>,
): Promise<{ result: T; effects: DealEffects }> {
  return prisma.$transaction(
    async (tx) => {
      const effects: DealEffects = { emails: [], notices: [] };
      const result = await work(tx, effects);
      return { effects, result };
    },
    { timeout: 20_000 },
  );
}

/** Starts a deal: copies the workflow's steps and prepares the first document. */
export async function startDeal({
  organizationId,
  workflowId,
  customerId,
  title,
  currency,
  items,
  caution,
  actor,
}: {
  organizationId: string;
  workflowId: string;
  customerId: string;
  title: string;
  currency: string;
  items: DealLineItem[];
  /** For workflows that take a caution fee: how much, and when to settle it. */
  caution?: { amountMinor: number; settleAfter: Date | null };
  actor: Actor;
}) {
  return await runTransition(async (tx, effects) => {
    const [workflow, customer] = await Promise.all([
      tx.workflow.findFirst({
        include: { steps: { orderBy: { position: "asc" } } },
        where: { archivedAt: null, id: workflowId, organizationId },
      }),
      tx.customer.findFirst({
        where: { archivedAt: null, id: customerId, organizationId },
      }),
    ]);
    if (!workflow || workflow.steps.length === 0) {
      throw new DealTransitionError("workflowNotFound");
    }
    if (!customer) {
      throw new DealTransitionError("customerNotFound");
    }
    const takesCaution = workflow.steps.some((step) => step.kind === "caution");
    if (takesCaution && !(caution && caution.amountMinor > 0)) {
      throw new DealTransitionError("cautionAmountRequired");
    }

    const deal = await tx.deal.create({
      data: {
        cautionAmountMinor: takesCaution ? caution?.amountMinor : null,
        cautionSettleAfter: takesCaution
          ? (caution?.settleAfter ?? null)
          : null,
        createdById: actor.userId,
        currency,
        customerId,
        organizationId,
        steps: {
          create: workflow.steps.map((step) => ({
            advanceMode: step.advanceMode,
            carryForward: step.carryForward,
            depositPercentBps: step.depositPercentBps,
            documentType: step.documentType,
            kind: step.kind,
            name: step.name,
            paymentTermsDays: step.paymentTermsDays,
            position: step.position,
            negotiable: step.negotiable,
            requestsPurchaseOrder: step.requestsPurchaseOrder,
            requiresAcceptance: step.requiresAcceptance,
            templateId: step.templateId,
            validityDays: step.validityDays,
          })),
        },
        title,
        workflowId,
        workflowName: workflow.name,
      },
      include: { steps: { orderBy: { position: "asc" } } },
    });
    await recordEvent(tx, deal.id, "dealCreated", actor);

    const loaded = await loadDealForUpdate(tx, organizationId, deal.id);
    const [firstStep] = deal.steps;
    if (firstStep) {
      await activateStep(tx, loaded, firstStep.id, actor, effects, items);
    }
    return deal;
  });
}

/** Sends the current step's draft document. */
export async function sendDealDocument({
  organizationId,
  dealId,
  documentId,
  actor,
}: {
  organizationId: string;
  dealId: string;
  documentId: string;
  actor: Actor;
}) {
  return await runTransition(async (tx, effects) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const { step } = activeDocument(deal, documentId);
    await sendDocumentInTransaction(tx, deal, step.id, actor, effects);
  });
}

/** Emails an already-sent document again. */
export async function resendDealDocument({
  organizationId,
  dealId,
  documentId,
  actor,
}: {
  organizationId: string;
  dealId: string;
  documentId: string;
  actor: Actor;
}) {
  return await runTransition(async (tx, effects) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const document = deal.steps.find(
      (step) => step.document?.id === documentId,
    )?.document;
    if (!document) {
      throw new DealTransitionError("dealNotFound");
    }
    if (!document.sentAt || document.status === "draft") {
      throw new DealTransitionError("documentNotSent");
    }
    await recordEvent(tx, deal.id, "documentResent", actor, { documentId });
    effects.emails.push({ documentId });
  });
}

/**
 * Replaces the lines of the current step's document. A draft that was never
 * sent is edited in place; otherwise a new version is added and the document
 * goes back to draft, to be sent again.
 */
export async function reviseDealDocument({
  organizationId,
  dealId,
  documentId,
  items,
  note,
  actor,
}: {
  organizationId: string;
  dealId: string;
  documentId: string;
  items: DealLineItem[];
  note: string;
  actor: Actor;
}) {
  return await runTransition(async (tx) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const { document } = activeDocument(deal, documentId);
    if (document.status === "accepted") {
      throw new DealTransitionError("documentAccepted");
    }
    const current = document.versions.find(
      (version) => version.state === "current",
    );
    const totals = versionTotals(items);

    if (!document.sentAt && current) {
      await tx.dealDocumentVersion.update({
        data: { ...totals, note },
        where: { id: current.id },
      });
      return;
    }

    const version = Math.max(0, ...document.versions.map((v) => v.version)) + 1;
    await tx.dealDocumentVersion.updateMany({
      data: { state: "superseded" },
      where: { dealDocumentId: document.id, state: "current" },
    });
    await tx.dealDocumentVersion.updateMany({
      data: { state: "rejected" },
      where: { dealDocumentId: document.id, state: "proposed" },
    });
    await tx.dealDocumentVersion.create({
      data: {
        ...totals,
        createdById: actor.userId,
        dealDocumentId: document.id,
        note,
        proposedBy: actor.party,
        state: "current",
        version,
      },
    });
    await tx.dealDocument.update({
      data: { declinedAt: null, declineReason: "", status: "draft" },
      where: { id: document.id },
    });
    await recordEvent(tx, deal.id, "documentRevised", actor, {
      documentId: document.id,
      payload: { version },
    });
  });
}

const AWAITING_ANSWER = new Set(["sent", "viewed", "changesRequested"]);

/** Records the customer's acceptance and moves the deal on. */
export async function acceptDealDocument({
  organizationId,
  dealId,
  documentId,
  acceptedByName,
  expectedVersionId,
  purchaseOrder,
  actor,
}: {
  organizationId: string;
  dealId: string;
  documentId: string;
  acceptedByName: string;
  /** The version the customer looked at; refused if it's no longer current. */
  expectedVersionId?: string;
  /**
   * The customer's purchase order. Required from customers when the step asks
   * for it; the business may add one when recording an acceptance.
   */
  purchaseOrder?: {
    number: string;
    fileId: string | null;
    fileName: string;
  };
  actor: Actor;
}) {
  return await runTransition(async (tx, effects) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const { document, step } = activeDocument(deal, documentId);
    const current = document.versions.find(
      (version) => version.state === "current",
    );
    if (!AWAITING_ANSWER.has(document.status) || !current) {
      throw new DealTransitionError("documentNotAwaitingAnswer");
    }
    if (expectedVersionId && expectedVersionId !== current.id) {
      throw new DealTransitionError("versionChanged");
    }
    const poNumber = purchaseOrder?.number.trim() ?? "";
    if (step.requestsPurchaseOrder && actor.party === "customer" && !poNumber) {
      throw new DealTransitionError("purchaseOrderRequired");
    }
    if (poNumber) {
      await tx.deal.update({
        data: {
          purchaseOrderFileId: purchaseOrder?.fileId ?? null,
          purchaseOrderFileName: purchaseOrder?.fileName ?? "",
          purchaseOrderNumber: poNumber,
          purchaseOrderReceivedAt: new Date(),
        },
        where: { id: deal.id },
      });
      await recordEvent(tx, deal.id, "purchaseOrderReceived", actor, {
        documentId: document.id,
        payload: {
          fileName: purchaseOrder?.fileName ?? "",
          number: poNumber,
        },
      });
    }

    await tx.dealDocument.update({
      data: {
        acceptedAt: new Date(),
        acceptedByName,
        acceptedVersionId: current.id,
        status: "accepted",
      },
      where: { id: document.id },
    });
    await tx.dealDocumentVersion.updateMany({
      data: { state: "rejected" },
      where: { dealDocumentId: document.id, state: "proposed" },
    });
    await recordEvent(tx, deal.id, "documentAccepted", actor, {
      documentId: document.id,
      payload: { acceptedByName, version: current.version },
    });
    await completeStep(tx, deal, step.id, actor, effects);
  });
}

/** Records that the customer turned the document down. The deal stays open. */
export async function declineDealDocument({
  organizationId,
  dealId,
  documentId,
  reason,
  actor,
}: {
  organizationId: string;
  dealId: string;
  documentId: string;
  reason: string;
  actor: Actor;
}) {
  return await runTransition(async (tx) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const { document } = activeDocument(deal, documentId);
    if (!AWAITING_ANSWER.has(document.status)) {
      throw new DealTransitionError("documentNotAwaitingAnswer");
    }
    await tx.dealDocument.update({
      data: {
        declinedAt: new Date(),
        declineReason: reason,
        status: "declined",
      },
      where: { id: document.id },
    });
    await recordEvent(tx, deal.id, "documentDeclined", actor, {
      documentId: document.id,
      payload: { reason },
    });
  });
}

/** Records a payment made outside the app (bank transfer, cash, …). */
export async function recordDealPayment({
  organizationId,
  dealId,
  stepId,
  method,
  reference,
  actor,
}: {
  organizationId: string;
  dealId: string;
  stepId: string;
  method: string;
  reference: string;
  actor: Actor;
}) {
  return await runTransition(async (tx, effects) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const step = activeStep(deal);
    if (
      step.id !== stepId ||
      (step.kind !== "payment" && step.kind !== "caution")
    ) {
      throw new DealTransitionError("notPaymentStep");
    }
    const amountMinor = step.amountDueMinor ?? 0;
    // Kept as a payment too, so it counts in the dashboard's totals.
    await tx.payment.create({
      data: {
        amountMinor,
        currency: deal.currency,
        customerEmail: deal.customer.email,
        customerName: deal.customer.name,
        dealId: deal.id,
        dealStepId: step.id,
        items: [
          { description: step.name, quantity: 1, unitPriceMinor: amountMinor },
        ],
        metadata: { method, reference },
        organizationId,
        provider: "manual",
        providerPaymentId: `manual_${step.id}`,
        // Cautions are held for the customer, so they don't count as income.
        purpose: step.kind === "caution" ? "caution" : "sale",
        status: "succeeded",
      },
    });
    await settlePaymentStep(tx, deal, step, {
      actor,
      amountMinor,
      effects,
      method,
      reference,
    });
  });
}

async function settlePaymentStep(
  tx: Tx,
  deal: LoadedDeal,
  step: StepWithDocument,
  {
    amountMinor,
    method,
    reference,
    actor,
    effects,
    online = false,
  }: {
    amountMinor: number;
    method: string;
    reference: string;
    actor: Actor;
    effects: DealEffects;
    online?: boolean;
  },
) {
  await tx.dealStep.update({
    data: {
      amountPaidMinor: amountMinor,
      paidAt: new Date(),
      paymentMethod: method,
      paymentReference: reference,
    },
    where: { id: step.id },
  });
  await recordEvent(tx, deal.id, "paymentRecorded", actor, {
    payload: {
      amountMinor,
      caution: step.kind === "caution",
      method,
      online,
      reference,
    },
  });
  await completeStep(tx, deal, step.id, actor, effects);
}

/**
 * Applies a confirmed online payment to the deal step it was taken for. Does
 * nothing (and says so) when the step was already paid, moved on or the deal
 * was closed, so a repeated webhook can't pay a step twice.
 */
export async function applyOnlinePaymentToDeal({
  paymentId,
}: {
  paymentId: string;
}) {
  const payment = await prisma.payment.findUnique({
    select: {
      amountMinor: true,
      dealId: true,
      dealStepId: true,
      organizationId: true,
      provider: true,
      providerPaymentId: true,
      status: true,
    },
    where: { id: paymentId },
  });
  if (
    !payment?.dealId ||
    !payment.dealStepId ||
    payment.status !== "succeeded"
  ) {
    return {
      applied: false as const,
      effects: { emails: [], notices: [] } as DealEffects,
    };
  }
  const { dealId, dealStepId } = payment;

  const { result: applied, effects } = await runTransition(
    async (tx, effects) => {
      const deal = await loadDealForUpdate(tx, payment.organizationId, dealId);
      const step = deal.steps.find((candidate) => candidate.id === dealStepId);
      if (
        deal.status !== "open" ||
        !step ||
        (step.kind !== "payment" && step.kind !== "caution") ||
        step.status !== "active" ||
        step.paidAt
      ) {
        return false;
      }
      await settlePaymentStep(tx, deal, step, {
        actor: { party: "customer", userId: null },
        amountMinor: payment.amountMinor,
        effects,
        method: payment.provider,
        online: true,
        reference: payment.providerPaymentId,
      });
      return true;
    },
  );
  return { applied, effects };
}

/** Closes an open deal as lost or cancelled. */
export async function closeDeal({
  organizationId,
  dealId,
  status,
  actor,
}: {
  organizationId: string;
  dealId: string;
  status: "lost" | "cancelled";
  actor: Actor;
}) {
  return await runTransition(async (tx) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    if (deal.status !== "open") {
      throw new DealTransitionError("dealClosed");
    }
    await tx.deal.update({
      data: { closedAt: new Date(), status },
      where: { id: deal.id },
    });
    await recordEvent(
      tx,
      deal.id,
      status === "lost" ? "dealLost" : "dealCancelled",
      actor,
    );
  });
}

/** Marks a sent document as seen by the customer, the first time only. */
export async function markDealDocumentViewed({
  organizationId,
  dealId,
  documentId,
  actor,
}: {
  organizationId: string;
  dealId: string;
  documentId: string;
  actor: Actor;
}) {
  return await runTransition(async (tx) => {
    const updated = await tx.dealDocument.updateMany({
      data: { status: "viewed" },
      where: {
        deal: { id: dealId, organizationId },
        id: documentId,
        status: "sent",
      },
    });
    if (updated.count > 0) {
      await recordEvent(tx, dealId, "documentViewed", actor, { documentId });
    }
    return updated.count > 0;
  });
}

/** The customer's own figures for a line; anything left out stays as it is. */
export type LineFigures = {
  quantity?: number;
  unitPriceMinor?: number;
  taxRateBps?: number;
  discountBps?: number;
};

export type ProposedChanges = {
  /** Changes per line of the current version, by index; quantity 0 removes it. */
  lines: Record<number, LineFigures>;
  /**
   * Catalogue products to add. Name, unit and description come from the
   * catalogue; the figures default to it unless the customer gives their own.
   */
  additions: Array<{ productId: string; quantity: number } & LineFigures>;
};

function withFigures(item: DealLineItem, figures: LineFigures): DealLineItem {
  return {
    ...item,
    discountBps: figures.discountBps ?? item.discountBps,
    quantity: figures.quantity ?? item.quantity,
    taxRateBps: figures.taxRateBps ?? item.taxRateBps,
    unitPriceMinor: figures.unitPriceMinor ?? item.unitPriceMinor,
  };
}

/**
 * The customer suggests different lines. Their version waits for the
 * business to approve or turn down; a newer suggestion replaces an older one.
 */
export async function proposeDealChanges({
  organizationId,
  dealId,
  documentId,
  changes,
  note,
  actor,
}: {
  organizationId: string;
  dealId: string;
  documentId: string;
  changes: ProposedChanges;
  note: string;
  actor: Actor;
}) {
  return await runTransition(async (tx) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const { document, step } = activeDocument(deal, documentId);
    const current = document.versions.find(
      (version) => version.state === "current",
    );
    if (
      !step.requiresAcceptance ||
      !AWAITING_ANSWER.has(document.status) ||
      !current
    ) {
      throw new DealTransitionError("documentNotAwaitingAnswer");
    }
    if (!step.negotiable) {
      throw new DealTransitionError("changesNotAllowed");
    }

    // The customer's figures are a request, not a price change: the business
    // sees exactly what they asked for and decides.
    const kept = parseDealItems(current.items).flatMap((item, index) => {
      const changed = withFigures(item, changes.lines[index] ?? {});
      return changed.quantity > 0 ? [changed] : [];
    });
    const productIds = [
      ...new Set(changes.additions.map((addition) => addition.productId)),
    ];
    const products = await tx.product.findMany({
      where: {
        archivedAt: null,
        currency: deal.currency,
        id: { in: productIds },
        organizationId,
      },
    });
    const added = changes.additions.flatMap((addition): DealLineItem[] => {
      const product = products.find(
        (candidate) => candidate.id === addition.productId,
      );
      return product && addition.quantity > 0
        ? [
            withFigures(
              {
                description: product.description,
                discountBps: 0,
                name: product.name,
                productId: product.id,
                quantity: addition.quantity,
                taxRateBps: product.taxRateBps,
                unit: product.unit,
                unitPriceMinor: product.unitPriceMinor,
              },
              addition,
            ),
          ]
        : [];
    });
    const items = [...kept, ...added];
    if (items.length === 0) {
      throw new DealTransitionError("noItems");
    }

    const version = Math.max(0, ...document.versions.map((v) => v.version)) + 1;
    await tx.dealDocumentVersion.updateMany({
      data: { state: "rejected" },
      where: { dealDocumentId: document.id, state: "proposed" },
    });
    await tx.dealDocumentVersion.create({
      data: {
        ...versionTotals(items),
        dealDocumentId: document.id,
        note,
        proposedBy: actor.party,
        state: "proposed",
        version,
      },
    });
    await tx.dealDocument.update({
      data: { status: "changesRequested" },
      where: { id: document.id },
    });
    await recordEvent(tx, deal.id, "changesProposed", actor, {
      documentId: document.id,
      payload: { version },
    });
    return { version };
  });
}

/**
 * The business takes the customer's suggestion: it becomes the document's
 * current version and is sent again for the customer to accept.
 */
export async function approveDealProposal({
  organizationId,
  dealId,
  versionId,
  actor,
}: {
  organizationId: string;
  dealId: string;
  versionId: string;
  actor: Actor;
}) {
  return await runTransition(async (tx, effects) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const step = activeStep(deal);
    const proposal = step.document?.versions.find(
      (version) => version.id === versionId && version.state === "proposed",
    );
    if (!step.document || !proposal) {
      throw new DealTransitionError("proposalNotFound");
    }
    await tx.dealDocumentVersion.updateMany({
      data: { state: "superseded" },
      where: { dealDocumentId: step.document.id, state: "current" },
    });
    await tx.dealDocumentVersion.update({
      data: { state: "current" },
      where: { id: proposal.id },
    });
    await tx.dealDocument.update({
      data: { status: "draft" },
      where: { id: step.document.id },
    });
    await recordEvent(tx, deal.id, "proposalApproved", actor, {
      documentId: step.document.id,
      payload: { version: proposal.version },
    });
    await sendDocumentInTransaction(tx, deal, step.id, actor, effects);
  });
}

/** The business turns the customer's suggestion down; the document stands. */
export async function rejectDealProposal({
  organizationId,
  dealId,
  versionId,
  actor,
}: {
  organizationId: string;
  dealId: string;
  versionId: string;
  actor: Actor;
}) {
  return await runTransition(async (tx) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const step = activeStep(deal);
    const proposal = step.document?.versions.find(
      (version) => version.id === versionId && version.state === "proposed",
    );
    if (!step.document || !proposal) {
      throw new DealTransitionError("proposalNotFound");
    }
    await tx.dealDocumentVersion.update({
      data: { state: "rejected" },
      where: { id: proposal.id },
    });
    await tx.dealDocument.update({
      data: { status: "viewed" },
      where: { id: step.document.id },
    });
    await recordEvent(tx, deal.id, "proposalRejected", actor, {
      documentId: step.document.id,
      payload: { version: proposal.version },
    });
  });
}

/** Adds a message to the deal's conversation. */
export async function postDealMessage({
  organizationId,
  dealId,
  body,
  actor,
}: {
  organizationId: string;
  dealId: string;
  body: string;
  actor: Actor;
}) {
  return await runTransition(async (tx) => {
    const deal = await tx.deal.findFirst({
      select: { id: true },
      where: { id: dealId, organizationId },
    });
    if (!deal) {
      throw new DealTransitionError("dealNotFound");
    }
    const message = await tx.dealMessage.create({
      data: {
        author: actor.party,
        body,
        dealId,
        userId: actor.party === "business" ? actor.userId : null,
      },
    });
    // Touch the deal so lists sort it to the top.
    await tx.deal.update({ data: {}, where: { id: dealId } });
    return message;
  });
}

/** Gives the deal a new share link; every older link stops working. */
export async function resetDealShareLink({
  organizationId,
  dealId,
  actor,
}: {
  organizationId: string;
  dealId: string;
  actor: Actor;
}) {
  return await runTransition(async (tx) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    await tx.deal.update({
      data: { shareNonce: createId(), shareRevokedAt: null },
      where: { id: deal.id },
    });
    await recordEvent(tx, deal.id, "shareLinkReset", actor);
  });
}

function activeCautionRefund(deal: LoadedDeal, stepId: string) {
  const step = activeStep(deal);
  if (step.id !== stepId || step.kind !== "cautionRefund") {
    throw new DealTransitionError("notCautionRefundStep");
  }
  return step;
}

/**
 * Sends the caution settlement to the customer: what's kept and why, and the
 * rest to refund. With nothing left to refund, the step is done there and
 * then; otherwise the customer is asked where to send it.
 */
export async function sendCautionSettlement({
  organizationId,
  dealId,
  stepId,
  deductions,
  actor,
}: {
  organizationId: string;
  dealId: string;
  stepId: string;
  deductions: CautionDeduction[];
  actor: Actor;
}) {
  return await runTransition(async (tx, effects) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const step = activeCautionRefund(deal, stepId);
    const settlement = await tx.dealCautionSettlement.findUnique({
      where: { stepId: step.id },
    });
    if (!settlement || settlement.sentAt) {
      throw new DealTransitionError("notCautionRefundStep");
    }
    const deductedMinor = deductions.reduce(
      (sum, deduction) => sum + deduction.amountMinor,
      0,
    );
    if (deductedMinor > settlement.heldMinor) {
      throw new DealTransitionError("deductionsTooHigh");
    }
    // Only evidence uploaded for this deal can be attached.
    const folder = `${cautionEvidenceFolder(organizationId, deal.id)}/`;
    const kept = deductions.map((deduction) => ({
      ...deduction,
      evidence: (deduction.evidence ?? []).filter((item) =>
        item.id.startsWith(folder),
      ),
    }));
    const refundMinor = settlement.heldMinor - deductedMinor;
    const now = new Date();
    await tx.dealCautionSettlement.update({
      data: {
        deductions: kept as unknown as Prisma.InputJsonValue,
        refundMinor,
        sentAt: now,
        ...(refundMinor === 0 ? { refundedAt: now } : {}),
      },
      where: { id: settlement.id },
    });
    await recordEvent(tx, deal.id, "cautionSettlementSent", actor, {
      payload: { deductedMinor, refundMinor },
    });
    if (refundMinor === 0) {
      effects.notices.push({ kind: "cautionRefunded", stepId: step.id });
      await completeStep(tx, deal, step.id, actor, effects);
      return;
    }
    effects.notices.push({ kind: "cautionSettlement", stepId: step.id });
  });
}

/** The customer telling the business where to send their caution refund. */
export async function giveCautionRefundAccount({
  organizationId,
  dealId,
  stepId,
  bankName,
  accountNumber,
  accountName,
  actor,
}: {
  organizationId: string;
  dealId: string;
  stepId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  actor: Actor;
}) {
  return await runTransition(async (tx) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const step = activeCautionRefund(deal, stepId);
    const settlement = await tx.dealCautionSettlement.findUnique({
      where: { stepId: step.id },
    });
    if (!settlement?.sentAt || settlement.refundedAt) {
      throw new DealTransitionError("notCautionRefundStep");
    }
    await tx.dealCautionSettlement.update({
      data: {
        accountGivenAt: new Date(),
        accountName,
        accountNumber,
        bankName,
      },
      where: { id: settlement.id },
    });
    await recordEvent(tx, deal.id, "refundAccountGiven", actor, {
      payload: { bankName },
    });
  });
}

/**
 * The business saying it has sent the caution refund from its bank. Finishes
 * the step, and the deal moves on.
 */
export async function markCautionRefunded({
  organizationId,
  dealId,
  stepId,
  reference,
  actor,
}: {
  organizationId: string;
  dealId: string;
  stepId: string;
  reference: string;
  actor: Actor;
}) {
  return await runTransition(async (tx, effects) => {
    const deal = await loadDealForUpdate(tx, organizationId, dealId);
    const step = activeCautionRefund(deal, stepId);
    const settlement = await tx.dealCautionSettlement.findUnique({
      where: { stepId: step.id },
    });
    if (!settlement?.sentAt || settlement.refundedAt) {
      throw new DealTransitionError("notCautionRefundStep");
    }
    if (!settlement.accountGivenAt) {
      throw new DealTransitionError("refundAccountMissing");
    }
    await tx.dealCautionSettlement.update({
      data: { refundReference: reference, refundedAt: new Date() },
      where: { id: settlement.id },
    });
    await recordEvent(tx, deal.id, "cautionRefunded", actor, {
      payload: { reference, refundMinor: settlement.refundMinor },
    });
    effects.notices.push({ kind: "cautionRefunded", stepId: step.id });
    await completeStep(tx, deal, step.id, actor, effects);
  });
}
