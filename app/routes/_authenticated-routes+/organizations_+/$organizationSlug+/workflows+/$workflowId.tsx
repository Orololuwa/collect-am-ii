import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, href, useFetcher, useNavigation } from "react-router";

import type { Route } from "./+types/$workflowId";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { WorkflowEditor } from "~/features/workflows/components/workflow-editor";
import type {
  SaveWorkflowIssue,
  WorkflowStepInput,
} from "~/features/workflows/workflow-steps";
import {
  saveWorkflowAction,
  updateWorkflowStatusAction,
} from "~/features/workflows/workflows-action.server";
import {
  ARCHIVE_WORKFLOW_INTENT,
  RESTORE_WORKFLOW_INTENT,
  SAVE_WORKFLOW_INTENT,
} from "~/features/workflows/workflows-constants";
import {
  retrieveWorkflowFromDatabaseById,
  retrieveWorkflowStepTemplatesFromDatabase,
} from "~/features/workflows/workflows-model.server";
import { getPageTitle } from "~/utils/get-page-title.server";
import { notFound } from "~/utils/http-responses.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const [workflow, templates] = await Promise.all([
    retrieveWorkflowFromDatabaseById({
      organizationId: organization.id,
      workflowId: params.workflowId,
    }),
    retrieveWorkflowStepTemplatesFromDatabase(organization.id),
  ]);
  if (!workflow) {
    throw notFound();
  }

  return data(
    {
      breadcrumb: {
        title: workflow.name,
        to: href("/organizations/:organizationSlug/workflows/:workflowId", {
          organizationSlug: params.organizationSlug,
          workflowId: workflow.id,
        }),
      },
      pageTitle: getPageTitle(i18n.t.bind(i18n), "workflows:pageTitle"),
      templates,
      workflow: {
        archivedAt: workflow.archivedAt,
        description: workflow.description,
        id: workflow.id,
        name: workflow.name,
        steps: workflow.steps.map(
          (step): WorkflowStepInput => ({
            advanceMode: step.advanceMode,
            carryForward: step.carryForward,
            depositPercentBps: step.depositPercentBps,
            documentType:
              step.documentType as WorkflowStepInput["documentType"],
            kind: step.kind,
            name: step.name,
            paymentTermsDays: step.paymentTermsDays,
            requiresAcceptance: step.requiresAcceptance,
            templateId: step.templateId,
            validityDays: step.validityDays,
          }),
        ),
        updatedAt: workflow.updatedAt,
      },
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  const intent = (await args.request.clone().formData()).get("intent");
  if (intent === SAVE_WORKFLOW_INTENT) {
    return await saveWorkflowAction(args, args.params.workflowId);
  }
  return await updateWorkflowStatusAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function WorkflowRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { t } = useTranslation("workflows");
  const navigation = useNavigation();
  const statusFetcher = useFetcher();
  const { workflow, templates } = loaderData;
  const isArchived = workflow.archivedAt !== null;
  const serverIssues: SaveWorkflowIssue[] =
    actionData && "issues" in actionData
      ? (actionData.issues as SaveWorkflowIssue[])
      : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 pt-6 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-2xl tracking-tight">
            {workflow.name}
          </h1>
          {isArchived ? (
            <Badge variant="secondary">{t("list.archived")}</Badge>
          ) : null}
        </div>
        <statusFetcher.Form method="POST">
          <input name="workflowId" type="hidden" value={workflow.id} />
          <Button
            disabled={statusFetcher.state !== "idle"}
            name="intent"
            type="submit"
            value={
              isArchived ? RESTORE_WORKFLOW_INTENT : ARCHIVE_WORKFLOW_INTENT
            }
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
      <WorkflowEditor
        isSaving={
          navigation.state === "submitting" &&
          navigation.formData?.get("intent") === SAVE_WORKFLOW_INTENT
        }
        key={String(workflow.updatedAt)}
        serverIssues={serverIssues}
        templates={templates}
        workflow={workflow}
      />
    </div>
  );
}
