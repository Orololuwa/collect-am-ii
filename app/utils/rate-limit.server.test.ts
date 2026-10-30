import { describe, expect, test } from "vitest";

import { consumeRateLimit, getClientIp } from "./rate-limit.server";

describe("consumeRateLimit()", () => {
  test("given: more hits than the limit in one window, should: refuse the extra ones", () => {
    const key = `test-${Math.random()}`;
    const hit = () =>
      consumeRateLimit({ key, limit: 2, now: 1000, windowMs: 60_000 });

    expect([hit(), hit(), hit()]).toEqual([true, true, false]);
  });

  test("given: a new window, should: allow hits again", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      consumeRateLimit({ key, limit: 2, now: 1000, windowMs: 60_000 });
    }

    expect(
      consumeRateLimit({ key, limit: 2, now: 62_000, windowMs: 60_000 }),
    ).toEqual(true);
  });
});

describe("getClientIp()", () => {
  test("given: a forwarded chain, should: use the first address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });

    expect(getClientIp(request)).toEqual("203.0.113.7");
  });
});
