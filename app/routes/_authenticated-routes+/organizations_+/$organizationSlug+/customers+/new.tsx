import { useTranslation } from "react-i18next";
import { data, href, useNavigation } from "react-router";

import type { Route } from "./+types/new";
import { CustomerForm } from "~/features/customers/components/customer-form";
import { saveCustomerAction } from "~/features/customers/customers-action.server";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { getPageTitle } from "~/utils/get-page-title.server";

export function loader({ params, context }: Route.LoaderArgs) {
  const { headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  return data(
    {
      breadcrumb: {
        title: i18n.t("customers:newBreadcrumb"),
        to: href("/organizations/:organizationSlug/customers/new", {
          organizationSlug: params.organizationSlug,
        }),
      },
      pageTitle: getPageTitle(i18n.t.bind(i18n), "customers:newPageTitle"),
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  return await saveCustomerAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function NewCustomerRoute({
  actionData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("customers");
  const navigation = useNavigation();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          {t("newTitle")}
        </h1>
        <p className="text-muted-foreground">{t("newDescription")}</p>
      </header>
      <CustomerForm
        defaults={{
          billingAddress: "",
          companyName: "",
          email: "",
          name: "",
          notes: "",
          phone: "",
          shippingAddress: "",
        }}
        isSaving={navigation.state === "submitting"}
        lastResult={actionData?.result}
        organizationSlug={params.organizationSlug}
      />
    </div>
  );
}
