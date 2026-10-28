import type { RouterContextProvider } from "react-router";

import { getUserIdFromSession } from "../user-authentication/auth-session.server";
import { logout } from "../user-authentication/user-authentication-helpers.server";
import { authContext } from "../user-authentication/user-authentication-middleware.server";
import {
  retrieveUserAccountFromDatabaseById,
  retrieveUserAccountWithMembershipsAndMemberCountsAndSubscriptionsFromDatabaseById,
  retrieveUserAccountWithMembershipsAndMemberCountsFromDatabaseById,
} from "./user-accounts-model.server";
import type { UserAccount } from "~/generated/client";

/**
 * Ensures that a user account is present.
 *
 * @param userAccount - The user account to check - possibly null or undefined.
 * @returns The same user account if it exists.
 * @throws Logs the user out if the user account is missing.
 */
export const throwIfUserAccountIsMissing = async <T extends UserAccount>(
  request: Request,
  userAccount: T | null,
) => {
  if (!userAccount) {
    throw await logout(request, "/login");
  }

  return userAccount;
};

/**
 * Ensures that a user account for the authenticated user exists.
 *
 * @param context - Router context provider containing authentication data.
 * @param request - Request object used for logout if user account is missing.
 * @returns The user account and authentication headers.
 * @throws Logs the user out if the user account is missing.
 */
export const requireAuthenticatedUserExists = async ({
  context,
  request,
}: {
  context: Readonly<RouterContextProvider>;
  request: Request;
}) => {
  const { userId, headers } = context.get(authContext);
  const user = await retrieveUserAccountFromDatabaseById(userId);
  return { headers, user: await throwIfUserAccountIsMissing(request, user) };
};

/**
 * Ensures that a user account for the authenticated user exists and also
 * returns their memberships.
 *
 * IMPORTANT: This function does not check if the user is an active member of
 * the current slug in the URL! For that use `requireUserIsMemberOfOrganization`
 * instead.
 *
 * @param context - Router context provider containing authentication data.
 * @param request - Request object used for logout if user account is missing.
 * @returns The user account with memberships and authentication headers.
 * @throws Logs the user out if the user account is missing.
 */
export const requireAuthenticatedUserWithMembershipsExists = async ({
  context,
  request,
}: {
  context: Readonly<RouterContextProvider>;
  request: Request;
}) => {
  const { userId, headers } = context.get(authContext);
  const user =
    await retrieveUserAccountWithMembershipsAndMemberCountsFromDatabaseById(
      userId,
    );
  return {
    headers,
    user: await throwIfUserAccountIsMissing(request, user),
  };
};

/**
 * Ensures that a user account for the authenticated user exists and also
 * returns their memberships and subscriptions.
 *
 * IMPORTANT: This function does not check if the user is an active member of
 * the current slug in the URL! For that use `requireUserIsMemberOfOrganization`
 * instead.
 *
 * @param context - Router context provider containing authentication data.
 * @param request - Request object used for logout if user account is missing.
 * @returns The user account with memberships and subscriptions and authentication headers.
 * @throws Logs the user out if the user account is missing.
 */
export const requireAuthenticatedUserWithMembershipsAndSubscriptionsExists =
  async ({
    context,
    request,
  }: {
    context: Readonly<RouterContextProvider>;
    request: Request;
  }) => {
    const { userId, headers } = context.get(authContext);
    const user =
      await retrieveUserAccountWithMembershipsAndMemberCountsAndSubscriptionsFromDatabaseById(
        userId,
      );
    return {
      headers,
      user: await throwIfUserAccountIsMissing(request, user),
    };
  };

/**
 * Ensures that the request has a signed-in user whose account exists. For
 * routes that don't run `authMiddleware`.
 *
 * @param request - The incoming request object.
 * @returns The user account.
 * @throws Logs the user out if there is no session or the account is missing.
 */
export async function requireUserSession(request: Request) {
  const userId = await getUserIdFromSession(request);
  const user = userId
    ? await retrieveUserAccountFromDatabaseById(userId)
    : null;
  return await throwIfUserAccountIsMissing(request, user);
}
