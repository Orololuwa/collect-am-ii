import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  SaveWorkflowIssue,
  WorkflowDocumentType,
  WorkflowStepInput,
} from "../workflow-steps";
import { WORKFLOW_DOCUMENT_TYPES } from "../workflow-steps";
import { DOCUMENT_TYPE_KEYS, STEP_ISSUE_KEYS } from "../workflows-constants";
import type { EditorStep } from "./workflow-step-meta";
import { KIND_ICONS, KIND_KEYS, KIND_TILE_CLASSES } from "./workflow-step-meta";
import { Button } from "~/components/ui/button";
import { Input, inputClassName } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import type { TemplateType } from "~/generated/browser";
import { cn } from "~/lib/utils";

export type WorkflowTemplateOption = {
  id: string;
  name: string;
  type: TemplateType;
};

// Browsers treat <select> as :read-only, which the input style dims.
const selectClassName = cn(inputClassName, "h-9 read-only:opacity-100");

function parseWholeNumber(value: string) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function Field({
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

/** Two choices side by side, like a segmented control. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 font-medium text-sm leading-none">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {options.map((option) => (
          <button
            aria-pressed={option.value === value}
            className={cn(
              "min-h-8 rounded-md px-2 py-1 font-medium text-sm transition-colors",
              option.value === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** The selected step's settings, the same in the steps and canvas views. */
export function WorkflowStepSettings({
  step,
  index,
  total,
  templates,
  issues,
  onChange,
  onMove,
  onRemove,
}: {
  step: EditorStep;
  index: number;
  total: number;
  templates: WorkflowTemplateOption[];
  issues: SaveWorkflowIssue[];
  onChange: (changes: Partial<WorkflowStepInput>) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation("workflows");
  const fieldId = (field: string) => `step-${step.key}-${field}`;
  const isFirst = index === 0;
  const Icon = KIND_ICONS[step.kind];
  const templatesOf = (type: TemplateType | null) =>
    templates.filter((template) => template.type === type);

  const templateField = (type: TemplateType | null) => (
    <Field htmlFor={fieldId("template")} label={t("editor.template")}>
      <select
        className={selectClassName}
        id={fieldId("template")}
        onChange={(event) =>
          onChange({ templateId: event.target.value || null })
        }
        value={step.templateId ?? ""}
      >
        <option value="">{t("editor.defaultTemplate")}</option>
        {templatesOf(type).map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
    </Field>
  );

  const lineOptions = [
    {
      hint: t("editor.carryItemsHint"),
      label: t("editor.carryItems"),
      value: "items",
    },
    {
      hint: t("editor.carryDepositHint"),
      label: t("editor.carryDeposit"),
      value: "deposit",
    },
    {
      hint: t("editor.carryBalanceHint"),
      label: t("editor.carryBalance"),
      value: "balance",
    },
  ] as const;

  return (
    <div
      className="flex min-h-full flex-col"
      data-testid="workflow-step-settings"
    >
      <div className="flex flex-col gap-3 border-b p-5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-md",
              KIND_TILE_CLASSES[step.kind],
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </span>
          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            {t("editor.stepOf", { number: index + 1, total })} ·{" "}
            {t(KIND_KEYS[step.kind])}
          </span>
        </div>
        <Field htmlFor={fieldId("name")} label={t("editor.stepName")}>
          <Input
            className="font-semibold"
            id={fieldId("name")}
            maxLength={80}
            onChange={(event) => onChange({ name: event.target.value })}
            value={step.name}
          />
        </Field>
      </div>

      {issues.length > 0 ? (
        <ul
          className="mx-5 mt-5 flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm"
          role="alert"
        >
          {issues.map((issue) => (
            <li key={issue.code}>{t(STEP_ISSUE_KEYS[issue.code])}</li>
          ))}
        </ul>
      ) : null}

      {step.kind === "document" ? (
        <div className="flex flex-col gap-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field htmlFor={fieldId("type")} label={t("editor.documentType")}>
              <select
                className={selectClassName}
                id={fieldId("type")}
                onChange={(event) =>
                  onChange({
                    documentType: event.target.value as WorkflowDocumentType,
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
            </Field>
            {templateField(step.documentType)}
          </div>

          {isFirst ? (
            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-sm">{t("editor.lines")}</span>
              <p className="text-muted-foreground text-sm">
                {t("editor.carryItemsFirst")}
              </p>
            </div>
          ) : (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-medium text-sm leading-none">
                {t("editor.lines")}
              </legend>
              {lineOptions.map((option) => {
                const picked = step.carryForward === option.value;
                return (
                  <button
                    aria-pressed={picked}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      picked
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent",
                    )}
                    key={option.value}
                    onClick={() =>
                      onChange({
                        carryForward: option.value,
                        depositPercentBps:
                          option.value === "deposit"
                            ? (step.depositPercentBps ?? 5000)
                            : step.depositPercentBps,
                      })
                    }
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0 rounded-full border bg-background",
                        picked ? "border-[5px] border-primary" : "border-input",
                      )}
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">
                        {option.label}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {option.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </fieldset>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {step.carryForward === "deposit" && !isFirst ? (
              <Field
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
                    onChange({
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
              </Field>
            ) : null}
            {step.documentType === "quote" ||
            step.documentType === "estimate" ? (
              <Field
                htmlFor={fieldId("validity")}
                label={t("editor.validityDays")}
              >
                <Input
                  id={fieldId("validity")}
                  inputMode="numeric"
                  max={365}
                  min={0}
                  onChange={(event) =>
                    onChange({
                      validityDays: parseWholeNumber(event.target.value),
                    })
                  }
                  type="number"
                  value={step.validityDays ?? ""}
                />
              </Field>
            ) : null}
            {step.documentType === "invoice" ? (
              <Field
                htmlFor={fieldId("terms")}
                label={t("editor.paymentTermsDays")}
              >
                <Input
                  id={fieldId("terms")}
                  inputMode="numeric"
                  max={365}
                  min={0}
                  onChange={(event) =>
                    onChange({
                      paymentTermsDays: parseWholeNumber(event.target.value),
                    })
                  }
                  type="number"
                  value={step.paymentTermsDays ?? ""}
                />
              </Field>
            ) : null}
          </div>

          {isFirst ? null : (
            <Segmented
              label={t("editor.advance")}
              onChange={(advanceMode) => onChange({ advanceMode })}
              options={[
                { label: t("editor.advanceManual"), value: "manual" },
                { label: t("editor.advanceAutomatic"), value: "automatic" },
              ]}
              value={step.advanceMode}
            />
          )}

          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <Switch
                checked={step.requiresAcceptance}
                id={fieldId("accept")}
                onCheckedChange={(checked) =>
                  onChange({ requiresAcceptance: checked })
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
            {step.requiresAcceptance ? (
              <div className="ml-12 flex items-start gap-3 border-t pt-3">
                <Switch
                  checked={step.negotiable}
                  id={fieldId("negotiable")}
                  onCheckedChange={(checked) =>
                    onChange({ negotiable: checked })
                  }
                />
                <div className="space-y-0.5">
                  <Label htmlFor={fieldId("negotiable")}>
                    {t("editor.negotiable")}
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {t("editor.negotiableHint")}
                  </p>
                </div>
              </div>
            ) : null}
            {step.requiresAcceptance ? (
              <div className="ml-12 flex items-start gap-3 border-t pt-3">
                <Switch
                  checked={step.requestsPurchaseOrder}
                  id={fieldId("po")}
                  onCheckedChange={(checked) =>
                    onChange({ requestsPurchaseOrder: checked })
                  }
                />
                <div className="space-y-0.5">
                  <Label htmlFor={fieldId("po")}>
                    {t("editor.requestsPurchaseOrder")}
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {t("editor.requestsPurchaseOrderHint")}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {step.kind === "payment" ? (
        <div className="p-5">
          <p className="text-muted-foreground text-sm">
            {t("editor.paymentDescription")}
          </p>
        </div>
      ) : null}

      {step.kind === "receipt" ? (
        <div className="flex flex-col gap-5 p-5">
          <p className="text-muted-foreground text-sm">
            {t("editor.receiptDescription")}
          </p>
          {templateField("receipt")}
          <Segmented
            label={t("editor.advanceReceipt")}
            onChange={(advanceMode) => onChange({ advanceMode })}
            options={[
              { label: t("editor.advanceManual"), value: "manual" },
              {
                label: t("editor.advanceAutomaticReceipt"),
                value: "automatic",
              },
            ]}
            value={step.advanceMode}
          />
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t p-4">
        <Button
          aria-label={t("editor.moveUp", { name: step.name })}
          disabled={isFirst}
          onClick={() => onMove(-1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ArrowUpIcon aria-hidden="true" />
          {t("editor.moveUpShort")}
        </Button>
        <Button
          aria-label={t("editor.moveDown", { name: step.name })}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ArrowDownIcon aria-hidden="true" />
          {t("editor.moveDownShort")}
        </Button>
        <Button
          aria-label={t("editor.remove", { name: step.name })}
          className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2Icon aria-hidden="true" />
          {t("editor.removeShort")}
        </Button>
      </div>
    </div>
  );
}
