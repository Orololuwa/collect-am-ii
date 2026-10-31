import { useTranslation } from "react-i18next";
import { href, Link } from "react-router";

import {
  formatMoney,
  formatPercentChange,
  formatRelativeTime,
  formatShortDate,
  formatSignedNumber,
} from "./dashboard-format";
import type { FullDashboardData } from "./dashboard-helpers.server";
import { cn } from "~/lib/utils";

type Tone = "good" | "bad" | "neutral";

const toneClasses: Record<Tone, string> = {
  bad: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-400",
  good: "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-400",
  neutral: "bg-muted text-muted-foreground",
};

export function DashboardSection({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("min-w-0 rounded-xl border bg-card p-5", className)}
      {...props}
    />
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    // Takes whatever room the figure leaves, so wide amounts squeeze the
    // bars instead of pushing them out of the card.
    <div
      aria-hidden="true"
      className="flex h-8 w-full min-w-0 max-w-[112px] items-end justify-end gap-[2px]"
    >
      {values.map((value, index) => (
        <span
          className="min-w-px max-w-[5px] flex-1 rounded-sm bg-primary/80"
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length series
          key={index}
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/**
 * A bar's height as a share of the busiest day. Days with any money get at
 * least a sliver, so a small day next to a huge one still shows.
 */
function barHeight(amountMinor: number, max: number) {
  if (amountMinor <= 0) {
    return "0%";
  }
  return `max(4px, ${(amountMinor / max) * 100}%)`;
}

function KpiCard({
  label,
  value,
  badge,
  note,
  spark,
}: {
  label: string;
  value: string;
  badge?: { text: string; tone: Tone };
  note: string;
  spark?: number[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground">{label}</span>
        {badge ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-semibold text-xs",
              toneClasses[badge.tone],
            )}
          >
            {badge.text}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 items-end justify-between gap-3">
        <span className="shrink-0 font-semibold text-[28px] tabular-nums leading-9 tracking-tight">
          {value}
        </span>
        {spark ? (
          <div className="flex min-w-0 flex-1 justify-end">
            <Sparkline values={spark} />
          </div>
        ) : null}
      </div>
      <span className="text-muted-foreground text-sm">{note}</span>
    </div>
  );
}

function changeBadge(
  changePercent: number | null,
  locale: string,
): { text: string; tone: Tone } | undefined {
  if (changePercent === null) {
    return undefined;
  }
  return {
    text: formatPercentChange(changePercent, locale),
    tone: changePercent > 0 ? "good" : changePercent < 0 ? "bad" : "neutral",
  };
}

export function DashboardKpis({
  stats,
  currency,
  period,
}: {
  stats: FullDashboardData["stats"];
  currency: string;
  period: number;
}) {
  const { t, i18n } = useTranslation("organizations", {
    keyPrefix: "dashboard.kpis",
  });
  const locale = i18n.language;
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency, locale, whole: true });
  const unsent = stats.receipts.total - stats.receipts.sent;

  return (
    <section
      aria-label={t("label")}
      className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
    >
      <KpiCard
        badge={changeBadge(stats.collected.changePercent, locale)}
        label={t("collected.title")}
        note={
          stats.collected.previousAmountMinor > 0
            ? t("collected.note", {
                amount: money(stats.collected.previousAmountMinor),
                count: period,
              })
            : t("collected.noPrevious", { count: period })
        }
        spark={stats.collected.spark}
        value={money(stats.collected.amountMinor)}
      />
      <KpiCard
        badge={
          stats.payments.changeCount === 0
            ? undefined
            : {
                text: formatSignedNumber(stats.payments.changeCount, locale),
                tone: stats.payments.changeCount > 0 ? "good" : "bad",
              }
        }
        label={t("payments.title")}
        note={t("payments.note", {
          failed: stats.payments.failed,
          refunded: stats.payments.refunded,
        })}
        spark={stats.payments.spark}
        value={String(stats.payments.succeeded)}
      />
      <KpiCard
        badge={changeBadge(stats.average.changePercent, locale)}
        label={t("average.title")}
        note={t("average.note")}
        value={money(stats.average.amountMinor)}
      />
      <KpiCard
        label={t("receipts.title")}
        note={
          stats.receipts.total === 0
            ? t("receipts.none")
            : unsent > 0
              ? t("receipts.unsent", { count: unsent })
              : t("receipts.allSent")
        }
        value={t("receipts.value", {
          sent: stats.receipts.sent,
          total: stats.receipts.total,
        })}
      />
    </section>
  );
}

export function CollectedChart({
  daily,
  currency,
  period,
}: {
  daily: FullDashboardData["stats"]["daily"];
  currency: string;
  period: number;
}) {
  const { t, i18n } = useTranslation("organizations", {
    keyPrefix: "dashboard.chart",
  });
  const locale = i18n.language;
  const max = Math.max(
    ...daily.map((day) => Math.max(day.amountMinor, day.previousAmountMinor)),
    1,
  );
  const peak = daily.reduce<(typeof daily)[number] | undefined>(
    (best, day) => (!best || day.amountMinor > best.amountMinor ? day : best),
    undefined,
  );
  const total = daily.reduce((sum, day) => sum + day.amountMinor, 0);
  const ticks = [1, 2 / 3, 1 / 3, 0].map((fraction) =>
    formatMoney({
      amountMinor: Math.round(max * fraction),
      compact: true,
      currency,
      locale,
    }),
  );
  const labelEvery = Math.ceil(daily.length / 5);

  return (
    <DashboardSection
      aria-labelledby="collected-chart-title"
      className="flex flex-[2_1_560px] flex-col gap-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base" id="collected-chart-title">
            {t("title")}
          </h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-4 text-muted-foreground text-sm">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-primary" />
            {t("current", { count: period })}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-muted" />
            {t("previous", { count: period })}
          </span>
        </div>
      </div>

      {total === 0 || !peak ? (
        <p className="flex h-56 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="flex gap-3">
          <div
            aria-hidden="true"
            className="flex h-56 flex-col justify-between text-right text-muted-foreground text-xs tabular-nums"
          >
            {ticks.map((tick, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed axis ticks
              <span key={index}>{tick}</span>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div
              aria-label={t("summary", {
                amount: formatMoney({
                  amountMinor: peak.amountMinor,
                  currency,
                  locale,
                }),
                count: period,
                date: formatShortDate(peak.date, locale),
              })}
              className={cn(
                "flex h-56 items-end border-b",
                daily.length > 31 ? "gap-px" : "gap-1",
              )}
              role="img"
            >
              {daily.map((day) => (
                <div
                  className="relative flex h-full min-w-0 flex-1 items-end"
                  key={day.date}
                  title={`${formatShortDate(day.date, locale)}: ${formatMoney({ amountMinor: day.amountMinor, currency, locale })}`}
                >
                  <span
                    className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-muted"
                    style={{ height: barHeight(day.previousAmountMinor, max) }}
                  />
                  <span
                    className={cn(
                      "relative w-full rounded-t-[3px]",
                      day === peak ? "bg-primary" : "bg-primary/70",
                    )}
                    style={{ height: barHeight(day.amountMinor, max) }}
                  />
                </div>
              ))}
            </div>
            <div
              aria-hidden="true"
              className="flex justify-between text-muted-foreground text-xs"
            >
              {daily
                .filter(
                  (_, index) =>
                    index % labelEvery === 0 || index === daily.length - 1,
                )
                .map((day) => (
                  <span key={day.date}>
                    {formatShortDate(day.date, locale)}
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}
    </DashboardSection>
  );
}

export function TopCheckoutPages({
  pages,
  currency,
  organizationSlug,
}: {
  pages: FullDashboardData["stats"]["topPages"];
  currency: string;
  organizationSlug: string;
}) {
  const { t, i18n } = useTranslation("organizations", {
    keyPrefix: "dashboard.topPages",
  });
  const locale = i18n.language;
  const max = Math.max(...pages.map((page) => page.amountMinor), 1);

  return (
    <DashboardSection
      aria-labelledby="top-pages-title"
      className="flex flex-[1_1_300px] flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-base" id="top-pages-title">
          {t("title")}
        </h2>
        <Link
          className="font-medium text-primary text-sm hover:underline"
          to={href("/organizations/:organizationSlug/checkout-pages", {
            organizationSlug,
          })}
        >
          {t("viewAll")}
        </Link>
      </div>
      {pages.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {pages.map((page) => (
            <li className="flex flex-col gap-2" key={page.id}>
              <div className="flex justify-between gap-3">
                <Link
                  className="min-w-0 truncate font-medium hover:underline"
                  to={href(
                    "/organizations/:organizationSlug/checkout-pages/:checkoutPageId",
                    { checkoutPageId: page.id, organizationSlug },
                  )}
                >
                  {page.name}
                </Link>
                <span className="font-semibold tabular-nums">
                  {formatMoney({
                    amountMinor: page.amountMinor,
                    currency,
                    locale,
                    whole: true,
                  })}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(page.amountMinor / max) * 100}%` }}
                />
              </div>
              <span className="text-muted-foreground text-sm">
                {t("payments", { count: page.payments })}
                {page.lastPaymentAt
                  ? ` · ${t("lastPayment", { when: formatRelativeTime(page.lastPaymentAt, locale) })}`
                  : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
