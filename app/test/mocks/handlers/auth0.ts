import { createId } from "@paralleldrive/cuid2";
import type { JWK } from "jose";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import type { RequestHandler } from "msw";
import { HttpResponse, http } from "msw";
import { z } from "zod";

import { writeEmail } from "../utils";

/*
Auth0 handlers. Cover the endpoints used by
`app/features/user-authentication/auth0.server.ts`.
*/

const getBaseUrl = () => `https://${process.env.AUTH0_DOMAIN}`;

/** The only code the mocked passwordless flow accepts. */
export const MOCK_EMAIL_CODE = "123456";

const rateLimitPrefix = "rate-limited";

/**
 * Creates an email for which the mocked `/passwordless/start` returns 429.
 *
 * @returns An email that will be rate limited.
 */
export function createRateLimitedEmail() {
  return `${rateLimitPrefix}-${createId()}@example.com`;
}

/**
 * The OAuth `code` in the mocked Google flow is JSON so tests can pick the
 * email the callback signs in.
 */
export function stringifyAuthCodeData(data: { email: string }) {
  return JSON.stringify(data);
}

const authCodeDataSchema = z.object({ email: z.email() });

const KEY_ID = "mock-auth0-key";
const keyPairPromise = generateKeyPair("RS256");

async function signIdToken({ email, sub }: { email: string; sub: string }) {
  const { privateKey } = await keyPairPromise;
  return new SignJWT({ email, email_verified: true })
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
    .setIssuer(`${getBaseUrl()}/`)
    .setAudience(process.env.AUTH0_CLIENT_ID)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

const jwksMock = http.get(`${getBaseUrl()}/.well-known/jwks.json`, async () => {
  const { publicKey } = await keyPairPromise;
  const jwk: JWK = {
    ...(await exportJWK(publicKey)),
    alg: "RS256",
    kid: KEY_ID,
    use: "sig",
  };
  return HttpResponse.json({ keys: [jwk] });
});

const passwordlessStartBodySchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  connection: z.literal("email"),
  email: z.email(),
  send: z.literal("code"),
});

const passwordlessStartMock = http.post(
  `${getBaseUrl()}/passwordless/start`,
  async ({ request }) => {
    const body = passwordlessStartBodySchema.safeParse(await request.json());

    if (!body.success) {
      return HttpResponse.json(
        { error: "bad.request", error_description: body.error.message },
        { status: 400 },
      );
    }

    const { email } = body.data;

    if (email.includes(rateLimitPrefix)) {
      return HttpResponse.json(
        {
          error: "too_many_requests",
          error_description: "Too many requests. Please try again later.",
        },
        { status: 429 },
      );
    }

    await writeEmail({
      from: "no-reply@auth0.mock",
      html: `<p>Your verification code is <strong>${MOCK_EMAIL_CODE}</strong></p>`,
      subject: "Your verification code",
      text: `Your verification code is ${MOCK_EMAIL_CODE}`,
      to: email,
    });

    return HttpResponse.json({ _id: createId(), email, email_verified: false });
  },
);

const tokenMock = http.post(
  `${getBaseUrl()}/oauth/token`,
  async ({ request }) => {
    const body = (await request.json()) as Record<string, string | undefined>;

    if (
      body.client_id !== process.env.AUTH0_CLIENT_ID ||
      body.client_secret !== process.env.AUTH0_CLIENT_SECRET
    ) {
      return HttpResponse.json(
        { error: "access_denied", error_description: "Unauthorized" },
        { status: 401 },
      );
    }

    switch (body.grant_type) {
      case "http://auth0.com/oauth/grant-type/passwordless/otp": {
        if (!body.username || body.otp !== MOCK_EMAIL_CODE) {
          return HttpResponse.json(
            {
              error: "invalid_grant",
              error_description: "Wrong email or verification code.",
            },
            { status: 403 },
          );
        }

        return HttpResponse.json({
          access_token: `access_${createId()}`,
          expires_in: 86_400,
          id_token: await signIdToken({
            email: body.username,
            sub: `email|${createId()}`,
          }),
          token_type: "Bearer",
        });
      }
      case "authorization_code": {
        let parsed: { email: string } | undefined;
        try {
          parsed = authCodeDataSchema.parse(JSON.parse(body.code ?? ""));
        } catch {
          parsed = undefined;
        }

        if (!parsed || !body.code_verifier) {
          return HttpResponse.json(
            {
              error: "invalid_grant",
              error_description: "Invalid authorization code",
            },
            { status: 403 },
          );
        }

        return HttpResponse.json({
          access_token: `access_${createId()}`,
          expires_in: 86_400,
          id_token: await signIdToken({
            email: parsed.email,
            sub: `google-oauth2|${createId()}`,
          }),
          token_type: "Bearer",
        });
      }
      case "client_credentials": {
        return HttpResponse.json({
          access_token: `management_${createId()}`,
          expires_in: 86_400,
          token_type: "Bearer",
        });
      }
      default: {
        return HttpResponse.json(
          { error: "unsupported_grant_type" },
          { status: 400 },
        );
      }
    }
  },
);

const usersByEmailMock = http.get(
  `${getBaseUrl()}/api/v2/users-by-email`,
  ({ request }) => {
    if (!request.headers.get("Authorization")?.startsWith("Bearer ")) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = new URL(request.url).searchParams.get("email");
    return HttpResponse.json(
      email ? [{ email, user_id: `email|${createId()}` }] : [],
    );
  },
);

const deleteUserMock = http.delete(
  `${getBaseUrl()}/api/v2/users/:id`,
  ({ request }) => {
    if (!request.headers.get("Authorization")?.startsWith("Bearer ")) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return new HttpResponse(null, { status: 204 });
  },
);

export const auth0Handlers: RequestHandler[] = [
  jwksMock,
  passwordlessStartMock,
  tokenMock,
  usersByEmailMock,
  deleteUserMock,
];
