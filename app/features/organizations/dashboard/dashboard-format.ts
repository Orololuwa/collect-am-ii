import { fromMinorUnits } from "~/features/checkout/money";

/**
 * Formats an amount in minor units with the currency's symbol, e.g.
 * `₦1,284,500.00`. `whole` drops the decimals (`₦1,284,500`); `compact` also
 * shortens big numbers (`₦1.3M`) for tight spots like chart axes.
 */
export function formatMoney({
  amountMinor,
  currency,
  locale,
  whole = false,
  compact = false,
}: {
  amountMinor: number;
  currency: string;
  locale: string;
  whole?: boolean;
  compact?: boolean;
}) {
  return new Intl.NumberFormat(locale, {
    currency: currency.toUpperCase(),
    currencyDisplay: "narrowSymbol",
    style: "currency",
    ...(compact
      ? {
          maximumFractionDigits: 1,
          minimumFractionDigits: 0,
          notation: "compact" as const,
        }
      : whole
        ? { maximumFractionDigits: 0, minimumFractionDigits: 0 }
        : {}),
  }).format(fromMinorUnits({ amountMinor, currency }));
}

/** `+18.4%` / `−0.4%`, with a real minus sign. */
export function formatPercentChange(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
    style: "percent",
  })
    .format(value / 100)
    .replace("-", "−");
}

/** `+9` / `−3`, with a real minus sign. */
export function formatSignedNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { signDisplay: "exceptZero" })
    .format(value)
    .replace("-", "−");
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "12 minutes ago", "yesterday", "in 3 days", in the given language. */
export function formatRelativeTime(
  date: Date | string,
  locale: string,
  now = new Date(),
) {
  const seconds = (new Date(date).getTime() - now.getTime()) / 1000;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return format.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return format.format(0, "minute");
}

/** "24 Oct" in the given language. */
export function formatShortDate(date: Date | string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}
