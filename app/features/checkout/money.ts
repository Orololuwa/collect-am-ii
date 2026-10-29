const currencyMinorUnitMap: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
};

export function toMinorUnits({
  amountMajor,
  currency,
}: {
  amountMajor: string;
  currency: string;
}) {
  const normalizedCurrency = currency.toUpperCase();
  const exponent = currencyMinorUnitMap[normalizedCurrency] ?? 2;

  const n = Number(amountMajor);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Invalid amount");
  }

  const factor = 10 ** exponent;
  return Math.round(n * factor);
}

/** Converts an amount in minor units (e.g. kobo, cents) to major units. */
export function fromMinorUnits({
  amountMinor,
  currency,
}: {
  amountMinor: number;
  currency: string;
}) {
  const exponent = currencyMinorUnitMap[currency.toUpperCase()] ?? 2;
  return amountMinor / 10 ** exponent;
}

export function formatMinorUnits({
  amountMinor,
  currency,
  locale = "en-US",
}: {
  amountMinor: number;
  currency: string;
  locale?: string;
}) {
  const normalizedCurrency = currency.toUpperCase();
  const amountMajor = fromMinorUnits({ amountMinor, currency });
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrency,
  }).format(amountMajor);
}
