import { report } from "@conform-to/react/future";
import { z } from "zod";

import {
  redirectToGoogleSignIn,
  sendEmailCode,
  verifyEmailCode,
} from "../user-authentication-actions.server";
import {
  registerWithEmailSchema,
  registerWithGoogleSchema,
  verifyRegistrationCodeSchema,
} from "./registration-schemas";
import type { Route } from ".react-router/types/app/routes/_user-authentication+/_anonymous-routes+/+types/register";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { retrieveUserAccountFromDatabaseByEmail } from "~/features/user-accounts/user-accounts-model.server";
import { badRequest } from "~/utils/http-responses.server";
import { validateFormData } from "~/utils/validate-form-data.server";

const registerSchema = z.discriminatedUnion("intent", [
  registerWithEmailSchema,
  // The code format is checked by Auth0, so a malformed code still returns the
  // email and keeps the code entry step open.
  verifyRegistrationCodeSchema.extend({ code: z.string().trim() }),
  registerWithGoogleSchema,
]);

export async function registerAction({ request, context }: Route.ActionArgs) {
  const i18n = getInstance(context);
  const result = await validateFormData(request, registerSchema);

  if (!result.success) {
    return result.response;
  }

  const body = result.data;

  switch (body.intent) {
    case "registerWithEmail": {
      const userAccount = await retrieveUserAccountFromDatabaseByEmail(
        body.email,
      );

      if (userAccount) {
        return badRequest({
          result: report(result.submission, {
            error: {
              fieldErrors: {
                email: ["userAuthentication:register.form.userAlreadyExists"],
              },
              formErrors: [],
            },
          }),
        });
      }

      return sendEmailCode({
        email: body.email,
        rateLimitedError: "userAuthentication:register.form.registrationFailed",
        submission: result.submission,
      });
    }
    case "verifyCode": {
      return verifyEmailCode({
        code: body.code,
        email: body.email,
        errors: {
          invalidCode: "userAuthentication:register.code.invalidCode",
          rateLimited: "userAuthentication:register.code.codeRateLimited",
        },
        i18n,
        request,
        submission: result.submission,
      });
    }
    case "registerWithGoogle": {
      return redirectToGoogleSignIn();
    }
  }
}
