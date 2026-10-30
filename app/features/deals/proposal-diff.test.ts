import { describe, expect, test } from "vitest";

import type { DealLineItem } from "./deal-items";
import { diffDealItems } from "./proposal-diff";

const line = (overrides: Partial<DealLineItem>): DealLineItem => ({
  description: "",
  discountBps: 0,
  name: "Design",
  productId: "p1",
  quantity: 1,
  taxRateBps: 0,
  unit: "hour",
  unitPriceMinor: 1000,
  ...overrides,
});

describe("diffDealItems()", () => {
  test("given: changed, removed and added lines, should: label each one", () => {
    const design = line({});
    const print = line({ name: "Print", productId: "p2" });
    const extra = line({ name: "Extra", productId: "p3" });
    const cheaper = { ...design, discountBps: 1000, unitPriceMinor: 900 };

    expect(
      diffDealItems([design, print], [cheaper, extra]).map(
        (change) => change.kind,
      ),
    ).toEqual(["changed", "removed", "added"]);
  });

  test("given: identical lines, should: mark them unchanged", () => {
    const design = line({});

    expect(diffDealItems([design], [{ ...design }])).toEqual([
      { after: design, before: design, kind: "same" },
    ]);
  });
});
