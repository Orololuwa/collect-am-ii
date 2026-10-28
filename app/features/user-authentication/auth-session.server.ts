import { createCookieSessionStorage } from "react-router";
import { z } from "zod";

export const USER_SESSION_NAME = "__session";
const OAUTH_SESSION_NAME = "__oauth";

const USER_ID_KEY = "userId";
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
const TEN_MINUTES_IN_SECONDS = 60 * 10;

const userSessionSchema = z.object({ [USER_ID_KEY]: z.string() });

type UserSessionData = z.infer<typeof userSessionSchema>;

export const userSessionStorage = createCookieSessionStorage<UserSessionData>({
  cookie: {
    httpOnly: true,
    maxAge: THIRTY_DAYS_IN_SECONDS,
    name: USER_SESSION_NAME,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.COOKIE_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

/**
 * Creates the `Set-Cookie` header value that signs the given user in.
 *
 * @param userId - The id of the `UserAccount` to sign in.
 * @returns The serialized session cookie.
 */
export async function createUserSessionCookie(userId: string) {
  const session = await userSessionStorage.getSession();
  session.set(USER_ID_KEY, userId);
  return await userSessionStorage.commitSession(session);
}

/**
 * Creates headers that sign the given user in.
 *
 * @param userId - The id of the `UserAccount` to sign in.
 * @returns A `Headers` object with the session `Set-Cookie` header.
 */
export async function createUserSessionHeaders(userId: string) {
  return new Headers({ "Set-Cookie": await createUserSessionCookie(userId) });
}

/**
 * Reads the signed-in user's id from the session cookie.
 *
 * @param request - The incoming request.
 * @returns The `UserAccount` id, or `undefined` when nobody is signed in.
 */
export async function getUserIdFromSession(request: Request) {
  const session = await userSessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const result = userSessionSchema.safeParse({
    [USER_ID_KEY]: session.get(USER_ID_KEY),
  });
  return result.success ? result.data[USER_ID_KEY] : undefined;
}

/**
 * Creates headers that clear the session cookie.
 *
 * @param request - The incoming request.
 * @returns A `Headers` object with the `Set-Cookie` header that signs out.
 */
export async function destroyUserSession(request: Request) {
  const session = await userSessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  return new Headers({
    "Set-Cookie": await userSessionStorage.destroySession(session),
  });
}

const oauthSessionSchema = z.object({
  codeVerifier: z.string(),
  state: z.string(),
});

type OAuthSessionData = z.infer<typeof oauthSessionSchema>;

const oauthSessionStorage = createCookieSessionStorage<OAuthSessionData>({
  cookie: {
    httpOnly: true,
    maxAge: TEN_MINUTES_IN_SECONDS,
    name: OAUTH_SESSION_NAME,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.COOKIE_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

/**
 * Stores the OAuth `state` and PKCE verifier for the Google sign-in round trip.
 *
 * @returns A `Headers` object with the short-lived `__oauth` cookie.
 */
export async function createOAuthSessionHeaders(data: OAuthSessionData) {
  const session = await oauthSessionStorage.getSession();
  session.set("state", data.state);
  session.set("codeVerifier", data.codeVerifier);
  return new Headers({
    "Set-Cookie": await oauthSessionStorage.commitSession(session),
  });
}

/**
 * Reads the OAuth `state` and PKCE verifier stored before the redirect.
 *
 * @param request - The incoming callback request.
 * @returns The stored data, or `undefined` if the cookie is missing or expired.
 */
export async function getOAuthSession(request: Request) {
  const session = await oauthSessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const result = oauthSessionSchema.safeParse({
    codeVerifier: session.get("codeVerifier"),
    state: session.get("state"),
  });
  return result.success ? result.data : undefined;
}

/**
 * Creates headers that clear the `__oauth` cookie.
 */
export async function destroyOAuthSession(request: Request) {
  const session = await oauthSessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  return new Headers({
    "Set-Cookie": await oauthSessionStorage.destroySession(session),
  });
}
