import type { SubmissionResult } from "@conform-to/react/future";
import { useForm } from "@conform-to/react/future";
import { coerceFormValue } from "@conform-to/zod/v4/future";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, href, Link } from "react-router";

import { START_DEAL_INTENT } from "../deals-constants";
import { startDealFormSchema } from "../deals-schemas";
import type { DealProductOption } from "./deal-items-editor";
import { DealItemsEditor } from "./deal-items-editor";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
} from "~/components/ui/field";
import { Input, inputClassName } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { COMMON_CURRENCIES } from "~/features/templates/shared/common-currencies";
import { WorkflowStepChips } from "~/features/workflows/components/workflow-step-chips";
import type { WorkflowStepKind } from "~/generated/browser";
import { cn } from "~/lib/utils";

const selectClassName = cn(inputClassName, "read-only:opacity-100");

export function NewDealForm({
  customers,
  workflows,
  products,
  defaultCurrency,
  lastResult,
  isSaving,
  organizationSlug,
}: {
  customers: Array<{
    id: string;
    name: string;
    email: string;
    companyName: string;
  }>;
  workflows: Array<{
    id: string;
    name: string;
    steps: Array<{ kind: WorkflowStepKind; name: string }>;
  }>;
  products: DealProductOption[];
  defaultCurrency: string;
  lastResult?: SubmissionResult;
  isSaving: boolean;
  organizationSlug: string;
}) {
  const { t } = useTranslation("deals", { keyPrefix: "new" });
  const { form, fields } = useForm(coerceFormValue(startDealFormSchema), {
    lastResult,
  });
  const [currency, setCurrency] = useState(defaultCurrency);
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? "");
  const [itemsValid, setItemsValid] = useState(false);
  const workflow = workflows.find((candidate) => candidate.id === workflowId);

  return (
    <Card>
      <CardContent>
        <Form method="POST" {...form.props}>
          <input name="intent" type="hidden" value={START_DEAL_INTENT} />
          <FieldSet className="flex flex-col gap-6" disabled={isSaving}>
            <Field data-invalid={fields.title.ariaInvalid}>
              <FieldLabel htmlFor={fields.title.id}>
                {t("titleLabel")}
              </FieldLabel>
              <Input
                {...fields.title.inputProps}
                autoComplete="off"
                autoFocus
                maxLength={120}
                placeholder={t("titlePlaceholder")}
              />
              <FieldError
                errors={fields.title.errors}
                id={fields.title.errorId}
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field data-invalid={fields.customerId.ariaInvalid}>
                <FieldLabel htmlFor={fields.customerId.id}>
                  {t("customerLabel")}
                </FieldLabel>
                <select
                  {...fields.customerId.inputProps}
                  className={selectClassName}
                  defaultValue=""
                >
                  <option disabled value="">
                    {t("customerPlaceholder")}
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.companyName
                        ? `${customer.name} (${customer.companyName})`
                        : `${customer.name} · ${customer.email}`}
                    </option>
                  ))}
                </select>
                <FieldDescription>
                  <Link
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                    to={href("/organizations/:organizationSlug/customers/new", {
                      organizationSlug,
                    })}
                  >
                    <PlusIcon aria-hidden="true" className="size-3" />
                    {t("addCustomer")}
                  </Link>
                </FieldDescription>
                <FieldError
                  errors={fields.customerId.errors}
                  id={fields.customerId.errorId}
                />
              </Field>

              <Field data-invalid={fields.currency.ariaInvalid}>
                <FieldLabel htmlFor={fields.currency.id}>
                  {t("currencyLabel")}
                </FieldLabel>
                <select
                  {...fields.currency.inputProps}
                  className={selectClassName}
                  onChange={(event) => setCurrency(event.target.value)}
                  value={currency}
                >
                  {COMMON_CURRENCIES.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.code}
                    </option>
                  ))}
                </select>
                <FieldDescription>{t("currencyHint")}</FieldDescription>
                <FieldError
                  errors={fields.currency.errors}
                  id={fields.currency.errorId}
                />
              </Field>
            </div>

            <Field data-invalid={fields.workflowId.ariaInvalid}>
              <FieldLabel htmlFor={fields.workflowId.id}>
                {t("workflowLabel")}
              </FieldLabel>
              <select
                {...fields.workflowId.inputProps}
                className={selectClassName}
                onChange={(event) => setWorkflowId(event.target.value)}
                value={workflowId}
              >
                {workflows.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {workflow ? (
                <WorkflowStepChips className="mt-1" steps={workflow.steps} />
              ) : null}
              <FieldError
                errors={fields.workflowId.errors}
                id={fields.workflowId.errorId}
              />
            </Field>

            <Field data-invalid={fields.items.ariaInvalid}>
              <div className="space-y-1">
                <FieldLabel>{t("itemsTitle")}</FieldLabel>
                <FieldDescription>{t("itemsDescription")}</FieldDescription>
              </div>
              <DealItemsEditor
                currency={currency}
                key={currency}
                onValidityChange={setItemsValid}
                products={products}
              />
              <FieldError
                errors={fields.items.errors}
                id={fields.items.errorId}
              />
            </Field>
          </FieldSet>
        </Form>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button asChild variant="ghost">
          <Link
            to={href("/organizations/:organizationSlug/deals", {
              organizationSlug,
            })}
          >
            {t("cancel")}
          </Link>
        </Button>
        <Button disabled={isSaving || !itemsValid} form={form.id} type="submit">
          {isSaving ? <Spinner /> : null}
          {isSaving ? t("submitting") : t("submit")}
        </Button>
      </CardFooter>
    </Card>
  );
}
