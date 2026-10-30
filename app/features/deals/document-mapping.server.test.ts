import { describe, expect, test } from "vitest";

import type { DealLineItem } from "./deal-items";
import { calculateDealTotals } from "./deal-items";
import type {
  DocumentContent,
  DocumentParties,
  DocumentTemplate,
} from "./document-mapping.server";
import { buildDocumentSections } from "./document-mapping.server";
import type { TemplateSection } from "~/features/templates/shared/types";

const section = (
  type: TemplateSection["type"],
  data: Record<string, unknown>,
): TemplateSection => ({ data, id: type, order: 0, styles: {}, type });

const template = (
  sections: TemplateSection[],
  sampleValues: string[] = [],
): DocumentTemplate => ({
  colorPalette: [],
  globalStyles: { currency: "USD" },
  sampleValues: new Set(sampleValues),
  sections,
});

const parties: DocumentParties = {
  customer: {
    billingAddress: "1 Marina Road\nLagos",
    companyName: "Ada Ventures",
    email: "ada@example.com",
    name: "Ada Obi",
    phone: "",
    shippingAddress: "",
  },
  organization: {
    billingEmail: "hello@studio.test",
    imageUrl: "https://example.com/logo.png",
    name: "Studio",
  },
};

const logo: DealLineItem = {
  description: "Two rounds of changes",
  name: "Logo design",
  productId: null,
  quantity: 2,
  taxRateBps: 750,
  unit: "item",
  unitPriceMinor: 15_000_000,
};
const items = [logo];

const content = (
  overrides: Partial<DocumentContent> = {},
): DocumentContent => ({
  currency: "NGN",
  dueAt: new Date("2026-11-29T12:00:00Z"),
  issuedAt: new Date("2026-10-30T12:00:00Z"),
  items,
  number: "QUO-0001",
  paymentTermsDays: null,
  totals: calculateDealTotals(items),
  type: "quote",
  ...overrides,
});

describe("buildDocumentSections()", () => {
  test("given: a quote, should: fill the number, dates, customer, lines and totals", () => {
    const [header, lines, footer, notes] = buildDocumentSections({
      content: content(),
      parties,
      template: template([
        section("quote-header", {
          companyName: "Our Studio Ltd",
          quoteNumber: "",
        }),
        section("quote-items", { items: [] }),
        section("quote-footer", { showTaxRate: true, terms: "50% upfront" }),
        section("contract-body", { content: "Untouched" }),
      ]),
    });

    expect(header?.data).toMatchObject({
      billToAddress: "1 Marina Road\nLagos",
      billToName: "Ada Obi, Ada Ventures",
      // The organization's own template keeps its company details.
      companyName: "Our Studio Ltd",
      quoteDate: "30 Oct 2026",
      quoteNumber: "QUO-0001",
      shipToName: "",
      validityDate: "29 Nov 2026",
    });
    expect(lines?.data.items).toEqual([
      {
        description: "Logo design\nTwo rounds of changes",
        quantity: "2",
        total: "300000.00",
        unitPrice: "150000.00",
      },
    ]);
    expect(footer?.data).toMatchObject({
      discount: "0.00",
      showTaxRate: true,
      subtotal: "300000.00",
      taxAmount: "22500.00",
      taxMode: "amount",
      taxRate: "7.50",
      terms: "50% upfront",
      total: "322500.00",
    });
    expect(notes?.data).toEqual({ content: "Untouched" });
  });

  test("given: a template still showing sample company details, should: replace them", () => {
    const [header] = buildDocumentSections({
      content: content({ number: null }),
      parties,
      template: template(
        [
          section("quote-header", {
            companyAddress: "1 Sample Street",
            companyName: "Your Company Name",
            companyPhone: "+234 801 000 0000",
          }),
        ],
        ["1 Sample Street", "Your Company Name"],
      ),
    });

    expect(header?.data).toMatchObject({
      companyAddress: "",
      companyEmail: "hello@studio.test",
      companyLogo: "https://example.com/logo.png",
      companyName: "Studio",
      // Not a sample value, so it's the organization's own.
      companyPhone: "+234 801 000 0000",
      quoteNumber: "DRAFT",
    });
  });

  test("given: an invoice with payment terms, should: fill the due date and terms", () => {
    const [header, footer] = buildDocumentSections({
      content: content({
        number: "INV-0002",
        paymentTermsDays: 14,
        type: "invoice",
      }),
      parties,
      template: template([
        section("invoice-header", {}),
        section("invoice-footer", { paymentTerms: "" }),
      ]),
    });

    expect(header?.data).toMatchObject({
      dueDate: "29 Nov 2026",
      invoiceNumber: "INV-0002",
    });
    expect(footer?.data.paymentTerms).toEqual("Due within 14 days");
  });

  test("given: a receipt, should: fill the store details and payment", () => {
    const [header, footer] = buildDocumentSections({
      content: content({
        dueAt: null,
        number: "RCP-0001",
        payment: { method: "Bank transfer", reference: "TRF-123" },
        type: "receipt",
      }),
      parties,
      template: template([
        section("receipt-header", { storeName: "" }),
        section("receipt-footer", {}),
      ]),
    });

    expect(header?.data).toMatchObject({
      receiptNumber: "RCP-0001",
      storeName: "Studio",
      transactionId: "TRF-123",
    });
    expect(header?.data).not.toHaveProperty("billToName");
    expect(footer?.data).toMatchObject({
      paymentMethod: "Bank transfer",
      total: "322500.00",
    });
  });

  test("given: lines with different tax rates, should: hide the blended rate", () => {
    const mixed = [...items, { ...logo, name: "Print", taxRateBps: 0 }];
    const [footer] = buildDocumentSections({
      content: content({ items: mixed, totals: calculateDealTotals(mixed) }),
      parties,
      template: template([section("quote-footer", { showTaxRate: true })]),
    });

    expect(footer?.data.showTaxRate).toEqual(false);
  });
});
