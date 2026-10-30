import type { TemplateType as BuilderTemplateType } from "~/features/templates/shared/types";
import type { WorkflowDocumentType } from "~/features/workflows/workflow-steps";

/** Every document a deal can produce: the workflow's types plus receipts. */
export type DealDocumentType = WorkflowDocumentType | "receipt";

export const DOCUMENT_NUMBER_PREFIXES = {
  estimate: "EST",
  invoice: "INV",
  orderConfirmation: "OC",
  purchaseOrder: "PO",
  quote: "QUO",
  receipt: "RCP",
  salesOrder: "SO",
} as const satisfies Record<DealDocumentType, string>;

/** "QUO-0007". */
export function formatDocumentNumber(type: DealDocumentType, sequence: number) {
  return `${DOCUMENT_NUMBER_PREFIXES[type]}-${String(sequence).padStart(4, "0")}`;
}

/** The template builder's name for the type (`orderConfirmation` → `order-confirmation`). */
export const BUILDER_TEMPLATE_TYPES = {
  estimate: "estimate",
  invoice: "invoice",
  orderConfirmation: "order-confirmation",
  purchaseOrder: "purchase-order",
  quote: "quote",
  receipt: "receipt",
  salesOrder: "sales-order",
} as const satisfies Record<DealDocumentType, BuilderTemplateType>;

export function isDealDocumentType(type: string): type is DealDocumentType {
  return type in DOCUMENT_NUMBER_PREFIXES;
}

/** How a payment method reads on receipts. */
export const PAYMENT_METHOD_NAMES: Record<string, string> = {
  bankTransfer: "Bank transfer",
  card: "Card",
  cash: "Cash",
  mobileMoney: "Mobile money",
  other: "Other",
};

export function paymentMethodName(method: string) {
  return PAYMENT_METHOD_NAMES[method] ?? method;
}
