import type { SubmissionResult } from "@conform-to/react/future";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, href, useFetcher, useNavigation } from "react-router";

import type { Route } from "./+types/$customerId";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { CustomerForm } from "~/features/customers/components/customer-form";
import {
  saveCustomerAction,
  updateCustomerStatusAction,
} from "~/features/customers/customers-action.server";
import {
  ARCHIVE_CUSTOMER_INTENT,
  RESTORE_CUSTOMER_INTENT,
  SAVE_CUSTOMER_INTENT,
} from "~/features/customers/customers-constants";
import { retrieveCustomerFromDatabaseById } from "~/features/customers/customers-model.server";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { getPageTitle } from "~/utils/get-page-title.server";
import { notFound } from "~/utils/http-responses.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const customer = await retrieveCustomerFromDatabaseById({
    customerId: params.customerId,
    organizationId: organization.id,
  });
  if (!customer) {
    throw notFound();
  }

  return data(
    {
      breadcrumb: {
        title: customer.name,
        to: href("/organizations/:organizationSlug/customers/:customerId", {
          customerId: customer.id,
          organizationSlug: params.organizationSlug,
        }),
      },
      customer,
      pageTitle: getPageTitle(i18n.t.bind(i18n), "customers:editPageTitle"),
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  const intent = (await args.request.clone().formData()).get("intent");
  if (intent === SAVE_CUSTOMER_INTENT) {
    return await saveCustomerAction(args, args.params.customerId);
  }
  return await updateCustomerStatusAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function EditCustomerRoute({
  loaderData,
  actionData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("customers");
  const navigation = useNavigation();
  const statusFetcher = useFetcher();
  const { customer } = loaderData;
  const isArchived = customer.archivedAt !== null;
  const isSaving =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === SAVE_CUSTOMER_INTENT;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">
              {customer.name}
            </h1>
            {isArchived ? (
              <Badge variant="secondary">{t("list.archivedBadge")}</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
        <statusFetcher.Form method="POST">
          <input name="customerId" type="hidden" value={customer.id} />
          <Button
            disabled={statusFetcher.state !== "idle"}
            name="intent"
            type="submit"
            value={
              isArchived ? RESTORE_CUSTOMER_INTENT : ARCHIVE_CUSTOMER_INTENT
            }
            variant="outline"
          >
            {isArchived ? (
              <ArchiveRestoreIcon aria-hidden="true" />
            ) : (
              <ArchiveIcon aria-hidden="true" />
            )}
            {isArchived ? t("list.restore") : t("list.archive")}
          </Button>
        </statusFetcher.Form>
      </header>
      <CustomerForm
        defaults={{
          billingAddress: customer.billingAddress,
          companyName: customer.companyName,
          email: customer.email,
          name: customer.name,
          notes: customer.notes,
          phone: customer.phone,
          shippingAddress: customer.shippingAddress,
        }}
        isSaving={isSaving}
        key={customer.updatedAt.toString()}
        lastResult={
          actionData && "result" in actionData
            ? (actionData.result as SubmissionResult | undefined)
            : undefined
        }
        organizationSlug={params.organizationSlug}
      />
    </div>
  );
}
