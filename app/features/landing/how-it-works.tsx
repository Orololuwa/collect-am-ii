import {
  CheckIcon,
  CreditCardIcon,
  FileTextIcon,
  MousePointerClickIcon,
  PlusIcon,
  ReceiptIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

const STEPS = ["workflow", "deal", "run"] as const;

export function HowItWorks() {
  const { t } = useTranslation("landing", { keyPrefix: "howItWorks" });
  const visuals: Record<(typeof STEPS)[number], ReactNode> = {
    deal: <DealVisual />,
    run: <RunVisual />,
    workflow: <WorkflowVisual />,
  };

  return (
    <section className="scroll-mt-20 py-24 sm:py-32" id="how-it-works">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-sm font-medium">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h2>
        </div>

        <ol className="mt-16 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              className="bg-card flex flex-col overflow-hidden rounded-2xl border"
              key={step}
            >
              <div
                aria-hidden="true"
                className="bg-muted/40 flex h-44 items-center justify-center border-b p-6"
              >
                {visuals[step]}
              </div>
              <div className="p-6">
                <p className="text-muted-foreground font-mono text-xs">
                  0{index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  {t(`steps.${step}.title`)}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {t(`steps.${step}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Node({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card flex size-11 items-center justify-center rounded-xl border shadow-sm">
      {children}
    </div>
  );
}

/** A small canvas of steps joined by lines. */
function WorkflowVisual() {
  return (
    <div className="flex items-center">
      <Node>
        <FileTextIcon className="size-5 text-sky-500" />
      </Node>
      <span className="bg-border h-px w-6" />
      <Node>
        <CreditCardIcon className="size-5 text-emerald-500" />
      </Node>
      <span className="bg-border h-px w-6" />
      <Node>
        <ReceiptIcon className="size-5 text-amber-500" />
      </Node>
      <span className="bg-border h-px w-6" />
      <div className="text-muted-foreground flex size-11 items-center justify-center rounded-xl border border-dashed">
        <PlusIcon className="size-4" />
      </div>
    </div>
  );
}

/** A draft document's first lines. */
function DealVisual() {
  return (
    <div className="bg-card w-full max-w-60 space-y-2 rounded-xl border p-4 shadow-sm">
      <div className="bg-foreground/80 h-2 w-16 rounded-full" />
      <div className="flex items-center justify-between pt-1">
        <div className="bg-muted-foreground/30 h-2 w-24 rounded-full" />
        <div className="bg-muted-foreground/30 h-2 w-10 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <div className="bg-muted-foreground/30 h-2 w-20 rounded-full" />
        <div className="bg-muted-foreground/30 h-2 w-8 rounded-full" />
      </div>
      <div className="flex items-center justify-between border-t pt-2">
        <div className="bg-foreground/60 h-2 w-10 rounded-full" />
        <div className="bg-primary h-2 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** Steps ticking off by themselves. */
function RunVisual() {
  return (
    <div className="relative w-full max-w-60 space-y-2">
      {[0, 1, 2].map((row) => (
        <div
          className="bg-card flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm"
          key={row}
        >
          {row < 2 ? (
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckIcon className="size-2.5" strokeWidth={3} />
            </span>
          ) : (
            <span className="bg-primary size-2 rounded-full" />
          )}
          <div className="bg-muted-foreground/30 h-2 flex-1 rounded-full" />
        </div>
      ))}
      <MousePointerClickIcon className="text-foreground absolute -right-3 -bottom-3 size-5" />
    </div>
  );
}
