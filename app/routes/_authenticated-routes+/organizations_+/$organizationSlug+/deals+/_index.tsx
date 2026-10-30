import { HandshakeIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, Form, href, Link } from "react-router";

import type { Route } from "./+types/_index";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DealStatusBadge,
  DocumentStatusBadge,
} from "~/features/deals/components/deal-badges";
import { DEALS_PAGE_SIZE } from "~/features/deals/deals-constants";
import type { DealListFilter } from "~/features/deals/deals-model.server";
import {
  countDealsInDatabaseByOrganizationId,
  retrieveDealsPageFromDatabaseByOrganizationId,
} from "~/features/deals/deals-model.server";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import {
  formatMoney,
  formatRelativeTime,
} from "~/features/organizations/dashboard/dashboard-format";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { cn } from "~/lib/utils";
import { getPageTitle } from "~/utils/get-page-title.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);
  const searchParams = new URL(request.url).searchParams;
  const filter: DealListFilter =
    searchParams.get("status") === "closed" ? "closed" : "open";
  const search = searchParams.get("q")?.trim().slice(0, 100) || undefined;
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const total = await countDealsInDatabaseByOrganizationId({
    filter,
    organizationId: organization.id,
    search,
  });
  const totalPages = Math.max(1, Math.ceil(total / DEALS_PAGE_SIZE));
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    totalPages,
  );
  const deals = await retrieveDealsPageFromDatabaseByOrganizationId({
    filter,
    organizationId: organization.id,
    search,
    skip: (page - 1) * DEALS_PAGE_SIZE,
    take: DEALS_PAGE_SIZE,
  });

  return data(
    {
      breadcrumb: {
        title: i18n.t("deals:breadcrumb"),
        to: href("/organizations/:organizationSlug/deals", {
          organizationSlug: params.organizationSlug,
        }),
      },
      deals: deals.map((deal) => {
        const activeStep = deal.steps.find((step) => step.status === "active");
        // The deal's value: the latest document that lists items.
        const valueStep = deal.steps.findLast(
          (step) =>
            step.kind === "document" &&
            step.carryForward === "items" &&
            step.document,
        );
        return {
          activeStep: activeStep
            ? {
                documentStatus: activeStep.document?.status ?? null,
                kind: activeStep.kind,
                name: activeStep.name,
              }
            : null,
          currency: deal.currency,
          customer: deal.customer,
          id: deal.id,
          status: deal.status,
          title: deal.title,
          updatedAt: deal.updatedAt,
          valueMinor: valueStep?.document?.versions[0]?.totalMinor ?? null,
        };
      }),
      filter,
      page,
      pageTitle: getPageTitle(i18n.t.bind(i18n), "deals:pageTitle"),
      search: search ?? "",
      totalPages,
    },
    { headers },
  );
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function DealsRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { t, i18n } = useTranslation("deals", { keyPrefix: "list" });
  const { deals, filter, search, page, totalPages } = loaderData;
  const organizationSlug = params.organizationSlug;
  const listUrl = href("/organizations/:organizationSlug/deals", {
    organizationSlug,
  });
  const newDealUrl = href("/organizations/:organizationSlug/deals/new", {
    organizationSlug,
  });
  const urlWith = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = {
      page: undefined,
      q: search || undefined,
      status: filter === "closed" ? "closed" : undefined,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `${listUrl}?${query}` : listUrl;
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link to={newDealUrl}>
            <PlusIcon aria-hidden="true" />
            {t("newDeal")}
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label={t("filterLabel")}
          className="flex rounded-lg border bg-card p-0.5"
        >
          {(
            [
              ["open", t("open")],
              ["closed", t("closed")],
            ] as const
          ).map(([value, label]) => (
            <Link
              aria-current={value === filter ? "page" : undefined}
              className={cn(
                "flex h-9 items-center rounded-md px-3 font-medium text-sm transition-colors",
                value === filter
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={value}
              to={urlWith({
                status: value === "closed" ? "closed" : undefined,
              })}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Form
          action={listUrl}
          className="flex w-full max-w-xs items-center gap-2"
          method="GET"
          role="search"
        >
          {filter === "closed" ? (
            <input name="status" type="hidden" value="closed" />
          ) : null}
          <div className="relative w-full">
            <SearchIcon
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={t("searchLabel")}
              className="pl-9"
              defaultValue={search}
              name="q"
              placeholder={t("searchPlaceholder")}
              type="search"
            />
          </div>
        </Form>
      </div>

      {deals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <HandshakeIcon
            aria-hidden="true"
            className="size-10 text-muted-foreground"
          />
          <p className="font-medium">
            {search
              ? t("noResults", { search })
              : filter === "closed"
                ? t("noClosed")
                : t("empty")}
          </p>
          {!search && filter === "open" ? (
            <>
              <p className="max-w-sm text-muted-foreground text-sm">
                {t("emptyDescription")}
              </p>
              <Button asChild>
                <Link to={newDealUrl}>
                  <PlusIcon aria-hidden="true" />
                  {t("newDeal")}
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("columns.deal")}</TableHead>
                <TableHead>{t("columns.step")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.value")}
                </TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="pr-4 text-right">
                  {t("columns.updated")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="pl-4">
                    <Link
                      className="block hover:underline"
                      to={href(
                        "/organizations/:organizationSlug/deals/:dealId",
                        { dealId: deal.id, organizationSlug },
                      )}
                    >
                      <span className="block font-medium">{deal.title}</span>
                      <span className="block text-muted-foreground text-xs">
                        {deal.customer.companyName
                          ? `${deal.customer.name} · ${deal.customer.companyName}`
                          : deal.customer.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {deal.activeStep ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span>{deal.activeStep.name}</span>
                        {deal.activeStep.documentStatus ? (
                          <DocumentStatusBadge
                            status={deal.activeStep.documentStatus}
                          />
                        ) : deal.activeStep.kind === "payment" ? (
                          <span className="text-muted-foreground text-xs">
                            {t("paymentDue")}
                          </span>
                        ) : null}
                      </span>
                    ) : deal.status === "won" ? (
                      <span className="text-muted-foreground">
                        {t("allDone")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {deal.valueMinor === null
                      ? "—"
                      : formatMoney({
                          amountMinor: deal.valueMinor,
                          currency: deal.currency,
                          locale: i18n.language,
                        })}
                  </TableCell>
                  <TableCell>
                    <DealStatusBadge status={deal.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground text-sm">
                    {formatRelativeTime(deal.updatedAt, i18n.language)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-3 text-muted-foreground text-sm">
          <span>{t("pagination", { page, totalPages })}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild size="sm" variant="outline">
                <Link to={urlWith({ page: String(page - 1) })}>
                  {t("previous")}
                </Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild size="sm" variant="outline">
                <Link to={urlWith({ page: String(page + 1) })}>
                  {t("next")}
                </Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
