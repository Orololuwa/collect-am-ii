import { describe, expect, test } from "vitest";

import { action, loader } from "./_index";
import { resolveDocumentTemplate } from "~/features/deals/document-mapping.server";
import {
  BLANK_STARTER,
  CREATE_TEMPLATE_INTENT,
  DELETE_TEMPLATE_INTENT,
  DUPLICATE_TEMPLATE_INTENT,
  MAKE_DEFAULT_TEMPLATE_INTENT,
  RENAME_TEMPLATE_INTENT,
} from "~/features/templates/library/templates-library-constants";
import { getStarterTemplates } from "~/features/templates/shared/templates-library.server";
import type { Organization, UserAccount } from "~/generated/client";
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

const pattern = "/organizations/:organizationSlug/templates";

async function call<T>(
  handler: (args: never) => Promise<T>,
  {
    user,
    organization,
    formData,
    search = "",
  }: {
    user: UserAccount;
    organization: Organization;
    formData?: Record<string, string>;
    search?: string;
  },
) {
  const params = { organizationSlug: organization.slug };
  const request = await createAuthenticatedRequest({
    formData: formData ? toFormData(formData) : undefined,
    method: formData ? "POST" : "GET",
    url: `http://localhost:3000/organizations/${organization.slug}/templates${search}`,
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

async function create(
  setup: { user: UserAccount; organization: Organization },
  {
    name,
    starterId,
    makeDefault = false,
  }: { name: string; starterId: string; makeDefault?: boolean },
) {
  const response = (await call(action, {
    ...setup,
    formData: {
      intent: CREATE_TEMPLATE_INTENT,
      makeDefault: makeDefault ? "on" : "",
      name,
      starterId,
      type: "estimate",
    },
  })) as Response;
  const template = await prisma.template.findFirstOrThrow({
    where: { name, organizationId: setup.organization.id },
  });
  return { response, template };
}

const findById = (id: string) =>
  prisma.template.findUniqueOrThrow({ where: { id } });

describe("templates library", () => {
  test("given: a starter design, should: create the template and open it in the builder", async () => {
    const setup = await setupUserWithOrgAndAddAsMember();
    const [starter] = getStarterTemplates("estimate");

    const { response, template } = await create(setup, {
      makeDefault: true,
      name: "Studio estimate",
      starterId: starter?.id ?? "",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `/organizations/${setup.organization.slug}/templates/${template.id}?mode=edit`,
    );
    expect(template).toMatchObject({
      isDefault: true,
      sourceTemplateId: starter?.id,
      type: "estimate",
    });
  });

  test("given: a blank start, should: create the type's sections in order", async () => {
    const setup = await setupUserWithOrgAndAddAsMember();

    const { template } = await create(setup, {
      name: "Blank estimate",
      starterId: BLANK_STARTER,
    });

    const sections = template.sections as Array<{ type: string }>;
    expect(sections.map((section) => section.type)).toEqual([
      "estimate-header",
      "estimate-items",
      "estimate-footer",
    ]);
    expect(template.sourceTemplateId).toBeNull();
    expect(template.isDefault).toBe(false);
  });

  test("given: a new default, should: unset the type's previous default and make deals use it", async () => {
    const setup = await setupUserWithOrgAndAddAsMember();
    const { template: first } = await create(setup, {
      makeDefault: true,
      name: "First",
      starterId: BLANK_STARTER,
    });
    const { template: second } = await create(setup, {
      name: "Second",
      starterId: BLANK_STARTER,
    });
    await prisma.template.update({
      data: { globalStyles: { marker: "second" } },
      where: { id: second.id },
    });
    // Edited last, so it would win if deals only looked at recency.
    await prisma.template.update({
      data: { globalStyles: { marker: "first" } },
      where: { id: first.id },
    });

    await call(action, {
      ...setup,
      formData: {
        intent: MAKE_DEFAULT_TEMPLATE_INTENT,
        templateId: second.id,
      },
    });

    expect((await findById(first.id)).isDefault).toBe(false);
    expect((await findById(second.id)).isDefault).toBe(true);
    const resolved = await resolveDocumentTemplate({
      organizationId: setup.organization.id,
      templateId: null,
      type: "estimate",
    });
    expect(resolved.globalStyles).toEqual({ marker: "second" });
  });

  test("given: a template, should: rename, duplicate and delete it", async () => {
    const setup = await setupUserWithOrgAndAddAsMember();
    const { template } = await create(setup, {
      makeDefault: true,
      name: "Original",
      starterId: BLANK_STARTER,
    });

    await call(action, {
      ...setup,
      formData: {
        intent: RENAME_TEMPLATE_INTENT,
        name: "  Renamed  ",
        templateId: template.id,
      },
    });
    expect((await findById(template.id)).name).toBe("Renamed");

    await call(action, {
      ...setup,
      formData: { intent: DUPLICATE_TEMPLATE_INTENT, templateId: template.id },
    });
    const copy = await prisma.template.findFirstOrThrow({
      where: { name: "Renamed (copy)", organizationId: setup.organization.id },
    });
    // Only one template per type can be the default.
    expect(copy.isDefault).toBe(false);
    expect(copy.sections).toEqual(template.sections);

    await call(action, {
      ...setup,
      formData: { intent: DELETE_TEMPLATE_INTENT, templateId: template.id },
    });
    expect(
      await prisma.template.findUnique({ where: { id: template.id } }),
    ).toBeNull();
  });

  test("given: another organization's template, should: leave it alone", async () => {
    const owner = await setupUserWithOrgAndAddAsMember();
    const other = await setupUserWithOrgAndAddAsMember();
    const { template } = await create(owner, {
      name: "Not yours",
      starterId: BLANK_STARTER,
    });

    await call(action, {
      ...other,
      formData: {
        intent: RENAME_TEMPLATE_INTENT,
        name: "Taken",
        templateId: template.id,
      },
    });
    await call(action, {
      ...other,
      formData: {
        intent: MAKE_DEFAULT_TEMPLATE_INTENT,
        templateId: template.id,
      },
    });

    expect(await findById(template.id)).toMatchObject({
      isDefault: false,
      name: "Not yours",
    });
  });

  test("given: templates of several types, should: list, count and filter them", async () => {
    const setup = await setupUserWithOrgAndAddAsMember();
    await create(setup, { name: "Alpha estimate", starterId: BLANK_STARTER });
    await create(setup, { name: "Beta estimate", starterId: BLANK_STARTER });

    const all = (await call(loader, { ...setup })) as unknown as {
      data: {
        templateCounts: Record<string, number>;
        templates: Array<{ name: string }>;
        total: number;
      };
    };
    expect(all.data.total).toBe(2);
    expect(all.data.templateCounts).toEqual({ estimate: 2 });

    const searched = (await call(loader, {
      ...setup,
      search: "?q=beta&sort=name",
    })) as unknown as { data: { templates: Array<{ name: string }> } };
    expect(searched.data.templates.map((template) => template.name)).toEqual([
      "Beta estimate",
    ]);
  });
});
