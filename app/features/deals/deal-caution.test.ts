import { describe, expect, test } from "vitest";

import { findCautionLinesMinor, maskAccountNumber } from "./deal-caution";
import type { DealLineItem } from "./deal-items";

const line = (name: string, unitPriceMinor: number): DealLineItem => ({
  description: "",
  discountBps: 0,
  name,
  productId: null,
  quantity: 1,
  taxRateBps: 0,
  unit: "item",
  unitPriceMinor,
});

describe("findCautionLinesMinor()", () => {
  test("given: documents with a caution line, should: use the latest one", () => {
    expect(
      findCautionLinesMinor([
        [line("Hall hire", 50_000_000), line("Caution fee", 10_000_000)],
        [line("Hall hire", 50_000_000), line("Refundable caution", 20_000_000)],
      ]),
    ).toEqual(20_000_000);
  });

  test("given: no caution line, should: suggest nothing", () => {
    expect(findCautionLinesMinor([[line("Hall hire", 50_000_000)]])).toBeNull();
  });
});

describe("maskAccountNumber()", () => {
  test("given: a full account number, should: keep only the last four digits", () => {
    expect(maskAccountNumber("0123456789")).toEqual("•••• 6789");
  });
});
