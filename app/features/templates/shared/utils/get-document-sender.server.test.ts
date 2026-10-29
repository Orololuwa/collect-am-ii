import { describe, expect, test } from "vitest";

import { getDocumentSender } from "./email-sender.server";

describe("getDocumentSender()", () => {
  test("given: a bare EMAIL_FROM address, should: send from it under the organization's name", () => {
    expect(
      getDocumentSender({
        appName: "CollectAm",
        emailFrom: "documents@orololuwa.dev",
        organizationName: "Acme",
      }),
    ).toEqual('"Acme via CollectAm" <documents@orololuwa.dev>');
  });

  test("given: an EMAIL_FROM with its own display name, should: keep only its address", () => {
    expect(
      getDocumentSender({
        appName: "CollectAm",
        emailFrom: "CollectAm <login@orololuwa.dev>",
        organizationName: "Acme",
      }),
    ).toEqual('"Acme via CollectAm" <login@orololuwa.dev>');
  });

  test("given: an organization name with header characters, should: strip them", () => {
    expect(
      getDocumentSender({
        appName: "CollectAm",
        emailFrom: "documents@orololuwa.dev",
        organizationName: 'Evil" <attacker@x.com>\r\nBcc: a@b.c',
      }),
    ).toEqual(
      '"Evil attacker@x.com Bcc: a@b.c via CollectAm" <documents@orololuwa.dev>',
    );
  });
});
