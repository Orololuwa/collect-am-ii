export const DEAL_EVENT_TYPES = [
  "dealCreated",
  "documentPrepared",
  "documentRevised",
  "documentSent",
  "documentResent",
  "documentAccepted",
  "documentDeclined",
  "paymentRecorded",
  "dealWon",
  "dealLost",
  "dealCancelled",
  "documentViewed",
  "changesProposed",
  "proposalApproved",
  "proposalRejected",
  "shareLinkReset",
  "purchaseOrderReceived",
] as const;
export type DealEventType = (typeof DEAL_EVENT_TYPES)[number];

export const START_DEAL_INTENT = "startDeal";
export const REVISE_DOCUMENT_INTENT = "reviseDocument";
export const SEND_DOCUMENT_INTENT = "sendDocument";
export const RESEND_DOCUMENT_INTENT = "resendDocument";
export const ACCEPT_DOCUMENT_INTENT = "acceptDocument";
export const DECLINE_DOCUMENT_INTENT = "declineDocument";
export const RECORD_PAYMENT_INTENT = "recordPayment";
export const POST_MESSAGE_INTENT = "postMessage";
export const CLOSE_DEAL_INTENT = "closeDeal";
export const APPROVE_PROPOSAL_INTENT = "approveProposal";
export const REJECT_PROPOSAL_INTENT = "rejectProposal";
export const RESET_SHARE_LINK_INTENT = "resetShareLink";
export const PROPOSE_CHANGES_INTENT = "proposeChanges";

export const DEALS_PAGE_SIZE = 25;
export const MAX_MESSAGE_LENGTH = 2000;

export const PAYMENT_METHODS = [
  "bankTransfer",
  "cash",
  "card",
  "mobileMoney",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_KEYS = {
  bankTransfer: "detail.paymentMethods.bankTransfer",
  card: "detail.paymentMethods.card",
  cash: "detail.paymentMethods.cash",
  mobileMoney: "detail.paymentMethods.mobileMoney",
  other: "detail.paymentMethods.other",
} as const satisfies Record<PaymentMethod, string>;

export const DEAL_STATUS_KEYS = {
  cancelled: "status.cancelled",
  lost: "status.lost",
  open: "status.open",
  won: "status.won",
} as const;

export const DOCUMENT_STATUS_KEYS = {
  accepted: "documentStatus.accepted",
  changesRequested: "documentStatus.changesRequested",
  declined: "documentStatus.declined",
  draft: "documentStatus.draft",
  sent: "documentStatus.sent",
  viewed: "documentStatus.viewed",
} as const;

export const DOCUMENT_TYPE_KEYS = {
  estimate: "documentTypes.estimate",
  invoice: "documentTypes.invoice",
  orderConfirmation: "documentTypes.orderConfirmation",
  purchaseOrder: "documentTypes.purchaseOrder",
  quote: "documentTypes.quote",
  receipt: "documentTypes.receipt",
  salesOrder: "documentTypes.salesOrder",
} as const;

export const EVENT_KEYS = {
  dealCancelled: "events.dealCancelled",
  dealCreated: "events.dealCreated",
  dealLost: "events.dealLost",
  dealWon: "events.dealWon",
  documentAccepted: "events.documentAccepted",
  documentDeclined: "events.documentDeclined",
  documentPrepared: "events.documentPrepared",
  documentResent: "events.documentResent",
  documentRevised: "events.documentRevised",
  documentSent: "events.documentSent",
  paymentRecorded: "events.paymentRecorded",
  documentViewed: "events.documentViewed",
  changesProposed: "events.changesProposed",
  proposalApproved: "events.proposalApproved",
  proposalRejected: "events.proposalRejected",
  shareLinkReset: "events.shareLinkReset",
  purchaseOrderReceived: "events.purchaseOrderReceived",
} as const satisfies Record<DealEventType, string>;

export const ERROR_KEYS = {
  customerNotFound: "errors.customerNotFound",
  dealClosed: "errors.dealClosed",
  dealNotFound: "errors.dealNotFound",
  documentAccepted: "errors.documentAccepted",
  documentNotAwaitingAnswer: "errors.documentNotAwaitingAnswer",
  documentNotDraft: "errors.documentNotDraft",
  documentNotSent: "errors.documentNotSent",
  notCurrentStep: "errors.notCurrentStep",
  notPaymentStep: "errors.notPaymentStep",
  workflowNotFound: "errors.workflowNotFound",
  versionChanged: "errors.versionChanged",
  proposalNotFound: "errors.proposalNotFound",
  noItems: "errors.noItems",
  purchaseOrderRequired: "errors.purchaseOrderRequired",
  changesNotAllowed: "errors.changesNotAllowed",
} as const;

/** A customer's purchase order file, attached when they accept. */
export const PURCHASE_ORDER_MAX_FILE_SIZE = 5_000_000;
export const PURCHASE_ORDER_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;
