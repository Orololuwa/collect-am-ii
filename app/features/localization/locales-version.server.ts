import { createHash } from "node:crypto";

import resources from "./locales";

/**
 * A fingerprint of every translation. The client puts it in the URLs it loads
 * translations from, so a deploy that changes any copy also changes the URLs
 * and no browser can keep serving the old copy from its cache.
 */
export const LOCALES_VERSION = createHash("sha256")
  .update(JSON.stringify(resources))
  .digest("hex")
  .slice(0, 12);
