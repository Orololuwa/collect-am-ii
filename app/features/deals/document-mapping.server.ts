import type { DealDocumentType } from "./deal-documents";
import { BUILDER_TEMPLATE_TYPES } from "./deal-documents";
import type { DealLineItem, DealTotals } from "./deal-items";
import { lineSubtotalMinor } from "./deal-items";
import { minorUnitsToMajorString } from "~/features/products/products-format";
import { componentLibrary } from "~/features/templates/shared/components/component-library-registry";
import { getTemplatesByType } from "~/features/templates/shared/templates";
import type { TemplateSection } from "~/features/templates/shared/types";
import {
  generateExportHTML,
  generatePreviewHTML,
} from "~/features/templates/shared/utils/html-generator.server";
import { prisma } from "~/utils/database.server";

/** Where each document type keeps its number and dates in the header section. */
const HEADER_FIELDS = {
  estimate: {
    date: "estimateDate",
    due: "validityDate",
    number: "estimateNumber",
  },
  invoice: { date: "invoiceDate", due: "dueDate", number: "invoiceNumber" },
  orderConfirmation: {
    date: "orderDate",
    due: null,
    number: "confirmationNumber",
  },
  purchaseOrder: { date: "orderDate", due: null, number: "poNumber" },
  quote: { date: "quoteDate", due: "validityDate", number: "quoteNumber" },
  receipt: { date: "receiptDate", due: null, number: "receiptNumber" },
  salesOrder: { date: "orderDate", due: null, number: "orderNumber" },
} as const satisfies Record<
  DealDocumentType,
  { number: string; date: string; due: string | null }
>;

export type DocumentTemplate = {
  sections: TemplateSection[];
  globalStyles: Record<string, string>;
  colorPalette: string[];
  /**
   * Company details the built-in templates ship with ("Your Company Name",
   * the sample logo, …). Wherever a template still shows one of these, the
   * organization's own details go in instead.
   */
  sampleValues: ReadonlySet<string>;
};

export type DocumentParties = {
  organization: { name: string; imageUrl: string; billingEmail: string };
  customer: {
    name: string;
    email: string;
    phone: string;
    companyName: string;
    billingAddress: string;
    shippingAddress: string;
  };
};

export type DocumentContent = {
  type: DealDocumentType;
  /** Null while the document is a draft. */
  number: string | null;
  issuedAt: Date;
  dueAt: Date | null;
  currency: string;
  items: DealLineItem[];
  totals: DealTotals;
  paymentTermsDays: number | null;
  payment?: { method: string; reference: string };
};

export function formatDocumentDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * The template a step's document is rendered with: the step's own template,
 * else the organization's default for that type, else its most recently
 * edited one of that type, else the first built-in one.
 */
const COMPANY_FIELDS = [
  "companyName",
  "companyLogo",
  "companyEmail",
  "companyAddress",
  "companyPhone",
  "companyWebsite",
  "storeName",
  "storeLogo",
  "storeEmail",
  "storeAddress",
  "storePhone",
] as const;

function collectSampleValues(type: DealDocumentType) {
  const prefix = BUILDER_TEMPLATE_TYPES[type];
  const headers = [
    componentLibrary[`${prefix}-header`]?.defaultData ?? {},
    ...getTemplatesByType(prefix).flatMap((template) =>
      template.sections
        .filter((section) => section.type === `${prefix}-header`)
        .map((section) => section.data),
    ),
  ];
  const values = new Set<string>();
  for (const data of headers) {
    for (const field of COMPANY_FIELDS) {
      const value = data[field];
      if (typeof value === "string" && value.trim()) {
        values.add(value.trim());
      }
    }
  }
  return values;
}

export async function resolveDocumentTemplate({
  organizationId,
  type,
  templateId,
}: {
  organizationId: string;
  type: DealDocumentType;
  templateId: string | null;
}): Promise<DocumentTemplate> {
  // The step's own template, else the type's default, else the latest edited.
  const template = await prisma.template.findFirst({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: { colorPalette: true, globalStyles: true, sections: true },
    where: {
      organizationId,
      type,
      ...(templateId ? { id: templateId } : {}),
    },
  });
  const fallback =
    template ??
    (templateId
      ? await prisma.template.findFirst({
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          select: { colorPalette: true, globalStyles: true, sections: true },
          where: { organizationId, type },
        })
      : null);
  const sampleValues = collectSampleValues(type);
  if (fallback) {
    return {
      colorPalette: (fallback.colorPalette as string[] | null) ?? [],
      globalStyles: (fallback.globalStyles as Record<string, string>) ?? {},
      sampleValues,
      sections: fallback.sections as unknown as TemplateSection[],
    };
  }

  const [builtIn] = getTemplatesByType(BUILDER_TEMPLATE_TYPES[type]);
  if (!builtIn) {
    throw new Error(`No built-in template for ${type}`);
  }
  return {
    colorPalette: builtIn.colorPalette,
    globalStyles: builtIn.globalStyles,
    sampleValues,
    sections: builtIn.sections,
  };
}

function toTemplateItems(content: DocumentContent) {
  return content.items.map((item) => ({
    // Templates have no discount column, so a line's discount is noted under
    // its name; the footer carries the total discount.
    description: [
      item.name,
      item.description,
      item.discountBps > 0 ? `Discount ${item.discountBps / 100}%` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    quantity: String(item.quantity),
    total: minorUnitsToMajorString(lineSubtotalMinor(item), content.currency),
    unitPrice: minorUnitsToMajorString(item.unitPriceMinor, content.currency),
  }));
}

function buildHeaderData(
  data: Record<string, unknown>,
  content: DocumentContent,
  parties: DocumentParties,
  sampleValues: ReadonlySet<string>,
) {
  const fields = HEADER_FIELDS[content.type];
  const { organization, customer } = parties;
  // Keeps what the organization put in its template; fills the rest.
  const own = (field: string, replacement = "") => {
    const value = data[field];
    return typeof value === "string" &&
      value.trim() &&
      !sampleValues.has(value.trim())
      ? value
      : replacement;
  };
  const company =
    content.type === "receipt"
      ? {
          storeAddress: own("storeAddress"),
          storeEmail: own("storeEmail", organization.billingEmail),
          storeLogo: own("storeLogo", organization.imageUrl),
          storeName: own("storeName", organization.name),
          storePhone: own("storePhone"),
        }
      : {
          companyAddress: own("companyAddress"),
          companyEmail: own("companyEmail", organization.billingEmail),
          companyLogo: own("companyLogo", organization.imageUrl),
          companyName: own("companyName", organization.name),
          companyPhone: own("companyPhone"),
          companyWebsite: own("companyWebsite"),
        };
  const billToName = customer.companyName
    ? `${customer.name}, ${customer.companyName}`
    : customer.name;

  return {
    ...data,
    ...company,
    [fields.number]: content.number ?? "DRAFT",
    [fields.date]: formatDocumentDate(content.issuedAt),
    ...(fields.due
      ? {
          [fields.due]: content.dueAt ? formatDocumentDate(content.dueAt) : "",
        }
      : {}),
    ...(content.type === "receipt"
      ? { transactionId: content.payment?.reference ?? "" }
      : {
          billToAddress: customer.billingAddress,
          billToName,
          shipToAddress: customer.shippingAddress,
          shipToName: customer.shippingAddress ? billToName : "",
        }),
  };
}

function buildFooterData(
  data: Record<string, unknown>,
  content: DocumentContent,
) {
  const { currency, totals, items } = content;
  const major = (minor: number) => minorUnitsToMajorString(minor, currency);
  const rates = new Set(items.map((item) => item.taxRateBps));
  const discounts = new Set(items.map((item) => item.discountBps));
  const discountedMinor = totals.subtotalMinor - totals.discountMinor;
  const effectiveRate =
    discountedMinor > 0 ? (totals.taxMinor / discountedMinor) * 100 : 0;
  const effectiveDiscount =
    totals.subtotalMinor > 0
      ? (totals.discountMinor / totals.subtotalMinor) * 100
      : 0;

  return {
    ...data,
    discount: major(totals.discountMinor),
    discountMode: "amount",
    discountRate: effectiveDiscount.toFixed(2),
    // With mixed rates a blended percentage would only confuse.
    showDiscountRate: discounts.size <= 1 && data.showDiscountRate !== false,
    showTaxRate: rates.size <= 1 && data.showTaxRate !== false,
    subtotal: major(totals.subtotalMinor),
    taxAmount: major(totals.taxMinor),
    taxMode: "amount",
    taxRate: effectiveRate.toFixed(2),
    total: major(totals.totalMinor),
    ...(content.type === "invoice" &&
    content.paymentTermsDays !== null &&
    !(typeof data.paymentTerms === "string" && data.paymentTerms.trim())
      ? { paymentTerms: `Due within ${content.paymentTermsDays} days` }
      : {}),
    ...(content.type === "receipt"
      ? {
          paymentMethod: content.payment?.method ?? "",
          transactionId: content.payment?.reference ?? "",
        }
      : {}),
  };
}

/**
 * Fills a template's header, items and footer sections with a deal
 * document's details. Other sections (notes, terms, …) are left as designed.
 */
export function buildDocumentSections({
  template,
  content,
  parties,
}: {
  template: DocumentTemplate;
  content: DocumentContent;
  parties: DocumentParties;
}): TemplateSection[] {
  const prefix = BUILDER_TEMPLATE_TYPES[content.type];
  return template.sections.map((section) => {
    if (section.type === `${prefix}-header`) {
      return {
        ...section,
        data: buildHeaderData(
          section.data,
          content,
          parties,
          template.sampleValues,
        ),
      };
    }
    if (section.type === `${prefix}-items`) {
      return {
        ...section,
        data: { ...section.data, items: toTemplateItems(content) },
      };
    }
    if (section.type === `${prefix}-footer`) {
      return { ...section, data: buildFooterData(section.data, content) };
    }
    return section;
  });
}

export function buildDocumentGlobalStyles(
  template: DocumentTemplate,
  currency: string,
) {
  return { ...template.globalStyles, currency };
}

export type RenderedDocument = {
  type: DealDocumentType;
  sections: TemplateSection[];
  globalStyles: Record<string, string>;
  colorPalette: string[];
};

export function renderDocumentHtml(
  document: RenderedDocument,
  mode: "preview" | "export",
) {
  const render = mode === "preview" ? generatePreviewHTML : generateExportHTML;
  return render(
    document.sections,
    document.globalStyles,
    BUILDER_TEMPLATE_TYPES[document.type],
    document.colorPalette,
  );
}
