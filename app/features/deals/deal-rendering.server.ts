import type { DealDocumentType } from "./deal-documents";
import { paymentMethodName } from "./deal-documents";
import { calculateDealTotals, parseDealItems } from "./deal-items";
import {
  buildDocumentGlobalStyles,
  buildDocumentSections,
  renderDocumentHtml,
  resolveDocumentTemplate,
} from "./document-mapping.server";
import type { TemplateSection } from "~/features/templates/shared/types";
import { prisma } from "~/utils/database.server";

/**
 * A deal document as HTML: the snapshot taken when it was sent, or for a
 * draft, its current lines in today's template.
 */
export async function renderDealDocument({
  documentId,
  organizationId,
  mode,
}: {
  documentId: string;
  /** Limits the lookup to one organization's deals, when given. */
  organizationId?: string;
  mode: "preview" | "export";
}) {
  const document = await prisma.dealDocument.findFirst({
    include: {
      deal: {
        include: {
          customer: true,
          organization: {
            select: { billingEmail: true, imageUrl: true, name: true },
          },
          steps: { orderBy: { position: "asc" } },
        },
      },
      step: true,
      versions: { where: { state: "current" } },
    },
    where: {
      id: documentId,
      ...(organizationId ? { deal: { organizationId } } : {}),
    },
  });
  const version =
    document?.versions.find((v) => v.id === document.acceptedVersionId) ??
    document?.versions[0];
  if (!document || !version) {
    return null;
  }

  const type = document.type as DealDocumentType;
  const html = version.sections
    ? renderDocumentHtml(
        {
          colorPalette: (version.colorPalette as string[] | null) ?? [],
          globalStyles: (version.globalStyles as Record<string, string>) ?? {},
          sections: version.sections as unknown as TemplateSection[],
          type,
        },
        mode,
      )
    : await renderDraft();

  return { document, html, version };

  async function renderDraft() {
    if (!document || !version) return "";
    const { deal, step } = document;
    const template = await resolveDocumentTemplate({
      organizationId: deal.organizationId,
      templateId: step.templateId,
      type,
    });
    const items = parseDealItems(version.items);
    const paymentStep = deal.steps.find(
      (candidate) => candidate.position === step.position - 1,
    );
    return renderDocumentHtml(
      {
        colorPalette: template.colorPalette,
        globalStyles: buildDocumentGlobalStyles(template, deal.currency),
        sections: buildDocumentSections({
          content: {
            currency: deal.currency,
            dueAt: document.dueAt,
            issuedAt: document.issuedAt ?? new Date(),
            items,
            number: document.number,
            payment:
              type === "receipt" && paymentStep
                ? {
                    method: paymentMethodName(paymentStep.paymentMethod),
                    reference: paymentStep.paymentReference,
                  }
                : undefined,
            paymentTermsDays: step.paymentTermsDays,
            purchaseOrderNumber: deal.purchaseOrderNumber,
            totals: calculateDealTotals(items),
            type,
          },
          parties: { customer: deal.customer, organization: deal.organization },
          template,
        }),
        type,
      },
      mode,
    );
  }
}
