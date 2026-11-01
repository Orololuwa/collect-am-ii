import type { TFunction } from "i18next";
import { CreditCardIcon, FileTextIcon, ReceiptIcon } from "lucide-react";

import type { WorkflowStepInput } from "../workflow-steps";
import { DOCUMENT_TYPE_KEYS } from "../workflows-constants";
import type { WorkflowStepKind } from "~/generated/browser";

export type EditorStep = WorkflowStepInput & { key: string };

/** Who acts at a step: the business sends documents, the customer pays. */
export type StepLane = "you" | "customer";

export const KIND_ICONS = {
  document: FileTextIcon,
  payment: CreditCardIcon,
  receipt: ReceiptIcon,
} as const satisfies Record<WorkflowStepKind, unknown>;

/** The tinted tile behind a step's icon, one colour per kind. */
export const KIND_TILE_CLASSES = {
  document: "bg-primary/10 text-primary",
  payment: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  receipt: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300",
} as const satisfies Record<WorkflowStepKind, string>;

export const KIND_KEYS = {
  document: "kinds.document",
  payment: "kinds.payment",
  receipt: "kinds.receipt",
} as const satisfies Record<WorkflowStepKind, string>;

export function stepLane(step: WorkflowStepInput): StepLane {
  return step.kind === "payment" ? "customer" : "you";
}

/** True when the step goes out on its own once the one before it is done. */
export function isAutomaticStep(step: WorkflowStepInput, index: number) {
  return (
    index > 0 && step.kind !== "payment" && step.advanceMode === "automatic"
  );
}

/** One line describing a step, e.g. "Invoice · 40% deposit · Due in 7 days". */
export function stepSummary(
  t: TFunction<"workflows">,
  step: WorkflowStepInput,
) {
  if (step.kind === "payment") {
    return t("editor.summary.payment");
  }
  if (step.kind === "receipt") {
    return t("editor.summary.receipt");
  }
  const parts: string[] = [];
  if (step.documentType) {
    parts.push(t(DOCUMENT_TYPE_KEYS[step.documentType]));
  }
  if (step.carryForward === "deposit" && step.depositPercentBps !== null) {
    parts.push(
      t("editor.summary.deposit", { percent: step.depositPercentBps / 100 }),
    );
  } else if (step.carryForward === "balance") {
    parts.push(t("editor.summary.balance"));
  }
  if (step.documentType === "invoice" && step.paymentTermsDays !== null) {
    parts.push(t("editor.summary.terms", { count: step.paymentTermsDays }));
  }
  if (
    (step.documentType === "quote" || step.documentType === "estimate") &&
    step.validityDays !== null
  ) {
    parts.push(t("editor.summary.validity", { count: step.validityDays }));
  }
  return parts.join(" · ");
}

/** What the customer can do at an accept step, as the canvas and list say it. */
export function gateDescription(step: WorkflowStepInput) {
  if (step.requestsPurchaseOrder) {
    return step.negotiable ? "withPo" : "withPoFixed";
  }
  return step.negotiable ? "negotiable" : "fixed";
}

export const GATE_DESCRIPTION_KEYS = {
  fixed: "editor.gate.descriptionFixed",
  negotiable: "editor.gate.description",
  withPo: "editor.gate.descriptionWithPo",
  withPoFixed: "editor.gate.descriptionWithPoFixed",
} as const satisfies Record<ReturnType<typeof gateDescription>, string>;
