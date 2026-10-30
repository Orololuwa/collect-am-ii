import type { SubmissionResult } from "@conform-to/react/future";
import { UsersIcon, WorkflowIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, href, Link, useNavigation } from "react-router";

import type { Route } from "./+types/new";
import { Button } from "~/components/ui/button";
import { NewDealForm } from "~/features/deals/components/new-deal-form";
import { startDealAction } from "~/features/deals/deals-action.server";
import { retrieveNewDealOptionsFromDatabase } from "~/features/deals/deals-model.server";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { getPageTitle } from "~/utils/get-page-title.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);
  const options = await retrieveNewDealOptionsFromDatabase(organization.id);

  // Default to the currency most of the catalogue is priced in.
  const currencyCounts = new Map<string, number>();
  for (const product of options.products) {
    currencyCounts.set(
      product.currency,
      (currencyCounts.get(product.currency) ?? 0) + 1,
    );
  }
  const defaultCurrency =
    [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "NGN";

  return data(
    {
      breadcrumb: {
        title: i18n.t("deals:newBreadcrumb"),
        to: href("/organizations/:organizationSlug/deals/new", {
          organizationSlug: params.organizationSlug,
        }),
      },
      defaultCurrency,
      pageTitle: getPageTitle(i18n.t.bind(i18n), "deals:newPageTitle"),
      ...options,
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  return await startDealAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

function MissingSetup({
  icon: Icon,
  title,
  description,
  action,
  to,
}: {
  icon: typeof UsersIcon;
  title: string;
  description: string;
  action: string;
  to: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <Icon aria-hidden="true" className="size-10 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-muted-foreground text-sm">{description}</p>
      <Button asChild>
        <Link to={to}>{action}</Link>
      </Button>
    </div>
  );
}

export default function NewDealRoute({
  loaderData,
  actionData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("deals", { keyPrefix: "new" });
  const navigation = useNavigation();
  const { workflows, customers, products, defaultCurrency } = loaderData;
  const organizationSlug = params.organizationSlug;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
      </header>
      {workflows.length === 0 ? (
        <MissingSetup
          action={t("createWorkflow")}
          description={t("needWorkflowDescription")}
          icon={WorkflowIcon}
          title={t("needWorkflow")}
          to={href("/organizations/:organizationSlug/workflows/new", {
            organizationSlug,
          })}
        />
      ) : customers.length === 0 ? (
        <MissingSetup
          action={t("addCustomer")}
          description={t("needCustomerDescription")}
          icon={UsersIcon}
          title={t("needCustomer")}
          to={href("/organizations/:organizationSlug/customers/new", {
            organizationSlug,
          })}
        />
      ) : (
        <NewDealForm
          customers={customers}
          defaultCurrency={defaultCurrency}
          isSaving={navigation.state === "submitting"}
          lastResult={
            actionData && "result" in actionData
              ? (actionData.result as SubmissionResult | undefined)
              : undefined
          }
          organizationSlug={organizationSlug}
          products={products}
          workflows={workflows}
        />
      )}
    </div>
  );
}
