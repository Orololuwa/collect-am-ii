import { describe, expect, test } from "vitest";

import { action as listAction } from "./_index";
import { action as editAction, loader as editLoader } from "./$productId";
import { action as newAction } from "./new";
import {
  ARCHIVE_PRODUCT_INTENT,
  DELETE_PRODUCT_INTENT,
  SAVE_PRODUCT_INTENT,
} from "~/features/products/products-constants";
import { createPopulatedProduct } from "~/features/products/products-factories.server";
import {
  retrieveProductFromDatabaseById,
  saveProductToDatabase,
} from "~/features/products/products-model.server";
import type { UserAccount } from "~/generated/client";
import { OrganizationMembershipRole } from "~/generated/client";
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
  `http://localhost:3000/organizations/${slug}/products`;

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

const validProduct = {
  currency: "NGN",
  description: "Two-hour strategy session",
  intent: SAVE_PRODUCT_INTENT,
  name: "Strategy workshop",
  sku: "WS-01",
  taxRate: "7.5",
  unit: "session",
  unitPrice: "150000.50",
};

describe("products routes", () => {
  test("given: a valid new product, should: store the price in minor units and the tax in basis points", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();

    const response = (await callRoute({
      formData: toFormData(validProduct),
      handler: newAction,
      params: { organizationSlug: organization.slug },
      pattern: "/organizations/:organizationSlug/products/new",
      url: `${baseUrl(organization.slug)}/new`,
      user,
    })) as Response;

    expect(response.status).toEqual(302);
    expect(response.headers.get("Location")).toEqual(
      `/organizations/${organization.slug}/products`,
    );
    const saved = await prisma.product.findFirstOrThrow({
      where: { organizationId: organization.id },
    });
    expect(saved).toMatchObject({
      currency: "NGN",
      name: "Strategy workshop",
      sku: "WS-01",
      taxRateBps: 750,
      unit: "session",
      unitPriceMinor: 15_000_050,
    });
  });

  test("given: a SKU another product already uses, should: return a field error", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    await saveProductToDatabase(
      createPopulatedProduct({ organizationId: organization.id, sku: "WS-01" }),
    );

    const response = await callRoute({
      formData: toFormData(validProduct),
      handler: newAction,
      params: { organizationSlug: organization.slug },
      pattern: "/organizations/:organizationSlug/products/new",
      url: `${baseUrl(organization.slug)}/new`,
      user,
    });

    expect(response).toMatchObject({
      data: {
        result: { error: { fieldErrors: { sku: ["products:form.skuTaken"] } } },
      },
      init: { status: 400 },
    });
  });

  test("given: an invalid price, should: return a field error", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();

    const response = await callRoute({
      formData: toFormData({ ...validProduct, unitPrice: "12.345" }),
      handler: newAction,
      params: { organizationSlug: organization.slug },
      pattern: "/organizations/:organizationSlug/products/new",
      url: `${baseUrl(organization.slug)}/new`,
      user,
    });

    expect(response).toMatchObject({ init: { status: 400 } });
  });

  test("given: another organization's product, should: throw a 404", async () => {
    expect.assertions(1);
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    const { organization: otherOrganization } =
      await setupUserWithOrgAndAddAsMember();
    const otherProduct = await saveProductToDatabase(
      createPopulatedProduct({ organizationId: otherOrganization.id }),
    );

    try {
      await callRoute({
        handler: editLoader,
        params: {
          organizationSlug: organization.slug,
          productId: otherProduct.id,
        },
        pattern: "/organizations/:organizationSlug/products/:productId",
        url: `${baseUrl(organization.slug)}/${otherProduct.id}`,
        user,
      });
    } catch (error) {
      expect(error).toMatchObject({ init: { status: 404 } });
    }
  });

  test("given: an edit, should: update the product", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember();
    const product = await saveProductToDatabase(
      createPopulatedProduct({ organizationId: organization.id, sku: null }),
    );

    const response = (await callRoute({
      formData: toFormData({ ...validProduct, name: "Renamed", sku: "" }),
      handler: editAction,
      params: { organizationSlug: organization.slug, productId: product.id },
      pattern: "/organizations/:organizationSlug/products/:productId",
      url: `${baseUrl(organization.slug)}/${product.id}`,
      user,
    })) as Response;

    expect(response.status).toEqual(302);
    const updated = await retrieveProductFromDatabaseById({
      organizationId: organization.id,
      productId: product.id,
    });
    expect(updated).toMatchObject({ name: "Renamed", sku: null });
  });

  test("given: a member deleting an archived product, should: return a 403", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember({
      role: OrganizationMembershipRole.member,
    });
    const product = await saveProductToDatabase(
      createPopulatedProduct({
        archivedAt: new Date(),
        organizationId: organization.id,
      }),
    );

    const response = await callRoute({
      formData: toFormData({
        intent: DELETE_PRODUCT_INTENT,
        productId: product.id,
      }),
      handler: listAction,
      params: { organizationSlug: organization.slug },
      pattern: "/organizations/:organizationSlug/products",
      url: baseUrl(organization.slug),
      user,
    });

    expect(response).toMatchObject({ init: { status: 403 } });
    expect(
      await retrieveProductFromDatabaseById({
        organizationId: organization.id,
        productId: product.id,
      }),
    ).not.toBeNull();
  });

  test("given: an owner archiving then deleting a product, should: remove it", async () => {
    const { user, organization } = await setupUserWithOrgAndAddAsMember({
      role: OrganizationMembershipRole.owner,
    });
    const product = await saveProductToDatabase(
      createPopulatedProduct({ organizationId: organization.id }),
    );
    const send = (intent: string) =>
      callRoute({
        formData: toFormData({ intent, productId: product.id }),
        handler: listAction,
        params: { organizationSlug: organization.slug },
        pattern: "/organizations/:organizationSlug/products",
        url: baseUrl(organization.slug),
        user,
      });

    // An active product can't be deleted yet.
    expect(await send(DELETE_PRODUCT_INTENT)).toMatchObject({
      init: { status: 403 },
    });
    await send(ARCHIVE_PRODUCT_INTENT);
    await send(DELETE_PRODUCT_INTENT);

    expect(
      await retrieveProductFromDatabaseById({
        organizationId: organization.id,
        productId: product.id,
      }),
    ).toBeNull();
  });
});
