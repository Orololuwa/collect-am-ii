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
  /** Discount on this line in basis points (1000 = 10%), taken off before tax. */
  discountBps: number;
  /**
   * The deal's refundable caution. Its amount is what the caution refund step
   * settles, so it's tracked by this mark rather than by its name.
   */
  caution?: boolean;
};

export type DealTotals = {
  /** Quantity × price for every line, before discounts. */
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
};

/** Quantity × unit price, before any discount. */
export function lineSubtotalMinor(item: DealLineItem) {
  return Math.round(item.quantity * item.unitPriceMinor);
}

export function lineDiscountMinor(item: DealLineItem) {
  return Math.round((lineSubtotalMinor(item) * item.discountBps) / 10_000);
}

/** What the line comes to after its discount, before tax. */
export function lineNetMinor(item: DealLineItem) {
  return lineSubtotalMinor(item) - lineDiscountMinor(item);
}

/** Tax on the discounted amount. */
export function lineTaxMinor(item: DealLineItem) {
  return Math.round((lineNetMinor(item) * item.taxRateBps) / 10_000);
}

/**
 * Discounts and tax are rounded per line so every line's figures add up on
 * the document.
 */
export function calculateDealTotals(items: DealLineItem[]): DealTotals {
  let subtotalMinor = 0;
  let discountMinor = 0;
  let taxMinor = 0;
  for (const item of items) {
    subtotalMinor += lineSubtotalMinor(item);
    discountMinor += lineDiscountMinor(item);
    taxMinor += lineTaxMinor(item);
  }
  return {
    discountMinor,
    subtotalMinor,
    taxMinor,
    totalMinor: subtotalMinor - discountMinor + taxMinor,
  };
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
    const discountBps = Number(item.discountBps ?? 0);
    if (
      typeof item.name !== "string" ||
      !Number.isFinite(quantity) ||
      !Number.isInteger(unitPriceMinor) ||
      !Number.isInteger(taxRateBps) ||
      !Number.isInteger(discountBps)
    ) {
      return [];
    }
    return [
      {
        description:
          typeof item.description === "string" ? item.description : "",
        discountBps,
        name: item.name,
        productId: typeof item.productId === "string" ? item.productId : null,
        quantity,
        taxRateBps,
        unit: typeof item.unit === "string" ? item.unit : "item",
        unitPriceMinor,
        ...(item.caution === true ? { caution: true } : {}),
      },
    ];
  });
}

/** What the caution lines on a set of items add up to, after any tax. */
export function cautionLinesMinor(items: DealLineItem[]) {
  return items
    .filter((item) => item.caution)
    .reduce((sum, item) => sum + lineNetMinor(item) + lineTaxMinor(item), 0);
}
