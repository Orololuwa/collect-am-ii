import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, useNavigation } from "react-router";

import { UPDATE_WORKFLOW_VIEW_INTENT } from "./general-settings-constants";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Spinner } from "~/components/ui/spinner";
import type { WorkflowView } from "~/generated/browser";
import { cn } from "~/lib/utils";

/** A miniature of the steps view: a short list with an accept step. */
function StepsPreview() {
  const row = (accent: string, width: string) => (
    <span className="flex h-6 items-center gap-2 rounded-md border bg-background px-2">
      <span className={cn("size-3.5 rounded", accent)} />
      <span
        className={cn("h-1.5 rounded-full bg-muted-foreground/30", width)}
      />
    </span>
  );
  return (
    <span
      aria-hidden="true"
      className="flex h-36 flex-col justify-center gap-1.5 border-b bg-muted/60 px-10"
    >
      {row("bg-primary/15", "w-24")}
      <span className="ml-5 flex h-5 items-center rounded-md border border-sky-300 border-dashed bg-sky-50 px-2 dark:border-sky-800 dark:bg-sky-950/40">
        <span className="h-1.5 w-16 rounded-full bg-sky-300/70" />
      </span>
      {row("bg-primary/15", "w-28")}
      {row("bg-sky-200 dark:bg-sky-900", "w-20")}
    </span>
  );
}

/** A miniature of the canvas: two lanes and a hand-off between them. */
function CanvasPreview() {
  const line = "absolute bg-muted-foreground/40";
  return (
    <span
      aria-hidden="true"
      className="relative block h-36 border-b bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-muted/60 [background-size:12px_12px]"
    >
      <span className="absolute inset-y-3 left-[14%] w-[34%] rounded-lg border bg-background/60" />
      <span className="absolute inset-y-3 right-[14%] w-[34%] rounded-lg border border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30" />
      <span className="absolute top-6 left-[18%] h-5 w-[26%] rounded-md border bg-background" />
      <span className={cn(line, "top-11 left-[31%] h-2 w-0.5")} />
      <span className={cn(line, "top-[3.25rem] left-[31%] h-0.5 w-[38%]")} />
      <span className={cn(line, "top-[3.25rem] left-[69%] h-2 w-0.5")} />
      <span className="absolute top-[3.75rem] right-[18%] h-5 w-[26%] rounded-md border border-sky-300 border-dashed bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40" />
      <span className={cn(line, "top-[5rem] left-[69%] h-2 w-0.5")} />
      <span className={cn(line, "top-[5.5rem] left-[31%] h-0.5 w-[38%]")} />
      <span className={cn(line, "top-[5.5rem] left-[31%] h-2 w-0.5")} />
      <span className="absolute top-24 left-[18%] h-5 w-[26%] rounded-md border-[1.5px] border-primary bg-background" />
    </span>
  );
}

export function WorkflowViewSettings({
  organizationName,
  workflowView,
  workflowViewSwitchable,
}: {
  organizationName: string;
  workflowView: WorkflowView;
  workflowViewSwitchable: boolean;
}) {
  const { t } = useTranslation("organizations", {
    keyPrefix: "settings.general.workflowView",
  });
  const id = useId();
  const navigation = useNavigation();
  const [view, setView] = useState<WorkflowView>(workflowView);
  const saving =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === UPDATE_WORKFLOW_VIEW_INTENT;

  const options = [
    {
      description: t("stepsDescription"),
      label: t("steps"),
      preview: <StepsPreview />,
      value: "steps",
    },
    {
      description: t("canvasDescription"),
      label: t("canvas"),
      preview: <CanvasPreview />,
      value: "canvas",
    },
  ] as const;

  return (
    <Form className="flex flex-col gap-5" method="POST">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-semibold leading-none">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("description", { organizationName })}
        </p>
      </div>

      <RadioGroup
        aria-label={t("legend")}
        className="grid gap-3.5 sm:grid-cols-2"
        name="workflowView"
        onValueChange={(value) => setView(value as WorkflowView)}
        value={view}
      >
        {options.map((option) => (
          <Label
            className={cn(
              "flex cursor-pointer flex-col items-stretch gap-0 overflow-hidden rounded-xl border bg-card font-normal transition-shadow",
              view === option.value
                ? "border-primary ring-4 ring-primary/15"
                : "hover:shadow-sm",
            )}
            htmlFor={`${id}-${option.value}`}
            key={option.value}
          >
            {option.preview}
            <span className="flex items-start gap-3 p-4">
              <RadioGroupItem
                className="mt-0.5"
                id={`${id}-${option.value}`}
                value={option.value}
              />
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{option.label}</span>
                <span className="text-muted-foreground text-sm leading-snug">
                  {option.description}
                </span>
              </span>
            </span>
          </Label>
        ))}
      </RadioGroup>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
        <Checkbox
          className="mt-0.5"
          defaultChecked={workflowViewSwitchable}
          id={`${id}-switch`}
          name="allowViewSwitch"
        />
        <Label
          className="flex flex-col items-start gap-1 font-normal"
          htmlFor={`${id}-switch`}
        >
          <span className="font-semibold">{t("allowSwitch")}</span>
          <span className="text-muted-foreground text-sm leading-snug">
            {t("allowSwitchDescription")}
          </span>
        </Label>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={saving}
          name="intent"
          type="submit"
          value={UPDATE_WORKFLOW_VIEW_INTENT}
        >
          {saving ? <Spinner /> : null}
          {t("save")}
        </Button>
      </div>
    </Form>
  );
}
