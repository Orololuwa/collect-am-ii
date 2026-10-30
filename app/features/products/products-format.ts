/**
 * Number of decimals a currency uses for its minor unit (2 for NGN/USD, 0 for
 * JPY), from the runtime's currency data.
 */
export function getCurrencyExponent(currency: string) {
  return (
    new Intl.NumberFormat("en", {
      currency: currency.toUpperCase(),
      style: "currency",
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

/**
 * Converts an amount typed in major units ("1500.50") to minor units
 * (150050). Unlike checkout's `toMinorUnits`, zero is allowed, so free items
 * can be catalogued.
 */
export function majorToMinorUnits(amountMajor: string, currency: string) {
  const amount = Number(amountMajor);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid amount");
  }
  return Math.round(amount * 10 ** getCurrencyExponent(currency));
}

/** Converts minor units back to the plain string a form field shows. */
export function minorUnitsToMajorString(amountMinor: number, currency: string) {
  const exponent = getCurrencyExponent(currency);
  return (amountMinor / 10 ** exponent).toFixed(exponent);
}

/** "7.5" (percent) → 750 basis points. */
export function percentToBasisPoints(percent: string) {
  const value = Number(percent);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Invalid tax rate");
  }
  return Math.round(value * 100);
}

/** 750 basis points → "7.5". */
export function basisPointsToPercent(basisPoints: number) {
  return String(basisPoints / 100);
}
