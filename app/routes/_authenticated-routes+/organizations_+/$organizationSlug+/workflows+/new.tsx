import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, Form, href, useNavigation } from "react-router";

import type { Route } from "./+types/new";
import { Button } from "~/components/ui/button";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { WorkflowStepChips } from "~/features/workflows/components/workflow-step-chips";
import {
  WORKFLOW_SAMPLE_KEYS,
  WORKFLOW_SAMPLES,
} from "~/features/workflows/workflow-samples";
import { createWorkflowAction } from "~/features/workflows/workflows-action.server";
import {
  BLANK_WORKFLOW_KEY,
  CREATE_WORKFLOW_INTENT,
  SAMPLE_TEXT_KEYS,
  STEP_NAME_KEYS,
} from "~/features/workflows/workflows-constants";
import { getPageTitle } from "~/utils/get-page-title.server";

export function loader({ params, context }: Route.LoaderArgs) {
  const { headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);

  return data(
    {
      breadcrumb: {
        title: i18n.t("workflows:newBreadcrumb"),
        to: href("/organizations/:organizationSlug/workflows/new", {
          organizationSlug: params.organizationSlug,
        }),
      },
      pageTitle: getPageTitle(i18n.t.bind(i18n), "workflows:newPageTitle"),
    },
    { headers },
  );
}

export async function action(args: Route.ActionArgs) {
  return await createWorkflowAction(args);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function NewWorkflowRoute() {
  const { t } = useTranslation("workflows");
  const navigation = useNavigation();
  const pendingKey =
    navigation.state === "idle" ? null : navigation.formData?.get("sampleKey");

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          {t("gallery.title")}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {t("gallery.description")}
        </p>
      </header>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {WORKFLOW_SAMPLE_KEYS.map((sampleKey) => (
          <li
            className="flex flex-col gap-4 rounded-xl border bg-card p-5"
            key={sampleKey}
          >
            <div className="space-y-1">
              <h2 className="font-semibold">
                {t(SAMPLE_TEXT_KEYS[sampleKey].name)}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t(SAMPLE_TEXT_KEYS[sampleKey].description)}
              </p>
            </div>
            <WorkflowStepChips
              steps={WORKFLOW_SAMPLES[sampleKey].map((step) => ({
                kind: step.kind,
                name: t(STEP_NAME_KEYS[step.stepName]),
              }))}
            />
            <Form className="mt-auto" method="POST">
              <input name="sampleKey" type="hidden" value={sampleKey} />
              <Button
                className="w-full"
                disabled={pendingKey !== null}
                name="intent"
                type="submit"
                value={CREATE_WORKFLOW_INTENT}
                variant={pendingKey === sampleKey ? "default" : "outline"}
              >
                {t("gallery.use")}
              </Button>
            </Form>
          </li>
        ))}
        <li className="flex flex-col gap-4 rounded-xl border border-dashed p-5">
          <div className="space-y-1">
            <h2 className="font-semibold">{t("gallery.blankTitle")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("gallery.blankDescription")}
            </p>
          </div>
          <Form className="mt-auto" method="POST">
            <input name="sampleKey" type="hidden" value={BLANK_WORKFLOW_KEY} />
            <Button
              className="w-full"
              disabled={pendingKey !== null}
              name="intent"
              type="submit"
              value={CREATE_WORKFLOW_INTENT}
              variant="outline"
            >
              <PlusIcon aria-hidden="true" />
              {t("gallery.blankTitle")}
            </Button>
          </Form>
        </li>
      </ul>
    </div>
  );
}
