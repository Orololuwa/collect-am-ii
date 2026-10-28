import { href, redirect } from "react-router";

import type { Route } from "./+types/auth.callback";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import {
  destroyOAuthSession,
  getOAuthSession,
} from "~/features/user-authentication/auth-session.server";
import { exchangeAuthorizationCode } from "~/features/user-authentication/auth0.server";
import { completeSignIn } from "~/features/user-authentication/user-authentication-helpers.server";
import { getSearchParameterFromRequest } from "~/utils/get-search-parameter-from-request.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const i18n = getInstance(context);
  const clearOAuthHeaders = await destroyOAuthSession(request);

  const code = getSearchParameterFromRequest("code")(request);
  const state = getSearchParameterFromRequest("state")(request);
  const oauthSession = await getOAuthSession(request);

  // Missing code (e.g. the user cancelled at Google), an expired `__oauth`
  // cookie, or a state mismatch all send the user back to the login page.
  if (!code || !oauthSession || oauthSession.state !== state) {
    return redirect(href("/login"), { headers: clearOAuthHeaders });
  }

  const claims = await exchangeAuthorizationCode({
    code,
    codeVerifier: oauthSession.codeVerifier,
  });

  if (claims.email_verified === false) {
    throw new Error("Google account email is not verified");
  }

  return await completeSignIn({
    email: claims.email,
    headers: clearOAuthHeaders,
    i18n,
    request,
  });
}
