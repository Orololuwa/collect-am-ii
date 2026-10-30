import { describe, expect, test } from "vitest";

import {
  createDealShareToken,
  isDealShareTokenValid,
  parseDealShareToken,
} from "./deal-share-link.server";

const deal = { id: "deal123", shareNonce: "nonce-a" };

describe("deal share links", () => {
  test("given: a fresh token, should: be valid for its deal", () => {
    const token = createDealShareToken(deal);

    expect(token.startsWith("deal123.")).toEqual(true);
    expect(isDealShareTokenValid(token, deal)).toEqual(true);
  });

  test("given: the same deal, should: give the same link every time", () => {
    expect(createDealShareToken(deal)).toEqual(createDealShareToken(deal));
  });

  test("given: a new nonce, should: stop older links working", () => {
    const token = createDealShareToken(deal);

    expect(
      isDealShareTokenValid(token, { ...deal, shareNonce: "nonce-b" }),
    ).toEqual(false);
  });

  test("given: a tampered signature or another deal's id, should: be invalid", () => {
    const token = createDealShareToken(deal);
    const [, signature] = token.split(".");

    expect(isDealShareTokenValid(`${token}x`, deal)).toEqual(false);
    expect(
      isDealShareTokenValid(`other.${signature}`, { ...deal, id: "other" }),
    ).toEqual(false);
  });

  test("given: malformed tokens, should: not parse", () => {
    expect(parseDealShareToken("nodot")).toBeNull();
    expect(parseDealShareToken("a.b.c")).toBeNull();
    expect(parseDealShareToken(".sig")).toBeNull();
  });
});
