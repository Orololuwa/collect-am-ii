import { init } from "@paralleldrive/cuid2";

import { getCurrencyMinorUnitExponent } from "~/features/checkout/money";
import {
  generateReceiptExportHTML,
  generateReceiptPreviewHTML,
} from "~/features/templates/receipt/utils/html-generator-receipt.server";
import type { TemplateSection } from "~/features/templates/shared/types";
import { sendDocumentEmail } from "~/features/templates/shared/utils/email-sender.server";
import { generatePDF } from "~/features/templates/shared/utils/pdf-generator.server";
import type { Prisma, Receipt } from "~/generated/client";
import { prisma } from "~/utils/database.server";

const cuid = init({ length: 6 });

type ReceiptLineItem = {
  description: string;
  quantity: number;
  /** Null when the stored item has no unit price at all. */
  unitPriceMinor: number | null;
};

function createReceiptNumber() {
  const year = new Date().getFullYear();
  return `RCP-${year}-${cuid().toUpperCase()}`;
}

function formatMinorToMajor(amountMinor: number, currency: string) {
  const exponent = getCurrencyMinorUnitExponent(currency);
  return (amountMinor / 10 ** exponent).toFixed(exponent);
}

function toFiniteNumber(x: unknown): number | null {
  if (typeof x !== "number" && typeof x !== "string") return null;
  if (typeof x === "string" && x.trim() === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reads a stored payment item. Current rows hold
 * `{ description, quantity: number, unitPriceMinor: number }`; older rows hold
 * the checkout line shape `{ description, quantity, unitPrice, total }` with
 * major-unit strings.
 */
function parsePaymentItem(raw: unknown, currency: string): ReceiptLineItem {
  const item =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  const description =
    typeof item.description === "string" && item.description
      ? item.description
      : "Item";
  const quantity = toFiniteNumber(item.quantity) ?? 1;

  const unitPriceMinor = toFiniteNumber(item.unitPriceMinor);
  if (unitPriceMinor !== null) {
    return {
      description,
      quantity,
      unitPriceMinor: Math.round(unitPriceMinor),
    };
  }

  const unitPriceMajor = toFiniteNumber(item.unitPrice);
  if (unitPriceMajor !== null) {
    const factor = 10 ** getCurrencyMinorUnitExponent(currency);
    return {
      description,
      quantity,
      unitPriceMinor: Math.round(unitPriceMajor * factor),
    };
  }

  return { description, quantity, unitPriceMinor: null };
}

type UnknownSection = { type?: unknown; data?: unknown };

function getCheckoutHeaderData(sections: unknown) {
  if (!Array.isArray(sections)) return {};
  const header = sections.find((s): s is UnknownSection => {
    if (typeof s !== "object" || s === null) return false;
    return (s as UnknownSection).type === "checkout-header";
  });
  const data = header?.data;
  return typeof data === "object" && data !== null
    ? (data as Record<string, unknown>)
    : {};
}

function buildReceiptSections({
  templateSections,
  checkoutHeaderData,
  payment,
  receiptNumber,
}: {
  templateSections: TemplateSection[];
  checkoutHeaderData: Record<string, unknown>;
  payment: {
    provider: string;
    providerPaymentId: string;
    amountMinor: number;
    currency: string;
    customerEmail: string;
    items: unknown;
  };
  receiptNumber: string;
}) {
  const itemsArray = Array.isArray(payment.items)
    ? payment.items.map((raw) => parsePaymentItem(raw, payment.currency))
    : [];

  const lineItems =
    itemsArray.length > 0
      ? itemsArray.map((item) => {
          // Only a lone item without a price can safely take the paid amount.
          const unitPriceMinor =
            item.unitPriceMinor ??
            (itemsArray.length === 1
              ? Math.round(payment.amountMinor / Math.max(1, item.quantity))
              : 0);
          const totalMinor = Math.round(unitPriceMinor * item.quantity);

          return {
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: formatMinorToMajor(unitPriceMinor, payment.currency),
            total: formatMinorToMajor(totalMinor, payment.currency),
          };
        })
      : [
          {
            description: "Payment",
            quantity: "1",
            unitPrice: formatMinorToMajor(
              payment.amountMinor,
              payment.currency,
            ),
            total: formatMinorToMajor(payment.amountMinor, payment.currency),
          },
        ];

  const subtotalMajor = formatMinorToMajor(
    payment.amountMinor,
    payment.currency,
  );

  return templateSections.map((section) => {
    if (section.type === "receipt-header") {
      return {
        ...section,
        data: {
          ...section.data,
          storeName: checkoutHeaderData.storeName ?? section.data.storeName,
          storeLogo: checkoutHeaderData.storeLogo ?? section.data.storeLogo,
          storeAddress:
            checkoutHeaderData.storeAddress ?? section.data.storeAddress,
          storeEmail: checkoutHeaderData.storeEmail ?? section.data.storeEmail,
          storePhone: checkoutHeaderData.storePhone ?? section.data.storePhone,
          receiptNumber,
          receiptDate: new Date().toLocaleDateString(),
          transactionId: payment.providerPaymentId,
        },
      };
    }

    if (section.type === "receipt-items") {
      return {
        ...section,
        data: {
          ...section.data,
          items: lineItems,
        },
      };
    }

    if (section.type === "receipt-footer") {
      return {
        ...section,
        data: {
          ...section.data,
          subtotal: subtotalMajor,
          taxAmount: section.data.taxAmount ?? "0",
          discount: section.data.discount ?? "0",
          total: subtotalMajor,
          paymentMethod: payment.provider,
          transactionId: payment.providerPaymentId,
        },
      };
    }

    return section;
  });
}

export async function generateReceiptForPaymentInDatabaseById({
  paymentId,
}: {
  paymentId: string;
}): Promise<Receipt | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      checkoutPage: true,
      receipt: true,
    },
  });

  if (!payment) return null;
  if (payment.receipt) return payment.receipt;
  // Deal payments get their receipt from the deal's own receipt step.
  if (!payment.checkoutPage?.receiptTemplateId) return null;

  const template = await prisma.template.findFirst({
    where: {
      id: payment.checkoutPage.receiptTemplateId,
      organizationId: payment.organizationId,
    },
  });

  if (!template) return null;

  const templateSections = template.sections as unknown as TemplateSection[];
  const checkoutHeaderData = getCheckoutHeaderData(
    payment.checkoutPage.sections,
  );
  const receiptNumber = createReceiptNumber();

  const mergedSections = buildReceiptSections({
    checkoutHeaderData,
    payment: {
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      customerEmail: payment.customerEmail,
      items: payment.items,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
    },
    receiptNumber,
    templateSections,
  });

  const created = await prisma.receipt.create({
    data: {
      colorPalette: template.colorPalette as unknown as Prisma.InputJsonValue,
      globalStyles: template.globalStyles as unknown as Prisma.InputJsonValue,
      issuedAt: new Date(),
      payment: { connect: { id: payment.id } },
      receiptNumber,
      sections: mergedSections as unknown as Prisma.InputJsonValue,
      template: { connect: { id: template.id } },
      sentToEmail: null,
      sentAt: null,
    },
  });

  return created;
}

export async function sendReceiptEmailForReceiptInDatabaseById({
  receiptId,
}: {
  receiptId: string;
}) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { payment: true, template: true },
  });
  if (!receipt) return null;

  const to = receipt.payment.customerEmail;
  if (!to) return receipt;

  const sections = receipt.sections as unknown as TemplateSection[];
  const globalStyles = receipt.globalStyles as unknown as Record<
    string,
    string
  >;
  const colorPalette = (receipt.colorPalette as unknown as string[]) || [];

  const html = generateReceiptExportHTML(sections, globalStyles, colorPalette);
  const pdfBuffer = await generatePDF(html);

  // Sent from EMAIL_FROM. The idempotency key stops a retried payment webhook
  // from emailing the same receipt twice.
  const result = await sendDocumentEmail({
    html: `<p>Your receipt is attached. Receipt #: <strong>${receipt.receiptNumber}</strong></p>`,
    pdfBuffer,
    pdfFilename: `receipt-${receipt.receiptNumber}.pdf`,
    idempotencyKey: `receipt-email-${receipt.id}`,
    subject: `Your receipt ${receipt.receiptNumber}`,
    to,
  });

  if (result.success) {
    await prisma.receipt.update({
      data: { sentAt: new Date(), sentToEmail: to },
      where: { id: receipt.id },
    });
  }

  return receipt;
}

export async function generateReceiptPreviewHtmlForReceiptInDatabaseById({
  receiptId,
}: {
  receiptId: string;
}) {
  const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!receipt) return null;

  const sections = receipt.sections as unknown as TemplateSection[];
  const globalStyles = receipt.globalStyles as unknown as Record<
    string,
    string
  >;
  const colorPalette = (receipt.colorPalette as unknown as string[]) || [];

  return generateReceiptPreviewHTML(sections, globalStyles, colorPalette);
}
