import { generalSecurity } from "@nichtsam/helmet/general";
import type { MiddlewareFunction } from "react-router";

export const securityMiddleware: MiddlewareFunction = async (_, next) => {
  const response = (await next()) as Response;

  // same-origin CORP would block the portfolio (orololuwa.dev) from
  // embedding this app in browsers that apply the header to documents.
  // same-site still refuses other sites. Framing itself is allowlisted
  // with CSP frame-ancestors in entry.server.tsx.
  generalSecurity(response.headers, {
    referrerPolicy: false,
    sameOrigin: false,
  });
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");

  // Control search engine indexing via X-Robots-Tag header
  const allowIndexing = process.env.ALLOW_INDEXING !== "false";
  if (!allowIndexing) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
};
