import { render } from "@react-email/components";

import { DealDocumentEmail } from "./deal-document-email";
import type { DealDocumentType } from "./deal-documents";
import type { DealEffects } from "./deal-engine.server";
import { renderDealDocument } from "./deal-rendering.server";
import { createDealShareUrl } from "./deal-share-link.server";
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
        include: {
          customer: true,
          organization: { select: { billingEmail: true, name: true } },
        },
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
  const shareUrl = createDealShareUrl(deal);
  const typeName = DOCUMENT_TYPE_NAMES[document.type as DealDocumentType];
  const total = formatMoney({
    amountMinor: version.totalMinor,
    currency: deal.currency,
    locale: "en",
  });
  const documentLabel = `${typeName.toLowerCase()} ${document.number}`;
  const lowerType = typeName.toLowerCase();
  const { buttonText, nextSteps } = document.step.requiresAcceptance
    ? {
        buttonText: `Review ${lowerType}`,
        nextSteps:
          "On that page you can accept it, ask for changes or send a question.",
      }
    : document.type === "invoice"
      ? {
          buttonText: "View and pay invoice",
          nextSteps:
            "On that page you can see how to pay and download every document for this deal.",
        }
      : {
          buttonText: `View ${lowerType}`,
          nextSteps: "Every document for this deal is on the same page.",
        };
  const email = (
    <DealDocumentEmail
      appName={appName}
      buttonText={buttonText}
      customerName={deal.customer.name}
      dealTitle={deal.title}
      documentLabel={documentLabel}
      nextSteps={nextSteps}
      organizationName={deal.organization.name}
      shareUrl={shareUrl}
      total={total}
    />
  );
  const [html, text] = await Promise.all([
    render(email),
    render(email, { plainText: true }),
  ]);

  try {
    const pdfBuffer = await generatePDF(rendered.html);
    const result = await sendDocumentEmail({
      from: getDocumentSender({
        appName,
        organizationName: deal.organization.name,
      }),
      html,
      idempotencyKey,
      pdfBuffer,
      pdfFilename: `${typeName} ${document.number}.pdf`,
      text,
      // Automatic sends have no person behind them; replies go to the business.
      replyTo: replyTo ?? (deal.organization.billingEmail || undefined),
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
