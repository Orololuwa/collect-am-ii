import { cacheHeader } from "pretty-cache-header";
import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/$lng.$ns";
import resources from "~/features/localization/locales";
import { LOCALES_VERSION } from "~/features/localization/locales-version.server";
import { badRequest } from "~/utils/http-responses.server";

export async function loader({ params, request }: Route.LoaderArgs) {
  const lng = z
    .enum(Object.keys(resources) as Array<keyof typeof resources>)
    .safeParse(params.lng);

  if (lng.error) {
    return badRequest({ error: lng.error });
  }

  const namespaces = resources[lng.data];

  const ns = z
    .enum(Object.keys(namespaces) as Array<keyof typeof namespaces>)
    .safeParse(params.ns);

  if (ns.error) {
    return badRequest({ error: ns.error });
  }

  const headers = new Headers();

  // On production, cache the current version for good: a deploy that changes
  // any copy changes the version, and with it the URL. A request for an older
  // version (a tab opened before the deploy) gets today's copy, uncached.
  if (process.env.NODE_ENV === "production") {
    const version = new URL(request.url).searchParams.get("v");
    headers.set(
      "Cache-Control",
      version === LOCALES_VERSION
        ? cacheHeader({ immutable: true, maxAge: "1y", public: true })
        : "no-cache",
    );
  }

  return data(namespaces[ns.data], { headers });
}
