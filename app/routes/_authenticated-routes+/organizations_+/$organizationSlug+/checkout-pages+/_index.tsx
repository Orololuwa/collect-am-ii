import { ArrowRight, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import {
  data,
  href,
  Link,
  redirect,
  useFetcher,
  useNavigate,
} from "react-router";
import { z } from "zod";

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
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { checkoutDashboardStatusLabel } from "~/features/checkout/checkout-dashboard-status";
import {
  countCheckoutPagesInDatabaseByOrganizationId,
  deleteCheckoutPageFromDatabase,
  retrieveCheckoutPagesPageFromDatabaseByOrganizationId,
} from "~/features/checkout/checkout-pages-model.server";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { getPageTitle } from "~/utils/get-page-title.server";
import { createToastHeaders } from "~/utils/toast.server";
import { validateFormData } from "~/utils/validate-form-data.server";

const PAGE_SIZE = 12;

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const url = new URL(request.url);
  const rawPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const requestedPage =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const total = await countCheckoutPagesInDatabaseByOrganizationId({
    organizationId: organization.id,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  if (page !== requestedPage) {
    const next = new URL(request.url);
    if (page <= 1) {
      next.searchParams.delete("page");
    } else {
      next.searchParams.set("page", String(page));
    }
    const qs = next.searchParams.toString();
    throw redirect(qs ? `${next.pathname}?${qs}` : next.pathname);
  }

  const checkoutPages =
    total === 0
      ? []
      : await retrieveCheckoutPagesPageFromDatabaseByOrganizationId({
          organizationId: organization.id,
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        });

  const listPath = href("/organizations/:organizationSlug/checkout-pages", {
    organizationSlug: params.organizationSlug,
  });

  return data(
    {
      breadcrumb: {
        title: "Checkout Pages",
        to: listPath,
      },
      checkoutPages,
      listPath,
      organizationSlug: params.organizationSlug,
      pageTitle: getPageTitle(i18n.t.bind(i18n), "Checkout Pages"),
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    },
    { headers },
  );
}

const deleteSchema = z.object({
  checkoutPageId: z.string(),
  intent: z.literal("delete"),
});

export async function action({ request, context }: Route.ActionArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const result = await validateFormData(request, deleteSchema);
  if (!result.success) return result.response;

  const deleted = await deleteCheckoutPageFromDatabase({
    checkoutPageId: result.data.checkoutPageId,
    organizationId: organization.id,
  });

  if (!deleted) {
    return data(
      { success: false, error: "Checkout page not found" },
      { status: 404, headers },
    );
  }

  const toastHeaders = await createToastHeaders({
    title: "Checkout page deleted",
    description: "Your checkout page has been deleted.",
  });

  return data(
    { success: true },
    {
      headers: {
        ...Object.fromEntries(headers),
        ...Object.fromEntries(toastHeaders),
      },
    },
  );
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function CheckoutPagesIndexRoute({
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const { checkoutPages, listPath, organizationSlug, pagination } = loaderData;

  const first =
    checkoutPages.length === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const last = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  const pageLink = (p: number) => (p <= 1 ? listPath : `${listPath}?page=${p}`);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Checkout Pages</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create and manage your public checkout links.
          </p>
        </div>
        <Button
          onClick={() =>
            navigate(`/organizations/${organizationSlug}/checkout-pages/new`)
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New
        </Button>
      </div>

      {checkoutPages.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          No checkout pages yet. Click “Create New” to get started.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {checkoutPages.map((page) => (
              <CheckoutPageCardComponent
                key={page.id}
                onEdit={() =>
                  navigate(
                    `/organizations/${organizationSlug}/checkout-pages/${page.id}`,
                  )
                }
                page={page}
              />
            ))}
          </div>

          {pagination.totalPages > 1 ? (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-sm">
                Showing {first}–{last} of {pagination.total}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  asChild
                  disabled={pagination.page <= 1}
                  size="sm"
                  variant="outline"
                >
                  <Link to={pageLink(pagination.page - 1)}>Previous</Link>
                </Button>
                <span className="text-muted-foreground px-1 text-sm tabular-nums">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  asChild
                  disabled={pagination.page >= pagination.totalPages}
                  size="sm"
                  variant="outline"
                >
                  <Link to={pageLink(pagination.page + 1)}>Next</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function CheckoutPageCardComponent({
  page,
  onEdit,
}: {
  page: Route.ComponentProps["loaderData"]["checkoutPages"][number];
  onEdit: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const fetcher = useFetcher<{ success?: boolean }>();
  const publicPath = `/checkout/${page.slug}`;
  const status = checkoutDashboardStatusLabel({
    expiresAt: page.expiresAt,
    isActive: page.isActive,
    paymentCount: page.paymentCount,
  });

  const busy = fetcher.state !== "idle";

  React.useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data &&
      "success" in fetcher.data &&
      fetcher.data.success
    ) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <>
      <Card className="flex min-w-0 flex-col gap-0 py-0">
        <CardHeader className="space-y-1.5 p-3 pb-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-2 text-sm font-semibold leading-tight">
              {page.name}
            </h2>
            <Badge className="shrink-0 text-[10px]" variant={status.variant}>
              {status.label}
            </Badge>
          </div>
          <p className="text-muted-foreground truncate font-mono text-[11px]">
            {page.slug}
          </p>
        </CardHeader>
        <CardContent className="text-muted-foreground flex-1 px-3 pb-2 pt-0 text-xs">
          {page.paymentCount} payment{page.paymentCount === 1 ? "" : "s"} ·{" "}
          {page.viewCount} view{page.viewCount === 1 ? "" : "s"}
        </CardContent>
        {/* Wraps instead of overflowing when the grid makes the card narrow. */}
        <CardFooter className="flex flex-wrap items-center gap-2 border-t p-2">
          <Button
            className="min-w-fit flex-1"
            onClick={onEdit}
            size="sm"
            type="button"
          >
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            asChild
            className="min-w-fit flex-1"
            size="sm"
            title="Visit the public checkout page"
            variant="outline"
          >
            <a href={publicPath} rel="noreferrer" target="_blank">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Visit</span>
            </a>
          </Button>
          <Button
            className="min-w-fit flex-1"
            onClick={async () => {
              const full =
                typeof window !== "undefined"
                  ? `${window.location.origin}${publicPath}`
                  : publicPath;
              await navigator.clipboard.writeText(full);
            }}
            size="sm"
            title="Copy link"
            type="button"
            variant="outline"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy</span>
          </Button>
          <Button
            className="ml-auto shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={() => setOpen(true)}
            size="icon-sm"
            title="Delete"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <fetcher.Form method="post">
            <input name="intent" type="hidden" value="delete" />
            <input name="checkoutPageId" type="hidden" value={page.id} />
            <AlertDialogHeader>
              <AlertDialogTitle>Delete checkout page</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete “{page.name}” and all its payments/receipts.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={busy}
                type="submit"
              >
                {busy ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </fetcher.Form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
