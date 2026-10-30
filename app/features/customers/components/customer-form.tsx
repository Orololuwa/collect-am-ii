import type { SubmissionResult } from "@conform-to/react/future";
import { useForm } from "@conform-to/react/future";
import { coerceFormValue } from "@conform-to/zod/v4/future";
import { useTranslation } from "react-i18next";
import { Form, href, Link } from "react-router";

import { SAVE_CUSTOMER_INTENT } from "../customers-constants";
import { saveCustomerFormSchema } from "../customers-schemas";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";

export type CustomerFormDefaults = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  billingAddress: string;
  shippingAddress: string;
  notes: string;
};

export function CustomerForm({
  defaults,
  lastResult,
  isSaving = false,
  organizationSlug,
}: {
  defaults: CustomerFormDefaults;
  lastResult?: SubmissionResult;
  isSaving?: boolean;
  organizationSlug: string;
}) {
  const { t } = useTranslation("customers", { keyPrefix: "form" });
  const { form, fields } = useForm(coerceFormValue(saveCustomerFormSchema), {
    lastResult,
  });

  return (
    <Card>
      <CardContent>
        <Form method="POST" {...form.props}>
          <FieldSet className="flex flex-col gap-6" disabled={isSaving}>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field data-invalid={fields.name.ariaInvalid}>
                <FieldLabel htmlFor={fields.name.id}>{t("name")}</FieldLabel>
                <Input
                  {...fields.name.inputProps}
                  autoComplete="off"
                  autoFocus={!defaults.name}
                  defaultValue={defaults.name}
                />
                <FieldError
                  errors={fields.name.errors}
                  id={fields.name.errorId}
                />
              </Field>
              <Field data-invalid={fields.email.ariaInvalid}>
                <FieldLabel htmlFor={fields.email.id}>{t("email")}</FieldLabel>
                <Input
                  {...fields.email.inputProps}
                  autoComplete="off"
                  defaultValue={defaults.email}
                  type="email"
                />
                <FieldError
                  errors={fields.email.errors}
                  id={fields.email.errorId}
                />
              </Field>
              <Field data-invalid={fields.companyName.ariaInvalid}>
                <FieldLabel htmlFor={fields.companyName.id}>
                  {t("company")}
                </FieldLabel>
                <Input
                  {...fields.companyName.inputProps}
                  defaultValue={defaults.companyName}
                  placeholder={t("optional")}
                />
                <FieldError
                  errors={fields.companyName.errors}
                  id={fields.companyName.errorId}
                />
              </Field>
              <Field data-invalid={fields.phone.ariaInvalid}>
                <FieldLabel htmlFor={fields.phone.id}>{t("phone")}</FieldLabel>
                <Input
                  {...fields.phone.inputProps}
                  defaultValue={defaults.phone}
                  placeholder={t("optional")}
                  type="tel"
                />
                <FieldError
                  errors={fields.phone.errors}
                  id={fields.phone.errorId}
                />
              </Field>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field data-invalid={fields.billingAddress.ariaInvalid}>
                <FieldLabel htmlFor={fields.billingAddress.id}>
                  {t("billingAddress")}
                </FieldLabel>
                <Textarea
                  {...fields.billingAddress.inputProps}
                  defaultValue={defaults.billingAddress}
                  rows={3}
                />
                <FieldError
                  errors={fields.billingAddress.errors}
                  id={fields.billingAddress.errorId}
                />
              </Field>
              <Field data-invalid={fields.shippingAddress.ariaInvalid}>
                <FieldLabel htmlFor={fields.shippingAddress.id}>
                  {t("shippingAddress")}
                </FieldLabel>
                <Textarea
                  {...fields.shippingAddress.inputProps}
                  defaultValue={defaults.shippingAddress}
                  rows={3}
                />
                <FieldDescription>{t("shippingAddressHint")}</FieldDescription>
                <FieldError
                  errors={fields.shippingAddress.errors}
                  id={fields.shippingAddress.errorId}
                />
              </Field>
            </div>

            <Field data-invalid={fields.notes.ariaInvalid}>
              <FieldLabel htmlFor={fields.notes.id}>{t("notes")}</FieldLabel>
              <Textarea
                {...fields.notes.inputProps}
                defaultValue={defaults.notes}
                placeholder={t("notesPlaceholder")}
                rows={3}
              />
              <FieldError
                errors={fields.notes.errors}
                id={fields.notes.errorId}
              />
            </Field>
          </FieldSet>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline">
          <Link
            to={href("/organizations/:organizationSlug/customers", {
              organizationSlug,
            })}
          >
            {t("cancel")}
          </Link>
        </Button>
        <Button
          disabled={isSaving}
          form={form.id}
          name="intent"
          type="submit"
          value={SAVE_CUSTOMER_INTENT}
        >
          {isSaving ? <Spinner /> : null}
          {t("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
