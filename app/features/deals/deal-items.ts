/**
 * Line items and totals for deal documents. All money is in minor units and
 * tax is in basis points. Safe to use on the client for live totals.
 */

export const MAX_DEAL_ITEMS = 100;
export const MAX_ITEM_QUANTITY = 1_000_000;
export const MAX_ITEM_NAME_LENGTH = 200;
export const MAX_ITEM_DESCRIPTION_LENGTH = 1000;

export type DealLineItem = {
  /** The catalogue product it came from, if any. */
  productId: string | null;
  name: string;
  description: string;
  unit: string;
  /** Up to three decimals, e.g. 1.5 hours. */
  quantity: number;
  unitPriceMinor: number;
  taxRateBps: number;
};

export type DealTotals = {
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export function lineSubtotalMinor(item: DealLineItem) {
  return Math.round(item.quantity * item.unitPriceMinor);
}

export function lineTaxMinor(item: DealLineItem) {
  return Math.round((lineSubtotalMinor(item) * item.taxRateBps) / 10_000);
}

/** Tax is rounded per line so every line's figures add up on the document. */
export function calculateDealTotals(items: DealLineItem[]): DealTotals {
  let subtotalMinor = 0;
  let taxMinor = 0;
  for (const item of items) {
    subtotalMinor += lineSubtotalMinor(item);
    taxMinor += lineTaxMinor(item);
  }
  return { subtotalMinor, taxMinor, totalMinor: subtotalMinor + taxMinor };
}

/** `basisPoints` of `amountMinor`, rounded to the nearest minor unit. */
export function percentOfMinor(amountMinor: number, basisPoints: number) {
  return Math.round((amountMinor * basisPoints) / 10_000);
}

/** Rounds to at most three decimals, so 0.1 + 0.2 doesn't leak into totals. */
export function roundQuantity(quantity: number) {
  return Math.round(quantity * 1000) / 1000;
}

/** Reads stored items, dropping anything that isn't a valid line. */
export function parseDealItems(value: unknown): DealLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((raw): DealLineItem[] => {
    if (typeof raw !== "object" || raw === null) {
      return [];
    }
    const item = raw as Record<string, unknown>;
    const quantity = Number(item.quantity);
    const unitPriceMinor = Number(item.unitPriceMinor);
    const taxRateBps = Number(item.taxRateBps ?? 0);
    if (
      typeof item.name !== "string" ||
      !Number.isFinite(quantity) ||
      !Number.isInteger(unitPriceMinor) ||
      !Number.isInteger(taxRateBps)
    ) {
      return [];
    }
    return [
      {
        description:
          typeof item.description === "string" ? item.description : "",
        name: item.name,
        productId: typeof item.productId === "string" ? item.productId : null,
        quantity,
        taxRateBps,
        unit: typeof item.unit === "string" ? item.unit : "item",
        unitPriceMinor,
      },
    ];
  });
}
