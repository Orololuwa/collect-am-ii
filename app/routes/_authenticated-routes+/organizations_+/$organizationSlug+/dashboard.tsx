import { data, href, useLoaderData } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/dashboard";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { DISMISS_SETUP_GUIDE_INTENT } from "~/features/organizations/dashboard/dashboard-constants";
import { DashboardHeader } from "~/features/organizations/dashboard/dashboard-header";
import {
  dismissSetupGuide,
  getDashboardData,
} from "~/features/organizations/dashboard/dashboard-helpers.server";
import {
  NeedsAttention,
  RecentActivity,
  RecentPayments,
  TemplatesSummary,
} from "~/features/organizations/dashboard/dashboard-lists";
import { parseDashboardPeriod } from "~/features/organizations/dashboard/dashboard-metrics";
import {
  CollectedChart,
  DashboardKpis,
  TopCheckoutPages,
} from "~/features/organizations/dashboard/dashboard-overview";
import { SetupChecklist } from "~/features/organizations/dashboard/setup-checklist";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { getPageTitle } from "~/utils/get-page-title.server";
import { validateFormData } from "~/utils/validate-form-data.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { organization, user, headers } = context.get(
    organizationMembershipContext,
  );
  const i18n = getInstance(context);
  const t = i18n.t.bind(i18n);
  const searchParams = new URL(request.url).searchParams;

  const dashboardData = await getDashboardData({
    organizationId: organization.id,
    period: parseDashboardPeriod(searchParams.get("period")),
    requestedCurrency: searchParams.get("currency"),
  });

  return data(
    {
      breadcrumb: {
        title: t("organizations:dashboard.breadcrumb"),
        to: href("/organizations/:organizationSlug/dashboard", {
          organizationSlug: params.organizationSlug,
        }),
      },
      dashboardData,
      organizationName: organization.name,
      pageTitle: getPageTitle(t, "organizations:dashboard.pageTitle"),
      userName: user.name,
    },
    { headers },
  );
}

const dashboardActionSchema = z.object({
  intent: z.literal(DISMISS_SETUP_GUIDE_INTENT),
});

export async function action({ request, context }: Route.ActionArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);

  const result = await validateFormData(request, dashboardActionSchema);
  if (!result.success) {
    return result.response;
  }

  // The only intent: skip the setup guide and show the full dashboard.
  await dismissSetupGuide(organization.id);
  return data({}, { headers });
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

export default function OrganizationDashboardRoute({
  params,
}: Route.ComponentProps) {
  const { dashboardData, organizationName, userName } =
    useLoaderData<typeof loader>();
  const organizationSlug = params.organizationSlug;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      {dashboardData.isFirstRun ? (
        <SetupChecklist
          currency={dashboardData.currency}
          organizationName={organizationName}
          organizationSlug={organizationSlug}
          setup={dashboardData.setup}
          userName={userName}
        />
      ) : (
        <>
          <DashboardHeader
            currencies={dashboardData.currencies}
            currency={dashboardData.currency}
            organizationName={organizationName}
            organizationSlug={organizationSlug}
            period={dashboardData.period}
            userName={userName}
          />
          <DashboardKpis
            currency={dashboardData.currency}
            period={dashboardData.period}
            stats={dashboardData.stats}
          />
          <div className="flex flex-wrap gap-4">
            <CollectedChart
              currency={dashboardData.currency}
              daily={dashboardData.stats.daily}
              period={dashboardData.period}
            />
            <TopCheckoutPages
              currency={dashboardData.currency}
              organizationSlug={organizationSlug}
              pages={dashboardData.stats.topPages}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <RecentPayments payments={dashboardData.recentPayments} />
            <NeedsAttention
              attention={dashboardData.attention}
              organizationSlug={organizationSlug}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <TemplatesSummary
              organizationSlug={organizationSlug}
              templates={dashboardData.templates}
            />
            <RecentActivity
              activity={dashboardData.activity}
              organizationSlug={organizationSlug}
            />
          </div>
        </>
      )}
    </div>
  );
}
