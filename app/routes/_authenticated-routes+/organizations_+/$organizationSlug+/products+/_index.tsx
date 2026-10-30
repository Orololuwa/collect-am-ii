import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, Form, href, Link, useFetcher } from "react-router";

import type { Route } from "./+types/_index";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
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
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { formatMoney } from "~/features/organizations/dashboard/dashboard-format";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { updateProductStatusAction } from "~/features/products/products-action.server";
import {
  ARCHIVE_PRODUCT_INTENT,
  DELETE_PRODUCT_INTENT,
  PRODUCTS_PAGE_SIZE,
  RESTORE_PRODUCT_INTENT,
} from "~/features/products/products-constants";
import { basisPointsToPercent } from "~/features/products/products-format";
import type { ProductStatusFilter } from "~/features/products/products-model.server";
import {
  countProductsInDatabaseByOrganizationId,
  retrieveProductsPageFromDatabaseByOrganizationId,
} from "~/features/products/products-model.server";
import { OrganizationMembershipRole } from "~/generated/client";
import { cn } from "~/lib/utils";
import { getPageTitle } from "~/utils/get-page-title.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { organization, role, headers } = context.get(
    organizationMembershipContext,
  );
  const i18n = getInstance(context);
  const searchParams = new URL(request.url).searchParams;
  const status: ProductStatusFilter =
    searchParams.get("status") === "archived" ? "archived" : "active";
  const search = searchParams.get("q")?.trim().slice(0, 100) || undefined;
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const total = await countProductsInDatabaseByOrganizationId({
    organizationId: organization.id,
    search,
    status,
  });
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    totalPages,
  );
  const products = await retrieveProductsPageFromDatabaseByOrganizationId({
    organizationId: organization.id,
    search,
    skip: (page - 1) * PRODUCTS_PAGE_SIZE,
    status,
    take: PRODUCTS_PAGE_SIZE,
  });

  return data(
    {
      breadcrumb: {
        title: i18n.t("products:breadcrumb"),
        to: href("/organizations/:organizationSlug/products", {
          organizationSlug: params.organizationSlug,
        }),
      },
      canDelete: role !== OrganizationMembershipRole.member,
      page,
      pageTitle: getPageTitle(i18n.t.bind(i18n), "products:pageTitle"),
      products,
      search: search ?? "",
      status,
      total,
      totalPages,
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  return await updateProductStatusAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

function ProductStatusButton({
  productId,
  intent,
  label,
  icon: Icon,
}: {
  productId: string;
  intent: typeof ARCHIVE_PRODUCT_INTENT | typeof RESTORE_PRODUCT_INTENT;
  label: string;
  icon: typeof ArchiveIcon;
}) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="POST">
      <input name="productId" type="hidden" value={productId} />
      <Button
        disabled={fetcher.state !== "idle"}
        name="intent"
        size="sm"
        type="submit"
        value={intent}
        variant="outline"
      >
        <Icon aria-hidden="true" />
        {label}
      </Button>
    </fetcher.Form>
  );
}

function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const { t } = useTranslation("products", { keyPrefix: "list" });
  const fetcher = useFetcher();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label={t("deleteLabel", { name: productName })}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          size="icon-sm"
          variant="ghost"
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("deleteTitle", { name: productName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              fetcher.submit(
                { intent: DELETE_PRODUCT_INTENT, productId },
                { method: "POST" },
              )
            }
          >
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ProductsRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { t, i18n } = useTranslation("products", { keyPrefix: "list" });
  const { products, status, search, page, totalPages, total, canDelete } =
    loaderData;
  const organizationSlug = params.organizationSlug;
  const listUrl = href("/organizations/:organizationSlug/products", {
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
          <Link
            to={href("/organizations/:organizationSlug/products/new", {
              organizationSlug,
            })}
          >
            <PlusIcon aria-hidden="true" />
            {t("newProduct")}
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
                page: undefined,
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

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <PackageIcon
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
                <Link
                  to={href("/organizations/:organizationSlug/products/new", {
                    organizationSlug,
                  })}
                >
                  <PlusIcon aria-hidden="true" />
                  {t("newProduct")}
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
                <TableHead className="pl-4">{t("columns.product")}</TableHead>
                <TableHead>{t("columns.sku")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.price")}
                </TableHead>
                <TableHead className="text-right">{t("columns.tax")}</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="pl-4">
                    <Link
                      className="flex items-center gap-3 hover:underline"
                      to={href(
                        "/organizations/:organizationSlug/products/:productId",
                        { organizationSlug, productId: product.id },
                      )}
                    >
                      {product.imageUrl ? (
                        <img
                          alt=""
                          className="size-10 shrink-0 rounded-md border object-cover"
                          src={product.imageUrl}
                        />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                          <PackageIcon
                            aria-hidden="true"
                            className="size-4 text-muted-foreground"
                          />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {product.name}
                        </span>
                        {product.description ? (
                          <span className="block max-w-xs truncate text-muted-foreground text-xs">
                            {product.description}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.sku ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t("price", {
                      price: formatMoney({
                        amountMinor: product.unitPriceMinor,
                        currency: product.currency,
                        locale: i18n.language,
                      }),
                      unit: product.unit,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {product.taxRateBps > 0
                      ? `${basisPointsToPercent(product.taxRateBps)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-2">
                      {status === "active" ? (
                        <ProductStatusButton
                          icon={ArchiveIcon}
                          intent={ARCHIVE_PRODUCT_INTENT}
                          label={t("archive")}
                          productId={product.id}
                        />
                      ) : (
                        <>
                          <ProductStatusButton
                            icon={ArchiveRestoreIcon}
                            intent={RESTORE_PRODUCT_INTENT}
                            label={t("restore")}
                            productId={product.id}
                          />
                          {canDelete ? (
                            <DeleteProductButton
                              productId={product.id}
                              productName={product.name}
                            />
                          ) : null}
                        </>
                      )}
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
