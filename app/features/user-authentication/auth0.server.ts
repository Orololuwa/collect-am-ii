import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64urlNoPadding } from "@oslojs/encoding";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

const PASSWORDLESS_CONNECTION = "email";
const GOOGLE_CONNECTION = "google-oauth2";
const PASSWORDLESS_OTP_GRANT =
  "http://auth0.com/oauth/grant-type/passwordless/otp";

function getAuth0BaseUrl() {
  return `https://${process.env.AUTH0_DOMAIN}`;
}

function getCallbackUrl() {
  return `${process.env.APP_URL}/auth/callback`;
}

const idTokenClaimsSchema = z.object({
  email: z.email(),
  email_verified: z.boolean().optional(),
  sub: z.string(),
});

export type Auth0IdTokenClaims = z.infer<typeof idTokenClaimsSchema>;

const tokenResponseSchema = z.object({ id_token: z.string() });

const auth0ErrorSchema = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
});

/**
 * Error thrown when Auth0 responds with a non-2xx status. Keeps the HTTP status
 * and Auth0's `error` code so callers can map them to form errors.
 */
export class Auth0Error extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor({
    status,
    code,
    message,
  }: {
    status: number;
    code?: string;
    message: string;
  }) {
    super(message);
    this.name = "Auth0Error";
    this.status = status;
    this.code = code;
  }
}

async function postToAuth0(path: string, body: Record<string, string>) {
  const response = await fetch(`${getAuth0BaseUrl()}${path}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!response.ok) {
    const parsed = auth0ErrorSchema.safeParse(json);
    throw new Auth0Error({
      code: parsed.success ? parsed.data.error : undefined,
      message:
        (parsed.success && parsed.data.error_description) ||
        `Auth0 request to ${path} failed with status ${response.status}`,
      status: response.status,
    });
  }

  return json;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  jwks ??= createRemoteJWKSet(
    new URL(`${getAuth0BaseUrl()}/.well-known/jwks.json`),
  );
  return jwks;
}

/**
 * Verifies an Auth0 ID token's signature, issuer and audience.
 *
 * @param idToken - The raw ID token returned by Auth0's token endpoint.
 * @returns The verified identity claims.
 */
export async function verifyIdToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, getJwks(), {
    audience: process.env.AUTH0_CLIENT_ID,
    issuer: `${getAuth0BaseUrl()}/`,
  });

  return idTokenClaimsSchema.parse(payload);
}

/**
 * Asks Auth0 to email a one-time sign-in code to the given address. Auth0
 * delivers the email through its configured email provider (Resend SMTP).
 *
 * @param email - The email address to send the code to.
 * @throws {Auth0Error} With status 429 when the address is rate limited.
 */
export async function startPasswordlessEmail(email: string) {
  await postToAuth0("/passwordless/start", {
    client_id: process.env.AUTH0_CLIENT_ID,
    client_secret: process.env.AUTH0_CLIENT_SECRET,
    connection: PASSWORDLESS_CONNECTION,
    email,
    send: "code",
  });
}

/**
 * Exchanges an emailed one-time code for verified identity claims.
 *
 * @param email - The email the code was sent to.
 * @param code - The code the user typed in.
 * @returns The verified ID token claims.
 * @throws {Auth0Error} With status 403 when the code is wrong or expired.
 */
export async function verifyPasswordlessCode({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const json = await postToAuth0("/oauth/token", {
    client_id: process.env.AUTH0_CLIENT_ID,
    client_secret: process.env.AUTH0_CLIENT_SECRET,
    grant_type: PASSWORDLESS_OTP_GRANT,
    otp: code,
    realm: PASSWORDLESS_CONNECTION,
    scope: "openid email profile",
    username: email,
  });

  return verifyIdToken(tokenResponseSchema.parse(json).id_token);
}

/**
 * Generates a random URL-safe string for OAuth `state` and PKCE verifiers.
 */
export function generateRandomString() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return encodeBase64urlNoPadding(bytes);
}

/**
 * Builds the Auth0 `/authorize` URL that sends the user straight to Google.
 *
 * @param state - Random value that is checked again in the callback.
 * @param codeVerifier - PKCE verifier; its S256 hash is sent as the challenge.
 * @returns The URL to redirect the user to.
 */
export function createGoogleAuthorizationUrl({
  state,
  codeVerifier,
}: {
  state: string;
  codeVerifier: string;
}) {
  const codeChallenge = encodeBase64urlNoPadding(
    sha256(new TextEncoder().encode(codeVerifier)),
  );

  const url = new URL(`${getAuth0BaseUrl()}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.AUTH0_CLIENT_ID);
  url.searchParams.set("redirect_uri", getCallbackUrl());
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("connection", GOOGLE_CONNECTION);
  // Don't silently reuse an Auth0 session left over from a previous sign-in,
  // so logging out of the app and choosing Google again goes back to Google.
  url.searchParams.set("prompt", "login");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url;
}

/**
 * Exchanges the authorization code from the OAuth callback for verified
 * identity claims.
 *
 * @param code - The `code` query parameter from the callback.
 * @param codeVerifier - The PKCE verifier stored before the redirect.
 * @returns The verified ID token claims.
 */
export async function exchangeAuthorizationCode({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}) {
  const json = await postToAuth0("/oauth/token", {
    client_id: process.env.AUTH0_CLIENT_ID,
    client_secret: process.env.AUTH0_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: getCallbackUrl(),
  });

  return verifyIdToken(tokenResponseSchema.parse(json).id_token);
}

const managementTokenSchema = z.object({ access_token: z.string() });
const auth0UsersSchema = z.array(z.object({ user_id: z.string() }));

/**
 * Deletes every Auth0 user with the given email (one per connection, e.g. the
 * passwordless and Google identities). Best effort: failures are logged and
 * swallowed so they never block deleting the app's own account.
 *
 * Requires the application to be authorized for the Management API with the
 * `read:users` and `delete:users` scopes (client credentials grant).
 *
 * @param email - The email of the users to delete.
 */
export async function deleteAuth0UsersByEmail(email: string) {
  try {
    const tokenJson = await postToAuth0("/oauth/token", {
      audience: `${getAuth0BaseUrl()}/api/v2/`,
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      grant_type: "client_credentials",
    });
    const { access_token } = managementTokenSchema.parse(tokenJson);
    const authorization = `Bearer ${access_token}`;

    const usersUrl = new URL(`${getAuth0BaseUrl()}/api/v2/users-by-email`);
    usersUrl.searchParams.set("email", email);
    const usersResponse = await fetch(usersUrl, {
      headers: { Authorization: authorization },
    });

    if (!usersResponse.ok) {
      throw new Error(
        `Failed to look up Auth0 users (status ${usersResponse.status})`,
      );
    }

    const users = auth0UsersSchema.parse(await usersResponse.json());

    await Promise.all(
      users.map(async ({ user_id }) => {
        const response = await fetch(
          `${getAuth0BaseUrl()}/api/v2/users/${encodeURIComponent(user_id)}`,
          { headers: { Authorization: authorization }, method: "DELETE" },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to delete Auth0 user ${user_id} (status ${response.status})`,
          );
        }
      }),
    );
  } catch (error) {
    console.error("Failed to delete Auth0 users for", email, error);
  }
}
