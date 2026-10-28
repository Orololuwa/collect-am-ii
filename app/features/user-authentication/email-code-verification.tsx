import type { SubmissionResult } from "@conform-to/react/future";
import { useForm } from "@conform-to/react/future";
import { TriangleAlertIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Form } from "react-router";

import type { verifyLoginCodeSchema } from "./login/login-schemas";
import { useCountdown } from "./use-countdown";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field, FieldError } from "~/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";
import { Spinner } from "~/components/ui/spinner";

export const EMAIL_CODE_LENGTH = 6;
const CODE_SLOTS = Array.from({ length: EMAIL_CODE_LENGTH }, (_, slot) => slot);

export type EmailCodeVerificationProps = {
  email: string;
  /** The `login` or `register` translation section. */
  keyPrefix: "login" | "register";
  /** Result of the last code submission, used to show field errors. */
  lastResult?: SubmissionResult<string> | null;
  /** Intent that requests a new code. */
  resendIntent: string;
  /** Schema for the code form (login and register share the same shape). */
  schema: typeof verifyLoginCodeSchema;
  /** Intent that submits the code. */
  verifyIntent: string;
  isResending?: boolean;
  isSubmitting?: boolean;
  isVerifying?: boolean;
};

export function EmailCodeVerification({
  email,
  keyPrefix,
  lastResult,
  resendIntent,
  schema,
  verifyIntent,
  isResending = false,
  isSubmitting = false,
  isVerifying = false,
}: EmailCodeVerificationProps) {
  const { t } = useTranslation("userAuthentication", {
    keyPrefix: `${keyPrefix}.code`,
  });

  const { secondsLeft, reset } = useCountdown(60);
  const waitingToResend = secondsLeft !== 0;

  const { form, fields } = useForm(schema, { lastResult });
  const codeField = fields.code;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{t("cardTitle")}</CardTitle>

        <CardDescription className="text-center">
          <Trans
            components={{ 1: <b /> }}
            i18nKey={`${keyPrefix}.code.cardDescription`}
            ns="userAuthentication"
            values={{ email }}
          />
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4">
          <Form method="post" {...form.props}>
            <fieldset
              className="grid gap-4"
              disabled={isSubmitting || isVerifying}
            >
              <input name="email" type="hidden" value={email} />

              <Field
                className="items-center"
                data-invalid={codeField.ariaInvalid}
              >
                <InputOTP
                  aria-describedby={codeField.errorId}
                  aria-invalid={codeField.ariaInvalid}
                  aria-label={t("codeLabel")}
                  autoComplete="one-time-code"
                  autoFocus
                  containerClassName="justify-center"
                  id={codeField.id}
                  inputMode="numeric"
                  maxLength={EMAIL_CODE_LENGTH}
                  name="code"
                  pattern="^[0-9]+$"
                >
                  <InputOTPGroup>
                    {CODE_SLOTS.map((slot) => (
                      <InputOTPSlot index={slot} key={slot} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <FieldError
                  className="text-center"
                  errors={codeField.errors}
                  id={codeField.errorId}
                />
              </Field>

              <Button
                className="w-full"
                name="intent"
                type="submit"
                value={verifyIntent}
              >
                {isVerifying ? (
                  <>
                    <Spinner />
                    {t("verifyButtonLoading")}
                  </>
                ) : (
                  t("verifyButton")
                )}
              </Button>
            </fieldset>
          </Form>

          <p className="text-muted-foreground text-xs">
            <Trans
              count={secondsLeft}
              i18nKey={`${keyPrefix}.code.countdownMessage`}
              ns="userAuthentication"
            />
          </p>

          <Form method="post" onSubmit={() => reset()}>
            <fieldset disabled={waitingToResend || isSubmitting || isResending}>
              <input name="email" type="hidden" value={email} />

              <Button
                className="w-full"
                name="intent"
                type="submit"
                value={resendIntent}
                variant="outline"
              >
                {isResending ? (
                  <>
                    <Spinner />
                    {t("resendButtonLoading")}
                  </>
                ) : (
                  t("resendButton")
                )}
              </Button>
            </fieldset>
          </Form>

          <Alert>
            <TriangleAlertIcon />

            <AlertDescription>{t("alertDescription")}</AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
