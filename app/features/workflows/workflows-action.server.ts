import type { RouterContextProvider } from "react-router";
import { data, href } from "react-router";

import type { SampleStep } from "./workflow-samples";
import { BLANK_WORKFLOW_STEPS, WORKFLOW_SAMPLES } from "./workflow-samples";
import type { SaveWorkflowIssue, WorkflowStepInput } from "./workflow-steps";
import { normalizeWorkflowStep, validateWorkflowSteps } from "./workflow-steps";
import {
  ARCHIVE_WORKFLOW_INTENT,
  BLANK_WORKFLOW_KEY,
  SAMPLE_TEXT_KEYS,
  STEP_NAME_KEYS,
} from "./workflows-constants";
import {
  replaceWorkflowStepsInDatabase,
  retrieveWorkflowStepTemplatesFromDatabase,
  saveWorkflowWithStepsToDatabase,
  updateWorkflowInDatabaseById,
} from "./workflows-model.server";
import {
  createWorkflowFormSchema,
  saveWorkflowFormSchema,
  workflowIdFormSchema,
} from "./workflows-schemas";
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
 * Creates a workflow from a sample (or a blank one), with the step names in
 * the creator's language, and opens it in the editor.
 */
export async function createWorkflowAction({
  request,
  context,
  params,
}: ActionArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const result = await validateFormData(request, createWorkflowFormSchema);
  if (!result.success) {
    return result.response;
  }

  const { sampleKey } = result.data;
  const isBlank = sampleKey === BLANK_WORKFLOW_KEY;
  const sampleSteps: SampleStep[] = isBlank
    ? BLANK_WORKFLOW_STEPS
    : WORKFLOW_SAMPLES[sampleKey];
  const steps = sampleSteps.map(({ stepName, ...settings }) => ({
    ...settings,
    name: i18n.t(STEP_NAME_KEYS[stepName], { ns: "workflows" }),
    templateId: null,
  }));

  const workflow = await saveWorkflowWithStepsToDatabase({
    description: isBlank
      ? ""
      : i18n.t(SAMPLE_TEXT_KEYS[sampleKey].description, { ns: "workflows" }),
    name: isBlank
      ? i18n.t("blankName", { ns: "workflows" })
      : i18n.t(SAMPLE_TEXT_KEYS[sampleKey].name, { ns: "workflows" }),
    organizationId: organization.id,
    sampleKey: isBlank ? null : sampleKey,
    steps,
  });

  return redirectWithToast(
    href("/organizations/:organizationSlug/workflows/:workflowId", {
      organizationSlug: params.organizationSlug,
      workflowId: workflow.id,
    }),
    {
      title: i18n.t("toasts.created", { name: workflow.name, ns: "workflows" }),
      type: "success",
    },
    { headers },
  );
}

/**
 * Checks that every template a step uses belongs to the organization and
 * matches the step's document type.
 */
async function findTemplateIssues(
  organizationId: string,
  steps: WorkflowStepInput[],
): Promise<SaveWorkflowIssue[]> {
  if (!steps.some((step) => step.templateId)) {
    return [];
  }
  const templates =
    await retrieveWorkflowStepTemplatesFromDatabase(organizationId);
  const typeById = new Map(
    templates.map((template) => [template.id, template.type]),
  );
  return steps.flatMap((step, stepIndex) => {
    if (!step.templateId) {
      return [];
    }
    const expectedType =
      step.kind === "receipt" ? "receipt" : step.documentType;
    return typeById.get(step.templateId) === expectedType
      ? []
      : [{ code: "templateNotFound" as const, stepIndex }];
  });
}

/**
 * Saves a workflow's name, description and complete step list. Running deals
 * keep the steps they started with.
 */
export async function saveWorkflowAction(
  { request, context }: ActionArgs,
  workflowId: string,
) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const result = await validateFormData(request, saveWorkflowFormSchema);
  if (!result.success) {
    return result.response;
  }

  const steps = result.data.steps.map(normalizeWorkflowStep);
  const issues: SaveWorkflowIssue[] = [
    ...validateWorkflowSteps(steps),
    ...(await findTemplateIssues(organization.id, steps)),
  ];
  if (issues.length > 0) {
    return badRequest({ issues }, { headers });
  }

  const saved = await replaceWorkflowStepsInDatabase({
    description: result.data.description,
    name: result.data.name,
    organizationId: organization.id,
    steps,
    workflowId,
  });
  if (!saved) {
    throw notFound();
  }

  return data(
    { issues: [] as SaveWorkflowIssue[] },
    {
      headers: combineHeaders(
        headers,
        await createToastHeaders({
          title: i18n.t("toasts.saved", {
            name: result.data.name,
            ns: "workflows",
          }),
          type: "success",
        }),
      ),
    },
  );
}

export async function updateWorkflowStatusAction({
  request,
  context,
}: ActionArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const result = await validateFormData(request, workflowIdFormSchema);
  if (!result.success) {
    return result.response;
  }

  const archive = result.data.intent === ARCHIVE_WORKFLOW_INTENT;
  const updated = await updateWorkflowInDatabaseById({
    data: { archivedAt: archive ? new Date() : null },
    organizationId: organization.id,
    workflowId: result.data.workflowId,
  });
  if (!updated) {
    return notFound({}, { headers });
  }

  return data(
    {},
    {
      headers: combineHeaders(
        headers,
        await createToastHeaders({
          title: archive
            ? i18n.t("toasts.archived", { ns: "workflows" })
            : i18n.t("toasts.restored", { ns: "workflows" }),
          type: "success",
        }),
      ),
    },
  );
}
