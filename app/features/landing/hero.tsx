import {
  ArrowRightIcon,
  BellIcon,
  CheckIcon,
  CreditCardIcon,
  FileTextIcon,
  HandCoinsIcon,
  LinkIcon,
  ReceiptIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { Trans, useTranslation } from "react-i18next";
import { href, Link } from "react-router";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { formatMoney } from "~/features/organizations/dashboard/dashboard-format";
import { cn } from "~/lib/utils";

type StepState = "done" | "active" | "pending";

const MOCK_STEPS = [
  {
    icon: FileTextIcon,
    key: "quote",
    note: "accepted",
    state: "done",
  },
  {
    icon: FileTextIcon,
    key: "invoice",
    note: "sent",
    state: "done",
  },
  {
    icon: CreditCardIcon,
    key: "payment",
    note: null,
    state: "active",
  },
  {
    icon: ReceiptIcon,
    key: "receipt",
    note: "automatic",
    state: "pending",
  },
  {
    icon: HandCoinsIcon,
    key: "refund",
    note: "afterEvent",
    state: "pending",
  },
] as const satisfies ReadonlyArray<{
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: string;
  note: string | null;
  state: StepState;
}>;

export function Hero() {
  const { t } = useTranslation("landing", { keyPrefix: "hero" });

  return (
    <section className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-40 lg:pb-28">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[56px_56px] opacity-50 mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="bg-primary/25 absolute -top-40 left-1/2 -z-10 size-160 -translate-x-1/2 rounded-full blur-3xl"
      />

      <div className="container mx-auto grid grid-cols-1 items-center gap-16 px-4 lg:grid-cols-[1fr_1.05fr]">
        <div className="text-center lg:text-left">
          <Badge className="mb-6 rounded-full px-3 py-1" variant="secondary">
            <span className="bg-primary size-1.5 rounded-full" />
            {t("badge")}
          </Badge>

          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            <Trans
              components={{ 1: <span className="text-primary" /> }}
              i18nKey="hero.title"
              ns="landing"
            />
          </h1>

          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg text-pretty lg:mx-0">
            {t("description")}
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild size="lg">
              <Link to={href("/register")}>
                {t("cta.primary")}
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/#how-it-works">{t("cta.secondary")}</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">{t("note")}</p>
        </div>

        <HeroMock />
      </div>
    </section>
  );
}

/** A deal as the business sees it, with the customer's deal room beside it. */
function HeroMock() {
  const { t, i18n } = useTranslation("landing", { keyPrefix: "hero.mock" });
  const amount = formatMoney({
    amountMinor: 85_000_000,
    currency: "NGN",
    locale: i18n.language,
  });

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mb-8 w-full max-w-xl sm:mb-28"
    >
      <div className="bg-card relative rounded-2xl border p-5 shadow-2xl shadow-black/5 sm:p-6 dark:shadow-black/40">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            AO
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{t("dealTitle")}</p>
            <p className="text-muted-foreground truncate text-sm">
              {t("customer")} · {t("workflow")}
            </p>
          </div>
          <Badge variant="outline">{t("open")}</Badge>
        </div>

        <ol className="mt-6 space-y-1">
          {MOCK_STEPS.map((step) => (
            <li
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5",
                step.state === "active" &&
                  "bg-primary/5 ring-primary/20 ring-1",
              )}
              key={step.key}
            >
              <StepMarker state={step.state} />
              <step.icon
                className={cn(
                  "size-4 shrink-0",
                  step.state === "pending"
                    ? "text-muted-foreground/60"
                    : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  step.state === "pending" && "text-muted-foreground",
                  step.state === "active" && "font-medium",
                )}
              >
                {t(`steps.${step.key}`)}
              </span>
              <span
                className={cn(
                  "text-xs",
                  step.state === "active"
                    ? "text-primary font-medium"
                    : "text-muted-foreground",
                )}
              >
                {step.note
                  ? t(`states.${step.note}`)
                  : t("amountDue", { amount })}
              </span>
            </li>
          ))}
        </ol>

        <div className="text-muted-foreground mt-4 flex items-center gap-2 border-t pt-4 text-xs">
          <LinkIcon className="size-3.5" />
          {t("shareLink")}
        </div>
      </div>

      <div className="bg-card absolute -bottom-20 -left-2 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl sm:-left-10">
        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <BellIcon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{t("toast")}</p>
          <p className="text-muted-foreground text-xs">{t("toastTime")}</p>
        </div>
      </div>

      <div className="bg-card absolute -right-2 -bottom-28 hidden w-56 rounded-xl border p-4 shadow-xl sm:block lg:-right-8">
        <div className="flex items-center gap-2">
          <div className="bg-foreground text-background flex size-6 items-center justify-center rounded-md text-[10px] font-bold">
            EH
          </div>
          <span className="text-sm font-medium">{t("roomBusiness")}</span>
        </div>
        <p className="text-muted-foreground mt-4 text-xs">{t("roomLabel")}</p>
        <p className="text-xl font-semibold tracking-tight">{amount}</p>
        <div className="bg-primary text-primary-foreground mt-3 rounded-md py-2 text-center text-sm font-medium">
          {t("payNow", { amount })}
        </div>
        <p className="text-muted-foreground mt-2 text-center text-[11px]">
          {t("paymentMethods")}
        </p>
      </div>
    </div>
  );
}

function StepMarker({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <CheckIcon className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        <span className="bg-primary/40 absolute inline-flex size-full animate-ping rounded-full motion-reduce:animate-none" />
        <span className="bg-primary relative size-2.5 rounded-full" />
      </span>
    );
  }
  return (
    <span className="border-muted-foreground/30 size-5 shrink-0 rounded-full border-2 border-dashed" />
  );
}
