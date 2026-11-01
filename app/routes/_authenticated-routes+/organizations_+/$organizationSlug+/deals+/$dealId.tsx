import { data, href } from "react-router";

import type { Route } from "./+types/$dealId";
import type { DealView } from "~/features/deals/components/deal-detail";
import { DealDetail } from "~/features/deals/components/deal-detail";
import { parseDealItems } from "~/features/deals/deal-items";
import { createDealShareUrl } from "~/features/deals/deal-share-link.server";
import { dealDetailAction } from "~/features/deals/deals-action.server";
import type { DealEventType } from "~/features/deals/deals-constants";
import {
  retrieveDealFromDatabaseById,
  retrieveDealProductsFromDatabase,
} from "~/features/deals/deals-model.server";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { getPageTitle } from "~/utils/get-page-title.server";
import { notFound } from "~/utils/http-responses.server";

const displayName = (user: { name: string; email: string } | null) =>
  user ? user.name || user.email : null;

export async function loader({ params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const deal = await retrieveDealFromDatabaseById({
    dealId: params.dealId,
    organizationId: organization.id,
  });
  if (!deal) {
    throw notFound();
  }
  const products = await retrieveDealProductsFromDatabase({
    currency: deal.currency,
    organizationId: organization.id,
  });

  const documents = new Map(
    deal.steps.flatMap((step) =>
      step.document
        ? [
            [
              step.document.id,
              { number: step.document.number, type: step.document.type },
            ],
          ]
        : [],
    ),
  );

  const view: DealView = {
    closedAt: deal.closedAt,
    createdAt: deal.createdAt,
    createdByName: displayName(deal.createdBy),
    currency: deal.currency,
    customer: {
      companyName: deal.customer.companyName,
      email: deal.customer.email,
      id: deal.customer.id,
      name: deal.customer.name,
      phone: deal.customer.phone,
    },
    events: deal.events.map((event) => ({
      actor: event.actor,
      createdAt: event.createdAt,
      document: event.documentId
        ? (documents.get(event.documentId) ?? null)
        : null,
      id: event.id,
      payload: (event.payload ?? {}) as Record<string, unknown>,
      type: event.type as DealEventType,
      userName: displayName(event.user),
    })),
    id: deal.id,
    messages: deal.messages.map((message) => ({
      author: message.author,
      body: message.body,
      createdAt: message.createdAt,
      id: message.id,
      userName: displayName(message.user),
    })),
    status: deal.status,
    steps: deal.steps.map((step) => {
      const document = step.document;
      const current =
        document?.versions.find(
          (version) => version.id === document.acceptedVersionId,
        ) ?? document?.versions.find((version) => version.state === "current");
      const proposal = document?.versions.find(
        (version) => version.state === "proposed",
      );
      return {
        amountDueMinor: step.amountDueMinor,
        amountPaidMinor: step.amountPaidMinor,
        document:
          document && current
            ? {
                acceptedAt: document.acceptedAt,
                acceptedByName: document.acceptedByName,
                current: {
                  items: parseDealItems(current.items),
                  note: current.note,
                  discountMinor: current.discountMinor,
                  subtotalMinor: current.subtotalMinor,
                  taxMinor: current.taxMinor,
                  totalMinor: current.totalMinor,
                  version: current.version,
                },
                declineReason: document.declineReason,
                dueAt: document.dueAt,
                id: document.id,
                number: document.number,
                proposal: proposal
                  ? {
                      createdAt: proposal.createdAt,
                      id: proposal.id,
                      items: parseDealItems(proposal.items),
                      note: proposal.note,
                      discountMinor: proposal.discountMinor,
                      subtotalMinor: proposal.subtotalMinor,
                      taxMinor: proposal.taxMinor,
                      totalMinor: proposal.totalMinor,
                      version: proposal.version,
                    }
                  : null,
                sentAt: document.sentAt,
                status: document.status,
                type: document.type,
                versionCount: document.versions.length,
              }
            : null,
        id: step.id,
        kind: step.kind,
        name: step.name,
        paidAt: step.paidAt,
        paymentMethod: step.paymentMethod,
        paymentReference: step.paymentReference,
        payments: step.payments,
        requestsPurchaseOrder: step.requestsPurchaseOrder,
        requiresAcceptance: step.requiresAcceptance,
        status: step.status,
        validityDays: step.validityDays,
      };
    }),
    purchaseOrder: deal.purchaseOrderNumber
      ? {
          downloadUrl: href(
            "/organizations/:organizationSlug/deals/:dealId/purchase-order",
            { dealId: deal.id, organizationSlug: params.organizationSlug },
          ),
          fileName: deal.purchaseOrderFileId ? deal.purchaseOrderFileName : "",
          number: deal.purchaseOrderNumber,
          receivedAt: deal.purchaseOrderReceivedAt,
        }
      : null,
    shareUrl: createDealShareUrl(deal),
    title: deal.title,
    workflowName: deal.workflowName,
  };

  return data(
    {
      breadcrumb: {
        title: deal.title,
        to: href("/organizations/:organizationSlug/deals/:dealId", {
          dealId: deal.id,
          organizationSlug: params.organizationSlug,
        }),
      },
      deal: view,
      pageTitle: getPageTitle(i18n.t.bind(i18n), "deals:pageTitle"),
      products,
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  return await dealDetailAction(args, args.params.dealId);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function DealRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  return (
    <DealDetail
      deal={loaderData.deal}
      organizationSlug={params.organizationSlug}
      products={loaderData.products}
    />
  );
}
