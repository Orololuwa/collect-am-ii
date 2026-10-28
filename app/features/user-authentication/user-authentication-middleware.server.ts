import type { MiddlewareFunction } from "react-router";
import { createContext, href, redirect } from "react-router";
import { safeRedirect } from "remix-utils/safe-redirect";

import { getUserIdFromSession } from "./auth-session.server";

export const authContext = createContext<{
  userId: string;
  headers: Headers;
}>();

export const authMiddleware: MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const headers = new Headers();
  const userId = await getUserIdFromSession(request);

  if (!userId) {
    const redirectTo = new URL(request.url).pathname;
    const searchParameters = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(safeRedirect(`/login?${searchParameters.toString()}`), {
      headers,
    });
  }

  context.set(authContext, { headers, userId });

  return await next();
};

export const anonymousContext = createContext<{
  headers: Headers;
}>();

// Public routes that authenticated users can still access
const PUBLIC_ROUTES_ACCESSIBLE_TO_AUTHENTICATED = ["/", "/docs", "/pricing"];

export const anonymousMiddleware: MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const headers = new Headers();
  const userId = await getUserIdFromSession(request);

  const url = new URL(request.url);
  const isPublicRouteAccessibleToAuthenticated =
    PUBLIC_ROUTES_ACCESSIBLE_TO_AUTHENTICATED.some(
      (route) => url.pathname === route || url.pathname.startsWith(`${route}/`),
    );

  // Only redirect authenticated users if they're not trying to access a public route
  if (userId && !isPublicRouteAccessibleToAuthenticated) {
    throw redirect(href("/organizations"), { headers });
  }

  context.set(anonymousContext, { headers });

  return await next();
};
