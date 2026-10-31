import type { RouterContextProvider } from "react-router";
import { data, href } from "react-router";
import { z } from "zod";

import { isListedTemplateType } from "../shared/template-types";
import {
  createTemplateFromStarterInDatabase,
  renameTemplateInDatabase,
  setDefaultTemplateInDatabase,
} from "../shared/templates-library.server";
import {
  createTemplateInDatabase,
  deleteTemplateFromDatabase,
  retrieveTemplateFromDatabaseById,
} from "../shared/templates-model.server";
import type { TemplateType } from "../shared/types";
import {
  BLANK_STARTER,
  CREATE_TEMPLATE_INTENT,
  DELETE_TEMPLATE_INTENT,
  DUPLICATE_TEMPLATE_INTENT,
  MAKE_DEFAULT_TEMPLATE_INTENT,
  RENAME_TEMPLATE_INTENT,
} from "./templates-library-constants";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { combineHeaders } from "~/utils/combine-headers.server";
import { badRequest, notFound } from "~/utils/http-responses.server";
import { createToastHeaders, redirectWithToast } from "~/utils/toast.server";
import { validateFormData } from "~/utils/validate-form-data.server";

z.config({ jitless: true });

const name = z.string().trim().min(1).max(120);
const templateId = z.string().min(1);

const schema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal(CREATE_TEMPLATE_INTENT),
    makeDefault: z.string().optional(),
    name,
    starterId: z.string().min(1),
    type: z.custom<TemplateType>(
      (value) => typeof value === "string" && isListedTemplateType(value),
    ),
  }),
  z.object({ intent: z.literal(DUPLICATE_TEMPLATE_INTENT), templateId }),
  z.object({ intent: z.literal(RENAME_TEMPLATE_INTENT), name, templateId }),
  z.object({ intent: z.literal(MAKE_DEFAULT_TEMPLATE_INTENT), templateId }),
  z.object({ intent: z.literal(DELETE_TEMPLATE_INTENT), templateId }),
]);

/** Creates, duplicates, renames, deletes or picks the default template. */
export async function templatesLibraryAction({
  request,
  context,
  params,
}: {
  request: Request;
  context: Readonly<RouterContextProvider>;
  params: { organizationSlug: string };
}) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const result = await validateFormData(request, schema);
  if (!result.success) {
    return result.response;
  }
  const body = result.data;
  const toast = async (title: string) =>
    combineHeaders(
      headers,
      await createToastHeaders({ title, type: "success" }),
    );

  if (body.intent === CREATE_TEMPLATE_INTENT) {
    const created = await createTemplateFromStarterInDatabase({
      makeDefault: body.makeDefault === "on",
      name: body.name,
      organizationId: organization.id,
      starterId: body.starterId === BLANK_STARTER ? null : body.starterId,
      type: body.type,
    });
    return redirectWithToast(
      `${href("/organizations/:organizationSlug/templates/:templateId", {
        organizationSlug: params.organizationSlug,
        templateId: created.id,
      })}?mode=edit`,
      { title: `Created ${created.name}`, type: "success" },
      { headers },
    );
  }

  if (body.intent === DUPLICATE_TEMPLATE_INTENT) {
    const source = await retrieveTemplateFromDatabaseById({
      organizationId: organization.id,
      templateId: body.templateId,
    });
    if (!source) {
      return notFound({ error: "Template not found" }, { headers });
    }
    await createTemplateInDatabase({
      colorPalette: source.colorPalette,
      globalStyles: source.globalStyles,
      name: `${source.name} (copy)`,
      organizationId: organization.id,
      sections: source.sections,
      sourceTemplateId: source.sourceTemplateId,
      type: source.type,
    });
    return data({ ok: true }, { headers: await toast("Template duplicated") });
  }

  if (body.intent === RENAME_TEMPLATE_INTENT) {
    const renamed = await renameTemplateInDatabase({
      name: body.name,
      organizationId: organization.id,
      templateId: body.templateId,
    });
    if (!renamed) {
      return notFound({ error: "Template not found" }, { headers });
    }
    return data({ ok: true }, { headers: await toast("Template renamed") });
  }

  if (body.intent === MAKE_DEFAULT_TEMPLATE_INTENT) {
    const updated = await setDefaultTemplateInDatabase({
      organizationId: organization.id,
      templateId: body.templateId,
    });
    if (!updated) {
      return notFound({ error: "Template not found" }, { headers });
    }
    return data(
      { ok: true },
      { headers: await toast(`${updated.name} is now the default`) },
    );
  }

  if (body.intent === DELETE_TEMPLATE_INTENT) {
    const deleted = await deleteTemplateFromDatabase({
      organizationId: organization.id,
      templateId: body.templateId,
    });
    if (!deleted) {
      return notFound({ error: "Template not found" }, { headers });
    }
    return data({ ok: true }, { headers: await toast("Template deleted") });
  }

  return badRequest({ error: "Unknown intent" }, { headers });
}
