import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";

import type { Product } from "~/generated/client";
import type { Factory } from "~/utils/types";

/**
 * Creates a product with populated values.
 *
 * @param productParams - Product params to create the product with.
 * @returns A populated product with given params.
 */
export const createPopulatedProduct: Factory<Product> = ({
  id = createId(),
  organizationId = createId(),
  updatedAt = faker.date.recent({ days: 10 }),
  createdAt = faker.date.past({ refDate: updatedAt, years: 1 }),
  name = faker.commerce.productName(),
  description = faker.commerce.productDescription(),
  sku = faker.string.alphanumeric({ casing: "upper", length: 8 }),
  unitPriceMinor = faker.number.int({ max: 500_000, min: 100 }),
  currency = "NGN",
  unit = "item",
  taxRateBps = 750,
  imageUrl = "",
  archivedAt = null,
} = {}) => ({
  archivedAt,
  createdAt,
  currency,
  description,
  id,
  imageUrl,
  name,
  organizationId,
  sku,
  taxRateBps,
  unit,
  unitPriceMinor,
  updatedAt,
});
