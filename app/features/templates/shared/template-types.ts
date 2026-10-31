import type { LucideIcon } from "lucide-react";
import {
  BadgeCheckIcon,
  CalculatorIcon,
  ClipboardListIcon,
  FilePenLineIcon,
  FileTextIcon,
  MessageSquareQuoteIcon,
  PackageIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  TruckIcon,
} from "lucide-react";

import type { TemplateType } from "./types";

export type TemplateTypeInfo = {
  value: TemplateType;
  label: string;
  plural: string;
  icon: LucideIcon;
  /** Deals can send it, so workflows use it. */
  usedInDeals: boolean;
};

/** The document types the templates page offers, deal documents first. */
export const TEMPLATE_TYPES: TemplateTypeInfo[] = [
  {
    icon: MessageSquareQuoteIcon,
    label: "Quote",
    plural: "Quotes",
    usedInDeals: true,
    value: "quote",
  },
  {
    icon: CalculatorIcon,
    label: "Estimate",
    plural: "Estimates",
    usedInDeals: true,
    value: "estimate",
  },
  {
    icon: FileTextIcon,
    label: "Invoice",
    plural: "Invoices",
    usedInDeals: true,
    value: "invoice",
  },
  {
    icon: ReceiptIcon,
    label: "Receipt",
    plural: "Receipts",
    usedInDeals: true,
    value: "receipt",
  },
  {
    icon: BadgeCheckIcon,
    label: "Order confirmation",
    plural: "Order confirmations",
    usedInDeals: true,
    value: "order-confirmation",
  },
  {
    icon: ClipboardListIcon,
    label: "Sales order",
    plural: "Sales orders",
    usedInDeals: true,
    value: "sales-order",
  },
  {
    icon: ShoppingCartIcon,
    label: "Purchase order",
    plural: "Purchase orders",
    usedInDeals: true,
    value: "purchase-order",
  },
  {
    icon: PackageIcon,
    label: "Packing slip",
    plural: "Packing slips",
    usedInDeals: false,
    value: "packing-slip",
  },
  {
    icon: TruckIcon,
    label: "Delivery note",
    plural: "Delivery notes",
    usedInDeals: false,
    value: "delivery-note",
  },
  {
    icon: FilePenLineIcon,
    label: "Contract",
    plural: "Contracts",
    usedInDeals: false,
    value: "contract",
  },
];

export function getTemplateTypeInfo(type: string) {
  return TEMPLATE_TYPES.find((info) => info.value === type);
}

export function isListedTemplateType(type: string): type is TemplateType {
  return TEMPLATE_TYPES.some((info) => info.value === type);
}
