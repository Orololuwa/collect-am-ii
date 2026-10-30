import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { href, Link, useSearchParams } from "react-router";

import type { DashboardPeriod } from "./dashboard-metrics";
import { DASHBOARD_PERIODS } from "./dashboard-metrics";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

/** The current URL's search params with one value changed. */
function useSearchWith() {
  const [searchParams] = useSearchParams();
  return (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    return `?${next.toString()}`;
  };
}

export function DashboardHeader({
  userName,
  organizationName,
  organizationSlug,
  period,
  currency,
  currencies,
  hasWorkflow,
}: {
  /** Without a workflow no deal can start, so the main button makes one. */
  hasWorkflow: boolean;
  userName: string;
  organizationName: string;
  organizationSlug: string;
  period: DashboardPeriod;
  currency: string;
  currencies: readonly string[];
}) {
  const { t } = useTranslation("organizations", {
    keyPrefix: "dashboard.header",
  });
  const searchWith = useSearchWith();
  const firstName = userName.split(" ")[0];

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          {firstName ? t("greeting", { name: firstName }) : t("greetingNoName")}
        </h1>
        <p className="text-muted-foreground">
          {t("summary", { count: period, organizationName })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <nav
          aria-label={t("periodLabel")}
          className="flex rounded-lg border bg-card p-0.5"
        >
          {DASHBOARD_PERIODS.map((days) => (
            <Link
              aria-current={days === period ? "page" : undefined}
              className={cn(
                "flex h-9 items-center rounded-md px-3 font-medium text-sm transition-colors",
                days === period
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={days}
              preventScrollReset
              to={searchWith("period", String(days))}
            >
              {t("periodOption", { count: days })}
            </Link>
          ))}
        </nav>

        {currencies.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label={t("currencyLabel")} variant="outline">
                {currency}
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {currencies.map((code) => (
                <DropdownMenuItem asChild key={code}>
                  <Link preventScrollReset to={searchWith("currency", code)}>
                    {code}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <Button asChild>
          <Link
            to={
              hasWorkflow
                ? href("/organizations/:organizationSlug/deals/new", {
                    organizationSlug,
                  })
                : href("/organizations/:organizationSlug/workflows/new", {
                    organizationSlug,
                  })
            }
          >
            <PlusIcon />
            {hasWorkflow ? t("newDeal") : t("newWorkflow")}
          </Link>
        </Button>
      </div>
    </header>
  );
}
