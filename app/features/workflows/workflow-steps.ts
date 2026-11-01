import type {
  StepAdvanceMode,
  StepCarryForward,
  WorkflowStepKind,
} from "~/generated/browser";

/** Priced document types a workflow can send (Prisma `TemplateType` values). */
export const WORKFLOW_DOCUMENT_TYPES = [
  "quote",
  "estimate",
  "orderConfirmation",
  "salesOrder",
  "invoice",
] as const;
export type WorkflowDocumentType = (typeof WORKFLOW_DOCUMENT_TYPES)[number];

export const MAX_WORKFLOW_STEPS = 15;
export const MAX_STEP_NAME_LENGTH = 80;

export type WorkflowStepInput = {
  kind: WorkflowStepKind;
  name: string;
  /** Document steps only. */
  documentType: WorkflowDocumentType | null;
  /** Document and receipt steps; null means the organization's default. */
  templateId: string | null;
  requiresAcceptance: boolean;
  /** Accepting also asks the customer for their purchase order. */
  requestsPurchaseOrder: boolean;
  /** The customer may suggest their own figures before accepting. */
  negotiable: boolean;
  advanceMode: StepAdvanceMode;
  carryForward: StepCarryForward;
  depositPercentBps: number | null;
  validityDays: number | null;
  paymentTermsDays: number | null;
};

export type WorkflowStepIssueCode =
  | "tooFewSteps"
  | "tooManySteps"
  | "firstStepMustBeDocument"
  | "nameRequired"
  | "nameTooLong"
  | "documentTypeRequired"
  | "depositNeedsEarlierDocument"
  | "depositPercentOutOfRange"
  | "paymentNeedsDocument"
  | "receiptMustFollowPayment"
  | "cautionIsALineItem"
  | "cautionOnlyOnce";

export type WorkflowStepIssue = {
  /** The step the issue is about, or null for the workflow as a whole. */
  stepIndex: number | null;
  code: WorkflowStepIssueCode;
};

/** A step issue, plus the one only the server can find (a missing template). */
export type SaveWorkflowIssue = Omit<WorkflowStepIssue, "code"> & {
  code: WorkflowStepIssueCode | "templateNotFound";
};

/**
 * Checks that a list of steps can actually run as a deal:
 * - 1 to 15 steps, starting with a document;
 * - a payment collects the latest priced document since the previous payment;
 * - a receipt comes straight after a payment;
 * - deposit and balance documents need an earlier itemised document to take
 *   their total from.
 */
export function validateWorkflowSteps(
  steps: readonly WorkflowStepInput[],
): WorkflowStepIssue[] {
  const issues: WorkflowStepIssue[] = [];

  if (steps.length === 0) {
    return [{ code: "tooFewSteps", stepIndex: null }];
  }
  if (steps.length > MAX_WORKFLOW_STEPS) {
    issues.push({ code: "tooManySteps", stepIndex: null });
  }
  if (steps[0]?.kind !== "document") {
    issues.push({ code: "firstStepMustBeDocument", stepIndex: 0 });
  }

  let hasItemisedDocument = false;
  let hasDocumentSincePayment = false;
  let cautionRefunds = 0;

  steps.forEach((step, stepIndex) => {
    const name = step.name.trim();
    if (!name) {
      issues.push({ code: "nameRequired", stepIndex });
    } else if (name.length > MAX_STEP_NAME_LENGTH) {
      issues.push({ code: "nameTooLong", stepIndex });
    }

    switch (step.kind) {
      case "document": {
        if (
          !step.documentType ||
          !WORKFLOW_DOCUMENT_TYPES.includes(step.documentType)
        ) {
          issues.push({ code: "documentTypeRequired", stepIndex });
        }
        if (step.carryForward !== "items" && !hasItemisedDocument) {
          issues.push({ code: "depositNeedsEarlierDocument", stepIndex });
        }
        if (
          step.carryForward === "deposit" &&
          (step.depositPercentBps === null ||
            step.depositPercentBps < 1 ||
            step.depositPercentBps > 10_000)
        ) {
          issues.push({ code: "depositPercentOutOfRange", stepIndex });
        }
        if (step.carryForward === "items") {
          hasItemisedDocument = true;
        }
        hasDocumentSincePayment = true;
        break;
      }
      case "payment": {
        if (!hasDocumentSincePayment) {
          issues.push({ code: "paymentNeedsDocument", stepIndex });
        }
        hasDocumentSincePayment = false;
        break;
      }
      case "receipt": {
        if (steps[stepIndex - 1]?.kind !== "payment") {
          issues.push({ code: "receiptMustFollowPayment", stepIndex });
        }
        break;
      }
      case "caution": {
        // Cautions are now a line on a quote or invoice, not a step.
        issues.push({ code: "cautionIsALineItem", stepIndex });
        break;
      }
      case "cautionRefund": {
        cautionRefunds += 1;
        if (cautionRefunds > 1) {
          issues.push({ code: "cautionOnlyOnce", stepIndex });
        }
        break;
      }
    }
  });

  return issues;
}

/**
 * Clears settings that don't apply to a step's kind, so stored steps stay
 * tidy whatever the editor sent.
 */
export function normalizeWorkflowStep(
  step: WorkflowStepInput,
  stepIndex: number,
): WorkflowStepInput {
  const isDocument = step.kind === "document";
  return {
    ...step,
    advanceMode:
      // The first document is always prepared by hand; payments and cautions
      // wait for the customer, and a caution refund for the business.
      stepIndex === 0 || (step.kind !== "document" && step.kind !== "receipt")
        ? "manual"
        : step.advanceMode,
    carryForward: isDocument ? step.carryForward : "items",
    depositPercentBps:
      isDocument && step.carryForward === "deposit"
        ? step.depositPercentBps
        : null,
    documentType: isDocument ? step.documentType : null,
    name: step.name.trim(),
    paymentTermsDays:
      isDocument && step.documentType === "invoice"
        ? step.paymentTermsDays
        : null,
    requiresAcceptance: isDocument && step.requiresAcceptance,
    negotiable: isDocument && step.requiresAcceptance && step.negotiable,
    requestsPurchaseOrder:
      isDocument && step.requiresAcceptance && step.requestsPurchaseOrder,
    templateId:
      step.kind === "document" || step.kind === "receipt"
        ? step.templateId
        : null,
    validityDays:
      isDocument &&
      (step.documentType === "quote" || step.documentType === "estimate")
        ? step.validityDays
        : null,
  };
}
