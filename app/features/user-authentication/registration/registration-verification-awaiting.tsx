import type { SubmissionResult } from "@conform-to/react/future";

import { EmailCodeVerification } from "../email-code-verification";
import { registerIntents } from "../user-authentication-constants";
import { verifyRegistrationCodeSchema } from "./registration-schemas";

export type RegistrationVerificationAwaitingProps = {
  email: string;
  lastResult?: SubmissionResult<string> | null;
  isResending?: boolean;
  isSubmitting?: boolean;
  isVerifying?: boolean;
};

export function RegistrationVerificationAwaiting(
  props: RegistrationVerificationAwaitingProps,
) {
  return (
    <EmailCodeVerification
      {...props}
      keyPrefix="register"
      resendIntent={registerIntents.registerWithEmail}
      schema={verifyRegistrationCodeSchema}
      verifyIntent={registerIntents.verifyCode}
    />
  );
}
