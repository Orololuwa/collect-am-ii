import type { SampleStepName, WorkflowSampleKey } from "./workflow-samples";
import type {
  WorkflowDocumentType,
  WorkflowStepIssueCode,
} from "./workflow-steps";

export const CREATE_WORKFLOW_INTENT = "createWorkflow";
export const SAVE_WORKFLOW_INTENT = "saveWorkflow";
export const ARCHIVE_WORKFLOW_INTENT = "archiveWorkflow";
export const RESTORE_WORKFLOW_INTENT = "restoreWorkflow";

/** `createWorkflow` with this sample key starts from a single quote step. */
export const BLANK_WORKFLOW_KEY = "blank";

// Literal translation keys (in the `workflows` namespace) keep i18next's typed
// `t` cheap to type-check; never build these keys with template literals.

export const SAMPLE_TEXT_KEYS = {
  b2bWholesale: {
    description: "samples.b2bWholesale.description",
    name: "samples.b2bWholesale.name",
  },
  madeToOrder: {
    description: "samples.madeToOrder.description",
    name: "samples.madeToOrder.name",
  },
  quoteToCash: {
    description: "samples.quoteToCash.description",
    name: "samples.quoteToCash.name",
  },
  retailPrepaid: {
    description: "samples.retailPrepaid.description",
    name: "samples.retailPrepaid.name",
  },
  servicesDeposit: {
    description: "samples.servicesDeposit.description",
    name: "samples.servicesDeposit.name",
  },
} as const satisfies Record<
  WorkflowSampleKey,
  { name: string; description: string }
>;

export const STEP_NAME_KEYS = {
  depositInvoice: "stepNames.depositInvoice",
  depositPayment: "stepNames.depositPayment",
  estimate: "stepNames.estimate",
  finalInvoice: "stepNames.finalInvoice",
  finalPayment: "stepNames.finalPayment",
  invoice: "stepNames.invoice",
  orderConfirmation: "stepNames.orderConfirmation",
  payment: "stepNames.payment",
  quote: "stepNames.quote",
  receipt: "stepNames.receipt",
  salesOrder: "stepNames.salesOrder",
} as const satisfies Record<SampleStepName, string>;

export const DOCUMENT_TYPE_KEYS = {
  estimate: "documentTypes.estimate",
  invoice: "documentTypes.invoice",
  orderConfirmation: "documentTypes.orderConfirmation",
  purchaseOrder: "documentTypes.purchaseOrder",
  quote: "documentTypes.quote",
  salesOrder: "documentTypes.salesOrder",
} as const satisfies Record<WorkflowDocumentType, string>;

export const STEP_ISSUE_KEYS = {
  depositNeedsEarlierDocument: "issues.depositNeedsEarlierDocument",
  depositPercentOutOfRange: "issues.depositPercentOutOfRange",
  documentTypeRequired: "issues.documentTypeRequired",
  firstStepMustBeDocument: "issues.firstStepMustBeDocument",
  nameRequired: "issues.nameRequired",
  nameTooLong: "issues.nameTooLong",
  paymentNeedsDocument: "issues.paymentNeedsDocument",
  receiptMustFollowPayment: "issues.receiptMustFollowPayment",
  templateNotFound: "issues.templateNotFound",
  tooFewSteps: "issues.tooFewSteps",
  tooManySteps: "issues.tooManySteps",
} as const satisfies Record<WorkflowStepIssueCode | "templateNotFound", string>;
