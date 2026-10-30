import type { Prisma } from "~/generated/client";
import { prisma } from "~/utils/database.server";

export type CustomerStatusFilter = "active" | "archived";

function customerListWhere({
  organizationId,
  status,
  search,
}: {
  organizationId: string;
  status: CustomerStatusFilter;
  search?: string;
}): Prisma.CustomerWhereInput {
  return {
    archivedAt: status === "active" ? null : { not: null },
    organizationId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

/**
 * Retrieves one page of an organization's customers, alphabetically.
 */
export async function retrieveCustomersPageFromDatabaseByOrganizationId({
  organizationId,
  status,
  search,
  skip,
  take,
}: {
  organizationId: string;
  status: CustomerStatusFilter;
  search?: string;
  skip: number;
  take: number;
}) {
  return await prisma.customer.findMany({
    orderBy: { name: "asc" },
    skip,
    take,
    where: customerListWhere({ organizationId, search, status }),
  });
}

export async function countCustomersInDatabaseByOrganizationId({
  organizationId,
  status,
  search,
}: {
  organizationId: string;
  status: CustomerStatusFilter;
  search?: string;
}) {
  return await prisma.customer.count({
    where: customerListWhere({ organizationId, search, status }),
  });
}

export async function retrieveCustomerFromDatabaseById({
  customerId,
  organizationId,
}: {
  customerId: string;
  organizationId: string;
}) {
  return await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
  });
}

export async function retrieveCustomerByEmailFromDatabase({
  organizationId,
  email,
}: {
  organizationId: string;
  email: string;
}) {
  return await prisma.customer.findUnique({
    where: {
      organizationId_email: { email: email.toLowerCase(), organizationId },
    },
  });
}

export async function saveCustomerToDatabase(
  customer: Prisma.CustomerUncheckedCreateInput,
) {
  return await prisma.customer.create({
    data: { ...customer, email: customer.email.toLowerCase() },
  });
}

/**
 * Updates a customer, scoped to its organization. Returns null if it isn't
 * there.
 */
export async function updateCustomerInDatabaseById({
  customerId,
  organizationId,
  data,
}: {
  customerId: string;
  organizationId: string;
  data: Prisma.CustomerUpdateInput;
}) {
  const { count } = await prisma.customer.updateMany({
    data,
    where: { id: customerId, organizationId },
  });
  return count === 0
    ? null
    : await retrieveCustomerFromDatabaseById({ customerId, organizationId });
}
