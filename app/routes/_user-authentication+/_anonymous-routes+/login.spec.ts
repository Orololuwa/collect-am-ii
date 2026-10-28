import { describe, expect, onTestFinished, test } from "vitest";

import { action } from "./login";
import { createPopulatedUserAccount } from "~/features/user-accounts/user-accounts-factories.server";
import {
  deleteUserAccountFromDatabaseById,
  saveUserAccountToDatabase,
} from "~/features/user-accounts/user-accounts-model.server";
import { loginIntents } from "~/features/user-authentication/user-authentication-constants";
import { anonymousMiddleware } from "~/features/user-authentication/user-authentication-middleware.server";
import {
  auth0Handlers,
  createRateLimitedEmail,
  MOCK_EMAIL_CODE,
} from "~/test/mocks/handlers/auth0";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import {
  createAuthenticatedRequest,
  createTestContextProvider,
} from "~/test/test-utils";
import { toFormData } from "~/utils/to-form-data";

const createUrl = () => `http://localhost:3000/login`;

const pattern = "/login";

async function sendRequest({ formData }: { formData: FormData }) {
  const request = new Request(createUrl(), {
    body: formData,
    method: "POST",
  });
  const params = {};

  return await action({
    context: await createTestContextProvider({
      middlewares: [anonymousMiddleware],
      params,
      pattern,
      request,
    }),
    params,
    request,
    unstable_pattern: pattern,
  });
}

setupMockServerLifecycle(...auth0Handlers);

describe("/login route action", () => {
  test("given: an authenticated request, should: throw a redirect to the organizations page", async () => {
    expect.assertions(2);

    const userAccount = createPopulatedUserAccount();
    await saveUserAccountToDatabase(userAccount);
    onTestFinished(async () => {
      await deleteUserAccountFromDatabaseById(userAccount.id);
    });
    const request = await createAuthenticatedRequest({
      formData: toFormData({}),
      method: "POST",
      url: createUrl(),
      user: userAccount,
    });
    const params = {};

    try {
      await action({
        context: await createTestContextProvider({
          middlewares: [anonymousMiddleware],
          params,
          pattern,
          request,
        }),
        params,
        request,
        unstable_pattern: pattern,
      });
    } catch (error) {
      if (error instanceof Response) {
        expect(error.status).toEqual(302);
        expect(error.headers.get("Location")).toEqual("/organizations");
      }
    }
  });

  test("given: an invalid intent, should: return a 400 status code with an error message", async () => {
    const formData = toFormData({ intent: "invalid-intent" });

    const actual = await sendRequest({ formData });

    expect(actual).toMatchObject({
      data: {
        result: {
          error: {
            fieldErrors: {
              intent: expect.arrayContaining(["Invalid input"]),
            },
          },
        },
      },
      init: { status: 400 },
    });
  });

  test("given: no intent, should: return a 400 status code with an error message", async () => {
    const formData = toFormData({});

    const actual = await sendRequest({ formData });

    expect(actual).toMatchObject({
      data: {
        result: {
          error: {
            fieldErrors: {
              intent: expect.arrayContaining(["Invalid input"]),
            },
          },
        },
      },
      init: { status: 400 },
    });
  });

  describe(`${loginIntents.loginWithEmail} intent`, () => {
    const intent = loginIntents.loginWithEmail;

    test("given: a valid email for an existing user, should: return the user's email with no session or user", async () => {
      const userAccount = createPopulatedUserAccount();
      await saveUserAccountToDatabase(userAccount);
      onTestFinished(async () => {
        await deleteUserAccountFromDatabaseById(userAccount.id);
      });
      const formData = toFormData({ email: userAccount.email, intent });

      const actual = await sendRequest({ formData });
      const expected = { email: userAccount.email, result: undefined };

      expect(actual).toEqual(expected);
    });

    test.each([
      {
        body: { intent },
        given: "no email",
      },
      {
        body: { email: "invalid-email", intent },
        given: "an invalid email",
      },
    ])("given: $given, should: return a 400 status code with an error message", async ({
      body,
    }) => {
      const formData = toFormData(body);

      const actual = await sendRequest({ formData });
      expect(actual).toMatchObject({
        data: {
          result: {
            error: {
              fieldErrors: {
                email: expect.arrayContaining([
                  "userAuthentication:login.errors.invalidEmail",
                ]),
              },
            },
          },
        },
        init: { status: 400 },
      });
    });

    test("given: a valid email for a non-existent user, should: return a 400 status code with an error message", async () => {
      const formData = toFormData({ email: "test@example.com", intent });

      const actual = await sendRequest({ formData });

      expect(actual).toMatchObject({
        data: {
          result: {
            error: {
              fieldErrors: {
                email: expect.arrayContaining([
                  "userAuthentication:login.form.userDoesntExist",
                ]),
              },
            },
          },
        },
        init: { status: 400 },
      });
    });

    test("given: too many requests in a short time, should: return a 400 status code with an error message", async () => {
      const email = createRateLimitedEmail();
      const userAccount = createPopulatedUserAccount({ email });
      await saveUserAccountToDatabase(userAccount);
      onTestFinished(async () => {
        await deleteUserAccountFromDatabaseById(userAccount.id);
      });
      const formData = toFormData({ email, intent });

      const actual = await sendRequest({ formData });

      expect(actual).toMatchObject({
        data: {
          result: {
            error: {
              fieldErrors: {
                email: expect.arrayContaining([
                  "userAuthentication:login.form.loginFailed",
                ]),
              },
            },
          },
        },
        init: { status: 400 },
      });
    });
  });

  describe(`${loginIntents.verifyCode} intent`, () => {
    const intent = loginIntents.verifyCode;

    test("given: the correct code, should: sign the user in and redirect", async () => {
      const userAccount = createPopulatedUserAccount();
      await saveUserAccountToDatabase(userAccount);
      onTestFinished(async () => {
        await deleteUserAccountFromDatabaseById(userAccount.id);
      });
      const { email } = userAccount;
      const EXPECTED_LOCATION = "/organizations";
      const formData = toFormData({ code: MOCK_EMAIL_CODE, email, intent });

      const response = (await sendRequest({ formData })) as Response;

      expect(response.status).toEqual(302);
      expect(response.headers.get("Location")).toEqual(EXPECTED_LOCATION);
      expect(response.headers.get("Set-Cookie")).toMatch(/__session=/);
    });

    test("given: a wrong code, should: return a 400 with the email and a code error", async () => {
      const email = "wrong-code@example.com";
      const formData = toFormData({ code: "000000", email, intent });

      const actual = await sendRequest({ formData });

      expect(actual).toMatchObject({
        data: {
          email,
          result: {
            error: {
              fieldErrors: {
                code: expect.arrayContaining([
                  "userAuthentication:login.code.invalidCode",
                ]),
              },
            },
          },
        },
        init: { status: 400 },
      });
    });
  });

  describe(`${loginIntents.loginWithGoogle} intent`, () => {
    const intent = loginIntents.loginWithGoogle;

    test("given: a login request with Google, should: redirect to Auth0's authorize URL for Google and set the OAuth cookie", async () => {
      const formData = toFormData({ intent });

      const response = (await sendRequest({ formData })) as Response;

      expect(response.status).toEqual(302);
      const location = new URL(response.headers.get("Location") ?? "");
      expect(location.origin).toEqual(`https://${process.env.AUTH0_DOMAIN}`);
      expect(location.pathname).toEqual("/authorize");
      expect(location.searchParams.get("connection")).toEqual("google-oauth2");
      expect(location.searchParams.get("code_challenge_method")).toEqual(
        "S256",
      );
      expect(location.searchParams.get("state")).toBeTruthy();
      expect(response.headers.get("Set-Cookie")).toMatch(/__oauth=/);
    });
  });
});
