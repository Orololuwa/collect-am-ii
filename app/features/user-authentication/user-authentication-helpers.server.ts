import type { i18n } from "i18next";
import { href, redirect } from "react-router";
import { safeRedirect } from "remix-utils/safe-redirect";

import {
  createUserSessionHeaders,
  destroyUserSession,
} from "./auth-session.server";
import { getValidEmailInviteInfo } from "~/features/organizations/accept-email-invite/accept-email-invite-helpers.server";
import { destroyEmailInviteInfoSession } from "~/features/organizations/accept-email-invite/accept-email-invite-session.server";
import { getValidInviteLinkInfo } from "~/features/organizations/accept-invite-link/accept-invite-link-helpers.server";
import { destroyInviteLinkInfoSession } from "~/features/organizations/accept-invite-link/accept-invite-link-session.server";
import {
  acceptEmailInvite,
  acceptInviteLink,
} from "~/features/organizations/organizations-helpers.server";
import {
  retrieveUserAccountWithActiveMembershipsFromDatabaseByEmail,
  saveUserAccountToDatabase,
} from "~/features/user-accounts/user-accounts-model.server";
import { combineHeaders } from "~/utils/combine-headers.server";
import { redirectWithToast } from "~/utils/toast.server";

/**
 * Logs out the current user by clearing their session cookie.
 *
 * @param request - The incoming request object.
 * @param redirectTo - The path to redirect to after logout (defaults to root).
 * @returns Redirect response to the given path.
 */
export async function logout(request: Request, redirectTo = "/") {
  return redirect(safeRedirect(redirectTo), {
    headers: await destroyUserSession(request),
  });
}

/**
 * Finishes a successful sign-in (email code or Google), regardless of whether
 * the user came from the login or the register page:
 *
 * 1. Finds the user account by its verified email, or creates it.
 * 2. Accepts a pending invite link or email invite, if there is one.
 * 3. Creates the session cookie and redirects to the right place.
 *
 * @param request - The incoming request (carries the invite cookies).
 * @param i18n - The i18n instance for toast messages.
 * @param email - The verified email address returned by Auth0.
 * @param headers - Extra headers to add to the redirect.
 * @returns A redirect response that signs the user in.
 */
export async function completeSignIn({
  request,
  i18n,
  email,
  headers,
}: {
  request: Request;
  i18n: i18n;
  email: string;
  headers?: HeadersInit;
}) {
  const { inviteLinkInfo, headers: inviteLinkHeaders } =
    await getValidInviteLinkInfo(request);
  const { emailInviteInfo, headers: emailInviteHeaders } =
    await getValidEmailInviteInfo(request);

  const userAccount =
    await retrieveUserAccountWithActiveMembershipsFromDatabaseByEmail(email);

  if (!userAccount) {
    const newUserAccount = await saveUserAccountToDatabase({ email });
    const sessionHeaders = combineHeaders(
      headers,
      await createUserSessionHeaders(newUserAccount.id),
    );

    if (emailInviteInfo) {
      await acceptEmailInvite({
        deactivatedAt: null,
        emailInviteId: emailInviteInfo.emailInviteId,
        emailInviteToken: emailInviteInfo.emailInviteToken,
        i18n,
        organizationId: emailInviteInfo.organizationId,
        request,
        role: emailInviteInfo.role,
        userAccountId: newUserAccount.id,
      });
    } else if (inviteLinkInfo) {
      await acceptInviteLink({
        i18n,
        inviteLinkId: inviteLinkInfo.inviteLinkId,
        inviteLinkToken: inviteLinkInfo.inviteLinkToken,
        organizationId: inviteLinkInfo.organizationId,
        request,
        userAccountId: newUserAccount.id,
      });
    }

    return redirect(
      emailInviteInfo ? href("/onboarding/user-account") : href("/onboarding"),
      {
        headers: combineHeaders(
          sessionHeaders,
          inviteLinkHeaders,
          emailInviteHeaders,
        ),
      },
    );
  }

  const sessionHeaders = combineHeaders(
    headers,
    await createUserSessionHeaders(userAccount.id),
  );

  if (inviteLinkInfo || emailInviteInfo) {
    const organizationId =
      // biome-ignore lint/style/noNonNullAssertion: The is checked above
      inviteLinkInfo?.organizationId ?? emailInviteInfo!.organizationId;
    const organizationSlug =
      // biome-ignore lint/style/noNonNullAssertion: The is checked above
      inviteLinkInfo?.organizationSlug ?? emailInviteInfo!.organizationSlug;
    const organizationName =
      // biome-ignore lint/style/noNonNullAssertion: The is checked above
      inviteLinkInfo?.organizationName ?? emailInviteInfo!.organizationName;

    // If the user is already a member of the organization, redirect to
    // the organization dashboard and show a toast.
    if (
      userAccount.memberships.some((m) => m.organizationId === organizationId)
    ) {
      return redirectWithToast(
        href("/organizations/:organizationSlug/dashboard", {
          organizationSlug,
        }),
        {
          description: i18n.t(
            "organizations:acceptInviteLink.alreadyMemberToastDescription",
            { organizationName },
          ),
          title: i18n.t(
            "organizations:acceptInviteLink.alreadyMemberToastTitle",
          ),
          type: "info",
        },
        {
          headers: combineHeaders(
            sessionHeaders,
            await destroyEmailInviteInfoSession(request),
            await destroyInviteLinkInfoSession(request),
          ),
        },
      );
    }

    if (emailInviteInfo) {
      await acceptEmailInvite({
        // If the user already has a name, we deactivate the email invite link,
        // otherwise this will be done during onboarding.
        deactivatedAt: userAccount.name ? new Date() : null,
        emailInviteId: emailInviteInfo.emailInviteId,
        emailInviteToken: emailInviteInfo.emailInviteToken,
        i18n,
        organizationId: emailInviteInfo.organizationId,
        request,
        role: emailInviteInfo.role,
        userAccountId: userAccount.id,
      });
    } else if (inviteLinkInfo) {
      await acceptInviteLink({
        i18n,
        inviteLinkId: inviteLinkInfo.inviteLinkId,
        inviteLinkToken: inviteLinkInfo.inviteLinkToken,
        organizationId: inviteLinkInfo.organizationId,
        request,
        userAccountId: userAccount.id,
      });
    }

    // If the user has no name yet, they still need to go through onboarding,
    // which reads (and later clears) the invite cookies.
    if (!userAccount.name) {
      return redirect(href("/onboarding/user-account"), {
        headers: sessionHeaders,
      });
    }

    // Otherwise they're already onboarded and we can redirect them to their
    // new organization's dashboard.
    return redirectWithToast(
      href("/organizations/:organizationSlug/dashboard", { organizationSlug }),
      {
        description: i18n.t(
          "organizations:acceptInviteLink.joinSuccessToastDescription",
          { organizationName },
        ),
        title: i18n.t("organizations:acceptInviteLink.joinSuccessToastTitle"),
        type: "success",
      },
      {
        headers: emailInviteInfo
          ? combineHeaders(
              sessionHeaders,
              inviteLinkHeaders,
              await destroyEmailInviteInfoSession(request),
            )
          : combineHeaders(
              sessionHeaders,
              emailInviteHeaders,
              await destroyInviteLinkInfoSession(request),
            ),
      },
    );
  }

  return redirect(href("/organizations"), {
    headers: combineHeaders(
      sessionHeaders,
      inviteLinkHeaders,
      emailInviteHeaders,
    ),
  });
}
