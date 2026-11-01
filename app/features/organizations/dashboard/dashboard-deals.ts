/** Where an open deal is waiting. */
export type DealStage = "toSend" | "withCustomer" | "awaitingPayment";

/** Why a deal needs someone to act, most urgent first. */
export const DEAL_ATTENTION_REASONS = [
  "proposal",
  "declined",
  "refundToSend",
  "overdue",
  "cautionToSettle",
  "draft",
  "expired",
  "expiring",
  "message",
] as const;
export type DealAttentionReason = (typeof DEAL_ATTENTION_REASONS)[number];

/** Quotes and estimates expiring this soon get flagged. */
const EXPIRING_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;

export type DashboardDealStep = {
  kind: string;
  name: string;
  status: string;
  requiresAcceptance: boolean;
  carryForward: string;
  /** Caution refund steps: how far the settlement has got. */
  settlement?: {
    sentAt: Date | null;
    accountGivenAt: Date | null;
    refundedAt: Date | null;
  } | null;
  document: {
    type: string;
    number: string | null;
    status: string;
    dueAt: Date | null;
    totalMinor: number | null;
  } | null;
};

export type DashboardDeal = {
  id: string;
  title: string;
  currency: string;
  customerName: string;
  updatedAt: Date;
  lastMessageAuthor: string | null;
  /** When the deal's caution can be settled, if it takes one. */
  cautionSettleAfter?: Date | null;
  /** In position order. */
  steps: DashboardDealStep[];
};

export type DealSummary = {
  id: string;
  title: string;
  customerName: string;
  currency: string;
  updatedAt: Date;
  stage: DealStage | null;
  stepName: string | null;
  /** The latest itemised document's total: what the deal is worth. */
  valueMinor: number | null;
  attention: {
    reason: DealAttentionReason;
    /** The document it's about, if any. */
    document: { type: string; number: string | null } | null;
    dueAt: Date | null;
  } | null;
};

/** Where an open deal stands and whether it needs the business to act. */
export function summarizeDeal(deal: DashboardDeal, now: Date): DealSummary {
  const activeIndex = deal.steps.findIndex((step) => step.status === "active");
  const active = deal.steps[activeIndex];
  const document = active?.document ?? null;
  // A payment settles the latest document before it.
  const billed = deal.steps
    .slice(0, Math.max(activeIndex, 0))
    .filter((step) => step.kind === "document" && step.document)
    .at(-1)?.document;
  const valueMinor =
    deal.steps
      .filter(
        (step) =>
          step.kind === "document" &&
          step.carryForward === "items" &&
          step.document,
      )
      .at(-1)?.document?.totalMinor ?? null;

  const settlement =
    active?.kind === "cautionRefund" ? active.settlement : null;
  const stage: DealStage | null = !active
    ? null
    : active.kind === "payment" || active.kind === "caution"
      ? "awaitingPayment"
      : active.kind === "cautionRefund"
        ? settlement?.sentAt && !settlement.accountGivenAt
          ? "withCustomer"
          : "toSend"
        : document?.status === "draft"
          ? "toSend"
          : "withCustomer";
  const settleAfter = deal.cautionSettleAfter ?? null;
  const cautionDue =
    active?.kind === "cautionRefund" &&
    !settlement?.sentAt &&
    (settleAfter === null || settleAfter.getTime() <= now.getTime());
  const refundDue =
    active?.kind === "cautionRefund" &&
    Boolean(settlement?.accountGivenAt) &&
    !settlement?.refundedAt;

  const awaitingAnswer =
    active?.requiresAcceptance &&
    (document?.status === "sent" || document?.status === "viewed");
  const dueTime = document?.dueAt?.getTime() ?? null;

  const ref = (
    doc: { type: string; number: string | null } | null | undefined,
  ) => (doc ? { number: doc.number, type: doc.type } : null);
  const attention: DealSummary["attention"] =
    document?.status === "changesRequested"
      ? { document: ref(document), dueAt: null, reason: "proposal" }
      : document?.status === "declined"
        ? { document: ref(document), dueAt: null, reason: "declined" }
        : refundDue
          ? { document: null, dueAt: null, reason: "refundToSend" }
          : cautionDue
            ? { document: null, dueAt: settleAfter, reason: "cautionToSettle" }
            : active?.kind === "payment" &&
                billed?.dueAt &&
                billed.dueAt.getTime() < now.getTime()
              ? {
                  document: ref(billed),
                  dueAt: billed.dueAt,
                  reason: "overdue",
                }
              : document?.status === "draft"
                ? { document: ref(document), dueAt: null, reason: "draft" }
                : awaitingAnswer && dueTime !== null && dueTime < now.getTime()
                  ? {
                      document: ref(document),
                      dueAt: document?.dueAt ?? null,
                      reason: "expired",
                    }
                  : awaitingAnswer &&
                      dueTime !== null &&
                      dueTime - now.getTime() <= EXPIRING_WITHIN_MS
                    ? {
                        document: ref(document),
                        dueAt: document?.dueAt ?? null,
                        reason: "expiring",
                      }
                    : deal.lastMessageAuthor === "customer"
                      ? { document: null, dueAt: null, reason: "message" }
                      : null;

  return {
    attention,
    currency: deal.currency,
    customerName: deal.customerName,
    id: deal.id,
    stage,
    stepName: active?.name ?? null,
    title: deal.title,
    updatedAt: deal.updatedAt,
    valueMinor,
  };
}

/** Deals that need someone, most urgent first, then most recently active. */
export function sortByAttention(deals: DealSummary[]) {
  return deals
    .filter((deal) => deal.attention)
    .sort((a, b) => {
      const byReason =
        DEAL_ATTENTION_REASONS.indexOf(a.attention?.reason ?? "message") -
        DEAL_ATTENTION_REASONS.indexOf(b.attention?.reason ?? "message");
      return byReason !== 0
        ? byReason
        : b.updatedAt.getTime() - a.updatedAt.getTime();
    });
}
