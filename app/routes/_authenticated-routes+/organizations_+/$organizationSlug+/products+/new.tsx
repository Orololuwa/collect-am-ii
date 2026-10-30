import { useTranslation } from "react-i18next";
import { data, href, useNavigation } from "react-router";

import type { Route } from "./+types/new";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { ProductForm } from "~/features/products/components/product-form";
import { saveProductAction } from "~/features/products/products-action.server";
import { retrieveLatestProductCurrencyFromDatabase } from "~/features/products/products-model.server";
import { getPageTitle } from "~/utils/get-page-title.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  // Default to the currency the organization already sells in, if any.
  const latestCurrency = await retrieveLatestProductCurrencyFromDatabase(
    organization.id,
  );

  return data(
    {
      breadcrumb: {
        title: i18n.t("products:newBreadcrumb"),
        to: href("/organizations/:organizationSlug/products/new", {
          organizationSlug: params.organizationSlug,
        }),
      },
      defaultCurrency: latestCurrency ?? "NGN",
      pageTitle: getPageTitle(i18n.t.bind(i18n), "products:newPageTitle"),
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  return await saveProductAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function NewProductRoute({
  loaderData,
  actionData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("products");
  const navigation = useNavigation();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          {t("newTitle")}
        </h1>
        <p className="text-muted-foreground">{t("newDescription")}</p>
      </header>
      <ProductForm
        defaults={{
          currency: loaderData.defaultCurrency,
          description: "",
          imageUrl: "",
          name: "",
          sku: "",
          taxRate: "0",
          unit: "item",
          unitPrice: "",
        }}
        isSaving={navigation.state === "submitting"}
        lastResult={actionData?.result}
        organizationSlug={params.organizationSlug}
      />
    </div>
  );
}
