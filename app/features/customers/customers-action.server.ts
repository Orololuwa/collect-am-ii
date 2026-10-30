import { report } from "@conform-to/react/future";
import { coerceFormValue } from "@conform-to/zod/v4/future";
import type { RouterContextProvider } from "react-router";
import { data, href } from "react-router";

import {
  ARCHIVE_CUSTOMER_INTENT,
  RESTORE_CUSTOMER_INTENT,
} from "./customers-constants";
import {
  retrieveCustomerByEmailFromDatabase,
  retrieveCustomerFromDatabaseById,
  saveCustomerToDatabase,
  updateCustomerInDatabaseById,
} from "./customers-model.server";
import {
  customerIdFormSchema,
  saveCustomerFormSchema,
} from "./customers-schemas";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { combineHeaders } from "~/utils/combine-headers.server";
import { badRequest, notFound } from "~/utils/http-responses.server";
import { createToastHeaders, redirectWithToast } from "~/utils/toast.server";
import { validateFormData } from "~/utils/validate-form-data.server";

type ActionArgs = {
  request: Request;
  context: Readonly<RouterContextProvider>;
  params: { organizationSlug: string };
};

/**
 * Creates a customer, or updates `customerId` when given, then returns to the
 * customer list.
 */
export async function saveCustomerAction(
  { request, context, params }: ActionArgs,
  customerId?: string,
) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const result = await validateFormData(
    request,
    coerceFormValue(saveCustomerFormSchema),
  );
  if (!result.success) {
    return result.response;
  }

  const existing = customerId
    ? await retrieveCustomerFromDatabaseById({
        customerId,
        organizationId: organization.id,
      })
    : null;
  if (customerId && !existing) {
    throw notFound();
  }

  const sameEmail = await retrieveCustomerByEmailFromDatabase({
    email: result.data.email,
    organizationId: organization.id,
  });
  if (sameEmail && sameEmail.id !== customerId) {
    return badRequest(
      {
        result: report(result.submission, {
          error: {
            fieldErrors: { email: ["customers:form.emailTaken"] },
            formErrors: [],
          },
        }),
      },
      { headers },
    );
  }

  const { intent: _intent, ...fields } = result.data;
  if (existing) {
    await updateCustomerInDatabaseById({
      customerId: existing.id,
      data: fields,
      organizationId: organization.id,
    });
  } else {
    await saveCustomerToDatabase({
      ...fields,
      organizationId: organization.id,
    });
  }

  return redirectWithToast(
    href("/organizations/:organizationSlug/customers", {
      organizationSlug: params.organizationSlug,
    }),
    {
      title: existing
        ? i18n.t("customers:toasts.updated", { name: fields.name })
        : i18n.t("customers:toasts.created", { name: fields.name }),
      type: "success",
    },
    { headers },
  );
}

/**
 * Archives or restores a customer. Customers aren't deleted, because deals
 * and documents refer to them.
 */
export async function updateCustomerStatusAction({
  request,
  context,
}: ActionArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const result = await validateFormData(request, customerIdFormSchema);
  if (!result.success) {
    return result.response;
  }

  const { intent, customerId } = result.data;
  const customer = await updateCustomerInDatabaseById({
    customerId,
    data: {
      archivedAt: intent === ARCHIVE_CUSTOMER_INTENT ? new Date() : null,
    },
    organizationId: organization.id,
  });
  if (!customer) {
    return notFound({}, { headers });
  }

  return data(
    {},
    {
      headers: combineHeaders(
        headers,
        await createToastHeaders({
          title:
            intent === RESTORE_CUSTOMER_INTENT
              ? i18n.t("customers:toasts.restored", { name: customer.name })
              : i18n.t("customers:toasts.archived", { name: customer.name }),
          type: "success",
        }),
      ),
    },
  );
}
