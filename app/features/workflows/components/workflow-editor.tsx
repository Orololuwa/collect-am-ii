import { createId } from "@paralleldrive/cuid2";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ListIcon,
  WorkflowIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link } from "react-router";

import type { SaveWorkflowIssue, WorkflowStepInput } from "../workflow-steps";
import {
  normalizeWorkflowStep,
  validateWorkflowSteps,
} from "../workflow-steps";
import { SAVE_WORKFLOW_INTENT, STEP_ISSUE_KEYS } from "../workflows-constants";
import { WorkflowCanvas } from "./workflow-canvas";
import type { EditorStep } from "./workflow-step-meta";
import type { WorkflowTemplateOption } from "./workflow-step-settings";
import { WorkflowStepSettings } from "./workflow-step-settings";
import { WorkflowStepsList } from "./workflow-steps-list";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import type { WorkflowStepKind, WorkflowView } from "~/generated/browser";
import { cn } from "~/lib/utils";

export type { WorkflowTemplateOption } from "./workflow-step-settings";

export function WorkflowEditor({
  workflow,
  templates,
  serverIssues,
  isSaving,
  view,
  viewLinks,
  backHref,
  openDeals,
  toolbarExtra,
}: {
  workflow: {
    name: string;
    description: string;
    steps: WorkflowStepInput[];
  };
  templates: WorkflowTemplateOption[];
  serverIssues: SaveWorkflowIssue[];
  isSaving: boolean;
  view: WorkflowView;
  /** Links that switch the view; null when the organization fixes it. */
  viewLinks: Record<WorkflowView, string> | null;
  backHref: string;
  /** Open deals running on this workflow. */
  openDeals: number;
  toolbarExtra?: React.ReactNode;
}) {
  const { t } = useTranslation("workflows");
  const [steps, setSteps] = useState<EditorStep[]>(() =>
    // Keys of the saved steps must match between server and client render;
    // steps added later get random ones.
    workflow.steps.map((step, index) => ({ ...step, key: `saved-${index}` })),
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(
    steps[0]?.key ?? null,
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
  const workflowIssues = issues.filter((issue) => issue.stepIndex === null);
  const stepsWithIssues = new Set(
    issues.flatMap((issue) =>
      issue.stepIndex === null ? [] : [issue.stepIndex],
    ),
  );

  const selectedIndex = steps.findIndex((step) => step.key === selectedKey);
  const selected = steps[selectedIndex];

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
  const remove = (index: number) => {
    setIsDirty(true);
    const neighbour = steps[index + 1] ?? steps[index - 1];
    setSelectedKey(neighbour?.key ?? null);
    setSteps((current) => current.filter((_, position) => position !== index));
  };
  const insert = (kind: WorkflowStepKind, index: number) => {
    setIsDirty(true);
    const key = createId();
    const step: EditorStep = {
      advanceMode: kind === "receipt" ? "automatic" : "manual",
      carryForward: "items",
      depositPercentBps: null,
      documentType: kind === "document" ? "invoice" : null,
      key,
      kind,
      name:
        kind === "document"
          ? t("stepNames.invoice")
          : kind === "payment"
            ? t("stepNames.payment")
            : kind === "caution"
              ? t("stepNames.caution")
              : kind === "cautionRefund"
                ? t("stepNames.cautionRefund")
                : t("stepNames.receipt"),
      paymentTermsDays: kind === "document" ? 14 : null,
      negotiable: false,
      requestsPurchaseOrder: false,
      requiresAcceptance: false,
      templateId: null,
      validityDays: null,
    };
    setSteps((current) => [
      ...current.slice(0, index),
      step,
      ...current.slice(index),
    ]);
    setSelectedKey(key);
  };
  const add = (kind: WorkflowStepKind) => insert(kind, steps.length);

  const firstStepWithIssue = steps.find((_, index) =>
    stepsWithIssues.has(index),
  );

  const list = (
    <WorkflowStepsList
      onAdd={add}
      onSelect={setSelectedKey}
      selectedKey={selectedKey}
      steps={steps}
      stepsWithIssues={stepsWithIssues}
    />
  );

  return (
    <Form
      className="flex min-h-0 flex-1 flex-col"
      method="POST"
      onSubmit={() => setIsDirty(false)}
    >
      <input
        name="steps"
        type="hidden"
        value={JSON.stringify(normalizedSteps)}
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b bg-background px-4 py-3 lg:px-5">
        <Button
          asChild
          className="text-muted-foreground"
          size="sm"
          variant="ghost"
        >
          <Link to={backHref}>
            <ArrowLeftIcon aria-hidden="true" />
            {t("editor.back")}
          </Link>
        </Button>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col">
          <input
            aria-label={t("editor.name")}
            className="-ml-1.5 w-full max-w-lg rounded-md border border-transparent bg-transparent px-1.5 py-0.5 font-semibold text-lg outline-none hover:border-input focus:border-ring focus:ring-2 focus:ring-ring/30"
            defaultValue={workflow.name}
            maxLength={120}
            name="name"
            onChange={() => setIsDirty(true)}
            required
          />
          <input
            aria-label={t("editor.description")}
            className="-ml-1.5 w-full max-w-2xl rounded-md border border-transparent bg-transparent px-1.5 text-muted-foreground text-sm outline-none placeholder:text-muted-foreground/70 hover:border-input focus:border-ring focus:ring-2 focus:ring-ring/30"
            defaultValue={workflow.description}
            maxLength={500}
            name="description"
            onChange={() => setIsDirty(true)}
            placeholder={t("editor.descriptionPlaceholder")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {issues.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-green-700 text-sm dark:text-green-400">
              <CircleCheckIcon aria-hidden="true" className="size-4" />
              {t("editor.ready")}
            </span>
          ) : (
            <button
              className="inline-flex items-center gap-1.5 font-medium text-destructive text-sm hover:underline"
              onClick={() =>
                firstStepWithIssue && setSelectedKey(firstStepWithIssue.key)
              }
              type="button"
            >
              <CircleAlertIcon aria-hidden="true" className="size-4" />
              {t("editor.problems", { count: issues.length })}
            </button>
          )}
          <span className="text-muted-foreground text-sm">
            {openDeals === 0
              ? t("editor.noOpenDeals")
              : t("editor.openDeals", { count: openDeals })}
          </span>
          {viewLinks ? (
            <nav
              aria-label={t("editor.view")}
              // Phones always get the steps, so the switch is for larger screens.
              className="hidden gap-0.5 rounded-lg bg-muted p-[3px] lg:inline-flex"
            >
              {(
                [
                  {
                    icon: ListIcon,
                    label: t("editor.views.steps"),
                    value: "steps",
                  },
                  {
                    icon: WorkflowIcon,
                    label: t("editor.views.canvas"),
                    value: "canvas",
                  },
                ] as const
              ).map((option) => (
                <Link
                  aria-current={view === option.value ? "page" : undefined}
                  className={cn(
                    "inline-flex h-[30px] items-center gap-1.5 rounded-md px-3 font-medium text-sm transition-colors",
                    view === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  key={option.value}
                  preventScrollReset
                  replace
                  to={viewLinks[option.value]}
                >
                  <option.icon aria-hidden="true" className="size-4" />
                  {option.label}
                </Link>
              ))}
            </nav>
          ) : null}
          {toolbarExtra}
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

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          aria-label={t("editor.steps")}
          className="flex min-h-0 min-w-0 flex-1 flex-col lg:w-0"
        >
          {workflowIssues.length > 0 ? (
            <div
              className="mx-4 mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm lg:mx-6"
              role="alert"
            >
              <p className="font-medium">{t("editor.issuesTitle")}</p>
              <ul className="mt-1 list-disc pl-5">
                {workflowIssues.map((issue) => (
                  <li key={issue.code}>{t(STEP_ISSUE_KEYS[issue.code])}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {view === "canvas" ? (
            <>
              <div className="hidden min-h-0 flex-1 lg:block">
                <WorkflowCanvas
                  onInsert={insert}
                  onSelect={setSelectedKey}
                  selectedKey={selectedKey}
                  steps={steps}
                  stepsWithIssues={stepsWithIssues}
                />
              </div>
              {/* A canvas is hard to use on a small screen. */}
              <div className="px-4 py-6 lg:hidden">{list}</div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6">
              {list}
            </div>
          )}
        </section>

        <aside
          aria-label={t("editor.stepSettings")}
          className="border-t bg-background lg:w-[360px] lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l"
        >
          {selected ? (
            <WorkflowStepSettings
              index={selectedIndex}
              issues={issues.filter(
                (issue) => issue.stepIndex === selectedIndex,
              )}
              key={selected.key}
              onChange={(changes) => update(selected.key, changes)}
              onMove={(offset) => {
                move(selectedIndex, offset);
              }}
              onRemove={() => remove(selectedIndex)}
              step={selected}
              templates={templates}
              total={steps.length}
            />
          ) : (
            <p className="p-6 text-center text-muted-foreground text-sm">
              {t("editor.selectStep")}
            </p>
          )}
        </aside>
      </div>
    </Form>
  );
}
