import type { Route } from "./+types/$token_.documents.$documentId.pdf";
import type { DealDocumentType } from "~/features/deals/deal-documents";
import { DOCUMENT_TYPE_NAMES } from "~/features/deals/deal-emails.server";
import { renderDealDocument } from "~/features/deals/deal-rendering.server";
import { retrieveDealForShareToken } from "~/features/deals/deal-room.server";
import { generatePDF } from "~/features/templates/shared/utils/pdf-generator.server";
import { notFound } from "~/utils/http-responses.server";

/** Downloads a sent document as a PDF from the deal room. */
export async function loader({ params }: Route.LoaderArgs) {
  const deal = await retrieveDealForShareToken(params.token);
  if (!deal) {
    throw notFound();
  }
  const rendered = await renderDealDocument({
    documentId: params.documentId,
    mode: "export",
    organizationId: deal.organizationId,
  });
  if (
    !rendered ||
    rendered.document.dealId !== deal.id ||
    rendered.document.status === "draft"
  ) {
    throw notFound();
  }

  const { document } = rendered;
  const pdf = await generatePDF(rendered.html);
  const name = `${DOCUMENT_TYPE_NAMES[document.type as DealDocumentType]} ${
    document.number ?? ""
  }`.trim();
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}.pdf"`,
      "Content-Type": "application/pdf",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
