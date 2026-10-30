import type { SubmissionResult } from "@conform-to/react/future";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, href, useFetcher, useNavigation } from "react-router";

import type { Route } from "./+types/$productId";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { ProductForm } from "~/features/products/components/product-form";
import {
  saveProductAction,
  updateProductStatusAction,
} from "~/features/products/products-action.server";
import {
  ARCHIVE_PRODUCT_INTENT,
  RESTORE_PRODUCT_INTENT,
  SAVE_PRODUCT_INTENT,
} from "~/features/products/products-constants";
import {
  basisPointsToPercent,
  minorUnitsToMajorString,
} from "~/features/products/products-format";
import { retrieveProductFromDatabaseById } from "~/features/products/products-model.server";
import { getPageTitle } from "~/utils/get-page-title.server";
import { notFound } from "~/utils/http-responses.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const product = await retrieveProductFromDatabaseById({
    organizationId: organization.id,
    productId: params.productId,
  });
  if (!product) {
    throw notFound();
  }

  return data(
    {
      breadcrumb: {
        title: product.name,
        to: href("/organizations/:organizationSlug/products/:productId", {
          organizationSlug: params.organizationSlug,
          productId: product.id,
        }),
      },
      pageTitle: getPageTitle(i18n.t.bind(i18n), "products:editPageTitle"),
      product,
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  // The form posts multipart data; peek at the intent on a copy.
  const intent = (await args.request.clone().formData()).get("intent");
  if (intent === SAVE_PRODUCT_INTENT) {
    return await saveProductAction(args, args.params.productId);
  }
  return await updateProductStatusAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function EditProductRoute({
  loaderData,
  actionData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("products");
  const navigation = useNavigation();
  const statusFetcher = useFetcher();
  const { product } = loaderData;
  const isArchived = product.archivedAt !== null;
  const isSaving =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === SAVE_PRODUCT_INTENT;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">
              {product.name}
            </h1>
            {isArchived ? (
              <Badge variant="secondary">{t("list.archivedBadge")}</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground">{t("editDescription")}</p>
        </div>
        <statusFetcher.Form method="POST">
          <input name="productId" type="hidden" value={product.id} />
          <Button
            disabled={statusFetcher.state !== "idle"}
            name="intent"
            type="submit"
            value={isArchived ? RESTORE_PRODUCT_INTENT : ARCHIVE_PRODUCT_INTENT}
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
      <ProductForm
        defaults={{
          currency: product.currency,
          description: product.description,
          imageUrl: product.imageUrl,
          name: product.name,
          sku: product.sku ?? "",
          taxRate: basisPointsToPercent(product.taxRateBps),
          unit: product.unit,
          unitPrice: minorUnitsToMajorString(
            product.unitPriceMinor,
            product.currency,
          ),
        }}
        isSaving={isSaving}
        key={product.updatedAt.toString()}
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
