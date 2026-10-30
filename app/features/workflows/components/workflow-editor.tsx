import { createId } from "@paralleldrive/cuid2";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CreditCardIcon,
  FileTextIcon,
  PlusIcon,
  ReceiptIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-router";

import type {
  SaveWorkflowIssue,
  WorkflowDocumentType,
  WorkflowStepInput,
} from "../workflow-steps";
import {
  normalizeWorkflowStep,
  validateWorkflowSteps,
  WORKFLOW_DOCUMENT_TYPES,
} from "../workflow-steps";
import {
  DOCUMENT_TYPE_KEYS,
  SAVE_WORKFLOW_INTENT,
  STEP_ISSUE_KEYS,
} from "../workflows-constants";
import { Button } from "~/components/ui/button";
import { Input, inputClassName } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import type { TemplateType, WorkflowStepKind } from "~/generated/browser";
import { cn } from "~/lib/utils";

type EditorStep = WorkflowStepInput & { key: string };

export type WorkflowTemplateOption = {
  id: string;
  name: string;
  type: TemplateType;
};

const kindIcons = {
  document: FileTextIcon,
  payment: CreditCardIcon,
  receipt: ReceiptIcon,
} as const;

// Browsers treat <select> as :read-only, which the input style dims.
const selectClassName = cn(inputClassName, "h-9 read-only:opacity-100");

function parseWholeNumber(value: string) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function StepField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function WorkflowEditor({
  workflow,
  templates,
  serverIssues,
  isSaving,
}: {
  workflow: {
    name: string;
    description: string;
    steps: WorkflowStepInput[];
  };
  templates: WorkflowTemplateOption[];
  serverIssues: SaveWorkflowIssue[];
  isSaving: boolean;
}) {
  const { t } = useTranslation("workflows");
  const [steps, setSteps] = useState<EditorStep[]>(() =>
    workflow.steps.map((step) => ({ ...step, key: createId() })),
  );
  const [isDirty, setIsDirty] = useState(false);

  const normalizedSteps = useMemo(
    () =>
      steps.map(({ key: _key, ...step }, index) =>
        normalizeWorkflowStep(step, index),
      ),
    [steps],
  );
  const liveIssues = useMemo(
    () => validateWorkflowSteps(normalizedSteps),
    [normalizedSteps],
  );
  // Template problems only come from the server; show them until the next edit.
  const issues: SaveWorkflowIssue[] = isDirty
    ? liveIssues
    : [
        ...liveIssues,
        ...serverIssues.filter((issue) => issue.code === "templateNotFound"),
      ];
  const issuesFor = (stepIndex: number | null) =>
    issues.filter((issue) => issue.stepIndex === stepIndex);

  const update = (key: string, changes: Partial<WorkflowStepInput>) => {
    setIsDirty(true);
    setSteps((current) =>
      current.map((step) =>
        step.key === key ? { ...step, ...changes } : step,
      ),
    );
  };
  const move = (index: number, offset: -1 | 1) => {
    setIsDirty(true);
    setSteps((current) => {
      const next = [...current];
      const [step] = next.splice(index, 1);
      if (step) next.splice(index + offset, 0, step);
      return next;
    });
  };
  const remove = (key: string) => {
    setIsDirty(true);
    setSteps((current) => current.filter((step) => step.key !== key));
  };
  const add = (kind: WorkflowStepKind) => {
    setIsDirty(true);
    setSteps((current) => [
      ...current,
      {
        advanceMode: kind === "receipt" ? "automatic" : "manual",
        carryForward: "items",
        depositPercentBps: null,
        documentType: kind === "document" ? "invoice" : null,
        key: createId(),
        kind,
        name:
          kind === "document"
            ? t("stepNames.invoice")
            : kind === "payment"
              ? t("stepNames.payment")
              : t("stepNames.receipt"),
        paymentTermsDays: kind === "document" ? 14 : null,
        requiresAcceptance: false,
        templateId: null,
        validityDays: null,
      },
    ]);
  };

  const templatesOf = (type: TemplateType | null) =>
    templates.filter((template) => template.type === type);

  return (
    <Form
      className="flex flex-col gap-6"
      method="POST"
      onSubmit={() => setIsDirty(false)}
    >
      <input
        name="steps"
        type="hidden"
        value={JSON.stringify(normalizedSteps)}
      />

      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
        <StepField htmlFor="workflow-name" label={t("editor.name")}>
          <Input
            defaultValue={workflow.name}
            id="workflow-name"
            maxLength={120}
            name="name"
            onChange={() => setIsDirty(true)}
            required
          />
        </StepField>
        <StepField
          htmlFor="workflow-description"
          label={t("editor.description")}
        >
          <Textarea
            className="min-h-9"
            defaultValue={workflow.description}
            id="workflow-description"
            maxLength={500}
            name="description"
            onChange={() => setIsDirty(true)}
            placeholder={t("editor.descriptionPlaceholder")}
            rows={1}
          />
        </StepField>
      </section>

      <section
        aria-labelledby="workflow-steps-title"
        className="flex flex-col gap-3"
      >
        <div className="space-y-1">
          <h2 className="font-semibold text-base" id="workflow-steps-title">
            {t("editor.steps")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("editor.stepsHint")}
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => {
            const Icon = kindIcons[step.kind];
            const stepIssues = issuesFor(index);
            const fieldId = (field: string) => `step-${step.key}-${field}`;
            const isFirst = index === 0;
            const documentTemplates = templatesOf(step.documentType);
            const kindLabel =
              step.kind === "document"
                ? t("kinds.document")
                : step.kind === "payment"
                  ? t("kinds.payment")
                  : t("kinds.receipt");

            return (
              <li
                aria-invalid={stepIssues.length > 0 || undefined}
                className={cn(
                  "flex flex-col gap-4 rounded-xl border bg-card p-4",
                  stepIssues.length > 0 && "border-destructive",
                )}
                key={step.key}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground text-xs">
                    <Icon aria-hidden="true" className="size-3.5" />
                    {t("editor.stepLabel", { number: index + 1 })} · {kindLabel}
                  </span>
                  <Input
                    aria-label={t("editor.stepName")}
                    className="h-8 min-w-40 flex-1"
                    maxLength={80}
                    onChange={(event) =>
                      update(step.key, { name: event.target.value })
                    }
                    value={step.name}
                  />
                  <div className="flex gap-1">
                    <Button
                      aria-label={t("editor.moveUp", { name: step.name })}
                      disabled={isFirst}
                      onClick={() => move(index, -1)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <ArrowUpIcon aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={t("editor.moveDown", { name: step.name })}
                      disabled={index === steps.length - 1}
                      onClick={() => move(index, 1)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <ArrowDownIcon aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={t("editor.remove", { name: step.name })}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => remove(step.key)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {step.kind === "document" ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StepField
                      htmlFor={fieldId("type")}
                      label={t("editor.documentType")}
                    >
                      <select
                        className={selectClassName}
                        id={fieldId("type")}
                        onChange={(event) =>
                          update(step.key, {
                            documentType: event.target
                              .value as WorkflowDocumentType,
                            templateId: null,
                          })
                        }
                        value={step.documentType ?? ""}
                      >
                        {WORKFLOW_DOCUMENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {t(DOCUMENT_TYPE_KEYS[type])}
                          </option>
                        ))}
                      </select>
                    </StepField>
                    <StepField
                      htmlFor={fieldId("template")}
                      label={t("editor.template")}
                    >
                      <select
                        className={selectClassName}
                        id={fieldId("template")}
                        onChange={(event) =>
                          update(step.key, {
                            templateId: event.target.value || null,
                          })
                        }
                        value={step.templateId ?? ""}
                      >
                        <option value="">{t("editor.defaultTemplate")}</option>
                        {documentTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </StepField>
                    <StepField
                      htmlFor={fieldId("lines")}
                      label={t("editor.lines")}
                    >
                      {isFirst ? (
                        <p
                          className="flex h-9 items-center text-muted-foreground text-sm"
                          id={fieldId("lines")}
                        >
                          {t("editor.carryItemsFirst")}
                        </p>
                      ) : (
                        <select
                          className={selectClassName}
                          id={fieldId("lines")}
                          onChange={(event) => {
                            const carryForward = event.target
                              .value as WorkflowStepInput["carryForward"];
                            update(step.key, {
                              carryForward,
                              depositPercentBps:
                                carryForward === "deposit"
                                  ? (step.depositPercentBps ?? 5000)
                                  : step.depositPercentBps,
                            });
                          }}
                          value={step.carryForward}
                        >
                          <option value="items">
                            {t("editor.carryItems")}
                          </option>
                          <option value="deposit">
                            {t("editor.carryDeposit")}
                          </option>
                          <option value="balance">
                            {t("editor.carryBalance")}
                          </option>
                        </select>
                      )}
                    </StepField>
                    {step.carryForward === "deposit" && !isFirst ? (
                      <StepField
                        htmlFor={fieldId("deposit")}
                        label={t("editor.depositPercent")}
                      >
                        <Input
                          id={fieldId("deposit")}
                          inputMode="numeric"
                          max={100}
                          min={1}
                          onChange={(event) => {
                            const percent = Number(event.target.value);
                            update(step.key, {
                              depositPercentBps: Number.isFinite(percent)
                                ? Math.round(percent * 100)
                                : null,
                            });
                          }}
                          type="number"
                          value={
                            step.depositPercentBps === null
                              ? ""
                              : step.depositPercentBps / 100
                          }
                        />
                      </StepField>
                    ) : null}
                    {step.documentType === "quote" ||
                    step.documentType === "estimate" ? (
                      <StepField
                        htmlFor={fieldId("validity")}
                        label={t("editor.validityDays")}
                      >
                        <Input
                          id={fieldId("validity")}
                          inputMode="numeric"
                          max={365}
                          min={0}
                          onChange={(event) =>
                            update(step.key, {
                              validityDays: parseWholeNumber(
                                event.target.value,
                              ),
                            })
                          }
                          type="number"
                          value={step.validityDays ?? ""}
                        />
                      </StepField>
                    ) : null}
                    {step.documentType === "invoice" ? (
                      <StepField
                        htmlFor={fieldId("terms")}
                        label={t("editor.paymentTermsDays")}
                      >
                        <Input
                          id={fieldId("terms")}
                          inputMode="numeric"
                          max={365}
                          min={0}
                          onChange={(event) =>
                            update(step.key, {
                              paymentTermsDays: parseWholeNumber(
                                event.target.value,
                              ),
                            })
                          }
                          type="number"
                          value={step.paymentTermsDays ?? ""}
                        />
                      </StepField>
                    ) : null}
                    {isFirst ? null : (
                      <StepField
                        htmlFor={fieldId("advance")}
                        label={t("editor.advance")}
                      >
                        <select
                          className={selectClassName}
                          id={fieldId("advance")}
                          onChange={(event) =>
                            update(step.key, {
                              advanceMode: event.target
                                .value as WorkflowStepInput["advanceMode"],
                            })
                          }
                          value={step.advanceMode}
                        >
                          <option value="manual">
                            {t("editor.advanceManual")}
                          </option>
                          <option value="automatic">
                            {t("editor.advanceAutomatic")}
                          </option>
                        </select>
                      </StepField>
                    )}
                    <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-3">
                      <Switch
                        checked={step.requiresAcceptance}
                        id={fieldId("accept")}
                        onCheckedChange={(checked) =>
                          update(step.key, { requiresAcceptance: checked })
                        }
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor={fieldId("accept")}>
                          {t("editor.requiresAcceptance")}
                        </Label>
                        <p className="text-muted-foreground text-sm">
                          {t("editor.requiresAcceptanceHint")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {step.kind === "payment" ? (
                  <p className="text-muted-foreground text-sm">
                    {t("editor.paymentDescription")}
                  </p>
                ) : null}

                {step.kind === "receipt" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <p className="text-muted-foreground text-sm sm:col-span-2">
                      {t("editor.receiptDescription")}
                    </p>
                    <StepField
                      htmlFor={fieldId("template")}
                      label={t("editor.template")}
                    >
                      <select
                        className={selectClassName}
                        id={fieldId("template")}
                        onChange={(event) =>
                          update(step.key, {
                            templateId: event.target.value || null,
                          })
                        }
                        value={step.templateId ?? ""}
                      >
                        <option value="">{t("editor.defaultTemplate")}</option>
                        {templatesOf("receipt").map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </StepField>
                    <StepField
                      htmlFor={fieldId("advance")}
                      label={t("editor.advance")}
                    >
                      <select
                        className={selectClassName}
                        id={fieldId("advance")}
                        onChange={(event) =>
                          update(step.key, {
                            advanceMode: event.target
                              .value as WorkflowStepInput["advanceMode"],
                          })
                        }
                        value={step.advanceMode}
                      >
                        <option value="automatic">
                          {t("editor.advanceAutomaticReceipt")}
                        </option>
                        <option value="manual">
                          {t("editor.advanceManual")}
                        </option>
                      </select>
                    </StepField>
                  </div>
                ) : null}

                {stepIssues.length > 0 ? (
                  <ul className="flex flex-col gap-1 text-destructive text-sm">
                    {stepIssues.map((issue) => (
                      <li key={issue.code}>{t(STEP_ISSUE_KEYS[issue.code])}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => add("document")}
            type="button"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" />
            {t("editor.addDocument")}
          </Button>
          <Button
            onClick={() => add("payment")}
            type="button"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" />
            {t("editor.addPayment")}
          </Button>
          <Button
            onClick={() => add("receipt")}
            type="button"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" />
            {t("editor.addReceipt")}
          </Button>
        </div>
      </section>

      {issuesFor(null).length > 0 ? (
        <div
          className="rounded-lg border border-destructive p-4 text-destructive text-sm"
          role="alert"
        >
          <p className="font-medium">{t("editor.issuesTitle")}</p>
          <ul className="mt-1 list-disc pl-5">
            {issuesFor(null).map((issue) => (
              <li key={issue.code}>{t(STEP_ISSUE_KEYS[issue.code])}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <p className="text-muted-foreground text-sm">
          {t("editor.runningDealsNote")}
        </p>
        <div className="flex items-center gap-3">
          {isDirty ? (
            <span className="text-muted-foreground text-sm">
              {t("editor.unsaved")}
            </span>
          ) : null}
          <Button
            disabled={isSaving || issues.length > 0}
            name="intent"
            type="submit"
            value={SAVE_WORKFLOW_INTENT}
          >
            {isSaving ? <Spinner /> : null}
            {t("editor.save")}
          </Button>
        </div>
      </div>
    </Form>
  );
}
