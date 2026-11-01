import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, Form, href, useNavigation } from "react-router";

import type { Route } from "./+types/new";
import { Button } from "~/components/ui/button";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { WorkflowStepChips } from "~/features/workflows/components/workflow-step-chips";
import type { SampleStep } from "~/features/workflows/workflow-samples";
import {
  WORKFLOW_SAMPLE_CATEGORIES,
  WORKFLOW_SAMPLE_CATEGORY_ORDER,
  WORKFLOW_SAMPLES,
} from "~/features/workflows/workflow-samples";
import { createWorkflowAction } from "~/features/workflows/workflows-action.server";
import {
  BLANK_WORKFLOW_KEY,
  CREATE_WORKFLOW_INTENT,
  DOCUMENT_TYPE_KEYS,
  SAMPLE_CATEGORY_KEYS,
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

/** Two or three facts that set a sample apart: deposit, validity, terms. */
function useSampleHighlights() {
  const { t } = useTranslation("workflows");
  return (steps: SampleStep[]) => {
    const highlights: string[] = [];
    const [first] = steps;
    const deposit = steps.find((step) => step.carryForward === "deposit");
    const invoice = steps.find(
      (step) =>
        step.documentType === "invoice" &&
        step.carryForward !== "deposit" &&
        step.paymentTermsDays !== null,
    );
    if (deposit?.depositPercentBps) {
      highlights.push(
        t("gallery.highlights.deposit", {
          percent: deposit.depositPercentBps / 100,
        }),
      );
    }
    if (first?.validityDays && first.documentType) {
      highlights.push(
        t("gallery.highlights.validity", {
          count: first.validityDays,
          type: t(DOCUMENT_TYPE_KEYS[first.documentType]),
        }),
      );
    }
    if (steps.some((step) => step.kind === "caution")) {
      highlights.push(t("gallery.highlights.caution"));
    }
    if (steps.some((step) => step.requestsPurchaseOrder)) {
      highlights.push(t("gallery.highlights.purchaseOrder"));
    }
    if (invoice?.paymentTermsDays) {
      highlights.push(
        t("gallery.highlights.terms", { count: invoice.paymentTermsDays }),
      );
    } else if (!deposit) {
      highlights.push(t("gallery.highlights.paidUpfront"));
    }
    return highlights;
  };
}

export default function NewWorkflowRoute() {
  const { t } = useTranslation("workflows");
  const highlightsFor = useSampleHighlights();
  const navigation = useNavigation();
  const pendingKey =
    navigation.state === "idle" ? null : navigation.formData?.get("sampleKey");

  const renderUseButton = (sampleKey: string, outline = true) => (
    <Form className="mt-auto" method="POST">
      <input name="sampleKey" type="hidden" value={sampleKey} />
      <Button
        className="w-full"
        disabled={pendingKey !== null}
        name="intent"
        type="submit"
        value={CREATE_WORKFLOW_INTENT}
        variant={pendingKey === sampleKey || !outline ? "default" : "outline"}
      >
        {sampleKey === BLANK_WORKFLOW_KEY ? (
          <PlusIcon aria-hidden="true" />
        ) : null}
        {sampleKey === BLANK_WORKFLOW_KEY
          ? t("gallery.blankTitle")
          : t("gallery.use")}
      </Button>
    </Form>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 py-6 lg:px-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          {t("gallery.title")}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {t("gallery.description")}
        </p>
      </header>

      {WORKFLOW_SAMPLE_CATEGORY_ORDER.map((category) => (
        <section
          aria-labelledby={`samples-${category}`}
          className="space-y-3"
          key={category}
        >
          <h2
            className="font-semibold text-muted-foreground text-sm uppercase tracking-wide"
            id={`samples-${category}`}
          >
            {t(SAMPLE_CATEGORY_KEYS[category])}
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {WORKFLOW_SAMPLE_CATEGORIES[category].map((sampleKey) => {
              const steps = WORKFLOW_SAMPLES[sampleKey];
              return (
                <li
                  className="flex flex-col gap-4 rounded-xl border bg-card p-5"
                  key={sampleKey}
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold">
                      {t(SAMPLE_TEXT_KEYS[sampleKey].name)}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t(SAMPLE_TEXT_KEYS[sampleKey].description)}
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {highlightsFor(steps).map((highlight) => (
                      <li
                        className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs"
                        key={highlight}
                      >
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <WorkflowStepChips
                    steps={steps.map((step) => ({
                      kind: step.kind,
                      name: t(STEP_NAME_KEYS[step.stepName]),
                    }))}
                  />
                  {renderUseButton(sampleKey)}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section className="space-y-3">
        <div className="flex flex-col gap-4 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-semibold">{t("gallery.blankTitle")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("gallery.blankDescription")}
            </p>
          </div>
          <div className="sm:w-56">{renderUseButton(BLANK_WORKFLOW_KEY)}</div>
        </div>
      </section>
    </div>
  );
}
