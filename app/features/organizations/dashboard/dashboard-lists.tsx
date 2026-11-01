import {
  CircleAlertIcon,
  ClockIcon,
  CreditCardIcon,
  FileTextIcon,
  HandCoinsIcon,
  HandshakeIcon,
  MessageCircleIcon,
  SendIcon,
  ShoppingCartIcon,
  UserPlusIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useTranslation } from "react-i18next";
import { href, Link } from "react-router";

import type { DealAttentionReason, DealStage } from "./dashboard-deals";
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
import { DOCUMENT_TYPE_KEYS } from "~/features/deals/deals-constants";
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

const bad = "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-400";
const warn =
  "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300";
const info = "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300";

// Literal keys keep i18next's typed `t` cheap to type-check.
const attentionKeys = {
  declined: { detail: "dealDeclinedDetail", title: "dealDeclined" },
  draft: { detail: "dealDraftDetail", title: "dealDraft" },
  expired: { detail: "dealExpiredDetail", title: "dealExpired" },
  expiring: { detail: "dealExpiringDetail", title: "dealExpiring" },
  message: { detail: "dealMessageDetail", title: "dealMessage" },
  overdue: { detail: "dealOverdueDetail", title: "dealOverdue" },
  proposal: { detail: "dealProposalDetail", title: "dealProposal" },
  cautionToSettle: {
    detail: "dealCautionToSettleDetail",
    title: "dealCautionToSettle",
  },
  refundToSend: {
    detail: "dealRefundToSendDetail",
    title: "dealRefundToSend",
  },
} as const satisfies Record<
  DealAttentionReason,
  { title: string; detail: string }
>;

const attentionLooks = {
  declined: { icon: CircleAlertIcon, tone: bad },
  draft: { icon: SendIcon, tone: info },
  expired: { icon: ClockIcon, tone: bad },
  expiring: { icon: ClockIcon, tone: warn },
  message: { icon: MessageCircleIcon, tone: info },
  overdue: { icon: CircleAlertIcon, tone: bad },
  proposal: { icon: HandshakeIcon, tone: warn },
  cautionToSettle: { icon: HandCoinsIcon, tone: warn },
  refundToSend: { icon: HandCoinsIcon, tone: bad },
} as const satisfies Record<
  DealAttentionReason,
  { icon: ComponentType<SVGProps<SVGSVGElement>>; tone: string }
>;

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
  const { t: tDeals } = useTranslation("deals");
  const locale = i18n.language;
  const documentName = (document: { type: string; number: string | null }) =>
    `${tDeals(DOCUMENT_TYPE_KEYS[document.type as keyof typeof DOCUMENT_TYPE_KEYS])} ${document.number ?? ""}`.trim();

  const items: AttentionItem[] = attention.flatMap((deal) => {
    if (!deal.attention) return [];
    const { reason, document, dueAt } = deal.attention;
    const values = {
      customer: deal.customerName,
      deal: deal.title,
      document: document ? documentName(document) : "",
      step: deal.stepName ?? "",
      when: dueAt ? formatRelativeTime(dueAt, locale) : "",
    };
    return [
      {
        action: t("open"),
        detail: t(attentionKeys[reason].detail, values),
        icon: attentionLooks[reason].icon,
        iconClassName: attentionLooks[reason].tone,
        key: deal.id,
        title: t(attentionKeys[reason].title, values),
        to: href("/organizations/:organizationSlug/deals/:dealId", {
          dealId: deal.id,
          organizationSlug,
        }),
      },
    ];
  });

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

const stageKeys = {
  awaitingPayment: "stages.awaitingPayment",
  toSend: "stages.toSend",
  withCustomer: "stages.withCustomer",
} as const satisfies Record<DealStage, string>;

const stageTones = {
  awaitingPayment:
    "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-400",
  toSend: "bg-muted text-muted-foreground",
  withCustomer: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
} as const satisfies Record<DealStage, string>;

/** How many deals are open, where they're waiting, and the latest ones. */
export function OpenDeals({
  openDeals,
  currency,
  organizationSlug,
}: {
  openDeals: FullDashboardData["openDeals"];
  currency: string;
  organizationSlug: string;
}) {
  const { t, i18n } = useTranslation("organizations", {
    keyPrefix: "dashboard.openDeals",
  });
  const locale = i18n.language;
  const { counts, deals, valueMinor } = openDeals;
  const dealsUrl = href("/organizations/:organizationSlug/deals", {
    organizationSlug,
  });

  return (
    <DashboardSection
      aria-labelledby="open-deals-title"
      className="flex flex-[1_1_300px] flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base" id="open-deals-title">
            {t("title", { count: counts.total })}
          </h2>
          {counts.total > 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("value", {
                amount: formatMoney({
                  amountMinor: valueMinor,
                  currency,
                  locale,
                  whole: true,
                }),
              })}
            </p>
          ) : null}
        </div>
        <Link
          className="font-medium text-primary text-sm hover:underline"
          to={dealsUrl}
        >
          {t("viewAll")}
        </Link>
      </div>

      {counts.total === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {(["toSend", "withCustomer", "awaitingPayment"] as const).map(
              (stage) => (
                <div className="rounded-lg bg-muted/50 px-2 py-2" key={stage}>
                  <dd className="font-semibold text-xl tabular-nums">
                    {counts[stage]}
                  </dd>
                  <dt className="text-muted-foreground text-xs">
                    {t(stageKeys[stage])}
                  </dt>
                </div>
              ),
            )}
          </dl>
          <ul className="flex flex-col">
            {deals.map((deal) => (
              <li
                className="flex items-center justify-between gap-3 border-t py-2.5 first:border-t-0"
                key={deal.id}
              >
                <Link
                  className="min-w-0 hover:underline"
                  to={href("/organizations/:organizationSlug/deals/:dealId", {
                    dealId: deal.id,
                    organizationSlug,
                  })}
                >
                  <span className="block truncate font-medium text-sm">
                    {deal.title}
                  </span>
                  <span className="block truncate text-muted-foreground text-xs">
                    {deal.customerName}
                    {deal.stepName ? ` · ${deal.stepName}` : ""}
                  </span>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {deal.valueMinor !== null ? (
                    <span className="font-semibold text-sm tabular-nums">
                      {formatMoney({
                        amountMinor: deal.valueMinor,
                        currency: deal.currency,
                        locale,
                        whole: true,
                      })}
                    </span>
                  ) : null}
                  {deal.stage ? (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 font-medium text-[11px]",
                        stageTones[deal.stage],
                      )}
                    >
                      {t(stageKeys[deal.stage])}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
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
