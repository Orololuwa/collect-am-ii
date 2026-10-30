import type { Route } from "./+types/$dealId_.documents.$documentId.preview";
import { renderDealDocument } from "~/features/deals/deal-rendering.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { notFound } from "~/utils/http-responses.server";

/** The document as HTML, for the preview frame on the deal page. */
export async function loader({ params, context }: Route.LoaderArgs) {
  const { organization } = context.get(organizationMembershipContext);
  const rendered = await renderDealDocument({
    documentId: params.documentId,
    mode: "preview",
    organizationId: organization.id,
  });
  if (!rendered || rendered.document.dealId !== params.dealId) {
    throw notFound();
  }
  return new Response(rendered.html, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
