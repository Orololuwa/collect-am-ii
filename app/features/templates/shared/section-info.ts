import { componentLibrary } from "./components/component-library-registry";
import { getTemplateTypeInfo } from "./template-types";
import type { TemplateType } from "./types";

export type SectionInfo = {
  /** A short, human name, e.g. "Line items". */
  name: string;
  /** What the section holds, for the sections list. */
  summary: string;
  /** What a deal fills in when it sends a document with this section. */
  filledByDeal: string[] | null;
};

const MONEY_SECTIONS = {
  footer: { name: "Totals and notes", summary: "Subtotal, tax, total, terms" },
  header: { name: "Header", summary: "Logo, business, dates, bill to" },
  items: { name: "Line items", summary: "Description, quantity, price" },
} as const;

const OTHER_SECTIONS: Record<string, { name: string; summary: string }> = {
  body: { name: "Body", summary: "Terms and clauses" },
  footer: { name: "Footer", summary: "Notes and sign-off" },
  header: { name: "Header", summary: "Logo, business, dates, recipient" },
  items: { name: "Items", summary: "What is in the shipment" },
  signature: { name: "Signatures", summary: "Who signs, and when" },
};

const DUE_LABELS: Partial<Record<TemplateType, string>> = {
  estimate: "Valid until",
  invoice: "Due date",
  "order-confirmation": "Delivery date",
  quote: "Valid until",
};

function dealFields(type: TemplateType, part: string) {
  if (part === "header") {
    return [
      "Document number",
      "Date",
      ...(DUE_LABELS[type] ? [DUE_LABELS[type]] : []),
      type === "receipt" ? "Payment reference" : "Bill to, from the customer",
      "Business details still showing sample values",
    ];
  }
  if (part === "items") {
    return ["Every line, with its quantity, price, discount and tax"];
  }
  if (part === "footer") {
    return [
      "Subtotal, discount, tax and total",
      ...(type === "receipt" ? ["Payment method"] : []),
    ];
  }
  return null;
}

/** Names a template section the way people talk about it. */
export function getSectionInfo(
  templateType: TemplateType,
  sectionType: string,
): SectionInfo {
  const prefix = `${templateType}-`;
  const part = sectionType.startsWith(prefix)
    ? sectionType.slice(prefix.length)
    : null;
  const usedInDeals = getTemplateTypeInfo(templateType)?.usedInDeals ?? false;

  if (part && usedInDeals && part in MONEY_SECTIONS) {
    return {
      ...MONEY_SECTIONS[part as keyof typeof MONEY_SECTIONS],
      filledByDeal: dealFields(templateType, part),
    };
  }
  if (part && OTHER_SECTIONS[part]) {
    return { ...OTHER_SECTIONS[part], filledByDeal: null };
  }
  const label = componentLibrary[sectionType]?.label ?? sectionType;
  return {
    filledByDeal: null,
    name: label.charAt(0).toUpperCase() + label.slice(1),
    summary: "",
  };
}

/** The section types a template of this type can have, in document order. */
export function getSectionTypesFor(templateType: TemplateType) {
  return Object.values(componentLibrary)
    .filter((component) =>
      templateType === "resume"
        ? !component.type.includes("-")
        : component.type.startsWith(`${templateType}-`),
    )
    .map((component) => component.type);
}
