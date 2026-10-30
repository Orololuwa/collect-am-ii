import { describe, expect, test } from "vitest";

import { action as listAction } from "./_index";
import { loader as editLoader } from "./$customerId";
import { action as newAction } from "./new";
import {
  ARCHIVE_CUSTOMER_INTENT,
  RESTORE_CUSTOMER_INTENT,
  SAVE_CUSTOMER_INTENT,
} from "~/features/customers/customers-constants";
import { createPopulatedCustomer } from "~/features/customers/customers-factories.server";
import {
  retrieveCustomerFromDatabaseById,
  saveCustomerToDatabase,
} from "~/features/customers/customers-model.server";
import type { UserAccount } from "~/generated/client";
import { auth0Handlers } from "~/test/mocks/handlers/auth0";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { setupUserWithOrgAndAddAsMember } from "~/test/server-test-utils";
import {
  createAuthenticatedRequest,
  createOrganizationMembershipTestContextProvider,
} from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { toFormData } from "~/utils/to-form-data";

setupMockServerLifecycle(...auth0Handlers);

const baseUrl = (slug: string) =>
  `http://localhost:3000/organizations/${slug}/customers`;

async function callRoute<T>({
  handler,
  pattern,
  params,
  url,
  user,
  formData,
}: {
  handler: (args: never) => Promise<T>;
  pattern: string;
  params: Record<string, string>;
  url: string;
  user: UserAccount;
  formData?: FormData;
}) {
  const request = await createAuthenticatedRequest({
    formData,
    method: formData ? "POST" : "GET",
    url,
    user,
  });
  return await handler({
    context: await createOrganizationMembershipTestContextProvider({
      params,
      pattern,
      request,
    }),
    params,
    request,
    unstable_pattern: pattern,
  } as never);
}

const validCustomer = {
  billingAddress: "12 Admiralty Way\nLekki, Lagos",
  companyName: "Okafor Studios",
  email: "Ada@Example.com",
  intent: SAVE_CUSTOMER_INTENT,
  name: "Ada Okafor",
  phone: "+234 801 234 5678",
};

describe("customers routes", () => {
  test("given: a valid new customer, should: save them with a lower-cased email", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();

    const response = (await callRoute({
      formData: toFormData(validCustomer),
      handler: newAction,
      params: { organizationSlug: organization.slug },
      pattern: "/organizations/:organizationSlug/customers/new",
      url: `${baseUrl(organization.slug)}/new`,
      user,
    })) as Response;

    expect(response.status).toEqual(302);
    const saved = await prisma.customer.findFirstOrThrow({
      where: { organizationId: organization.id },
    });
    expect(saved).toMatchObject({
      billingAddress: "12 Admiralty Way\nLekki, Lagos",
      email: "ada@example.com",
      name: "Ada Okafor",
    });
  });

  test("given: an email another customer already has, should: return a field error", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    await saveCustomerToDatabase(
      createPopulatedCustomer({
        email: "ada@example.com",
        organizationId: organization.id,
      }),
    );

    const response = await callRoute({
      formData: toFormData(validCustomer),
      handler: newAction,
      params: { organizationSlug: organization.slug },
      pattern: "/organizations/:organizationSlug/customers/new",
      url: `${baseUrl(organization.slug)}/new`,
      user,
    });

    expect(response).toMatchObject({
      data: {
        result: {
          error: { fieldErrors: { email: ["customers:form.emailTaken"] } },
        },
      },
      init: { status: 400 },
    });
  });

  test("given: another organization's customer, should: throw a 404", async () => {
    expect.assertions(1);
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    const { organization: otherOrganization } =
      await setupUserWithOrgAndAddAsMember();
    const otherCustomer = await saveCustomerToDatabase(
      createPopulatedCustomer({ organizationId: otherOrganization.id }),
    );

    try {
      await callRoute({
        handler: editLoader,
        params: {
          customerId: otherCustomer.id,
          organizationSlug: organization.slug,
        },
        pattern: "/organizations/:organizationSlug/customers/:customerId",
        url: `${baseUrl(organization.slug)}/${otherCustomer.id}`,
        user,
      });
    } catch (error) {
      expect(error).toMatchObject({ init: { status: 404 } });
    }
  });

  test("given: archive then restore, should: toggle the customer's archived date", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    const customer = await saveCustomerToDatabase(
      createPopulatedCustomer({ organizationId: organization.id }),
    );
    const send = (intent: string) =>
      callRoute({
        formData: toFormData({ customerId: customer.id, intent }),
        handler: listAction,
        params: { organizationSlug: organization.slug },
        pattern: "/organizations/:organizationSlug/customers",
        url: baseUrl(organization.slug),
        user,
      });
    const current = () =>
      retrieveCustomerFromDatabaseById({
        customerId: customer.id,
        organizationId: organization.id,
      });

    await send(ARCHIVE_CUSTOMER_INTENT);
    expect((await current())?.archivedAt).toBeInstanceOf(Date);

    await send(RESTORE_CUSTOMER_INTENT);
    expect((await current())?.archivedAt).toBeNull();
  });
});
