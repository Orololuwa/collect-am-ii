import {
  ChevronRightIcon,
  CreditCardIcon,
  FileTextIcon,
  HandCoinsIcon,
  ReceiptIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Fragment } from "react";

import type { WorkflowStepKind } from "~/generated/browser";
import { cn } from "~/lib/utils";

const kindIcons = {
  document: FileTextIcon,
  payment: CreditCardIcon,
  receipt: ReceiptIcon,
  caution: ShieldCheckIcon,
  cautionRefund: HandCoinsIcon,
} as const satisfies Record<WorkflowStepKind, unknown>;

/**
 * A workflow's steps in order, as small chips joined by arrows.
 */
export function WorkflowStepChips({
  steps,
  className,
}: {
  steps: Array<{ kind: WorkflowStepKind; name: string }>;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-1", className)}>
      {steps.map((step, index) => {
        const Icon = kindIcons[step.kind];
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: steps have no id here and never reorder
          <Fragment key={index}>
            {index > 0 ? (
              <ChevronRightIcon
                aria-hidden="true"
                className="size-3 text-muted-foreground"
              />
            ) : null}
            <li
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs",
                step.kind === "document"
                  ? "bg-card"
                  : "border-transparent bg-muted text-muted-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-3" />
              {step.name}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
