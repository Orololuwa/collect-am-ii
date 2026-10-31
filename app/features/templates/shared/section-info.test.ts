import { describe, expect, test } from "vitest";

import { getSectionInfo, getSectionTypesFor } from "./section-info";
import type { TemplateSection } from "./types";
import { moveSection } from "./utils/move-section";

describe("getSectionInfo()", () => {
  test("given: a deal document's sections, should: name them and list what deals fill in", () => {
    expect(getSectionInfo("invoice", "invoice-items")).toEqual({
      filledByDeal: ["Every line, with its quantity, price, discount and tax"],
      name: "Line items",
      summary: "Description, quantity, price",
    });
    expect(getSectionInfo("quote", "quote-header").filledByDeal).toContain(
      "Valid until",
    );
    expect(getSectionInfo("receipt", "receipt-footer")).toMatchObject({
      filledByDeal: ["Subtotal, discount, tax and total", "Payment method"],
      name: "Totals and notes",
    });
  });

  test("given: a document deals don't send, should: name it without deal fields", () => {
    expect(getSectionInfo("contract", "contract-signature")).toEqual({
      filledByDeal: null,
      name: "Signatures",
      summary: "Who signs, and when",
    });
    expect(getSectionInfo("packing-slip", "packing-slip-footer").name).toBe(
      "Footer",
    );
  });
});

describe("getSectionTypesFor()", () => {
  test("given: a type, should: return only its own sections, in order", () => {
    expect(getSectionTypesFor("sales-order")).toEqual([
      "sales-order-header",
      "sales-order-items",
      "sales-order-footer",
    ]);
  });
});

describe("moveSection()", () => {
  const sections = ["a", "b", "c"].map(
    (id, order): TemplateSection => ({
      data: {},
      id,
      order,
      styles: {},
      type: "header",
    }),
  );

  test("given: a middle section, should: move it up or down", () => {
    expect(moveSection(sections, "b", -1)?.map(({ id }) => id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(moveSection(sections, "b", 1)?.map(({ id }) => id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  test("given: an end section moved past the edge, should: return null", () => {
    expect(moveSection(sections, "a", -1)).toBeNull();
    expect(moveSection(sections, "c", 1)).toBeNull();
  });
});
