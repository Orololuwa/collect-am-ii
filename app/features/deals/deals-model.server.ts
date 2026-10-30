import type { Prisma } from "~/generated/client";
import { prisma } from "~/utils/database.server";

export type DealListFilter = "open" | "closed";

const userName = { select: { email: true, name: true } } as const;

function dealListWhere({
  organizationId,
  filter,
  search,
}: {
  organizationId: string;
  filter: DealListFilter;
  search?: string;
}): Prisma.DealWhereInput {
  return {
    organizationId,
    status: filter === "open" ? "open" : { not: "open" },
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { customer: { name: { contains: search, mode: "insensitive" } } },
            {
              customer: {
                companyName: { contains: search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
}

export async function retrieveDealsPageFromDatabaseByOrganizationId({
  organizationId,
  filter,
  search,
  skip,
  take,
}: {
  organizationId: string;
  filter: DealListFilter;
  search?: string;
  skip: number;
  take: number;
}) {
  return await prisma.deal.findMany({
    include: {
      customer: { select: { companyName: true, name: true } },
      steps: {
        include: {
          document: {
            select: {
              acceptedVersionId: true,
              status: true,
              versions: {
                select: { id: true, state: true, totalMinor: true },
                where: { state: "current" },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    skip,
    take,
    where: dealListWhere({ filter, organizationId, search }),
  });
}

export async function countDealsInDatabaseByOrganizationId(args: {
  organizationId: string;
  filter: DealListFilter;
  search?: string;
}) {
  return await prisma.deal.count({ where: dealListWhere(args) });
}

export async function retrieveDealFromDatabaseById({
  organizationId,
  dealId,
}: {
  organizationId: string;
  dealId: string;
}) {
  return await prisma.deal.findFirst({
    include: {
      createdBy: userName,
      customer: true,
      events: {
        include: { user: userName },
        orderBy: { createdAt: "desc" },
        take: 200,
      },
      messages: {
        include: { user: userName },
        orderBy: { createdAt: "asc" },
        take: 500,
      },
      steps: {
        include: {
          payments: {
            orderBy: { createdAt: "desc" },
            select: {
              amountMinor: true,
              createdAt: true,
              id: true,
              provider: true,
              status: true,
            },
            where: { provider: { not: "manual" } },
          },
          document: {
            include: {
              versions: {
                include: { createdBy: userName },
                omit: {
                  colorPalette: true,
                  globalStyles: true,
                  sections: true,
                },
                orderBy: { version: "desc" },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
    where: { id: dealId, organizationId },
  });
}

/** What the new-deal form offers: active workflows, customers and products. */
export async function retrieveNewDealOptionsFromDatabase(
  organizationId: string,
) {
  const [workflows, customers, products] = await Promise.all([
    prisma.workflow.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        steps: {
          orderBy: { position: "asc" },
          select: { documentType: true, kind: true, name: true },
        },
      },
      where: { archivedAt: null, organizationId },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { companyName: true, email: true, id: true, name: true },
      take: 1000,
      where: { archivedAt: null, organizationId },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        currency: true,
        description: true,
        id: true,
        name: true,
        sku: true,
        taxRateBps: true,
        unit: true,
        unitPriceMinor: true,
      },
      take: 1000,
      where: { archivedAt: null, organizationId },
    }),
  ]);
  return { customers, products, workflows };
}

/** Active products in one currency, for adding lines to a deal's documents. */
export async function retrieveDealProductsFromDatabase({
  organizationId,
  currency,
}: {
  organizationId: string;
  currency: string;
}) {
  return await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      currency: true,
      description: true,
      id: true,
      name: true,
      sku: true,
      taxRateBps: true,
      unit: true,
      unitPriceMinor: true,
    },
    take: 1000,
    where: { archivedAt: null, currency, organizationId },
  });
}
