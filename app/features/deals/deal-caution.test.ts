import { describe, expect, test } from "vitest";

import { findCautionLinesMinor, maskAccountNumber } from "./deal-caution";
import type { DealLineItem } from "./deal-items";

const line = (
  name: string,
  unitPriceMinor: number,
  caution = false,
): DealLineItem => ({
  ...(caution ? { caution: true } : {}),
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
        [line("Hall hire", 50_000_000), line("Caution", 10_000_000, true)],
        [line("Hall hire", 50_000_000), line("Caution", 20_000_000, true)],
        [line("Extra chairs", 1_000_000)],
      ]),
    ).toEqual(20_000_000);
  });

  test("given: a line only named like a caution, should: not count it", () => {
    expect(
      findCautionLinesMinor([[line("Caution fee", 10_000_000)]]),
    ).toBeNull();
  });
});

describe("maskAccountNumber()", () => {
  test("given: a full account number, should: keep only the last four digits", () => {
    expect(maskAccountNumber("0123456789")).toEqual("•••• 6789");
  });
});
