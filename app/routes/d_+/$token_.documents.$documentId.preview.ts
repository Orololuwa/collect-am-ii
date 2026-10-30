import type { Route } from "./+types/$token_.documents.$documentId.preview";
import { renderDealDocument } from "~/features/deals/deal-rendering.server";
import { retrieveDealForShareToken } from "~/features/deals/deal-room.server";
import { notFound } from "~/utils/http-responses.server";

/** A sent document as HTML, for the deal room's preview frame. */
export async function loader({ params }: Route.LoaderArgs) {
  const deal = await retrieveDealForShareToken(params.token);
  if (!deal) {
    throw notFound();
  }
  const rendered = await renderDealDocument({
    documentId: params.documentId,
    mode: "preview",
    organizationId: deal.organizationId,
  });
  // Drafts stay private until the business sends them.
  if (
    !rendered ||
    rendered.document.dealId !== deal.id ||
    rendered.document.status === "draft"
  ) {
    throw notFound();
  }
  return new Response(rendered.html, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
