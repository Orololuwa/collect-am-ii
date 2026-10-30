import { report } from "@conform-to/react/future";
import { coerceFormValue } from "@conform-to/zod/v4/future";
import { createId } from "@paralleldrive/cuid2";
import type { RouterContextProvider } from "react-router";
import { data, href } from "react-router";

import {
  ARCHIVE_PRODUCT_INTENT,
  DELETE_PRODUCT_INTENT,
  PRODUCT_IMAGE_MAX_SIZE,
  RESTORE_PRODUCT_INTENT,
} from "./products-constants";
import {
  productFormToFields,
  replaceProductImage,
} from "./products-helpers.server";
import {
  deleteProductFromDatabaseById,
  retrieveProductBySkuFromDatabase,
  retrieveProductFromDatabaseById,
  saveProductToDatabase,
  updateProductInDatabaseById,
} from "./products-model.server";
import { productIdFormSchema, saveProductFormSchema } from "./products-schemas";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { OrganizationMembershipRole } from "~/generated/client";
import { combineHeaders } from "~/utils/combine-headers.server";
import { badRequest, forbidden, notFound } from "~/utils/http-responses.server";
import { removeImageFromStorage } from "~/utils/storage.server";
import { createToastHeaders, redirectWithToast } from "~/utils/toast.server";
import { validateFormData } from "~/utils/validate-form-data.server";

type ActionArgs = {
  request: Request;
  context: Readonly<RouterContextProvider>;
  params: { organizationSlug: string };
};

/**
 * Creates a product, or updates `productId` when given, then returns to the
 * product list.
 */
export async function saveProductAction(
  { request, context, params }: ActionArgs,
  productId?: string,
) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const result = await validateFormData(
    request,
    coerceFormValue(saveProductFormSchema),
    { maxFileSize: PRODUCT_IMAGE_MAX_SIZE },
  );
  if (!result.success) {
    return result.response;
  }

  const existing = productId
    ? await retrieveProductFromDatabaseById({
        organizationId: organization.id,
        productId,
      })
    : null;
  if (productId && !existing) {
    throw notFound();
  }

  const fields = productFormToFields(result.data);
  if (fields.sku) {
    const sameSku = await retrieveProductBySkuFromDatabase({
      organizationId: organization.id,
      sku: fields.sku,
    });
    if (sameSku && sameSku.id !== productId) {
      return badRequest(
        {
          result: report(result.submission, {
            error: {
              fieldErrors: { sku: ["products:form.skuTaken"] },
              formErrors: [],
            },
          }),
        },
        { headers },
      );
    }
  }

  const id = existing?.id ?? createId();
  const imageUrl = await replaceProductImage({
    currentImageUrl: existing?.imageUrl ?? "",
    image: result.data.image,
    productId: id,
    removeImage: result.data.removeImage,
  });

  if (existing) {
    await updateProductInDatabaseById({
      data: { ...fields, imageUrl },
      organizationId: organization.id,
      productId: existing.id,
    });
  } else {
    await saveProductToDatabase({
      ...fields,
      id,
      imageUrl,
      organizationId: organization.id,
    });
  }

  return redirectWithToast(
    href("/organizations/:organizationSlug/products", {
      organizationSlug: params.organizationSlug,
    }),
    {
      title: existing
        ? i18n.t("products:toasts.updated", { name: fields.name })
        : i18n.t("products:toasts.created", { name: fields.name }),
      type: "success",
    },
    { headers },
  );
}

/**
 * Archives, restores or deletes a product. Deleting is limited to owners and
 * admins, and to archived products, so nothing in use disappears by accident.
 */
export async function updateProductStatusAction({
  request,
  context,
}: ActionArgs) {
  const { organization, role, headers } = context.get(
    organizationMembershipContext,
  );
  const i18n = getInstance(context);

  const result = await validateFormData(request, productIdFormSchema);
  if (!result.success) {
    return result.response;
  }

  const { intent, productId } = result.data;
  const product = await retrieveProductFromDatabaseById({
    organizationId: organization.id,
    productId,
  });
  if (!product) {
    return notFound({}, { headers });
  }

  switch (intent) {
    case ARCHIVE_PRODUCT_INTENT: {
      await updateProductInDatabaseById({
        data: { archivedAt: new Date() },
        organizationId: organization.id,
        productId,
      });
      return data(
        {},
        {
          headers: combineHeaders(
            headers,
            await createToastHeaders({
              title: i18n.t("products:toasts.archived", { name: product.name }),
              type: "success",
            }),
          ),
        },
      );
    }
    case RESTORE_PRODUCT_INTENT: {
      await updateProductInDatabaseById({
        data: { archivedAt: null },
        organizationId: organization.id,
        productId,
      });
      return data(
        {},
        {
          headers: combineHeaders(
            headers,
            await createToastHeaders({
              title: i18n.t("products:toasts.restored", { name: product.name }),
              type: "success",
            }),
          ),
        },
      );
    }
    case DELETE_PRODUCT_INTENT: {
      if (role === OrganizationMembershipRole.member || !product.archivedAt) {
        return forbidden({}, { headers });
      }
      await deleteProductFromDatabaseById({
        organizationId: organization.id,
        productId,
      });
      if (product.imageUrl) {
        await removeImageFromStorage(product.imageUrl);
      }
      return data(
        {},
        {
          headers: combineHeaders(
            headers,
            await createToastHeaders({
              title: i18n.t("products:toasts.deleted", { name: product.name }),
              type: "success",
            }),
          ),
        },
      );
    }
  }
}
