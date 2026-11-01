import { redirect } from "react-router";

import type { Route } from "./+types/$dealId_.purchase-order";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { prisma } from "~/utils/database.server";
import { notFound } from "~/utils/http-responses.server";
import { getPrivateFileUrl } from "~/utils/storage.server";

/** Downloads the purchase order file the customer attached when accepting. */
export async function loader({ params, context }: Route.LoaderArgs) {
  const { organization } = context.get(organizationMembershipContext);
  const deal = await prisma.deal.findFirst({
    select: { purchaseOrderFileId: true },
    where: { id: params.dealId, organizationId: organization.id },
  });
  if (!deal?.purchaseOrderFileId) {
    throw notFound();
  }
  return redirect(getPrivateFileUrl(deal.purchaseOrderFileId), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
