import type { SubmissionResult } from "@conform-to/react/future";
import { useForm } from "@conform-to/react/future";
import { coerceFormValue } from "@conform-to/zod/v4/future";
import { PackageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Form, href, Link } from "react-router";

import {
  PRODUCT_IMAGE_MAX_SIZE,
  PRODUCT_IMAGE_TYPES,
  PRODUCT_UNITS,
  SAVE_PRODUCT_INTENT,
} from "../products-constants";
import { saveProductFormSchema } from "../products-schemas";
import {
  AvatarUpload,
  AvatarUploadDescription,
  AvatarUploadInput,
  AvatarUploadPreviewImage,
} from "~/components/avatar-upload";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
} from "~/components/ui/field";
import { Input, inputClassName } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { COMMON_CURRENCIES } from "~/features/templates/shared/common-currencies";
import { cn } from "~/lib/utils";

export type ProductFormDefaults = {
  name: string;
  description: string;
  sku: string;
  unitPrice: string;
  currency: string;
  unit: string;
  taxRate: string;
  imageUrl: string;
};

export function ProductForm({
  defaults,
  lastResult,
  isSaving = false,
  organizationSlug,
}: {
  defaults: ProductFormDefaults;
  lastResult?: SubmissionResult;
  isSaving?: boolean;
  organizationSlug: string;
}) {
  const { t } = useTranslation("products", { keyPrefix: "form" });
  const { form, fields } = useForm(coerceFormValue(saveProductFormSchema), {
    lastResult,
  });

  return (
    <Card>
      <CardContent>
        <Form
          encType="multipart/form-data"
          method="POST"
          {...form.props}
          className="flex flex-col gap-6"
        >
          <FieldSet className="flex flex-col gap-6" disabled={isSaving}>
            <Field data-invalid={fields.name.ariaInvalid}>
              <FieldLabel htmlFor={fields.name.id}>{t("name")}</FieldLabel>
              <Input
                {...fields.name.inputProps}
                autoFocus={!defaults.name}
                defaultValue={defaults.name}
                placeholder={t("namePlaceholder")}
              />
              <FieldError
                errors={fields.name.errors}
                id={fields.name.errorId}
              />
            </Field>

            <Field data-invalid={fields.description.ariaInvalid}>
              <FieldLabel htmlFor={fields.description.id}>
                {t("description")}
              </FieldLabel>
              <Textarea
                {...fields.description.inputProps}
                defaultValue={defaults.description}
                placeholder={t("descriptionPlaceholder")}
                rows={3}
              />
              <FieldError
                errors={fields.description.errors}
                id={fields.description.errorId}
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
              <Field data-invalid={fields.unitPrice.ariaInvalid}>
                <FieldLabel htmlFor={fields.unitPrice.id}>
                  {t("unitPrice")}
                </FieldLabel>
                <Input
                  {...fields.unitPrice.inputProps}
                  defaultValue={defaults.unitPrice}
                  inputMode="decimal"
                  placeholder="0.00"
                />
                <FieldError
                  errors={fields.unitPrice.errors}
                  id={fields.unitPrice.errorId}
                />
              </Field>
              <Field data-invalid={fields.currency.ariaInvalid}>
                <FieldLabel htmlFor={fields.currency.id}>
                  {t("currency")}
                </FieldLabel>
                <select
                  {...fields.currency.inputProps}
                  // Browsers treat <select> as :read-only, which the input
                  // style dims.
                  className={cn(inputClassName, "read-only:opacity-100")}
                  defaultValue={defaults.currency}
                >
                  {COMMON_CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code}
                    </option>
                  ))}
                </select>
                <FieldError
                  errors={fields.currency.errors}
                  id={fields.currency.errorId}
                />
              </Field>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <Field data-invalid={fields.unit.ariaInvalid}>
                <FieldLabel htmlFor={fields.unit.id}>{t("unit")}</FieldLabel>
                <Input
                  {...fields.unit.inputProps}
                  defaultValue={defaults.unit}
                  list="product-units"
                />
                <datalist id="product-units">
                  {PRODUCT_UNITS.map((unit) => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
                <FieldError
                  errors={fields.unit.errors}
                  id={fields.unit.errorId}
                />
              </Field>
              <Field data-invalid={fields.taxRate.ariaInvalid}>
                <FieldLabel htmlFor={fields.taxRate.id}>
                  {t("taxRate")}
                </FieldLabel>
                <Input
                  {...fields.taxRate.inputProps}
                  defaultValue={defaults.taxRate}
                  inputMode="decimal"
                  placeholder="0"
                />
                <FieldError
                  errors={fields.taxRate.errors}
                  id={fields.taxRate.errorId}
                />
              </Field>
              <Field data-invalid={fields.sku.ariaInvalid}>
                <FieldLabel htmlFor={fields.sku.id}>{t("sku")}</FieldLabel>
                <Input
                  {...fields.sku.inputProps}
                  defaultValue={defaults.sku}
                  placeholder={t("skuPlaceholder")}
                />
                <FieldError
                  errors={fields.sku.errors}
                  id={fields.sku.errorId}
                />
              </Field>
            </div>

            <AvatarUpload maxFileSize={PRODUCT_IMAGE_MAX_SIZE}>
              {({ error }) => (
                <Field
                  data-invalid={
                    fields.image.ariaInvalid || error ? "true" : undefined
                  }
                >
                  <FieldLabel htmlFor={fields.image.id}>
                    {t("image")}
                  </FieldLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="size-20 rounded-lg">
                      <AvatarUploadPreviewImage
                        alt={t("imagePreviewAlt")}
                        className="size-20 rounded-lg object-cover"
                        src={defaults.imageUrl}
                      />
                      <AvatarFallback className="size-20 rounded-lg border">
                        <PackageIcon className="size-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-2">
                      <AvatarUploadInput
                        {...fields.image.inputProps}
                        accept={PRODUCT_IMAGE_TYPES.join(",")}
                      />
                      <AvatarUploadDescription>
                        {t("imageFormats")}
                      </AvatarUploadDescription>
                      {defaults.imageUrl ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Checkbox
                            id={fields.removeImage.id}
                            name={fields.removeImage.name}
                            value="on"
                          />
                          <label htmlFor={fields.removeImage.id}>
                            {t("removeImage")}
                          </label>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <FieldError
                    errors={[
                      ...(fields.image.errors ?? []),
                      ...(error ? [error] : []),
                    ]}
                    id={fields.image.errorId}
                  />
                </Field>
              )}
            </AvatarUpload>
            <FieldDescription>{t("pricesNote")}</FieldDescription>
          </FieldSet>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline">
          <Link
            to={href("/organizations/:organizationSlug/products", {
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
          value={SAVE_PRODUCT_INTENT}
        >
          {isSaving ? <Spinner /> : null}
          {t("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
