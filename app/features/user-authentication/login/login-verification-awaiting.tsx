import type { SubmissionResult } from "@conform-to/react/future";

import { EmailCodeVerification } from "../email-code-verification";
import { loginIntents } from "../user-authentication-constants";
import { verifyLoginCodeSchema } from "./login-schemas";

export type LoginVerificationAwaitingProps = {
  email: string;
  lastResult?: SubmissionResult<string> | null;
  isResending?: boolean;
  isSubmitting?: boolean;
  isVerifying?: boolean;
};

export function LoginVerificationAwaiting(
  props: LoginVerificationAwaitingProps,
) {
  return (
    <EmailCodeVerification
      {...props}
      keyPrefix="login"
      resendIntent={loginIntents.loginWithEmail}
      schema={verifyLoginCodeSchema}
      verifyIntent={loginIntents.verifyCode}
    />
  );
}
