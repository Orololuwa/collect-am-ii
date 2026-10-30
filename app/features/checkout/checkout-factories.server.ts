import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";
import { onTestFinished } from "vitest";

import type { CheckoutLineItem } from "./checkout-sections";
import { createPopulatedOrganization } from "~/features/organizations/organizations-factories.server";
import {
  deleteOrganizationFromDatabaseById,
  saveOrganizationToDatabase,
} from "~/features/organizations/organizations-model.server";
import type { Prisma } from "~/generated/client";
import { prisma } from "~/utils/database.server";

/** Two lines: 2 × 10.00 + 1 × 5.50 = 25.50. */
export const defaultCheckoutLineItems: CheckoutLineItem[] = [
  { description: "Widget", quantity: "2", total: "20.00", unitPrice: "10.00" },
  { description: "Gadget", quantity: "1", total: "5.50", unitPrice: "5.50" },
];

export function createCheckoutItemsSections(
  items: CheckoutLineItem[] = defaultCheckoutLineItems,
) {
  return [
    {
      data: { items },
      id: "checkout-items",
      order: 1,
      styles: {},
      type: "checkout-items",
    },
  ];
}

export function createPopulatedCheckoutPage({
  organizationId,
  ...overrides
}: Partial<Prisma.CheckoutPageUncheckedCreateInput> & {
  organizationId: string;
}): Prisma.CheckoutPageUncheckedCreateInput {
  const name = faker.commerce.productName();
  return {
    allowedCurrencies: ["USD", "NGN"],
    defaultCurrency: "USD",
    globalStyles: {},
    isActive: true,
    name,
    organizationId,
    paymentProviders: ["stripe", "paystack"],
    sections: createCheckoutItemsSections() as unknown as Prisma.InputJsonValue,
    slug: `checkout-${createId()}`,
    ...overrides,
  };
}

/**
 * Saves an organization with one checkout page, and deletes both (with their
 * payments and receipts) when the test finishes.
 */
export async function setupCheckoutPageWithOrganization(
  overrides: Partial<Prisma.CheckoutPageUncheckedCreateInput> = {},
) {
  const organization = await saveOrganizationToDatabase(
    createPopulatedOrganization(),
  );
  const checkoutPage = await prisma.checkoutPage.create({
    data: createPopulatedCheckoutPage({
      organizationId: organization.id,
      ...overrides,
    }),
  });

  onTestFinished(async () => {
    // Receipts block deleting their template, so remove them first.
    await prisma.receipt.deleteMany({
      where: { payment: { checkoutPage: { organizationId: organization.id } } },
    });
    await deleteOrganizationFromDatabaseById(organization.id);
  });

  return { checkoutPage, organization };
}
