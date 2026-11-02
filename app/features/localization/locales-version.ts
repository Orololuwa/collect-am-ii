/** The meta tag the client reads the translations version from before it hydrates. */
export const LOCALES_VERSION_META = "i18n-version";

/** Where the client loads one namespace from, tied to that version. */
export function localesLoadPath(version: string | null | undefined) {
  return version
    ? `/api/locales/{{lng}}/{{ns}}?v=${encodeURIComponent(version)}`
    : "/api/locales/{{lng}}/{{ns}}";
}
