import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { href } from "react-router";

import {
  getPath,
  setupEmailInviteCookie,
  setupInviteLinkCookie,
} from "../../utils";
import { priceLookupKeysByTierAndInterval } from "~/features/billing/billing-constants";
import { EMAIL_INVITE_INFO_SESSION_NAME } from "~/features/organizations/accept-email-invite/accept-email-invite-constants";
import { INVITE_LINK_INFO_SESSION_NAME } from "~/features/organizations/accept-invite-link/accept-invite-link-constants";
import { saveOrganizationEmailInviteLinkToDatabase } from "~/features/organizations/organizations-email-invite-link-model.server";
import {
  createPopulatedOrganizationEmailInviteLink,
  createPopulatedOrganizationInviteLink,
} from "~/features/organizations/organizations-factories.server";
import { saveOrganizationInviteLinkToDatabase } from "~/features/organizations/organizations-invite-link-model.server";
import { createPopulatedUserAccount } from "~/features/user-accounts/user-accounts-factories.server";
import {
  deleteUserAccountFromDatabaseById,
  retrieveUserAccountFromDatabaseByEmail,
} from "~/features/user-accounts/user-accounts-model.server";
import { createOAuthSessionHeaders } from "~/features/user-authentication/auth-session.server";
import { stringifyAuthCodeData } from "~/test/mocks/handlers/auth0";
import {
  createUserWithOrgAndAddAsMember,
  teardownOrganizationAndMember,
} from "~/test/test-utils";

const path = "/auth/callback";

const OAUTH_STATE = "test-oauth-state";

/**
 * Sets up the `__oauth` cookie (state + PKCE verifier) that the app sets when
 * the user clicks "Continue with Google".
 */
async function setupCodeVerifierCookie({ page }: { page: Page }) {
  const setCookie = (
    await createOAuthSessionHeaders({
      codeVerifier: "test-code-verifier",
      state: OAUTH_STATE,
    })
  ).get("Set-Cookie");
  const value = /^__oauth=([^;]+)/.exec(setCookie ?? "")?.[1];

  if (!value) {
    throw new Error("Failed to extract the __oauth cookie value");
  }

  await page.context().addCookies([
    {
      domain: "localhost",
      httpOnly: true,
      name: "__oauth",
      path: "/",
      value,
    },
  ]);
}

/**
 * Builds the callback URL Auth0 would redirect to after Google sign-in.
 */
const createCallbackUrl = (email: string) =>
  `${path}?${new URLSearchParams({ code: stringifyAuthCodeData({ email }), state: OAUTH_STATE }).toString()}`;

test.describe(`${path} API route`, () => {
  test("given: a valid code for a new user, should: create user account and redirect to onboarding page", async ({
    page,
  }) => {
    // Set up the code verifier cookie first.
    await setupCodeVerifierCookie({ page });

    // The mocked Auth0 token endpoint signs in the email encoded in the code.
    const { email } = createPopulatedUserAccount();
    const callbackUrl = createCallbackUrl(email);

    // Navigate to the callback page with code.
    await page.goto(callbackUrl);

    // Verify we're on the onboarding page.
    expect(getPath(page)).toEqual("/onboarding/user-account");

    // Get the created user account from the database.
    const userAccount = await retrieveUserAccountFromDatabaseByEmail(email);
    expect(userAccount).not.toBeNull();

    // Clean up if user was created.
    if (userAccount) {
      await deleteUserAccountFromDatabaseById(userAccount.id);
    }
  });

  test("given: a code for an existing user, should: redirect to organizations page", async ({
    page,
  }) => {
    // Create an existing user account first.
    const { user, organization } = await createUserWithOrgAndAddAsMember();

    // Set up the code verifier cookie.
    await setupCodeVerifierCookie({ page });

    const callbackUrl = createCallbackUrl(user.email);

    // Navigate to callback with code.
    await page.goto(callbackUrl);

    // Verify we're on the organizations page.
    expect(getPath(page)).toEqual(
      `/organizations/${organization.slug}/dashboard`,
    );

    // Clean up.
    await teardownOrganizationAndMember({ organization, user });
  });

  test("given: a valid code for a new user with an active invite link cookie, should: create their account, add them to the organization, show a success toast, and clear the invite link cookie", async ({
    page,
  }) => {
    // Create organization and invite link
    const { organization, user: invitingUser } =
      await createUserWithOrgAndAddAsMember();
    const link = createPopulatedOrganizationInviteLink({
      creatorId: invitingUser.id,
      organizationId: organization.id,
    });
    await saveOrganizationInviteLinkToDatabase(link);

    // Set up the code verifier cookie
    await setupCodeVerifierCookie({ page });

    // Generate email for the new user and create auth code
    const { email } = createPopulatedUserAccount();
    const callbackUrl = createCallbackUrl(email);

    // Set the invite link cookie
    await setupInviteLinkCookie({
      link: { expiresAt: link.expiresAt, inviteLinkToken: link.token },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify redirect to onboarding page
    await expect(
      page.getByRole("heading", { level: 1, name: /create your account/i }),
    ).toBeVisible();
    expect(getPath(page)).toEqual(`/onboarding/user-account`);

    // Verify the user account was created
    const userAccount = await retrieveUserAccountFromDatabaseByEmail(email);
    expect(userAccount).not.toBeNull();
    expect(userAccount?.email).toEqual(email);

    // Enter the account details
    const { name } = createPopulatedUserAccount();
    await page.getByRole("textbox", { name: /name/i }).fill(name);
    await page.getByRole("button", { name: /continue/i }).click();

    // Verify success toast
    await expect(
      page.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();
    expect(getPath(page)).toEqual(
      `/organizations/${organization.slug}/dashboard`,
    );
    await expect(
      page
        .getByRole("region", {
          name: /notifications/i,
        })
        .getByText(/successfully joined organization/i),
    ).toBeVisible();

    // Verify invite link cookie is cleared
    const cookies = await page.context().cookies();
    const inviteLinkCookie = cookies.find(
      (cookie) => cookie.name === INVITE_LINK_INFO_SESSION_NAME,
    );
    expect(inviteLinkCookie).toBeUndefined();

    // Cleanup
    if (userAccount) {
      await deleteUserAccountFromDatabaseById(userAccount.id);
    }
    await teardownOrganizationAndMember({ organization, user: invitingUser });
  });

  test("given: a code for an existing user with an active invite link cookie, should: add them to the organization and show success toast", async ({
    page,
  }) => {
    // Create organization and invite link
    const { organization, user: invitingUser } =
      await createUserWithOrgAndAddAsMember();
    const link = createPopulatedOrganizationInviteLink({
      creatorId: invitingUser.id,
      organizationId: organization.id,
    });
    await saveOrganizationInviteLinkToDatabase(link);

    // Create the existing user that will log in
    const { user: existingUser, organization: existingOrg } =
      await createUserWithOrgAndAddAsMember();

    // Set up the code verifier cookie
    await setupCodeVerifierCookie({ page });

    // Create auth code for existing user
    const callbackUrl = createCallbackUrl(existingUser.email);

    // Set the invite link cookie
    await setupInviteLinkCookie({
      link: { expiresAt: link.expiresAt, inviteLinkToken: link.token },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify redirect to organization dashboard
    await expect(
      page.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();
    expect(getPath(page)).toEqual(
      `/organizations/${organization.slug}/dashboard`,
    );

    // Verify success toast
    await expect(
      page
        .getByRole("region", {
          name: /notifications/i,
        })
        .getByText(/successfully joined organization/i),
    ).toBeVisible();

    // Verify invite link cookie is cleared
    const cookies = await page.context().cookies();
    const inviteLinkCookie = cookies.find(
      (cookie) => cookie.name === INVITE_LINK_INFO_SESSION_NAME,
    );
    expect(inviteLinkCookie).toBeUndefined();

    // Cleanup
    await teardownOrganizationAndMember({
      organization: existingOrg,
      user: existingUser,
    });
    await teardownOrganizationAndMember({ organization, user: invitingUser });
  });

  test("given: a code for an existing user with an active invite link cookie for an organization that the user is already a member of, should: redirect them to the organization's dashboard and show a toast", async ({
    page,
  }) => {
    // Create organization and user who is already a member
    const { organization, user } = await createUserWithOrgAndAddAsMember();

    // Create an invite link for the same organization
    const link = createPopulatedOrganizationInviteLink({
      creatorId: user.id,
      organizationId: organization.id,
    });
    await saveOrganizationInviteLinkToDatabase(link);

    // Set up the code verifier cookie
    await setupCodeVerifierCookie({ page });

    // Create auth code for the same user
    const callbackUrl = createCallbackUrl(user.email);

    // Set the invite link cookie
    await setupInviteLinkCookie({
      link: { expiresAt: link.expiresAt, inviteLinkToken: link.token },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify redirect to organization dashboard
    await expect(
      page.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();
    expect(getPath(page)).toEqual(
      `/organizations/${organization.slug}/dashboard`,
    );

    // Verify toast message
    await expect(
      page
        .getByRole("region", { name: /notifications/i })
        .getByText(
          new RegExp(`You are already a member of ${organization.name}`, "i"),
        ),
    ).toBeVisible();

    // Verify invite link cookie is cleared
    const cookies = await page.context().cookies();
    const inviteLinkCookie = cookies.find(
      (cookie) => cookie.name === INVITE_LINK_INFO_SESSION_NAME,
    );
    expect(inviteLinkCookie).toBeUndefined();

    // Cleanup
    await teardownOrganizationAndMember({ organization, user });
  });

  test("given: no code parameter, should: redirect to the login page", async ({
    request,
  }) => {
    // Make request without code.
    const response = await request.get(path, { maxRedirects: 0 });

    // Verify response.
    expect(response.status()).toEqual(302);
    expect(response.headers().location).toEqual("/login");
  });

  test("given: a state that doesn't match the OAuth cookie, should: redirect to the login page", async ({
    page,
  }) => {
    await setupCodeVerifierCookie({ page });

    await page.goto(
      `${path}?${new URLSearchParams({ code: stringifyAuthCodeData({ email: createPopulatedUserAccount().email }), state: "forged-state" }).toString()}`,
    );

    expect(getPath(page)).toEqual("/login");
  });

  test("given: an invalid code, should: return an error", async ({
    page,
    request,
  }) => {
    await setupCodeVerifierCookie({ page });
    const cookies = await page.context().cookies();

    // Make request with an invalid code but a valid state.
    const response = await request.get(
      `${path}?${new URLSearchParams({ code: "invalid_code", state: OAUTH_STATE }).toString()}`,
      {
        headers: {
          Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
        },
        maxRedirects: 0,
      },
    );

    // Verify response.
    expect(response.status()).toEqual(500);
  });

  test("given: a valid code for a new user with an active email invite cookie, should: create their account, add them to the organization, show a success toast, and clear the email invite cookie", async ({
    page,
  }) => {
    // Create organization and email invite
    const { organization, user: invitingUser } =
      await createUserWithOrgAndAddAsMember();
    const invite = createPopulatedOrganizationEmailInviteLink({
      invitedById: invitingUser.id,
      organizationId: organization.id,
    });
    await saveOrganizationEmailInviteLinkToDatabase(invite);

    // Set up the code verifier cookie first.
    await setupCodeVerifierCookie({ page });

    // Generate email for the new user and create auth code
    const { email } = createPopulatedUserAccount();
    const callbackUrl = createCallbackUrl(email);

    // Set the email invite cookie
    await setupEmailInviteCookie({
      invite: { emailInviteToken: invite.token, expiresAt: invite.expiresAt },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify redirect to onboarding page
    await expect(
      page.getByRole("heading", { level: 1, name: /create your account/i }),
    ).toBeVisible();
    expect(getPath(page)).toEqual(`/onboarding/user-account`);

    // Verify the user account was created
    const userAccount = await retrieveUserAccountFromDatabaseByEmail(email);
    expect(userAccount).not.toBeNull();
    expect(userAccount?.email).toEqual(email);

    // Enter the account details
    const { name } = createPopulatedUserAccount();
    await page.getByRole("textbox", { name: /name/i }).fill(name);
    await page.getByRole("button", { name: /continue/i }).click();

    // Verify success toast
    await expect(
      page.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();
    expect(getPath(page)).toEqual(
      `/organizations/${organization.slug}/dashboard`,
    );
    await expect(
      page
        .getByRole("region", {
          name: /notifications/i,
        })
        .getByText(/successfully joined organization/i),
    ).toBeVisible();

    // Verify email invite cookie is cleared
    const cookies = await page.context().cookies();
    const emailInviteCookie = cookies.find(
      (cookie) => cookie.name === EMAIL_INVITE_INFO_SESSION_NAME,
    );
    expect(emailInviteCookie).toBeUndefined();

    // Cleanup
    if (userAccount) {
      await deleteUserAccountFromDatabaseById(userAccount.id);
    }
    await teardownOrganizationAndMember({ organization, user: invitingUser });
  });

  test("given: a code for an existing user with an active email invite cookie, should: add them to the organization and show success toast", async ({
    page,
  }) => {
    // Create organization and email invite
    const { organization, user: invitingUser } =
      await createUserWithOrgAndAddAsMember();
    const invite = createPopulatedOrganizationEmailInviteLink({
      invitedById: invitingUser.id,
      organizationId: organization.id,
    });
    await saveOrganizationEmailInviteLinkToDatabase(invite);

    // Create the existing user that will log in
    const { user: existingUser, organization: existingOrg } =
      await createUserWithOrgAndAddAsMember();

    // Set up the code verifier cookie
    await setupCodeVerifierCookie({ page });

    // Create auth code for existing user
    const callbackUrl = createCallbackUrl(existingUser.email);

    // Set the email invite cookie
    await setupEmailInviteCookie({
      invite: { emailInviteToken: invite.token, expiresAt: invite.expiresAt },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify redirect to organization dashboard
    await expect(
      page.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();
    expect(getPath(page)).toEqual(
      `/organizations/${organization.slug}/dashboard`,
    );

    // Verify success toast
    await expect(
      page
        .getByRole("region", {
          name: /notifications/i,
        })
        .getByText(/successfully joined organization/i),
    ).toBeVisible();

    // Verify email invite cookie is cleared
    const cookies = await page.context().cookies();
    const emailInviteCookie = cookies.find(
      (cookie) => cookie.name === EMAIL_INVITE_INFO_SESSION_NAME,
    );
    expect(emailInviteCookie).toBeUndefined();

    // Cleanup
    await teardownOrganizationAndMember({
      organization: existingOrg,
      user: existingUser,
    });
    await teardownOrganizationAndMember({ organization, user: invitingUser });
  });

  test("given: a code for an existing user with an active email invite cookie for an organization that the user is already a member of, should: redirect them to the organization's dashboard and show a toast", async ({
    page,
  }) => {
    // Create organization and user who is already a member
    const { organization, user } = await createUserWithOrgAndAddAsMember();

    // Create an email invite for the same organization
    const invite = createPopulatedOrganizationEmailInviteLink({
      email: user.email,
      invitedById: user.id,
      organizationId: organization.id,
    });
    await saveOrganizationEmailInviteLinkToDatabase(invite);

    // Set up the code verifier cookie
    await setupCodeVerifierCookie({ page });

    // Create auth code for the same user
    const callbackUrl = createCallbackUrl(user.email);

    // Set the email invite cookie
    await setupEmailInviteCookie({
      invite: { emailInviteToken: invite.token, expiresAt: invite.expiresAt },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify redirect to organization dashboard
    await expect(
      page.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();
    expect(getPath(page)).toEqual(
      `/organizations/${organization.slug}/dashboard`,
    );

    // Verify toast message
    await expect(
      page
        .getByRole("region", { name: /notifications/i })
        .getByText(
          new RegExp(`You are already a member of ${organization.name}`, "i"),
        ),
    ).toBeVisible();

    // Verify email invite cookie is cleared
    const cookies = await page.context().cookies();
    const emailInviteCookie = cookies.find(
      (cookie) => cookie.name === EMAIL_INVITE_INFO_SESSION_NAME,
    );
    expect(emailInviteCookie).toBeUndefined();

    // Cleanup
    await teardownOrganizationAndMember({ organization, user });
  });

  test("given: a valid code for a new user with an active invite link cookie for an organization that is already full, should: NOT let the user join the organization and show a toast with a message letting the user know what is happening", async ({
    page,
  }) => {
    // Create organization with the low tier plan (1 seat limit)
    const { organization, user: invitingUser } =
      await createUserWithOrgAndAddAsMember({
        lookupKey: priceLookupKeysByTierAndInterval.low.annual,
      });

    // Create an invite link for this organization
    const link = createPopulatedOrganizationInviteLink({
      creatorId: invitingUser.id,
      organizationId: organization.id,
    });
    await saveOrganizationInviteLinkToDatabase(link);

    // Set up the code verifier cookie
    await setupCodeVerifierCookie({ page });

    // Generate email for the new user and create auth code
    const { email } = createPopulatedUserAccount();
    const callbackUrl = createCallbackUrl(email);

    // Set the invite link cookie
    await setupInviteLinkCookie({
      link: { expiresAt: link.expiresAt, inviteLinkToken: link.token },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify toast message
    await expect(
      page
        .getByRole("region", { name: /notifications/i })
        .getByText(/organization has reached its member limit/i),
    ).toBeVisible();

    // Verify we're still on the same page (not redirected)
    expect(getPath(page)).toEqual(
      `${href("/organizations/invite-link")}?token=${link.token}`,
    );

    // Verify the user account was created
    const userAccount = await retrieveUserAccountFromDatabaseByEmail(email);
    expect(userAccount).not.toBeNull();
    expect(userAccount?.email).toEqual(email);

    // Cleanup
    if (userAccount) {
      await deleteUserAccountFromDatabaseById(userAccount.id);
    }
    await teardownOrganizationAndMember({ organization, user: invitingUser });
  });

  test("given: a valid code for a new user with an active email invite cookie for an organization that is already full, should: NOT let the user join the organization and show a toast with a message letting the user know what is happening", async ({
    page,
  }) => {
    // Create organization with the low tier plan (1 seat limit)
    const { organization, user: invitingUser } =
      await createUserWithOrgAndAddAsMember({
        lookupKey: priceLookupKeysByTierAndInterval.low.annual,
      });

    // Create an email invite for this organization
    const invite = createPopulatedOrganizationEmailInviteLink({
      invitedById: invitingUser.id,
      organizationId: organization.id,
    });
    await saveOrganizationEmailInviteLinkToDatabase(invite);

    // Set up the code verifier cookie
    await setupCodeVerifierCookie({ page });

    // Generate email for the new user and create auth code
    const { email } = createPopulatedUserAccount();
    const callbackUrl = createCallbackUrl(email);

    // Set the email invite cookie
    await setupEmailInviteCookie({
      invite: { emailInviteToken: invite.token, expiresAt: invite.expiresAt },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify toast message
    await expect(
      page
        .getByRole("region", { name: /notifications/i })
        .getByText(/organization has reached its member limit/i),
    ).toBeVisible();

    // Verify we're still on the same page (not redirected)
    expect(getPath(page)).toEqual(
      `${href("/organizations/email-invite")}?token=${invite.token}`,
    );

    // Verify the user account was created
    const userAccount = await retrieveUserAccountFromDatabaseByEmail(email);
    expect(userAccount).not.toBeNull();
    expect(userAccount?.email).toEqual(email);

    // Cleanup
    if (userAccount) {
      await deleteUserAccountFromDatabaseById(userAccount.id);
    }
    await teardownOrganizationAndMember({ organization, user: invitingUser });
  });

  test("given: a code for an existing user with an active invite link cookie for an organization that is already full, should: NOT let the user join the organization and show a toast with a message letting the user know what is happening", async ({
    page,
  }) => {
    // Create organization with the low tier plan (1 seat limit)
    const { organization, user: invitingUser } =
      await createUserWithOrgAndAddAsMember({
        lookupKey: priceLookupKeysByTierAndInterval.low.annual,
      });

    // Create an invite link for this organization
    const link = createPopulatedOrganizationInviteLink({
      creatorId: invitingUser.id,
      organizationId: organization.id,
    });
    await saveOrganizationInviteLinkToDatabase(link);

    // Create the existing user that will log in
    const { user: existingUser, organization: existingOrg } =
      await createUserWithOrgAndAddAsMember();

    // Set up the code verifier cookie
    await setupCodeVerifierCookie({ page });

    // Create auth code for existing user
    const callbackUrl = createCallbackUrl(existingUser.email);

    // Set the invite link cookie
    await setupInviteLinkCookie({
      link: { expiresAt: link.expiresAt, inviteLinkToken: link.token },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify toast message
    await expect(
      page
        .getByRole("region", { name: /notifications/i })
        .getByText(/organization has reached its member limit/i),
    ).toBeVisible();

    // Verify we're still on the same page (not redirected)
    expect(getPath(page)).toEqual(
      `${href("/organizations/invite-link")}?token=${link.token}`,
    );

    // Cleanup
    await teardownOrganizationAndMember({
      organization: existingOrg,
      user: existingUser,
    });
    await teardownOrganizationAndMember({ organization, user: invitingUser });
  });

  test("given: a code for an existing user with an active email invite cookie for an organization that is already full, should: NOT let the user join the organization and show a toast with a message letting the user know what is happening", async ({
    page,
  }) => {
    // Create organization with the low tier plan (1 seat limit)
    const { organization, user: invitingUser } =
      await createUserWithOrgAndAddAsMember({
        lookupKey: priceLookupKeysByTierAndInterval.low.annual,
      });

    // Create an email invite for this organization
    const invite = createPopulatedOrganizationEmailInviteLink({
      invitedById: invitingUser.id,
      organizationId: organization.id,
    });
    await saveOrganizationEmailInviteLinkToDatabase(invite);

    // Create the existing user that will log in
    const { user: existingUser, organization: existingOrg } =
      await createUserWithOrgAndAddAsMember();

    // Set up the code verifier cookie
    await setupCodeVerifierCookie({ page });

    // Create auth code for existing user
    const callbackUrl = createCallbackUrl(existingUser.email);

    // Set the email invite cookie
    await setupEmailInviteCookie({
      invite: { emailInviteToken: invite.token, expiresAt: invite.expiresAt },
      page,
    });

    // Navigate to callback with code
    await page.goto(callbackUrl);

    // Verify toast message
    await expect(
      page
        .getByRole("region", { name: /notifications/i })
        .getByText(/organization has reached its member limit/i),
    ).toBeVisible();

    // Verify we're still on the same page (not redirected)
    expect(getPath(page)).toEqual(
      `${href("/organizations/email-invite")}?token=${invite.token}`,
    );

    // Cleanup
    await teardownOrganizationAndMember({
      organization: existingOrg,
      user: existingUser,
    });
    await teardownOrganizationAndMember({ organization, user: invitingUser });
  });
});
