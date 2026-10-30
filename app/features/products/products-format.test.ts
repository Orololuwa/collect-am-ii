import { describe, expect, test } from "vitest";

import {
  basisPointsToPercent,
  getCurrencyExponent,
  majorToMinorUnits,
  minorUnitsToMajorString,
  percentToBasisPoints,
} from "./products-format";

describe("getCurrencyExponent()", () => {
  test.each([
    ["NGN", 2],
    ["usd", 2],
    ["JPY", 0],
  ])("given: %s, should: return %i", (currency, expected) => {
    expect(getCurrencyExponent(currency)).toEqual(expected);
  });
});

describe("majorToMinorUnits()", () => {
  test.each([
    ["150000.50", "NGN", 15_000_050],
    ["0.1", "USD", 10],
    ["1500", "JPY", 1500],
    ["0", "NGN", 0],
  ])("given: %s %s, should: return %i", (amount, currency, expected) => {
    expect(majorToMinorUnits(amount, currency)).toEqual(expected);
  });

  test("given: a negative amount, should: throw", () => {
    expect(() => majorToMinorUnits("-1", "NGN")).toThrow("Invalid amount");
  });
});

describe("minorUnitsToMajorString()", () => {
  test.each([
    [15_000_050, "NGN", "150000.50"],
    [1500, "JPY", "1500"],
    [0, "USD", "0.00"],
  ])("given: %i %s, should: return %s", (amount, currency, expected) => {
    expect(minorUnitsToMajorString(amount, currency)).toEqual(expected);
  });
});

describe("tax rates", () => {
  test.each([
    ["7.5", 750],
    ["0", 0],
    ["100", 10_000],
    ["16", 1600],
  ])("given: %s%%, should: be %i basis points and back", (percent, bps) => {
    expect(percentToBasisPoints(percent)).toEqual(bps);
    expect(basisPointsToPercent(bps)).toEqual(String(Number(percent)));
  });

  test("given: more than 100%, should: throw", () => {
    expect(() => percentToBasisPoints("101")).toThrow("Invalid tax rate");
  });
});
