import {
  CircleAlertIcon,
  PlusIcon,
  UserCheckIcon,
  ZapIcon,
} from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import type { EditorStep } from "./workflow-step-meta";
import {
  GATE_DESCRIPTION_KEYS,
  gateDescription,
  isAutomaticStep,
  KIND_ICONS,
  KIND_TILE_CLASSES,
  stepLane,
  stepSummary,
} from "./workflow-step-meta";
import { Button } from "~/components/ui/button";
import type { WorkflowStepKind } from "~/generated/browser";
import { cn } from "~/lib/utils";

export function AutoBadge() {
  const { t } = useTranslation("workflows");
  return (
    <span className="inline-flex h-[18px] shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 font-semibold text-[11px] text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <ZapIcon aria-hidden="true" className="size-2.5 fill-current" />
      {t("editor.auto")}
    </span>
  );
}

export function AddStepButtons({
  onAdd,
}: {
  onAdd: (kind: WorkflowStepKind) => void;
}) {
  const { t } = useTranslation("workflows");
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => onAdd("document")} type="button" variant="outline">
        <PlusIcon aria-hidden="true" />
        {t("editor.addDocument")}
      </Button>
      <Button onClick={() => onAdd("payment")} type="button" variant="outline">
        <PlusIcon aria-hidden="true" />
        {t("editor.addPayment")}
      </Button>
      <Button onClick={() => onAdd("receipt")} type="button" variant="outline">
        <PlusIcon aria-hidden="true" />
        {t("editor.addReceipt")}
      </Button>
    </div>
  );
}

/** The steps view: the workflow as an ordered list. */
export function WorkflowStepsList({
  steps,
  selectedKey,
  stepsWithIssues,
  onSelect,
  onAdd,
}: {
  steps: EditorStep[];
  selectedKey: string | null;
  stepsWithIssues: ReadonlySet<number>;
  onSelect: (key: string) => void;
  onAdd: (kind: WorkflowStepKind) => void;
}) {
  const { t } = useTranslation("workflows");
  const connector = (
    <div aria-hidden="true" className="ml-[3.25rem] h-3.5 w-0.5 bg-border" />
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-base">
            {t("editor.stepCount", { count: steps.length })}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("editor.stepsHint")}
          </p>
        </div>
        <div className="flex gap-3 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-muted-foreground/25" />
            {t("editor.lanes.you")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-sky-300 dark:bg-sky-800" />
            {t("editor.lanes.customer")}
          </span>
        </div>
      </div>

      <ol aria-label={t("editor.steps")} className="flex flex-col">
        {steps.map((step, index) => {
          const Icon = KIND_ICONS[step.kind];
          const selected = step.key === selectedKey;
          const hasIssue = stepsWithIssues.has(index);
          const customer = stepLane(step) === "customer";
          return (
            <Fragment key={step.key}>
              {index > 0 ? <li aria-hidden="true">{connector}</li> : null}
              <li>
                <button
                  aria-current={selected ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-shadow",
                    customer &&
                      "bg-linear-to-r from-sky-50 to-card to-40% dark:from-sky-950/40",
                    selected
                      ? "border-primary ring-4 ring-primary/15"
                      : "hover:shadow-sm",
                    hasIssue && !selected && "border-destructive",
                  )}
                  data-testid={`workflow-step-${index}`}
                  onClick={() => onSelect(step.key)}
                  type="button"
                >
                  <span className="w-5 shrink-0 text-center font-semibold text-muted-foreground text-xs">
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      KIND_TILE_CLASSES[step.kind],
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-sm">
                        {step.name || t("editor.untitledStep")}
                      </span>
                      {isAutomaticStep(step, index) ? <AutoBadge /> : null}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {stepSummary(t, step)}
                    </span>
                  </span>
                  {hasIssue ? (
                    <CircleAlertIcon
                      aria-label={t("editor.hasProblem")}
                      className="size-4 shrink-0 text-destructive"
                      role="img"
                    />
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex h-[22px] shrink-0 items-center rounded-full px-2 font-semibold text-[11px]",
                      customer
                        ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {customer
                      ? t("editor.lanes.customer")
                      : t("editor.lanes.you")}
                  </span>
                </button>
              </li>
              {step.kind === "document" && step.requiresAcceptance ? (
                <>
                  <li aria-hidden="true">{connector}</li>
                  <li>
                    <button
                      className="ml-11 flex w-[calc(100%-2.75rem)] items-center gap-2.5 rounded-lg border-[1.5px] border-sky-300 border-dashed bg-sky-50 px-3 py-2 text-left dark:border-sky-800 dark:bg-sky-950/40"
                      onClick={() => onSelect(step.key)}
                      type="button"
                    >
                      <UserCheckIcon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-sky-800 dark:text-sky-300"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold text-sky-950 text-sm dark:text-sky-100">
                          {t(
                            step.requestsPurchaseOrder
                              ? "editor.gate.titleWithPo"
                              : "editor.gate.title",
                          )}
                        </span>
                        <span className="text-sky-900/80 text-xs dark:text-sky-200/80">
                          {t(GATE_DESCRIPTION_KEYS[gateDescription(step)])}
                        </span>
                      </span>
                    </button>
                  </li>
                </>
              ) : null}
            </Fragment>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-col gap-3 border-t border-dashed pt-5">
        <AddStepButtons onAdd={onAdd} />
        <p className="text-muted-foreground text-xs">
          {t("editor.runningDealsNote")}
        </p>
      </div>
    </div>
  );
}
