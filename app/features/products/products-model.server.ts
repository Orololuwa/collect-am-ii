import type { Prisma } from "~/generated/client";
import { prisma } from "~/utils/database.server";

export type ProductStatusFilter = "active" | "archived";

function productListWhere({
  organizationId,
  status,
  search,
}: {
  organizationId: string;
  status: ProductStatusFilter;
  search?: string;
}): Prisma.ProductWhereInput {
  return {
    archivedAt: status === "active" ? null : { not: null },
    organizationId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

/**
 * Retrieves one page of an organization's products, alphabetically.
 */
export async function retrieveProductsPageFromDatabaseByOrganizationId({
  organizationId,
  status,
  search,
  skip,
  take,
}: {
  organizationId: string;
  status: ProductStatusFilter;
  search?: string;
  skip: number;
  take: number;
}) {
  return await prisma.product.findMany({
    orderBy: { name: "asc" },
    skip,
    take,
    where: productListWhere({ organizationId, search, status }),
  });
}

export async function countProductsInDatabaseByOrganizationId({
  organizationId,
  status,
  search,
}: {
  organizationId: string;
  status: ProductStatusFilter;
  search?: string;
}) {
  return await prisma.product.count({
    where: productListWhere({ organizationId, search, status }),
  });
}

export async function retrieveProductFromDatabaseById({
  productId,
  organizationId,
}: {
  productId: string;
  organizationId: string;
}) {
  return await prisma.product.findFirst({
    where: { id: productId, organizationId },
  });
}

export async function retrieveProductBySkuFromDatabase({
  organizationId,
  sku,
}: {
  organizationId: string;
  sku: string;
}) {
  return await prisma.product.findUnique({
    where: { organizationId_sku: { organizationId, sku } },
  });
}

export async function saveProductToDatabase(
  product: Prisma.ProductUncheckedCreateInput,
) {
  return await prisma.product.create({ data: product });
}

/**
 * Updates a product, scoped to its organization. Returns null if it isn't
 * there.
 */
export async function updateProductInDatabaseById({
  productId,
  organizationId,
  data,
}: {
  productId: string;
  organizationId: string;
  data: Prisma.ProductUpdateInput;
}) {
  const { count } = await prisma.product.updateMany({
    data,
    where: { id: productId, organizationId },
  });
  return count === 0
    ? null
    : await retrieveProductFromDatabaseById({ organizationId, productId });
}

/**
 * Deletes a product, scoped to its organization. Returns the deleted product,
 * or null if it wasn't there.
 */
export async function deleteProductFromDatabaseById({
  productId,
  organizationId,
}: {
  productId: string;
  organizationId: string;
}) {
  const product = await retrieveProductFromDatabaseById({
    organizationId,
    productId,
  });
  if (!product) {
    return null;
  }
  await prisma.product.delete({ where: { id: product.id } });
  return product;
}

/**
 * The currency of the organization's most recently added product, used as the
 * default for the next one.
 */
export async function retrieveLatestProductCurrencyFromDatabase(
  organizationId: string,
) {
  const product = await prisma.product.findFirst({
    orderBy: { createdAt: "desc" },
    select: { currency: true },
    where: { organizationId },
  });
  return product?.currency ?? null;
}
