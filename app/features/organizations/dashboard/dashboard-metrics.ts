import { addDays, startOfDay, subDays } from "date-fns";

export const DASHBOARD_PERIODS = [7, 30, 90] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = 30;

/** Payment statuses whose money counts as collected (refunds excluded). */
export const COLLECTED_STATUSES = ["succeeded", "partially_refunded"] as const;

/**
 * Reads the `period` search param (days), falling back to 30.
 */
export function parseDashboardPeriod(value: string | null): DashboardPeriod {
  const days = Number(value);
  return (DASHBOARD_PERIODS as readonly number[]).includes(days)
    ? (days as DashboardPeriod)
    : DEFAULT_DASHBOARD_PERIOD;
}

/**
 * The current period is the `days` days up to and including today; the
 * previous period is the same number of days before it.
 */
export function getPeriodRanges(days: DashboardPeriod, now = new Date()) {
  const currentStart = startOfDay(subDays(now, days - 1));
  const previousStart = subDays(currentStart, days);
  return { currentStart, now, previousStart };
}

/**
 * Picks the currency to show: the requested one if the organization has
 * payments in it, else the one it has the most payments in, else its
 * checkout pages' default, else USD.
 */
export function pickDashboardCurrency({
  requested,
  paymentCurrencies,
  fallback,
}: {
  requested: string | null;
  /** Currencies with payments, most used first. */
  paymentCurrencies: string[];
  fallback?: string | null;
}) {
  const wanted = requested?.toUpperCase();
  if (wanted && paymentCurrencies.includes(wanted)) {
    return wanted;
  }
  return paymentCurrencies[0] ?? fallback?.toUpperCase() ?? "USD";
}

/** Change from `previous` to `current` in percent, or null if there's no base. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function dayKey(date: Date) {
  const day = startOfDay(date);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

/**
 * Totals payments per day for the current period, each day paired with the
 * same day of the previous period.
 */
export function buildDailySeries({
  payments,
  days,
  currentStart,
  previousStart,
}: {
  payments: Array<{ amountMinor: number; createdAt: Date }>;
  days: number;
  currentStart: Date;
  previousStart: Date;
}) {
  const totals = new Map<string, { amountMinor: number; count: number }>();
  for (const payment of payments) {
    const key = dayKey(payment.createdAt);
    const total = totals.get(key) ?? { amountMinor: 0, count: 0 };
    total.amountMinor += payment.amountMinor;
    total.count += 1;
    totals.set(key, total);
  }

  return Array.from({ length: days }, (_, index) => {
    const date = startOfDay(addDays(currentStart, index));
    const previousDate = startOfDay(addDays(previousStart, index));
    const current = totals.get(dayKey(date));
    const previous = totals.get(dayKey(previousDate));
    return {
      amountMinor: current?.amountMinor ?? 0,
      count: current?.count ?? 0,
      date: dayKey(date),
      previousAmountMinor: previous?.amountMinor ?? 0,
    };
  });
}

/**
 * Sums a daily series into `buckets` roughly equal groups, for sparklines.
 */
export function bucketSeries(values: number[], buckets = 12) {
  if (values.length <= buckets) {
    return values;
  }
  const size = values.length / buckets;
  return Array.from({ length: buckets }, (_, index) =>
    values
      .slice(Math.round(index * size), Math.round((index + 1) * size))
      .reduce((sum, value) => sum + value, 0),
  );
}
