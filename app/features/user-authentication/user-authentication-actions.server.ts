import { report } from "@conform-to/react/future";
import type { i18n } from "i18next";
import { redirect } from "react-router";

import { createOAuthSessionHeaders } from "./auth-session.server";
import {
  Auth0Error,
  createGoogleAuthorizationUrl,
  generateRandomString,
  startPasswordlessEmail,
  verifyPasswordlessCode,
} from "./auth0.server";
import { completeSignIn } from "./user-authentication-helpers.server";
import { badRequest } from "~/utils/http-responses.server";

type Submission = Parameters<typeof report>[0];

/**
 * Emails a sign-in code through Auth0 and tells the page to show the code
 * entry step.
 *
 * @param email - The address to send the code to.
 * @param rateLimitedError - Translation key shown when Auth0 rate limits.
 * @param submission - The parsed form submission, for error reporting.
 * @returns The action data for the code entry step, or a 400 response.
 */
export async function sendEmailCode({
  email,
  rateLimitedError,
  submission,
}: {
  email: string;
  rateLimitedError: string;
  submission: Submission;
}) {
  try {
    await startPasswordlessEmail(email);
  } catch (error) {
    if (error instanceof Auth0Error && error.status === 429) {
      return badRequest({
        result: report(submission, {
          error: {
            fieldErrors: { email: [rateLimitedError] },
            formErrors: [],
          },
        }),
      });
    }

    throw error;
  }

  return { email, result: undefined };
}

/**
 * Checks the code the user typed in and, if Auth0 accepts it, signs them in.
 *
 * @param email - The address the code was sent to.
 * @param code - The code the user entered.
 * @param errors - Translation keys for an invalid code and for rate limiting.
 * @param i18n - The i18n instance for toast messages.
 * @param request - The incoming request.
 * @param submission - The parsed form submission, for error reporting.
 * @returns A redirect that signs the user in, or a 400 response that keeps the
 * code entry step open.
 */
export async function verifyEmailCode({
  email,
  code,
  errors,
  i18n,
  request,
  submission,
}: {
  email: string;
  code: string;
  errors: { invalidCode: string; rateLimited: string };
  i18n: i18n;
  request: Request;
  submission: Submission;
}) {
  try {
    const claims = await verifyPasswordlessCode({ code, email });
    return await completeSignIn({ email: claims.email, i18n, request });
  } catch (error) {
    if (error instanceof Auth0Error && error.status < 500) {
      const message =
        error.status === 429 ? errors.rateLimited : errors.invalidCode;

      return badRequest({
        email,
        result: report(submission, {
          error: { fieldErrors: { code: [message] }, formErrors: [] },
        }),
      });
    }

    throw error;
  }
}

/**
 * Starts Google sign-in through Auth0. Stores the OAuth `state` and PKCE
 * verifier in a short-lived cookie that the callback route checks.
 *
 * @returns A redirect to Auth0's `/authorize` endpoint.
 */
export async function redirectToGoogleSignIn() {
  const state = generateRandomString();
  const codeVerifier = generateRandomString();

  return redirect(
    createGoogleAuthorizationUrl({ codeVerifier, state }).toString(),
    { headers: await createOAuthSessionHeaders({ codeVerifier, state }) },
  );
}
