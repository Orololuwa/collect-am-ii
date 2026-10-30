import {
  CircleAlertIcon,
  ClockIcon,
  CreditCardIcon,
  FileTextIcon,
  HandshakeIcon,
  MessageCircleIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  UserPlusIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { href, Link } from "react-router";

import { formatMoney, formatRelativeTime } from "./dashboard-format";
import type {
  DashboardActivity,
  FullDashboardData,
} from "./dashboard-helpers.server";
import { DashboardSection } from "./dashboard-overview";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { PaymentStatus, TemplateType } from "~/generated/browser";
import { cn } from "~/lib/utils";

const statusClasses: Record<PaymentStatus, string> = {
  canceled: "bg-muted text-muted-foreground",
  failed: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-400",
  partially_refunded: "bg-muted text-muted-foreground",
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  processing:
    "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  refunded: "bg-muted text-muted-foreground",
  succeeded:
    "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-400",
};

// Literal keys keep i18next's typed `t` cheap to type-check.
const statusKeys = {
  canceled: "statuses.canceled",
  failed: "statuses.failed",
  partially_refunded: "statuses.partially_refunded",
  pending: "statuses.pending",
  processing: "statuses.processing",
  refunded: "statuses.refunded",
  succeeded: "statuses.succeeded",
} as const satisfies Record<PaymentStatus, string>;

const templateTypeKeys = {
  certificate: "types.certificate",
  contract: "types.contract",
  deliveryNote: "types.deliveryNote",
  estimate: "types.estimate",
  form: "types.form",
  invoice: "types.invoice",
  label: "types.label",
  letter: "types.letter",
  orderConfirmation: "types.orderConfirmation",
  packingSlip: "types.packingSlip",
  proposal: "types.proposal",
  purchaseOrder: "types.purchaseOrder",
  quote: "types.quote",
  receipt: "types.receipt",
  reportCards: "types.reportCards",
  resume: "types.resume",
  salesOrder: "types.salesOrder",
  statement: "types.statement",
} as const satisfies Record<TemplateType, string>;

function providerName(provider: string) {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function RecentPayments({
  payments,
}: {
  payments: FullDashboardData["recentPayments"];
}) {
  const { t, i18n } = useTranslation("organizations", {
    keyPrefix: "dashboard.recentPayments",
  });
  const locale = i18n.language;

  return (
    <DashboardSection
      aria-labelledby="recent-payments-title"
      className="flex flex-[2_1_560px] flex-col gap-3 px-0 pb-2"
    >
      <h2 className="px-5 font-semibold text-base" id="recent-payments-title">
        {t("title")}
      </h2>
      {payments.length === 0 ? (
        <p className="px-5 pb-3 text-muted-foreground">{t("empty")}</p>
      ) : (
        <Table className="min-w-[620px] tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t("columns.customer")}</TableHead>
              <TableHead>{t("columns.page")}</TableHead>
              <TableHead className="text-right">
                {t("columns.amount")}
              </TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead className="pr-5 text-right">
                {t("columns.when")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="pl-5">
                  <span className="block font-medium">
                    {payment.customerName || payment.customerEmail}
                  </span>
                  <span className="block text-muted-foreground text-xs">
                    {providerName(payment.provider)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {payment.source?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney({
                    amountMinor: payment.amountMinor,
                    currency: payment.currency,
                    locale,
                  })}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold text-xs",
                      statusClasses[payment.status],
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {t(statusKeys[payment.status])}
                  </span>
                </TableCell>
                <TableCell className="pr-5 text-right text-muted-foreground">
                  {formatRelativeTime(payment.createdAt, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardSection>
  );
}

type AttentionItem = {
  key: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconClassName: string;
  title: string;
  detail: string;
  action: string;
  to: string;
};

export function NeedsAttention({
  attention,
  organizationSlug,
}: {
  attention: FullDashboardData["attention"];
  organizationSlug: string;
}) {
  const { t, i18n } = useTranslation("organizations", {
    keyPrefix: "dashboard.attention",
  });
  const locale = i18n.language;
  const checkoutPages = href(
    "/organizations/:organizationSlug/checkout-pages",
    {
      organizationSlug,
    },
  );
  const checkoutPage = (checkoutPageId: string) =>
    href("/organizations/:organizationSlug/checkout-pages/:checkoutPageId", {
      checkoutPageId,
      organizationSlug,
    });
  const bad = "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-400";
  const warn =
    "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300";

  const dealReasons = {
    declined: {
      detail: t("dealDeclinedDetail"),
      icon: CircleAlertIcon,
      iconClassName: bad,
      title: "dealDeclined",
    },
    message: {
      detail: t("dealMessageDetail"),
      icon: MessageCircleIcon,
      iconClassName:
        "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
      title: "dealMessage",
    },
    proposal: {
      detail: t("dealProposalDetail"),
      icon: HandshakeIcon,
      iconClassName: warn,
      title: "dealProposal",
    },
  } as const;

  const items: AttentionItem[] = [
    ...attention.deals.map((deal) => {
      const reason = dealReasons[deal.reason];
      return {
        action: t("open"),
        detail: reason.detail,
        icon: reason.icon,
        iconClassName: reason.iconClassName,
        key: `deal-${deal.id}`,
        title: t(reason.title, { customer: deal.customer, deal: deal.title }),
        to: href("/organizations/:organizationSlug/deals/:dealId", {
          dealId: deal.id,
          organizationSlug,
        }),
      };
    }),
    ...(attention.failedPayments > 0
      ? [
          {
            action: t("review"),
            detail: t("failedDetail"),
            icon: CircleAlertIcon,
            iconClassName: bad,
            key: "failed",
            title: t("failed", { count: attention.failedPayments }),
            to: checkoutPages,
          },
        ]
      : []),
    ...(attention.unsentReceipts > 0
      ? [
          {
            action: t("review"),
            detail: t("unsentDetail"),
            icon: ReceiptIcon,
            iconClassName: warn,
            key: "unsent",
            title: t("unsent", { count: attention.unsentReceipts }),
            to: checkoutPages,
          },
        ]
      : []),
    ...attention.expiringPages.map((page) => ({
      action: t("open"),
      detail: t("expiringDetail"),
      icon: ClockIcon,
      iconClassName: warn,
      key: `expiring-${page.id}`,
      title: t("expiring", {
        name: page.name,
        when: page.expiresAt ? formatRelativeTime(page.expiresAt, locale) : "",
      }),
      to: checkoutPage(page.id),
    })),
    ...attention.pagesWithoutReceipt.map((page) => ({
      action: t("open"),
      detail: t("noReceiptDetail"),
      icon: FileTextIcon,
      iconClassName: "bg-muted text-muted-foreground",
      key: `no-receipt-${page.id}`,
      title: t("noReceipt", { name: page.name }),
      to: checkoutPage(page.id),
    })),
  ];

  return (
    <DashboardSection
      aria-labelledby="attention-title"
      className="flex flex-[1_1_300px] flex-col"
    >
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-semibold text-base" id="attention-title">
          {t("title")}
        </h2>
        {items.length > 0 ? (
          <span className="rounded-full bg-primary/15 px-2 font-semibold text-primary text-xs">
            {items.length}
          </span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("allClear")}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              className="flex items-start gap-3 border-t py-3 first:border-t-0"
              key={item.key}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  item.iconClassName,
                )}
              >
                <item.icon aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block font-medium">{item.title}</span>
                <span className="block text-muted-foreground text-sm">
                  {item.detail}
                </span>
              </div>
              <Link
                className="shrink-0 font-medium text-primary text-sm hover:underline"
                to={item.to}
              >
                {item.action}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}

export function TemplatesSummary({
  templates,
  organizationSlug,
}: {
  templates: FullDashboardData["templates"];
  organizationSlug: string;
}) {
  const { t, i18n } = useTranslation("organizations", {
    keyPrefix: "dashboard.templates",
  });
  const locale = i18n.language;
  const templatesUrl = href("/organizations/:organizationSlug/templates", {
    organizationSlug,
  });

  return (
    <DashboardSection
      aria-labelledby="templates-title"
      className="flex flex-[2_1_560px] flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base" id="templates-title">
            {t("title")}
          </h2>
          <p className="text-muted-foreground">
            {t("summary", {
              count: templates.total,
              thisMonth: templates.thisMonth,
            })}
          </p>
        </div>
        <Link
          className="inline-flex h-9 items-center rounded-md border px-3 font-medium text-sm hover:bg-accent"
          to={templatesUrl}
        >
          {t("open")}
        </Link>
      </div>

      {templates.total === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2">
            {templates.byType.map((group) => (
              <li
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm"
                key={group.type}
              >
                <span className="font-semibold tabular-nums">
                  {group.count}
                </span>
                <span className="text-muted-foreground">
                  {t(templateTypeKeys[group.type], { count: group.count })}
                </span>
              </li>
            ))}
          </ul>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {templates.recent.map((template) => (
              <li key={template.id}>
                <Link
                  className="flex h-full flex-col gap-1 rounded-lg border bg-muted/40 p-3 hover:bg-accent"
                  to={href(
                    "/organizations/:organizationSlug/templates/:templateId",
                    { organizationSlug, templateId: template.id },
                  )}
                >
                  <span className="truncate font-medium">{template.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {t(templateTypeKeys[template.type], { count: 1 })} ·{" "}
                    {t("edited", {
                      when: formatRelativeTime(template.updatedAt, locale),
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardSection>
  );
}

const activityIcons: Record<
  DashboardActivity["kind"],
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  checkoutPageCreated: ShoppingCartIcon,
  memberJoined: UserPlusIcon,
  payment: CreditCardIcon,
  templateCreated: FileTextIcon,
};

export function RecentActivity({
  activity,
  organizationSlug,
}: {
  activity: FullDashboardData["activity"];
  organizationSlug: string;
}) {
  const { t, i18n } = useTranslation("organizations", {
    keyPrefix: "dashboard.activity",
  });
  const locale = i18n.language;

  const describe = (event: DashboardActivity) => {
    switch (event.kind) {
      case "payment": {
        return t("payment", {
          amount: formatMoney({
            amountMinor: event.amountMinor,
            currency: event.currency,
            locale,
          }),
          customer: event.customer,
          page: event.pageName,
        });
      }
      case "memberJoined": {
        return t("memberJoined", { member: event.member });
      }
      case "templateCreated": {
        return t("templateCreated", { name: event.name });
      }
      case "checkoutPageCreated": {
        return t("checkoutPageCreated", { name: event.name });
      }
    }
  };

  return (
    <DashboardSection
      aria-labelledby="activity-title"
      className="flex flex-[1_1_300px] flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-base" id="activity-title">
          {t("title")}
        </h2>
        <Link
          className="font-medium text-primary text-sm hover:underline"
          to={href("/organizations/:organizationSlug/settings/members", {
            organizationSlug,
          })}
        >
          {t("invite")}
        </Link>
      </div>
      {activity.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {activity.map((event) => {
            const Icon = activityIcons[event.kind];
            return (
              <li className="flex gap-2.5" key={event.id}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon aria-hidden="true" className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <span className="block">{describe(event)}</span>
                  <span className="block text-muted-foreground text-xs">
                    {formatRelativeTime(event.timestamp, locale)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
