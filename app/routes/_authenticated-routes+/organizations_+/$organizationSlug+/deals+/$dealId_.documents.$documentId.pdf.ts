import type { Route } from "./+types/$dealId_.documents.$documentId.pdf";
import type { DealDocumentType } from "~/features/deals/deal-documents";
import { DOCUMENT_TYPE_NAMES } from "~/features/deals/deal-emails.server";
import { renderDealDocument } from "~/features/deals/deal-rendering.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { generatePDF } from "~/features/templates/shared/utils/pdf-generator.server";
import { notFound } from "~/utils/http-responses.server";

/** Downloads the document as a PDF. */
export async function loader({ params, context }: Route.LoaderArgs) {
  const { organization } = context.get(organizationMembershipContext);
  const rendered = await renderDealDocument({
    documentId: params.documentId,
    mode: "export",
    organizationId: organization.id,
  });
  if (!rendered || rendered.document.dealId !== params.dealId) {
    throw notFound();
  }

  const { document } = rendered;
  const pdf = await generatePDF(rendered.html);
  const name = `${DOCUMENT_TYPE_NAMES[document.type as DealDocumentType]} ${
    document.number ?? "draft"
  }.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
      "Content-Type": "application/pdf",
    },
  });
}
