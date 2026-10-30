import {
  computeCheckoutPayableTotalMajor,
  parseCheckoutSections,
} from "./checkout-sections";
import { getCurrencyMinorUnitExponent, toMinorUnits } from "./money";
import {
  getCheckoutAccessSession,
  getIsCheckoutAccessValid,
} from "./public-checkout-session.server";
import type { CheckoutPage } from "~/generated/client";

/** Line item shape stored on `Payment.items` and in Stripe `itemsJson` metadata. */
export type CheckoutPaymentItem = {
  description: string;
  quantity: number;
  unitPriceMinor: number;
};

/** Whether the page still takes new payments: active and not past `expiresAt`. */
export function getIsCheckoutPageOpenForPayment(
  checkoutPage: Pick<CheckoutPage, "isActive" | "expiresAt">,
) {
  if (!checkoutPage.isActive) return false;
  if (
    checkoutPage.expiresAt &&
    checkoutPage.expiresAt.getTime() <= Date.now()
  ) {
    return false;
  }
  return true;
}

/**
 * Whether the request may start a payment: always for open pages, and only
 * with a valid access cookie for password-protected pages.
 */
export async function getHasCheckoutPaymentAccess({
  checkoutPage,
  request,
}: {
  checkoutPage: Pick<CheckoutPage, "isPasswordProtected" | "slug">;
  request: Request;
}) {
  if (!checkoutPage.isPasswordProtected) return true;
  const session = await getCheckoutAccessSession(request);
  return getIsCheckoutAccessValid({
    checkoutPageSlug: checkoutPage.slug,
    session,
  });
}

function majorToMinorUnitsOrZero(amountMajor: string, currency: string) {
  const n = Number(amountMajor);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return toMinorUnits({ amountMajor, currency });
}

/**
 * Computes what to charge from the page's stored `checkout-items` section, so
 * the amount never comes from the client. Returns null when nothing is payable.
 */
export function computeCheckoutPagePayment({
  checkoutPage,
  currency,
}: {
  checkoutPage: Pick<
    CheckoutPage,
    | "sections"
    | "globalStyles"
    | "name"
    | "defaultCurrency"
    | "allowedCurrencies"
  >;
  currency: string;
}): { amountMinor: number; items: CheckoutPaymentItem[] } | null {
  const { items, totals } = parseCheckoutSections(
    checkoutPage.sections,
    checkoutPage.globalStyles,
    {
      allowedCurrencies: checkoutPage.allowedCurrencies,
      defaultCurrency: checkoutPage.defaultCurrency,
      storeName: checkoutPage.name,
    },
  );

  const amountMinor = majorToMinorUnitsOrZero(
    computeCheckoutPayableTotalMajor(items, totals),
    currency,
  );
  if (amountMinor <= 0) return null;

  return {
    amountMinor,
    items: items.map((item) => {
      const quantity = Number(item.quantity);
      return {
        description: item.description,
        quantity: Number.isFinite(quantity) ? quantity : 1,
        unitPriceMinor: majorToMinorUnitsOrZero(item.unitPrice, currency),
      };
    }),
  };
}

/**
 * Whether an amount the client showed the customer matches the server total.
 * Compared in minor units so "10" and "10.00" are equal.
 */
export function getIsClientAmountMatching({
  amountMajor,
  amountMinor,
  currency,
}: {
  amountMajor: string;
  amountMinor: number;
  currency: string;
}) {
  const n = Number(amountMajor);
  if (!Number.isFinite(n)) return false;
  const factor = 10 ** getCurrencyMinorUnitExponent(currency);
  return Math.round(n * factor) === amountMinor;
}
