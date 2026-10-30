import {
  CircleHelpIcon,
  HammerIcon,
  LayoutDashboardIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingCartIcon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { href } from "react-router";

import { NavGroup } from "./nav-group";
import type { NavUserProps } from "./nav-user";
import { NavUser } from "./nav-user";
import type { OrganizationSwitcherProps } from "./organization-switcher";
import { OrganizationSwitcher } from "./organization-switcher";
import type { Route } from ".react-router/types/app/routes/_authenticated-routes+/organizations_+/$organizationSlug+/+types/_sidebar-layout";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar";
import type { BillingSidebarCardProps } from "~/features/billing/billing-sidebar-card";
import { BillingSidebarCard } from "~/features/billing/billing-sidebar-card";
import { cn } from "~/lib/utils";

type AppSidebarProps = {
  organizationSlug: Route.ComponentProps["params"]["organizationSlug"];
  billingSidebarCardProps?: BillingSidebarCardProps;
  organizationSwitcherProps: OrganizationSwitcherProps;
  navUserProps: NavUserProps;
} & ComponentProps<typeof Sidebar>;

export function AppSidebar({
  billingSidebarCardProps,
  navUserProps,
  organizationSlug,
  organizationSwitcherProps,
  ...props
}: AppSidebarProps) {
  const { t } = useTranslation("organizations", {
    keyPrefix: "layout.appSidebar.nav",
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrganizationSwitcher {...organizationSwitcherProps} />
      </SidebarHeader>

      <SidebarContent>
        <NavGroup
          items={[
            {
              icon: LayoutDashboardIcon,
              title: t("app.dashboard"),
              url: href("/organizations/:organizationSlug/dashboard", {
                organizationSlug,
              }),
            },
            {
              icon: HammerIcon,
              title: t("app.templates"),
              url: href("/organizations/:organizationSlug/templates", {
                organizationSlug,
              }),
            },
            {
              icon: ShoppingCartIcon,
              title: "Checkout",
              url: href("/organizations/:organizationSlug/checkout-pages", {
                organizationSlug,
              }),
            },
            {
              icon: PackageIcon,
              title: t("app.products"),
              url: href("/organizations/:organizationSlug/products", {
                organizationSlug,
              }),
            },
            {
              icon: UsersIcon,
              title: t("app.customers"),
              url: href("/organizations/:organizationSlug/customers", {
                organizationSlug,
              }),
            },
            {
              icon: WorkflowIcon,
              title: t("app.workflows"),
              url: href("/organizations/:organizationSlug/workflows", {
                organizationSlug,
              }),
            },
          ]}
          title={t("app.title")}
        />

        {billingSidebarCardProps && (
          <BillingSidebarCard
            className={cn(
              "mt-auto overflow-hidden transition-[opacity,transform,max-height] ease-in-out",
              "max-h-[500px] scale-100 opacity-100 delay-200 duration-500",
              "group-data-[state=collapsed]:max-h-0 group-data-[state=collapsed]:scale-95 group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:delay-0 group-data-[state=collapsed]:duration-200 group-data-[variant=sidebar]:mx-2",
            )}
            {...billingSidebarCardProps}
          />
        )}

        <NavGroup
          className={cn(!billingSidebarCardProps && "mt-auto")}
          items={[
            {
              icon: SettingsIcon,
              title: t("settings.organizationSettings"),
              url: href("/organizations/:organizationSlug/settings", {
                organizationSlug,
              }),
            },
            {
              icon: CircleHelpIcon,
              title: t("settings.getHelp"),
              url: href("/organizations/:organizationSlug/get-help", {
                organizationSlug,
              }),
            },
          ]}
          size="sm"
        />
      </SidebarContent>

      <SidebarFooter>
        <NavUser {...navUserProps} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
