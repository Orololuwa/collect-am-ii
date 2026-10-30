import { addDays, startOfMonth, subDays } from "date-fns";

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
const TOP_PAGES = 4;
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

  const [collected, statusCounts, receipts, pageTotals] = await Promise.all([
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
    // Deal payments get their receipts from the deal, not this table.
    prisma.payment.findMany({
      select: { receipt: { select: { sentAt: true } } },
      where: {
        ...inOrganization,
        checkoutPageId: { not: null },
        ...inCurrency,
        createdAt: { gte: currentStart },
        status: { in: [...COLLECTED_STATUSES] },
      },
    }),
    prisma.payment.groupBy({
      _count: { _all: true },
      _max: { createdAt: true },
      _sum: { amountMinor: true },
      by: ["checkoutPageId"],
      where: {
        ...inOrganization,
        checkoutPageId: { not: null },
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

  const topPageTotals = pageTotals
    .sort((a, b) => (b._sum.amountMinor ?? 0) - (a._sum.amountMinor ?? 0))
    .slice(0, TOP_PAGES);
  const topPageNames = await prisma.checkoutPage.findMany({
    select: { id: true, name: true },
    where: {
      id: {
        in: topPageTotals.flatMap((page) =>
          page.checkoutPageId ? [page.checkoutPageId] : [],
        ),
      },
    },
  });

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
      sent: receipts.filter((payment) => payment.receipt?.sentAt).length,
      total: receipts.length,
    },
    topPages: topPageTotals.map((page) => ({
      amountMinor: page._sum.amountMinor ?? 0,
      id: page.checkoutPageId ?? "",
      lastPaymentAt: page._max.createdAt,
      name:
        topPageNames.find((named) => named.id === page.checkoutPageId)?.name ??
        "",
      payments: page._count._all,
    })),
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

/**
 * Things someone should look at: failed payments, receipts that weren't
 * emailed, checkout pages about to close, and pages with no receipt template.
 */
async function getAttentionItems(organizationId: string, now: Date) {
  const inOrganization = { organizationId };
  const activePage = {
    organizationId,
    isActive: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

  const [failedPayments, unsentReceipts, expiringPages, pagesWithoutReceipt] =
    await Promise.all([
      prisma.payment.count({
        where: {
          ...inOrganization,
          createdAt: { gte: subDays(now, 7) },
          status: "failed",
        },
      }),
      prisma.payment.count({
        where: {
          ...inOrganization,
          checkoutPageId: { not: null },
          createdAt: { gte: subDays(now, 30) },
          OR: [{ receipt: null }, { receipt: { sentAt: null } }],
          status: { in: [...COLLECTED_STATUSES] },
        },
      }),
      prisma.checkoutPage.findMany({
        orderBy: { expiresAt: "asc" },
        select: { expiresAt: true, id: true, name: true },
        take: 3,
        where: {
          organizationId,
          expiresAt: { gt: now, lte: addDays(now, 7) },
          isActive: true,
        },
      }),
      prisma.checkoutPage.findMany({
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true },
        take: 3,
        where: { ...activePage, receiptTemplateId: null },
      }),
    ]);

  return {
    deals: await getDealsNeedingAttention(organizationId),
    expiringPages,
    failedPayments,
    pagesWithoutReceipt,
    unsentReceipts,
  };
}

/** How many deals the attention list shows at most. */
const ATTENTION_DEALS = 5;

/**
 * Open deals waiting on the business: customer suggestions to review,
 * declined documents and customer messages nobody has answered.
 */
async function getDealsNeedingAttention(organizationId: string) {
  const deals = await prisma.deal.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      customer: { select: { name: true } },
      documents: {
        select: { status: true },
        where: { status: { in: ["changesRequested", "declined"] } },
      },
      id: true,
      messages: {
        orderBy: { createdAt: "desc" },
        select: { author: true },
        take: 1,
      },
      title: true,
    },
    take: 50,
    where: { organizationId, status: "open" },
  });
  return deals
    .flatMap((deal) => {
      const reason = deal.documents.some(
        (document) => document.status === "changesRequested",
      )
        ? ("proposal" as const)
        : deal.documents.some((document) => document.status === "declined")
          ? ("declined" as const)
          : deal.messages[0]?.author === "customer"
            ? ("message" as const)
            : null;
      return reason
        ? [
            {
              customer: deal.customer.name,
              id: deal.id,
              reason,
              title: deal.title,
            },
          ]
        : [];
    })
    .slice(0, ATTENTION_DEALS);
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

  const [stats, recentPayments, attention, templates, activity] =
    await Promise.all([
      getPaymentStats({ currency, now, organizationId, period }),
      getRecentPayments(organizationId),
      getAttentionItems(organizationId, now),
      getTemplateSummary(organizationId, now),
      getRecentActivity(organizationId, now),
    ]);

  return {
    activity,
    attention,
    currencies: paymentCurrencies.length > 0 ? paymentCurrencies : [currency],
    currency,
    isFirstRun: false as const,
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
