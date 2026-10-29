import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Form, href, Link, useNavigation } from "react-router";

import { DISMISS_SETUP_GUIDE_INTENT } from "./dashboard-constants";
import { formatMoney } from "./dashboard-format";
import type { DashboardData } from "./dashboard-helpers.server";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * What a new organization sees until it has a checkout page: the steps to
 * its first payment, and the numbers that will appear once it has some.
 */
export function SetupChecklist({
  setup,
  currency,
  userName,
  organizationName,
  organizationSlug,
}: {
  setup: DashboardData["setup"];
  currency: string;
  userName: string;
  organizationName: string;
  organizationSlug: string;
}) {
  const { t, i18n } = useTranslation("organizations", {
    keyPrefix: "dashboard.setup",
  });
  const { t: tCommon } = useTranslation("translation");
  const firstName = userName.split(" ")[0];

  const steps = [
    {
      done: true,
      key: "organization",
      actionKey: "steps.organization.action",
      detailKey: "steps.organization.detail",
      titleKey: "steps.organization.title",
      to: href("/organizations/:organizationSlug/settings/general", {
        organizationSlug,
      }),
    },
    {
      done: setup.hasTemplate,
      key: "template",
      actionKey: "steps.template.action",
      detailKey: "steps.template.detail",
      titleKey: "steps.template.title",
      to: href("/organizations/:organizationSlug/templates", {
        organizationSlug,
      }),
    },
    {
      done: setup.hasCheckoutPage,
      key: "checkoutPage",
      actionKey: "steps.checkoutPage.action",
      detailKey: "steps.checkoutPage.detail",
      titleKey: "steps.checkoutPage.title",
      to: href("/organizations/:organizationSlug/checkout-pages/new", {
        organizationSlug,
      }),
    },
    {
      done: setup.hasPayment,
      key: "payment",
      actionKey: "steps.payment.action",
      detailKey: "steps.payment.detail",
      titleKey: "steps.payment.title",
      to: href("/organizations/:organizationSlug/checkout-pages", {
        organizationSlug,
      }),
    },
    {
      done: setup.hasTeammates,
      key: "team",
      actionKey: "steps.team.action",
      detailKey: "steps.team.detail",
      titleKey: "steps.team.title",
      to: href("/organizations/:organizationSlug/settings/members", {
        organizationSlug,
      }),
    },
  ] as const;
  const done = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done)?.key;
  const zero = formatMoney({ amountMinor: 0, currency, locale: i18n.language });
  const navigation = useNavigation();
  const isSkipping =
    navigation.formData?.get("intent") === DISMISS_SETUP_GUIDE_INTENT;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">
            {firstName
              ? t("welcome", { appName: tCommon("appName"), name: firstName })
              : t("welcomeNoName", { appName: tCommon("appName") })}
          </h1>
          <p className="text-muted-foreground">
            {t("intro", { organizationName })}
          </p>
        </div>
        <Form method="post">
          <Button
            disabled={isSkipping}
            name="intent"
            type="submit"
            value={DISMISS_SETUP_GUIDE_INTENT}
            variant="outline"
          >
            {t("skip")}
          </Button>
        </Form>
      </header>

      <div className="flex flex-wrap items-start gap-4">
        <section
          aria-labelledby="setup-title"
          className="min-w-0 flex-[2_1_560px] rounded-xl border bg-card"
        >
          <div className="flex flex-col gap-3 px-5 pt-5 pb-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-base" id="setup-title">
                {t("title")}
              </h2>
              <span className="text-muted-foreground text-sm tabular-nums">
                {t("progress", { done, total: steps.length })}
              </span>
            </div>
            <div
              aria-label={t("title")}
              aria-valuemax={steps.length}
              aria-valuemin={0}
              aria-valuenow={done}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(done / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <ol>
            {steps.map((step, index) => (
              <li
                className="flex items-start gap-3.5 border-t px-5 py-4"
                key={step.key}
              >
                {step.done ? (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-400">
                    <CheckIcon aria-label={t("done")} className="size-4" />
                  </span>
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border font-semibold text-muted-foreground text-xs">
                    {index + 1}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block font-semibold",
                      step.done && "text-muted-foreground",
                    )}
                  >
                    {t(step.titleKey)}
                  </span>
                  <span className="block text-muted-foreground">
                    {t(step.detailKey)}
                  </span>
                </div>
                {step.done ? null : (
                  <Button
                    asChild
                    size="sm"
                    variant={step.key === nextStep ? "default" : "outline"}
                  >
                    <Link to={step.to}>{t(step.actionKey)}</Link>
                  </Button>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="setup-preview-title"
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-3"
        >
          <h2
            className="font-semibold text-muted-foreground text-xs uppercase tracking-wider"
            id="setup-preview-title"
          >
            {t("preview.title")}
          </h2>
          {[
            {
              key: "collected",
              label: t("preview.collected.label"),
              note: t("preview.collected.note"),
              value: zero,
            },
            {
              key: "average",
              label: t("preview.average.label"),
              note: t("preview.average.note"),
              value: zero,
            },
            {
              key: "receipts",
              label: t("preview.receipts.label"),
              note: t("preview.receipts.note"),
              value: "0",
            },
          ].map((card) => (
            <div
              className="flex flex-col gap-1.5 rounded-xl border border-dashed bg-card px-4 py-4"
              key={card.key}
            >
              <span className="font-medium text-muted-foreground">
                {card.label}
              </span>
              <span className="font-semibold text-2xl text-muted-foreground tabular-nums">
                {card.value}
              </span>
              <span className="text-muted-foreground text-sm">{card.note}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
