import { data } from "react-router";

import type { Route } from "./+types/$token";
import { DealRoom } from "~/features/deals/components/deal-room";
import { markDealDocumentViewed } from "~/features/deals/deal-engine.server";
import { getDealPaymentProviders } from "~/features/deals/deal-payments.server";
import {
  documentName,
  notifyDealMembers,
  retrieveDealForShareToken,
  retrieveDealRoomFromDatabase,
  toDealRoomView,
} from "~/features/deals/deal-room.server";
import { dealRoomAction } from "~/features/deals/deal-room-action.server";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { notFound } from "~/utils/http-responses.server";
import { getClientIp } from "~/utils/rate-limit.server";

/** The link carries access, so keep it out of search results and referrers. */
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const i18n = getInstance(context);
  const deal = await retrieveDealForShareToken(params.token);
  if (!deal) {
    throw notFound();
  }

  let room = await retrieveDealRoomFromDatabase(deal.id);
  if (!room) {
    throw notFound();
  }

  // The first time the customer opens a sent document, tell the business.
  const current = room.deal.steps.find(
    (step) => step.status === "active",
  )?.document;
  if (current?.status === "sent") {
    const { result: marked } = await markDealDocumentViewed({
      actor: {
        ip: getClientIp(request),
        party: "customer",
        userAgent: request.headers.get("user-agent") ?? "",
        userId: null,
      },
      dealId: deal.id,
      documentId: current.id,
      organizationId: deal.organizationId,
    });
    if (marked) {
      await notifyDealMembers({
        dealId: deal.id,
        organizationId: deal.organizationId,
        text: `${room.deal.customer.name} viewed ${documentName(current)}`,
      });
      room = (await retrieveDealRoomFromDatabase(deal.id)) ?? room;
    }
  }

  const view = toDealRoomView(room);
  const paymentStep = view.steps.find(
    (step) => step.status === "active" && step.kind === "payment",
  );
  return data(
    {
      appName: i18n.t("translation:appName"),
      pageTitle: i18n.t("dealRoom:pageTitle", {
        organization: view.organization.name,
        title: view.title,
      }),
      payment: {
        processing:
          Boolean(paymentStep) &&
          new URL(request.url).searchParams.get("payment") === "processing",
        providers: paymentStep ? getDealPaymentProviders(view.currency) : [],
      },
      room: view,
    },
    { headers: privateHeaders },
  );
}

export async function action(args: Route.ActionArgs) {
  return await dealRoomAction(args);
}

export const headers: Route.HeadersFunction = ({ loaderHeaders }) =>
  loaderHeaders;

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
  { content: "noindex, nofollow", name: "robots" },
  { content: "no-referrer", name: "referrer" },
];

export default function DealRoomRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  return (
    <DealRoom
      appName={loaderData.appName}
      payment={loaderData.payment}
      room={loaderData.room}
      token={params.token}
    />
  );
}
