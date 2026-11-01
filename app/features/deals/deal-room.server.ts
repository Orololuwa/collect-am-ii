import type { DealDocumentType } from "./deal-documents";
import { DOCUMENT_TYPE_NAMES } from "./deal-emails.server";
import { parseDealItems } from "./deal-items";
import {
  isDealShareTokenValid,
  parseDealShareToken,
} from "./deal-share-link.server";
import type { DealEventType } from "./deals-constants";
import { LINK_NOTIFICATION_TYPE } from "~/features/notifications/notification-constants";
import { createNotificationForUsersInDatabaseById } from "~/features/notifications/notifications-model.server";
import { prisma } from "~/utils/database.server";

/** Events the customer sees on their trail; the rest are internal. */
export const CUSTOMER_EVENT_TYPES = [
  "documentSent",
  "documentAccepted",
  "documentDeclined",
  "changesProposed",
  "proposalApproved",
  "proposalRejected",
  "paymentRecorded",
  "dealWon",
  "purchaseOrderReceived",
] as const satisfies readonly DealEventType[];

/**
 * The deal a share link points to, if the link is still valid. Returns null
 * for a malformed, forged or reset link, so callers answer with a 404.
 */
export async function retrieveDealForShareToken(token: string) {
  const parsed = parseDealShareToken(token);
  if (!parsed) {
    return null;
  }
  const deal = await prisma.deal.findUnique({
    select: {
      id: true,
      organizationId: true,
      shareNonce: true,
      shareRevokedAt: true,
    },
    where: { id: parsed.dealId },
  });
  if (!deal || deal.shareRevokedAt || !isDealShareTokenValid(token, deal)) {
    return null;
  }
  return deal;
}

/** Everything the deal room shows. Drafts the customer hasn't been sent stay hidden. */
export async function retrieveDealRoomFromDatabase(dealId: string) {
  const deal = await prisma.deal.findUnique({
    include: {
      customer: { select: { companyName: true, name: true } },
      events: {
        orderBy: { createdAt: "desc" },
        take: 100,
        where: { type: { in: [...CUSTOMER_EVENT_TYPES] } },
      },
      messages: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
        take: 500,
      },
      organization: {
        select: { billingEmail: true, imageUrl: true, name: true },
      },
      steps: {
        include: {
          document: {
            include: {
              versions: {
                omit: {
                  colorPalette: true,
                  globalStyles: true,
                  sections: true,
                },
                orderBy: { version: "desc" },
                where: { state: { in: ["current", "proposed"] } },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
    where: { id: dealId },
  });
  if (!deal) {
    return null;
  }
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      description: true,
      id: true,
      name: true,
      taxRateBps: true,
      unit: true,
      unitPriceMinor: true,
    },
    take: 500,
    where: {
      archivedAt: null,
      currency: deal.currency,
      organizationId: deal.organizationId,
    },
  });
  return { deal, products };
}

export type DealRoomData = NonNullable<
  Awaited<ReturnType<typeof retrieveDealRoomFromDatabase>>
>;

/** Shapes the deal for the customer: only what they've been sent. */
export function toDealRoomView({ deal, products }: DealRoomData) {
  const documents = new Map<string, { type: string; number: string | null }>();
  for (const step of deal.steps) {
    if (step.document) {
      documents.set(step.document.id, {
        number: step.document.number,
        type: step.document.type,
      });
    }
  }

  return {
    currency: deal.currency,
    customer: deal.customer,
    events: deal.events.map((event) => ({
      createdAt: event.createdAt,
      document: event.documentId
        ? (documents.get(event.documentId) ?? null)
        : null,
      id: event.id,
      payload: (event.payload ?? {}) as Record<string, unknown>,
      type: event.type as (typeof CUSTOMER_EVENT_TYPES)[number],
    })),
    id: deal.id,
    messages: deal.messages.map((message) => ({
      author: message.author,
      body: message.body,
      createdAt: message.createdAt,
      id: message.id,
      name: message.author === "business" ? message.user?.name || null : null,
    })),
    organization: deal.organization,
    products,
    status: deal.status,
    steps: deal.steps.map((step) => {
      const document = step.document;
      const visible = document && document.status !== "draft";
      const current = document?.versions.find(
        (version) => version.state === "current",
      );
      const proposal = document?.versions.find(
        (version) => version.state === "proposed",
      );
      return {
        amountDueMinor: step.amountDueMinor,
        amountPaidMinor: step.amountPaidMinor,
        document:
          visible && document && current
            ? {
                acceptedAt: document.acceptedAt,
                acceptedByName: document.acceptedByName,
                current: {
                  id: current.id,
                  items: parseDealItems(current.items),
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
                      items: parseDealItems(proposal.items),
                      note: proposal.note,
                      totalMinor: proposal.totalMinor,
                    }
                  : null,
                sentAt: document.sentAt,
                status: document.status,
                type: document.type,
              }
            : null,
        /** A document the business is still preparing. */
        preparing: Boolean(document && document.status === "draft"),
        documentType:
          step.documentType ?? (step.kind === "receipt" ? "receipt" : null),
        id: step.id,
        kind: step.kind,
        name: step.name,
        paidAt: step.paidAt,
        negotiable: step.negotiable,
        requestsPurchaseOrder: step.requestsPurchaseOrder,
        requiresAcceptance: step.requiresAcceptance,
        status: step.status,
      };
    }),
    title: deal.title,
  };
}

export type DealRoomView = ReturnType<typeof toDealRoomView>;

/** Tells the organization's members what the customer did. */
export async function notifyDealMembers({
  organizationId,
  dealId,
  text,
}: {
  organizationId: string;
  dealId: string;
  text: string;
}) {
  const [organization, memberships] = await Promise.all([
    prisma.organization.findUnique({
      select: { slug: true },
      where: { id: organizationId },
    }),
    prisma.organizationMembership.findMany({
      select: { memberId: true },
      where: { deactivatedAt: null, organizationId },
    }),
  ]);
  if (!organization) {
    return;
  }
  await createNotificationForUsersInDatabaseById({
    content: {
      href: `/organizations/${organization.slug}/deals/${dealId}`,
      text,
      type: LINK_NOTIFICATION_TYPE,
    },
    organizationId,
    userIds: memberships.map((membership) => membership.memberId),
  });
}

/** "Quote QUO-0003", in English for notifications and emails. */
export function documentName(document: {
  type: string;
  number: string | null;
}) {
  const name = DOCUMENT_TYPE_NAMES[document.type as DealDocumentType];
  return document.number ? `${name} ${document.number}` : name;
}
