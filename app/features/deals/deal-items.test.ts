import { describe, expect, test } from "vitest";

import type { DealLineItem } from "./deal-items";
import {
  calculateDealTotals,
  parseDealItems,
  percentOfMinor,
  roundQuantity,
} from "./deal-items";

const item = (overrides: Partial<DealLineItem> = {}): DealLineItem => ({
  description: "",
  name: "Design",
  productId: null,
  quantity: 1,
  taxRateBps: 0,
  unit: "hour",
  unitPriceMinor: 10_000,
  ...overrides,
});

describe("calculateDealTotals()", () => {
  test("given: no items, should: return zeros", () => {
    expect(calculateDealTotals([])).toEqual({
      subtotalMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    });
  });

  test("given: lines with different tax rates, should: tax each line and add up", () => {
    expect(
      calculateDealTotals([
        item({ quantity: 2, taxRateBps: 750, unitPriceMinor: 15_000_000 }),
        item({ quantity: 1.5, taxRateBps: 0, unitPriceMinor: 2_000_000 }),
      ]),
    ).toEqual({
      subtotalMinor: 33_000_000,
      taxMinor: 2_250_000,
      totalMinor: 35_250_000,
    });
  });

  test("given: tax that isn't a whole minor unit, should: round each line", () => {
    // 3 × 333 = 999; 7.5% of 999 = 74.925 → 75
    expect(
      calculateDealTotals([
        item({ quantity: 3, taxRateBps: 750, unitPriceMinor: 333 }),
      ]),
    ).toEqual({ subtotalMinor: 999, taxMinor: 75, totalMinor: 1074 });
  });
});

describe("percentOfMinor()", () => {
  test("given: 50% of an odd amount, should: round to the nearest minor unit", () => {
    expect(percentOfMinor(1001, 5000)).toEqual(501);
  });
});

describe("roundQuantity()", () => {
  test("given: a float sum, should: keep three decimals", () => {
    expect(roundQuantity(0.1 + 0.2)).toEqual(0.3);
  });
});

describe("parseDealItems()", () => {
  test("given: stored lines with junk, should: keep only valid lines", () => {
    expect(
      parseDealItems([
        item(),
        { name: "No price", quantity: 1 },
        "nonsense",
        { ...item(), productId: 42, unit: undefined },
      ]),
    ).toEqual([item(), { ...item(), productId: null, unit: "item" }]);
  });

  test("given: something that isn't a list, should: return no lines", () => {
    expect(parseDealItems({ items: [] })).toEqual([]);
  });
});
