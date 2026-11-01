import type {
  SampleStepName,
  WorkflowSampleCategory,
  WorkflowSampleKey,
} from "./workflow-samples";
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
  eventCentreBooking: {
    description: "samples.eventCentreBooking.description",
    name: "samples.eventCentreBooking.name",
  },
  shortLetStay: {
    description: "samples.shortLetStay.description",
    name: "samples.shortLetStay.name",
  },
  agencyProject: {
    description: "samples.agencyProject.description",
    name: "samples.agencyProject.name",
  },
  constructionProject: {
    description: "samples.constructionProject.description",
    name: "samples.constructionProject.name",
  },
  eventCatering: {
    description: "samples.eventCatering.description",
    name: "samples.eventCatering.name",
  },
  freelanceJob: {
    description: "samples.freelanceJob.description",
    name: "samples.freelanceJob.name",
  },
  madeToOrder: {
    description: "samples.madeToOrder.description",
    name: "samples.madeToOrder.name",
  },
  photographyBooking: {
    description: "samples.photographyBooking.description",
    name: "samples.photographyBooking.name",
  },
  purchaseOrderSupply: {
    description: "samples.purchaseOrderSupply.description",
    name: "samples.purchaseOrderSupply.name",
  },
  retailOrder: {
    description: "samples.retailOrder.description",
    name: "samples.retailOrder.name",
  },
  wholesaleOnCredit: {
    description: "samples.wholesaleOnCredit.description",
    name: "samples.wholesaleOnCredit.name",
  },
} as const satisfies Record<
  WorkflowSampleKey,
  { name: string; description: string }
>;

export const SAMPLE_CATEGORY_KEYS = {
  bookings: "gallery.categories.bookings",
  goods: "gallery.categories.goods",
  projects: "gallery.categories.projects",
  services: "gallery.categories.services",
} as const satisfies Record<WorkflowSampleCategory, string>;

export const STEP_NAME_KEYS = {
  bookingInvoice: "stepNames.bookingInvoice",
  bookingPayment: "stepNames.bookingPayment",
  caution: "stepNames.caution",
  cautionReceipt: "stepNames.cautionReceipt",
  cautionRefund: "stepNames.cautionRefund",
  balanceInvoice: "stepNames.balanceInvoice",
  balancePayment: "stepNames.balancePayment",
  bookingDeposit: "stepNames.bookingDeposit",
  bookingDepositInvoice: "stepNames.bookingDepositInvoice",
  completionInvoice: "stepNames.completionInvoice",
  completionPayment: "stepNames.completionPayment",
  depositInvoice: "stepNames.depositInvoice",
  depositPayment: "stepNames.depositPayment",
  estimate: "stepNames.estimate",
  finalInvoice: "stepNames.finalInvoice",
  finalPayment: "stepNames.finalPayment",
  invoice: "stepNames.invoice",
  kickoffInvoice: "stepNames.kickoffInvoice",
  kickoffPayment: "stepNames.kickoffPayment",
  mobilisationInvoice: "stepNames.mobilisationInvoice",
  mobilisationPayment: "stepNames.mobilisationPayment",
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
  cautionOnlyOnce: "issues.cautionOnlyOnce",
  cautionIsALineItem: "issues.cautionIsALineItem",
  receiptMustFollowPayment: "issues.receiptMustFollowPayment",
  templateNotFound: "issues.templateNotFound",
  tooFewSteps: "issues.tooFewSteps",
  tooManySteps: "issues.tooManySteps",
} as const satisfies Record<WorkflowStepIssueCode | "templateNotFound", string>;
