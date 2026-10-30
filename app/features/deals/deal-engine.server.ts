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
  | "notPaymentStep";

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

  if (step.kind === "payment") {
    await tx.dealStep.update({
      data: {
        amountDueMinor: totalOf(documentBefore(fresh.steps, step.position)),
        startedAt: new Date(),
        status: "active",
      },
      where: { id: step.id },
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
      const effects: DealEffects = { emails: [] };
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
  actor,
}: {
  organizationId: string;
  workflowId: string;
  customerId: string;
  title: string;
  currency: string;
  items: DealLineItem[];
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

    const deal = await tx.deal.create({
      data: {
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
  actor,
}: {
  organizationId: string;
  dealId: string;
  documentId: string;
  acceptedByName: string;
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
    if (step.id !== stepId || step.kind !== "payment") {
      throw new DealTransitionError("notPaymentStep");
    }
    const amountPaidMinor = step.amountDueMinor ?? 0;
    await tx.dealStep.update({
      data: {
        amountPaidMinor,
        paidAt: new Date(),
        paymentMethod: method,
        paymentReference: reference,
      },
      where: { id: step.id },
    });
    await recordEvent(tx, deal.id, "paymentRecorded", actor, {
      payload: { amountMinor: amountPaidMinor, method, reference },
    });
    await completeStep(tx, deal, step.id, actor, effects);
  });
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
