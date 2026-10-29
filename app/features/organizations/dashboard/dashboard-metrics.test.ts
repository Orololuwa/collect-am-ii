import { describe, expect, test } from "vitest";

import {
  bucketSeries,
  buildDailySeries,
  getPeriodRanges,
  parseDashboardPeriod,
  percentChange,
  pickDashboardCurrency,
} from "./dashboard-metrics";

describe("parseDashboardPeriod()", () => {
  test.each([
    ["7", 7],
    ["30", 30],
    ["90", 90],
  ])("given: %s, should: return %i", (value, expected) => {
    expect(parseDashboardPeriod(value)).toEqual(expected);
  });

  test.each([
    [null],
    [""],
    ["14"],
    ["abc"],
  ])("given: %s, should: fall back to 30", (value) => {
    expect(parseDashboardPeriod(value)).toEqual(30);
  });
});

describe("getPeriodRanges()", () => {
  test("given: 7 days, should: start the current period 6 days before today and the previous one 7 days before that", () => {
    const now = new Date(2026, 9, 29, 15, 30);

    const { currentStart, previousStart } = getPeriodRanges(7, now);

    expect(currentStart).toEqual(new Date(2026, 9, 23));
    expect(previousStart).toEqual(new Date(2026, 9, 16));
  });
});

describe("pickDashboardCurrency()", () => {
  test("given: a requested currency the organization has payments in, should: use it", () => {
    expect(
      pickDashboardCurrency({
        paymentCurrencies: ["NGN", "USD"],
        requested: "usd",
      }),
    ).toEqual("USD");
  });

  test("given: a requested currency with no payments, should: use the most used one", () => {
    expect(
      pickDashboardCurrency({
        paymentCurrencies: ["NGN", "USD"],
        requested: "EUR",
      }),
    ).toEqual("NGN");
  });

  test("given: no payments, should: use the checkout pages' default currency", () => {
    expect(
      pickDashboardCurrency({
        fallback: "ngn",
        paymentCurrencies: [],
        requested: null,
      }),
    ).toEqual("NGN");
  });

  test("given: no payments and no default, should: use USD", () => {
    expect(
      pickDashboardCurrency({ paymentCurrencies: [], requested: null }),
    ).toEqual("USD");
  });
});

describe("percentChange()", () => {
  test("given: growth, should: return the percentage", () => {
    expect(percentChange(150, 100)).toEqual(50);
  });

  test("given: a drop, should: return a negative percentage", () => {
    expect(percentChange(75, 100)).toEqual(-25);
  });

  test("given: nothing in the previous period, should: return null", () => {
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("buildDailySeries()", () => {
  test("given: payments across both periods, should: total each day and pair it with the same day of the previous period", () => {
    const currentStart = new Date(2026, 9, 27);
    const previousStart = new Date(2026, 9, 24);

    const series = buildDailySeries({
      currentStart,
      days: 3,
      payments: [
        { amountMinor: 1000, createdAt: new Date(2026, 9, 27, 9) },
        { amountMinor: 500, createdAt: new Date(2026, 9, 27, 18) },
        { amountMinor: 2000, createdAt: new Date(2026, 9, 29, 12) },
        { amountMinor: 700, createdAt: new Date(2026, 9, 24, 10) },
        { amountMinor: 300, createdAt: new Date(2026, 9, 26, 23) },
      ],
      previousStart,
    });

    expect(series).toEqual([
      {
        amountMinor: 1500,
        count: 2,
        date: "2026-10-27",
        previousAmountMinor: 700,
      },
      { amountMinor: 0, count: 0, date: "2026-10-28", previousAmountMinor: 0 },
      {
        amountMinor: 2000,
        count: 1,
        date: "2026-10-29",
        previousAmountMinor: 300,
      },
    ]);
  });
});

describe("bucketSeries()", () => {
  test("given: fewer values than buckets, should: return them unchanged", () => {
    expect(bucketSeries([1, 2, 3], 12)).toEqual([1, 2, 3]);
  });

  test("given: more values than buckets, should: sum them into that many buckets", () => {
    expect(bucketSeries([1, 1, 2, 2, 3, 3], 3)).toEqual([2, 4, 6]);
  });

  test("given: 30 daily values, should: keep the total across 12 buckets", () => {
    const values = Array.from({ length: 30 }, (_, index) => index + 1);
    const buckets = bucketSeries(values, 12);

    expect(buckets).toHaveLength(12);
    expect(buckets.reduce((sum, value) => sum + value, 0)).toEqual(465);
  });
});
