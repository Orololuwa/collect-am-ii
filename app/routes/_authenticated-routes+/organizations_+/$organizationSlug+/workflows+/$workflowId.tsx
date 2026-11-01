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
import { resolveWorkflowView } from "~/features/workflows/workflow-view.server";
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
  countOpenDealsForWorkflowInDatabase,
  retrieveWorkflowFromDatabaseById,
  retrieveWorkflowStepTemplatesFromDatabase,
} from "~/features/workflows/workflows-model.server";
import { combineHeaders } from "~/utils/combine-headers.server";
import { getPageTitle } from "~/utils/get-page-title.server";
import { notFound } from "~/utils/http-responses.server";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  const [workflow, templates, openDeals, workflowView] = await Promise.all([
    retrieveWorkflowFromDatabaseById({
      organizationId: organization.id,
      workflowId: params.workflowId,
    }),
    retrieveWorkflowStepTemplatesFromDatabase(organization.id),
    countOpenDealsForWorkflowInDatabase({
      organizationId: organization.id,
      workflowId: params.workflowId,
    }),
    resolveWorkflowView({ organization, request }),
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
      canSwitchView: workflowView.canSwitch,
      openDeals,
      pageTitle: getPageTitle(i18n.t.bind(i18n), "workflows:pageTitle"),
      templates,
      view: workflowView.view,
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
            negotiable: step.negotiable,
            requestsPurchaseOrder: step.requestsPurchaseOrder,
            requiresAcceptance: step.requiresAcceptance,
            templateId: step.templateId,
            validityDays: step.validityDays,
          }),
        ),
        updatedAt: workflow.updatedAt,
      },
    },
    { headers: combineHeaders(headers, workflowView.headers) },
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
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("workflows");
  const navigation = useNavigation();
  const statusFetcher = useFetcher();
  const { workflow, templates, view, canSwitchView, openDeals } = loaderData;
  const isArchived = workflow.archivedAt !== null;
  const serverIssues: SaveWorkflowIssue[] =
    actionData && "issues" in actionData
      ? (actionData.issues as SaveWorkflowIssue[])
      : [];
  const workflowUrl = href(
    "/organizations/:organizationSlug/workflows/:workflowId",
    { organizationSlug: params.organizationSlug, workflowId: workflow.id },
  );

  return (
    // The editor fills the space under the app header.
    <div className="flex min-w-0 flex-col lg:h-[calc(100svh-var(--header-height)-1rem)]">
      <WorkflowEditor
        backHref={href("/organizations/:organizationSlug/workflows", {
          organizationSlug: params.organizationSlug,
        })}
        isSaving={
          navigation.state === "submitting" &&
          navigation.formData?.get("intent") === SAVE_WORKFLOW_INTENT
        }
        key={String(workflow.updatedAt)}
        openDeals={openDeals}
        serverIssues={serverIssues}
        templates={templates}
        toolbarExtra={
          <>
            {isArchived ? (
              <Badge variant="secondary">{t("list.archived")}</Badge>
            ) : null}
            <Button
              disabled={statusFetcher.state !== "idle"}
              form="workflow-status"
              name="intent"
              size="sm"
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
          </>
        }
        view={view}
        viewLinks={
          canSwitchView
            ? {
                canvas: `${workflowUrl}?view=canvas`,
                steps: `${workflowUrl}?view=steps`,
              }
            : null
        }
        workflow={workflow}
      />
      {/* Outside the editor's form, which it can't nest in. */}
      <statusFetcher.Form hidden id="workflow-status" method="POST">
        <input name="workflowId" type="hidden" value={workflow.id} />
      </statusFetcher.Form>
    </div>
  );
}
