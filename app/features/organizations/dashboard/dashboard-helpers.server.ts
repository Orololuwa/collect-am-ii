import { startOfMonth, subDays } from "date-fns";

import type { DealStage } from "./dashboard-deals";
import { sortByAttention, summarizeDeal } from "./dashboard-deals";
import type { DashboardPeriod } from "./dashboard-metrics";
import {
  bucketSeries,
  buildDailySeries,
  COLLECTED_STATUSES,
  getPeriodRanges,
  percentChange,
  pickDashboardCurrency,
} from "./dashboard-metrics";
import type { PaymentStatus, TemplateType } from "~/generated/client";
import { prisma } from "~/utils/database.server";

const RECENT_PAYMENTS = 6;
const RECENT_TEMPLATES = 3;
const ACTIVITY_ITEMS = 6;

export type DashboardActivity =
  | {
      id: string;
      kind: "payment";
      timestamp: Date;
      customer: string;
      amountMinor: number;
      currency: string;
      pageName: string;
    }
  | { id: string; kind: "memberJoined"; timestamp: Date; member: string }
  | { id: string; kind: "templateCreated"; timestamp: Date; name: string }
  | { id: string; kind: "checkoutPageCreated"; timestamp: Date; name: string };

/**
 * Whether the organization has done the steps the first-run checklist lists.
 */
async function getSetupProgress(organizationId: string) {
  const [templates, checkoutPages, payments, members] = await Promise.all([
    prisma.template.count({ where: { organizationId } }),
    prisma.checkoutPage.count({ where: { organizationId } }),
    prisma.payment.count({
      where: {
        organizationId,
        status: { in: [...COLLECTED_STATUSES] },
      },
    }),
    prisma.organizationMembership.count({
      where: {
        organizationId,
        OR: [{ deactivatedAt: null }, { deactivatedAt: { gt: new Date() } }],
      },
    }),
  ]);

  return {
    hasCheckoutPage: checkoutPages > 0,
    hasPayment: payments > 0,
    hasTeammates: members > 1,
    hasTemplate: templates > 0,
  };
}

async function getPaymentCurrencies(organizationId: string) {
  const groups = await prisma.payment.groupBy({
    _count: { _all: true },
    by: ["currency"],
    where: { organizationId },
  });
  return groups
    .sort((a, b) => b._count._all - a._count._all)
    .map((group) => group.currency.toUpperCase());
}

/** Whether a collected payment's receipt has gone out to the customer. */
function isReceiptSent(payment: {
  receipt: { sentAt: Date | null } | null;
  dealStep: {
    position: number;
    deal: {
      steps: Array<{
        position: number;
        document: { sentAt: Date | null } | null;
      }>;
    };
  } | null;
}) {
  if (payment.dealStep) {
    const { position, deal } = payment.dealStep;
    return Boolean(
      deal.steps.find((step) => step.position === position + 1)?.document
        ?.sentAt,
    );
  }
  return Boolean(payment.receipt?.sentAt);
}

/**
 * Money, payment counts and receipts for the current and previous period, in
 * one currency.
 */
async function getPaymentStats({
  organizationId,
  currency,
  period,
  now,
}: {
  organizationId: string;
  currency: string;
  period: DashboardPeriod;
  now: Date;
}) {
  const { currentStart, previousStart } = getPeriodRanges(period, now);
  const inOrganization = { organizationId };
  const inCurrency = {
    currency: { equals: currency, mode: "insensitive" as const },
  };

  const [collected, statusCounts, receipts] = await Promise.all([
    prisma.payment.findMany({
      select: { amountMinor: true, createdAt: true },
      where: {
        ...inOrganization,
        ...inCurrency,
        createdAt: { gte: previousStart },
        status: { in: [...COLLECTED_STATUSES] },
      },
    }),
    prisma.payment.groupBy({
      _count: { _all: true },
      by: ["status"],
      where: {
        ...inOrganization,
        ...inCurrency,
        createdAt: { gte: currentStart },
      },
    }),
    // Checkout payments have a Receipt row; deal payments get theirs from
    // the deal's receipt step that follows the payment step.
    prisma.payment.findMany({
      select: {
        dealStep: {
          select: {
            deal: {
              select: {
                steps: {
                  select: {
                    document: { select: { sentAt: true } },
                    position: true,
                  },
                  where: { kind: "receipt" },
                },
              },
            },
            position: true,
          },
        },
        receipt: { select: { sentAt: true } },
      },
      where: {
        ...inOrganization,
        ...inCurrency,
        createdAt: { gte: currentStart },
        status: { in: [...COLLECTED_STATUSES] },
      },
    }),
  ]);

  const current = collected.filter((p) => p.createdAt >= currentStart);
  const previous = collected.filter((p) => p.createdAt < currentStart);
  const sum = (payments: typeof collected) =>
    payments.reduce((total, p) => total + p.amountMinor, 0);

  const amountMinor = sum(current);
  const previousAmountMinor = sum(previous);
  const daily = buildDailySeries({
    currentStart,
    days: period,
    payments: collected,
    previousStart,
  });

  const countFor = (statuses: PaymentStatus[]) =>
    statusCounts
      .filter((group) => statuses.includes(group.status))
      .reduce((total, group) => total + group._count._all, 0);
  const succeeded = countFor([...COLLECTED_STATUSES]);
  const previousSucceeded = previous.length;

  const averageMinor = succeeded > 0 ? Math.round(amountMinor / succeeded) : 0;
  const previousAverageMinor =
    previousSucceeded > 0
      ? Math.round(previousAmountMinor / previousSucceeded)
      : 0;

  return {
    average: {
      amountMinor: averageMinor,
      changePercent: percentChange(averageMinor, previousAverageMinor),
    },
    collected: {
      amountMinor,
      changePercent: percentChange(amountMinor, previousAmountMinor),
      previousAmountMinor,
      spark: bucketSeries(daily.map((day) => day.amountMinor)),
    },
    daily,
    payments: {
      changeCount: succeeded - previousSucceeded,
      failed: countFor(["failed"]),
      refunded: countFor(["refunded", "partially_refunded"]),
      spark: bucketSeries(daily.map((day) => day.count)),
      succeeded,
    },
    receipts: {
      sent: receipts.filter(isReceiptSent).length,
      total: receipts.length,
    },
  };
}

async function getRecentPayments(organizationId: string) {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      amountMinor: true,
      checkoutPage: { select: { id: true, name: true } },
      createdAt: true,
      currency: true,
      customerEmail: true,
      customerName: true,
      deal: { select: { id: true, title: true } },
      id: true,
      provider: true,
      status: true,
    },
    take: RECENT_PAYMENTS,
    where: { organizationId },
  });
  return payments.map(({ checkoutPage, deal, ...payment }) => ({
    ...payment,
    currency: payment.currency.toUpperCase(),
    /** Where the payment came from: a checkout page or a deal. */
    source: checkoutPage
      ? {
          id: checkoutPage.id,
          kind: "checkoutPage" as const,
          name: checkoutPage.name,
        }
      : deal
        ? { id: deal.id, kind: "deal" as const, name: deal.title }
        : null,
  }));
}

/** How many deals the attention list and the open deals card show. */
const ATTENTION_DEALS = 8;
const OPEN_DEALS_LISTED = 5;

/**
 * Open deals: what needs the business to act (customer suggestions, drafts
 * ready to send, overdue payments, expiring quotes, unanswered messages) and
 * where the rest are waiting.
 */
async function getDealOverview({
  organizationId,
  currency,
  now,
}: {
  organizationId: string;
  currency: string;
  now: Date;
}) {
  const deals = await prisma.deal.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      currency: true,
      customer: { select: { name: true } },
      id: true,
      messages: {
        orderBy: { createdAt: "desc" },
        select: { author: true },
        take: 1,
      },
      steps: {
        orderBy: { position: "asc" },
        select: {
          carryForward: true,
          document: {
            select: {
              dueAt: true,
              number: true,
              status: true,
              type: true,
              versions: {
                select: { totalMinor: true },
                where: { state: "current" },
              },
            },
          },
          kind: true,
          name: true,
          requiresAcceptance: true,
          status: true,
        },
      },
      title: true,
      updatedAt: true,
    },
    take: 200,
    where: { organizationId, status: "open" },
  });

  const summaries = deals.map((deal) =>
    summarizeDeal(
      {
        currency: deal.currency,
        customerName: deal.customer.name,
        id: deal.id,
        lastMessageAuthor: deal.messages[0]?.author ?? null,
        steps: deal.steps.map((step) => ({
          ...step,
          document: step.document
            ? {
                dueAt: step.document.dueAt,
                number: step.document.number,
                status: step.document.status,
                totalMinor: step.document.versions[0]?.totalMinor ?? null,
                type: step.document.type,
              }
            : null,
        })),
        title: deal.title,
        updatedAt: deal.updatedAt,
      },
      now,
    ),
  );
  const count = (stage: DealStage) =>
    summaries.filter((deal) => deal.stage === stage).length;

  return {
    attention: sortByAttention(summaries).slice(0, ATTENTION_DEALS),
    openDeals: {
      counts: {
        awaitingPayment: count("awaitingPayment"),
        toSend: count("toSend"),
        total: summaries.length,
        withCustomer: count("withCustomer"),
      },
      deals: summaries.slice(0, OPEN_DEALS_LISTED),
      /** What the open deals in the dashboard's currency are worth. */
      valueMinor: summaries
        .filter((deal) => deal.currency.toUpperCase() === currency)
        .reduce((sum, deal) => sum + (deal.valueMinor ?? 0), 0),
    },
  };
}

async function getTemplateSummary(organizationId: string, now: Date) {
  const [total, thisMonth, byType, recent] = await Promise.all([
    prisma.template.count({ where: { organizationId } }),
    prisma.template.count({
      where: { createdAt: { gte: startOfMonth(now) }, organizationId },
    }),
    prisma.template.groupBy({
      _count: { _all: true },
      by: ["type"],
      where: { organizationId },
    }),
    prisma.template.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, type: true, updatedAt: true },
      take: RECENT_TEMPLATES,
      where: { organizationId },
    }),
  ]);

  return {
    byType: byType
      .map((group) => ({ count: group._count._all, type: group.type }))
      .sort((a, b) => b.count - a.count) as Array<{
      count: number;
      type: TemplateType;
    }>,
    recent,
    thisMonth,
    total,
  };
}

/**
 * Recent events across the organization, newest first. Templates don't record
 * who made them, so template and page events carry no person.
 */
async function getRecentActivity(
  organizationId: string,
  now: Date,
): Promise<DashboardActivity[]> {
  const since = subDays(now, 30);
  const [payments, members, templates, checkoutPages] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        amountMinor: true,
        checkoutPage: { select: { name: true } },
        createdAt: true,
        currency: true,
        customerEmail: true,
        customerName: true,
        deal: { select: { title: true } },
        id: true,
      },
      take: ACTIVITY_ITEMS,
      where: {
        organizationId,
        createdAt: { gte: since },
        status: { in: [...COLLECTED_STATUSES] },
      },
    }),
    prisma.organizationMembership.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        member: { select: { email: true, id: true, name: true } },
      },
      take: ACTIVITY_ITEMS,
      where: { createdAt: { gte: since }, organizationId },
    }),
    prisma.template.findMany({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, id: true, name: true },
      take: ACTIVITY_ITEMS,
      where: { createdAt: { gte: since }, organizationId },
    }),
    prisma.checkoutPage.findMany({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, id: true, name: true },
      take: ACTIVITY_ITEMS,
      where: { createdAt: { gte: since }, organizationId },
    }),
  ]);

  const activity: DashboardActivity[] = [
    ...payments.map((payment) => ({
      amountMinor: payment.amountMinor,
      currency: payment.currency.toUpperCase(),
      customer: payment.customerName || payment.customerEmail,
      id: `payment-${payment.id}`,
      kind: "payment" as const,
      pageName: payment.checkoutPage?.name ?? payment.deal?.title ?? "",
      timestamp: payment.createdAt,
    })),
    ...members.map((membership) => ({
      id: `member-${membership.member.id}`,
      kind: "memberJoined" as const,
      member: membership.member.name || membership.member.email,
      timestamp: membership.createdAt,
    })),
    ...templates.map((template) => ({
      id: `template-${template.id}`,
      kind: "templateCreated" as const,
      name: template.name,
      timestamp: template.createdAt,
    })),
    ...checkoutPages.map((page) => ({
      id: `checkout-page-${page.id}`,
      kind: "checkoutPageCreated" as const,
      name: page.name,
      timestamp: page.createdAt,
    })),
  ];

  return activity
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, ACTIVITY_ITEMS);
}

/**
 * Gets all dashboard data for an organization.
 */
export async function getDashboardData({
  organizationId,
  period,
  requestedCurrency,
  now = new Date(),
}: {
  organizationId: string;
  period: DashboardPeriod;
  requestedCurrency: string | null;
  now?: Date;
}) {
  const [setup, paymentCurrencies, defaultPage, organization] =
    await Promise.all([
      getSetupProgress(organizationId),
      getPaymentCurrencies(organizationId),
      prisma.checkoutPage.findFirst({
        orderBy: { createdAt: "asc" },
        select: { defaultCurrency: true },
        where: { organizationId },
      }),
      prisma.organization.findUnique({
        select: { setupGuideDismissedAt: true },
        where: { id: organizationId },
      }),
    ]);

  const currency = pickDashboardCurrency({
    fallback: defaultPage?.defaultCurrency,
    paymentCurrencies,
    requested: requestedCurrency,
  });

  // Until the first checkout page exists there's nothing to chart, so the
  // page shows the setup guide, unless someone in the organization skipped it.
  if (
    !setup.hasCheckoutPage &&
    !setup.hasPayment &&
    !organization?.setupGuideDismissedAt
  ) {
    return { currency, isFirstRun: true as const, period, setup };
  }

  const [stats, recentPayments, { attention, openDeals }, templates, activity] =
    await Promise.all([
      getPaymentStats({ currency, now, organizationId, period }),
      getRecentPayments(organizationId),
      getDealOverview({ currency, now, organizationId }),
      getTemplateSummary(organizationId, now),
      getRecentActivity(organizationId, now),
    ]);

  return {
    activity,
    attention,
    currencies: paymentCurrencies.length > 0 ? paymentCurrencies : [currency],
    currency,
    isFirstRun: false as const,
    openDeals,
    period,
    recentPayments,
    setup,
    stats,
    templates,
  } as const;
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
export type FullDashboardData = Extract<DashboardData, { isFirstRun: false }>;

/**
 * Hides the dashboard's setup guide for everyone in the organization.
 */
export async function dismissSetupGuide(organizationId: string) {
  await prisma.organization.update({
    data: { setupGuideDismissedAt: new Date() },
    where: { id: organizationId },
  });
}
