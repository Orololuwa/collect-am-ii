import type { LucideIcon } from "lucide-react";
import {
  BadgeCheckIcon,
  CalculatorIcon,
  ClipboardListIcon,
  FileTextIcon,
  MessageSquareQuoteIcon,
  ReceiptIcon,
  ShoppingCartIcon,
} from "lucide-react";

import type { DealDocumentType } from "../deal-documents";
import { cn } from "~/lib/utils";

/** The same icons the template builder uses for each document type. */
const DOCUMENT_TYPE_ICONS = {
  estimate: CalculatorIcon,
  invoice: FileTextIcon,
  orderConfirmation: BadgeCheckIcon,
  purchaseOrder: ShoppingCartIcon,
  quote: MessageSquareQuoteIcon,
  receipt: ReceiptIcon,
  salesOrder: ClipboardListIcon,
} as const satisfies Record<DealDocumentType, LucideIcon>;

export function DocumentTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = DOCUMENT_TYPE_ICONS[type as DealDocumentType] ?? FileTextIcon;
  return (
    <Icon
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
    />
  );
}
