import { describe, expect, test } from "vitest";

import { getDomainUrl } from "./get-domain-url.server";

describe("getDomainUrl()", () => {
  test("given: a plain request, should: return its protocol and host", () => {
    const request = new Request("http://localhost:3001/login");

    expect(getDomainUrl(request)).toEqual("http://localhost:3001");
  });

  test("given: a request forwarded over HTTPS by a proxy, should: return https", () => {
    const request = new Request("http://collect-am.orololuwa.dev/login", {
      headers: { "X-Forwarded-Proto": "https" },
    });

    expect(getDomainUrl(request)).toEqual("https://collect-am.orololuwa.dev");
  });

  test("given: a list of forwarded protocols, should: use the first one", () => {
    const request = new Request("http://example.com/", {
      headers: { "X-Forwarded-Proto": "https, http" },
    });

    expect(getDomainUrl(request)).toEqual("https://example.com");
  });

  test("given: an unexpected forwarded protocol, should: ignore it", () => {
    const request = new Request("http://example.com/", {
      headers: { "X-Forwarded-Proto": "javascript" },
    });

    expect(getDomainUrl(request)).toEqual("http://example.com");
  });
});
