import type { DealDocumentType } from "./deal-documents";
import type { DealEffects } from "./deal-engine.server";
import { renderDealDocument } from "./deal-rendering.server";
import { formatMoney } from "~/features/organizations/dashboard/dashboard-format";
import {
  getDocumentSender,
  sendDocumentEmail,
} from "~/features/templates/shared/utils/email-sender.server";
import { generatePDF } from "~/features/templates/shared/utils/pdf-generator.server";
import { prisma } from "~/utils/database.server";

/** Customer-facing names, used in the email and the PDF's file name. */
export const DOCUMENT_TYPE_NAMES = {
  estimate: "Estimate",
  invoice: "Invoice",
  orderConfirmation: "Order confirmation",
  purchaseOrder: "Purchase order",
  quote: "Quote",
  receipt: "Receipt",
  salesOrder: "Sales order",
} as const satisfies Record<DealDocumentType, string>;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Emails a sent document to the deal's customer with the PDF attached.
 * Returns false if it couldn't be sent; the deal itself has already moved on.
 */
export async function emailDealDocument({
  documentId,
  idempotencyKey,
  appName,
  replyTo,
}: {
  documentId: string;
  idempotencyKey?: string;
  appName: string;
  replyTo?: string;
}) {
  const document = await prisma.dealDocument.findUnique({
    include: {
      deal: {
        include: { customer: true, organization: { select: { name: true } } },
      },
      step: { select: { requiresAcceptance: true } },
      versions: { where: { state: "current" } },
    },
    where: { id: documentId },
  });
  const version = document?.versions[0];
  const rendered = await renderDealDocument({ documentId, mode: "export" });
  if (!document || !version || !rendered || !document.number) {
    return false;
  }

  const { deal } = document;
  const typeName = DOCUMENT_TYPE_NAMES[document.type as DealDocumentType];
  const total = formatMoney({
    amountMinor: version.totalMinor,
    currency: deal.currency,
    locale: "en",
  });
  const body = [
    `<p>Hi ${escapeHtml(deal.customer.name)},</p>`,
    `<p>${escapeHtml(deal.organization.name)} sent you ${escapeHtml(typeName.toLowerCase())} <strong>${escapeHtml(document.number)}</strong> for ${escapeHtml(deal.title)}. The total is <strong>${escapeHtml(total)}</strong>, and the PDF is attached.</p>`,
    document.step.requiresAcceptance
      ? "<p>Reply to this email to accept it or to ask for changes.</p>"
      : "",
  ].join("");

  try {
    const pdfBuffer = await generatePDF(rendered.html);
    const result = await sendDocumentEmail({
      from: getDocumentSender({
        appName,
        organizationName: deal.organization.name,
      }),
      html: body,
      idempotencyKey,
      pdfBuffer,
      pdfFilename: `${typeName} ${document.number}.pdf`,
      replyTo,
      subject: `${typeName} ${document.number} from ${deal.organization.name}`,
      to: deal.customer.email,
    });
    return result.success;
  } catch (error) {
    console.error("Failed to email deal document", documentId, error);
    return false;
  }
}

/** Sends the emails a transition queued. Returns how many failed. */
export async function deliverDealEffects(
  effects: DealEffects,
  options: { appName: string; replyTo?: string },
) {
  let failed = 0;
  for (const email of effects.emails) {
    const sent = await emailDealDocument({ ...email, ...options });
    if (!sent) failed += 1;
  }
  return failed;
}
