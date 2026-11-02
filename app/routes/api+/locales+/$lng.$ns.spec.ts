import { afterEach, describe, expect, test, vi } from "vitest";

import { loader } from "./$lng.$ns";
import { LOCALES_VERSION } from "~/features/localization/locales-version.server";
import { createTestContextProvider } from "~/test/test-utils";

const pattern = "/api/locales/:lng/:ns";

async function sendRequest({
  lng = "en",
  ns = "landing",
  version,
}: {
  lng?: string;
  ns?: string;
  version?: string;
}) {
  const url = new URL(`http://localhost:3000/api/locales/${lng}/${ns}`);
  if (version) url.searchParams.set("v", version);
  const request = new Request(url);
  const params = { lng, ns };

  return (await loader({
    context: await createTestContextProvider({ params, pattern, request }),
    params,
    request,
    unstable_pattern: pattern,
  })) as { data: unknown; init: ResponseInit | null };
}

const cacheControl = (response: { init: ResponseInit | null }) =>
  new Headers(response.init?.headers).get("Cache-Control");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/api/locales/:lng/:ns route loader", () => {
  test("given: a known language and namespace, should: return its translations", async () => {
    const response = await sendRequest({});

    expect(response.data).toMatchObject({
      header: { register: "Get started" },
    });
  });

  test("given: production and the current version, should: cache it for good", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await sendRequest({ version: LOCALES_VERSION });

    expect(cacheControl(response)).toContain("immutable");
  });

  test("given: production and an older version, should: send today's copy uncached", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await sendRequest({ version: "0ld0ld0ld0ld" });

    expect(cacheControl(response)).toEqual("no-cache");
  });
});
