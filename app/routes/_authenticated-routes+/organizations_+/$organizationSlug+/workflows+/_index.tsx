import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowRightIcon,
  PlusIcon,
  WorkflowIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, href, Link, useFetcher } from "react-router";

import type { Route } from "./+types/_index";
import { Button } from "~/components/ui/button";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { WorkflowStepChips } from "~/features/workflows/components/workflow-step-chips";
import { updateWorkflowStatusAction } from "~/features/workflows/workflows-action.server";
import {
  ARCHIVE_WORKFLOW_INTENT,
  RESTORE_WORKFLOW_INTENT,
} from "~/features/workflows/workflows-constants";
import { retrieveWorkflowsFromDatabaseByOrganizationId } from "~/features/workflows/workflows-model.server";
import { cn } from "~/lib/utils";
import { getPageTitle } from "~/utils/get-page-title.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);
  const archived =
    new URL(request.url).searchParams.get("status") === "archived";

  const workflows = await retrieveWorkflowsFromDatabaseByOrganizationId({
    archived,
    organizationId: organization.id,
  });

  return data(
    {
      archived,
      breadcrumb: {
        title: i18n.t("workflows:breadcrumb"),
        to: href("/organizations/:organizationSlug/workflows", {
          organizationSlug: params.organizationSlug,
        }),
      },
      pageTitle: getPageTitle(i18n.t.bind(i18n), "workflows:pageTitle"),
      workflows: workflows.map((workflow) => ({
        description: workflow.description,
        id: workflow.id,
        name: workflow.name,
        steps: workflow.steps.map((step) => ({
          kind: step.kind,
          name: step.name,
        })),
      })),
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  return await updateWorkflowStatusAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

function WorkflowStatusButton({
  workflowId,
  archived,
}: {
  workflowId: string;
  archived: boolean;
}) {
  const { t } = useTranslation("workflows", { keyPrefix: "list" });
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="POST">
      <input name="workflowId" type="hidden" value={workflowId} />
      <Button
        disabled={fetcher.state !== "idle"}
        name="intent"
        size="sm"
        type="submit"
        value={archived ? RESTORE_WORKFLOW_INTENT : ARCHIVE_WORKFLOW_INTENT}
        variant="outline"
      >
        {archived ? (
          <ArchiveRestoreIcon aria-hidden="true" />
        ) : (
          <ArchiveIcon aria-hidden="true" />
        )}
        {archived ? t("restore") : t("archive")}
      </Button>
    </fetcher.Form>
  );
}

export default function WorkflowsRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("workflows", { keyPrefix: "list" });
  const { workflows, archived } = loaderData;
  const organizationSlug = params.organizationSlug;
  const listUrl = href("/organizations/:organizationSlug/workflows", {
    organizationSlug,
  });
  const newUrl = href("/organizations/:organizationSlug/workflows/new", {
    organizationSlug,
  });

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link to={newUrl}>
            <PlusIcon aria-hidden="true" />
            {t("newWorkflow")}
          </Link>
        </Button>
      </header>

      <nav
        aria-label={t("statusLabel")}
        className="flex w-fit rounded-lg border bg-card p-0.5"
      >
        {(
          [
            [false, t("active"), listUrl],
            [true, t("archived"), `${listUrl}?status=archived`],
          ] as const
        ).map(([value, label, to]) => (
          <Link
            aria-current={value === archived ? "page" : undefined}
            className={cn(
              "flex h-9 items-center rounded-md px-3 font-medium text-sm transition-colors",
              value === archived
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={label}
            to={to}
          >
            {label}
          </Link>
        ))}
      </nav>

      {workflows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <WorkflowIcon
            aria-hidden="true"
            className="size-10 text-muted-foreground"
          />
          <p className="font-medium">
            {archived ? t("noArchived") : t("empty")}
          </p>
          {archived ? null : (
            <>
              <p className="max-w-sm text-muted-foreground text-sm">
                {t("emptyDescription")}
              </p>
              <Button asChild>
                <Link to={newUrl}>
                  <PlusIcon aria-hidden="true" />
                  {t("newWorkflow")}
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {workflows.map((workflow) => (
            <li
              className="flex flex-col gap-4 rounded-xl border bg-card p-5"
              key={workflow.id}
            >
              <div className="space-y-1">
                <h2 className="font-semibold">{workflow.name}</h2>
                <p className="text-muted-foreground text-sm">
                  {t("steps", { count: workflow.steps.length })}
                  {workflow.description ? ` · ${workflow.description}` : null}
                </p>
              </div>
              <WorkflowStepChips steps={workflow.steps} />
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <Button asChild className="min-w-fit flex-1" size="sm">
                  <Link
                    to={href(
                      "/organizations/:organizationSlug/workflows/:workflowId",
                      { organizationSlug, workflowId: workflow.id },
                    )}
                  >
                    {t("open")}
                    <ArrowRightIcon aria-hidden="true" />
                  </Link>
                </Button>
                <WorkflowStatusButton
                  archived={archived}
                  workflowId={workflow.id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
