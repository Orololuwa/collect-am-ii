import { describe, expect, test } from "vitest";

import { getIsAwaitingEmailConfirmation } from "./user-authentication-helpers";

describe("getIsAwaitingEmailConfirmation()", () => {
  test("given: action data with an email, should: return true", () => {
    const data = { email: "test@example.com", result: undefined };

    const actual = getIsAwaitingEmailConfirmation(data);
    const expected = true;

    expect(actual).toEqual(expected);
  });

  test("given: an object missing the email property, should: return false", () => {
    const data = { result: undefined };

    const actual = getIsAwaitingEmailConfirmation(data);
    const expected = false;

    expect(actual).toEqual(expected);
  });

  test("given: an object with a non-string email, should: return false", () => {
    const data = { email: 123 };

    const actual = getIsAwaitingEmailConfirmation(data);
    const expected = false;

    expect(actual).toEqual(expected);
  });

  test("given: null, should: return false", () => {
    const actual = getIsAwaitingEmailConfirmation(null);
    const expected = false;

    expect(actual).toEqual(expected);
  });

  test("given: undefined, should: return false", () => {
    const actual = getIsAwaitingEmailConfirmation(undefined);
    const expected = false;

    expect(actual).toEqual(expected);
  });

  test("given: a string, should: return false", () => {
    const actual = getIsAwaitingEmailConfirmation("test@example.com");
    const expected = false;

    expect(actual).toEqual(expected);
  });
});
