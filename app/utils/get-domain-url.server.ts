/**
 * Gets the domain URL from a request.
 *
 * Behind a TLS-terminating reverse proxy (e.g. Caddy) the app server only sees
 * plain HTTP, so the protocol comes from the proxy's `X-Forwarded-Proto` header
 * when present. The app is only reachable through the proxy in production
 * (see docker-compose.yml), so the header can be trusted.
 *
 * @param request - The request object
 * @returns The domain URL (e.g., "https://example.com")
 */
export function getDomainUrl(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers
    .get("X-Forwarded-Proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProto === "https" || forwardedProto === "http"
      ? `${forwardedProto}:`
      : url.protocol;
  return `${protocol}//${url.host}`;
}
