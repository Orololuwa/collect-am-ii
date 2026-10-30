import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, Form, href, Link, useFetcher } from "react-router";

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
import { updateCustomerStatusAction } from "~/features/customers/customers-action.server";
import {
  ARCHIVE_CUSTOMER_INTENT,
  CUSTOMERS_PAGE_SIZE,
  RESTORE_CUSTOMER_INTENT,
} from "~/features/customers/customers-constants";
import type { CustomerStatusFilter } from "~/features/customers/customers-model.server";
import {
  countCustomersInDatabaseByOrganizationId,
  retrieveCustomersPageFromDatabaseByOrganizationId,
} from "~/features/customers/customers-model.server";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { cn } from "~/lib/utils";
import { getPageTitle } from "~/utils/get-page-title.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);
  const searchParams = new URL(request.url).searchParams;
  const status: CustomerStatusFilter =
    searchParams.get("status") === "archived" ? "archived" : "active";
  const search = searchParams.get("q")?.trim().slice(0, 100) || undefined;
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const total = await countCustomersInDatabaseByOrganizationId({
    organizationId: organization.id,
    search,
    status,
  });
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE));
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    totalPages,
  );
  const customers = await retrieveCustomersPageFromDatabaseByOrganizationId({
    organizationId: organization.id,
    search,
    skip: (page - 1) * CUSTOMERS_PAGE_SIZE,
    status,
    take: CUSTOMERS_PAGE_SIZE,
  });

  return data(
    {
      breadcrumb: {
        title: i18n.t("customers:breadcrumb"),
        to: href("/organizations/:organizationSlug/customers", {
          organizationSlug: params.organizationSlug,
        }),
      },
      customers,
      page,
      pageTitle: getPageTitle(i18n.t.bind(i18n), "customers:pageTitle"),
      search: search ?? "",
      status,
      total,
      totalPages,
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  return await updateCustomerStatusAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

function CustomerStatusButton({
  customerId,
  archived,
}: {
  customerId: string;
  archived: boolean;
}) {
  const { t } = useTranslation("customers", { keyPrefix: "list" });
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="POST">
      <input name="customerId" type="hidden" value={customerId} />
      <Button
        disabled={fetcher.state !== "idle"}
        name="intent"
        size="sm"
        type="submit"
        value={archived ? RESTORE_CUSTOMER_INTENT : ARCHIVE_CUSTOMER_INTENT}
        variant="outline"
      >
        {archived ? (
          <ArchiveRestoreIcon aria-hidden="true" />
        ) : (
          <ArchiveIcon aria-hidden="true" />
        )}
        {archived ? t("restore") : t("archive")}
      </Button>
    </fetcher.Form>
  );
}

export default function CustomersRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("customers", { keyPrefix: "list" });
  const { customers, status, search, page, totalPages, total } = loaderData;
  const organizationSlug = params.organizationSlug;
  const listUrl = href("/organizations/:organizationSlug/customers", {
    organizationSlug,
  });
  const newUrl = href("/organizations/:organizationSlug/customers/new", {
    organizationSlug,
  });
  const urlWith = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = {
      page: undefined,
      q: search || undefined,
      status: status === "archived" ? "archived" : undefined,
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
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link to={newUrl}>
            <PlusIcon aria-hidden="true" />
            {t("newCustomer")}
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label={t("statusLabel")}
          className="flex rounded-lg border bg-card p-0.5"
        >
          {(
            [
              ["active", t("active")],
              ["archived", t("archived")],
            ] as const
          ).map(([value, label]) => (
            <Link
              aria-current={value === status ? "page" : undefined}
              className={cn(
                "flex h-9 items-center rounded-md px-3 font-medium text-sm transition-colors",
                value === status
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={value}
              to={urlWith({
                status: value === "archived" ? "archived" : undefined,
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
          {status === "archived" ? (
            <input name="status" type="hidden" value="archived" />
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

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <UsersIcon
            aria-hidden="true"
            className="size-10 text-muted-foreground"
          />
          <p className="font-medium">
            {search
              ? t("noResults", { search })
              : status === "archived"
                ? t("noArchived")
                : t("empty")}
          </p>
          {!search && status === "active" ? (
            <>
              <p className="max-w-sm text-muted-foreground text-sm">
                {t("emptyDescription")}
              </p>
              <Button asChild>
                <Link to={newUrl}>
                  <PlusIcon aria-hidden="true" />
                  {t("newCustomer")}
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("columns.name")}</TableHead>
                <TableHead>{t("columns.email")}</TableHead>
                <TableHead>{t("columns.phone")}</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="pl-4">
                    <Link
                      className="block hover:underline"
                      to={href(
                        "/organizations/:organizationSlug/customers/:customerId",
                        { customerId: customer.id, organizationSlug },
                      )}
                    >
                      <span className="block font-medium">{customer.name}</span>
                      {customer.companyName ? (
                        <span className="block text-muted-foreground text-xs">
                          {customer.companyName}
                        </span>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.phone || "—"}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end">
                      <CustomerStatusButton
                        archived={status === "archived"}
                        customerId={customer.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label={t("paginationLabel")}
          className="flex items-center justify-between gap-3 text-muted-foreground text-sm"
        >
          <span>{t("pageOf", { page, total, totalPages })}</span>
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
