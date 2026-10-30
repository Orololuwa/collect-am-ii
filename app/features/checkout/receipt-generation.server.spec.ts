import { createId } from "@paralleldrive/cuid2";
import { describe, expect, test } from "vitest";

import { setupCheckoutPageWithOrganization } from "./checkout-factories.server";
import { generateReceiptForPaymentInDatabaseById } from "./receipt-generation.server";
import type { Prisma } from "~/generated/client";
import { prisma } from "~/utils/database.server";

const receiptTemplateSections = [
  {
    data: {},
    id: "receipt-header",
    order: 1,
    styles: {},
    type: "receipt-header",
  },
  {
    data: {},
    id: "receipt-items",
    order: 2,
    styles: {},
    type: "receipt-items",
  },
  {
    data: {},
    id: "receipt-footer",
    order: 3,
    styles: {},
    type: "receipt-footer",
  },
];

async function setupPaymentWithReceiptTemplate({
  amountMinor,
  currency = "USD",
  items,
}: {
  amountMinor: number;
  currency?: string;
  items: Prisma.InputJsonValue;
}) {
  const { checkoutPage, organization } =
    await setupCheckoutPageWithOrganization();
  const template = await prisma.template.create({
    data: {
      globalStyles: {},
      name: "Receipt",
      organizationId: organization.id,
      sections: receiptTemplateSections,
      type: "receipt",
    },
  });
  await prisma.checkoutPage.update({
    data: { receiptTemplateId: template.id },
    where: { id: checkoutPage.id },
  });
  const payment = await prisma.payment.create({
    data: {
      amountMinor,
      checkoutPageId: checkoutPage.id,
      currency,
      customerEmail: "customer@example.com",
      items,
      provider: "stripe",
      providerPaymentId: `pi_${createId()}`,
      status: "succeeded",
    },
  });
  return { payment };
}

async function generateReceiptItems(paymentId: string) {
  const receipt = await generateReceiptForPaymentInDatabaseById({ paymentId });
  const sections = receipt?.sections as Array<{
    type: string;
    data: Record<string, unknown>;
  }>;
  return {
    footer: sections.find((s) => s.type === "receipt-footer")?.data,
    items: sections.find((s) => s.type === "receipt-items")?.data.items,
  };
}

describe("generateReceiptForPaymentInDatabaseById()", () => {
  test("given: a payment with several items in minor units, should: show each line's own price and total", async () => {
    const { payment } = await setupPaymentWithReceiptTemplate({
      amountMinor: 2550,
      items: [
        { description: "Widget", quantity: 2, unitPriceMinor: 1000 },
        { description: "Gadget", quantity: 1, unitPriceMinor: 550 },
      ],
    });

    const { footer, items } = await generateReceiptItems(payment.id);

    expect(items).toEqual([
      {
        description: "Widget",
        quantity: "2",
        total: "20.00",
        unitPrice: "10.00",
      },
      {
        description: "Gadget",
        quantity: "1",
        total: "5.50",
        unitPrice: "5.50",
      },
    ]);
    expect(footer).toMatchObject({ total: "25.50" });
  });

  test("given: an older payment with items in major-unit strings, should: show each line's own price and total", async () => {
    const { payment } = await setupPaymentWithReceiptTemplate({
      amountMinor: 2550,
      items: [
        {
          description: "Widget",
          quantity: "2",
          total: "20.00",
          unitPrice: "10.00",
        },
        {
          description: "Gadget",
          quantity: "1",
          total: "5.50",
          unitPrice: "5.50",
        },
      ],
    });

    const { items } = await generateReceiptItems(payment.id);

    expect(items).toEqual([
      {
        description: "Widget",
        quantity: "2",
        total: "20.00",
        unitPrice: "10.00",
      },
      {
        description: "Gadget",
        quantity: "1",
        total: "5.50",
        unitPrice: "5.50",
      },
    ]);
  });

  test("given: a zero-decimal currency, should: format amounts without decimals", async () => {
    const { payment } = await setupPaymentWithReceiptTemplate({
      amountMinor: 3000,
      currency: "JPY",
      items: [{ description: "Tea", quantity: 3, unitPriceMinor: 1000 }],
    });

    const { items } = await generateReceiptItems(payment.id);

    expect(items).toEqual([
      { description: "Tea", quantity: "3", total: "3000", unitPrice: "1000" },
    ]);
  });

  test("given: a payment without items, should: show one line for the paid amount", async () => {
    const { payment } = await setupPaymentWithReceiptTemplate({
      amountMinor: 1234,
      items: [],
    });

    const { items } = await generateReceiptItems(payment.id);

    expect(items).toEqual([
      {
        description: "Payment",
        quantity: "1",
        total: "12.34",
        unitPrice: "12.34",
      },
    ]);
  });
});
