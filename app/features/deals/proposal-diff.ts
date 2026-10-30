import type { DealLineItem } from "./deal-items";

export type LineChange =
  | { kind: "same" | "changed"; before: DealLineItem; after: DealLineItem }
  | { kind: "removed"; before: DealLineItem }
  | { kind: "added"; after: DealLineItem };

const FIGURES = [
  "quantity",
  "unitPriceMinor",
  "taxRateBps",
  "discountBps",
] as const;

/**
 * Lines up a suggested version against the current one: each current line
 * matched to the suggestion's line with the same product and name, so the
 * business sees what was changed, removed or added.
 */
export function diffDealItems(
  current: DealLineItem[],
  proposed: DealLineItem[],
): LineChange[] {
  const unmatched = [...proposed];
  const changes: LineChange[] = current.map((before) => {
    const index = unmatched.findIndex(
      (after) =>
        after.productId === before.productId && after.name === before.name,
    );
    if (index === -1) {
      return { before, kind: "removed" };
    }
    const [after] = unmatched.splice(index, 1);
    if (!after) {
      return { before, kind: "removed" };
    }
    const changed = FIGURES.some((figure) => after[figure] !== before[figure]);
    return { after, before, kind: changed ? "changed" : "same" };
  });
  return [
    ...changes,
    ...unmatched.map((after): LineChange => ({ after, kind: "added" })),
  ];
}
