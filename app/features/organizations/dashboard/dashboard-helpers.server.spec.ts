import { createId } from "@paralleldrive/cuid2";
import { subDays } from "date-fns";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  dismissSetupGuide,
  getDashboardData,
} from "./dashboard-helpers.server";
import type { Organization, UserAccount } from "~/generated/client";
import {
  createUserWithOrgAndAddAsMember,
  teardownOrganizationAndMember,
} from "~/test/test-utils";
import { prisma } from "~/utils/database.server";

const now = new Date();

async function createCheckoutPage(
  organizationId: string,
  overrides: Partial<{
    name: string;
    expiresAt: Date | null;
    receiptTemplateId: string | null;
  }> = {},
) {
  return prisma.checkoutPage.create({
    data: {
      defaultCurrency: "NGN",
      globalStyles: {},
      name: overrides.name ?? "Consulting deposit",
      organizationId,
      paymentProviders: ["paystack"],
      sections: [],
      slug: `page-${createId()}`,
      ...overrides,
    },
  });
}

async function createPayment(
  checkoutPageId: string,
  {
    amountMinor,
    currency = "NGN",
    status = "succeeded",
    daysAgo = 1,
  }: {
    amountMinor: number;
    currency?: string;
    status?:
      | "succeeded"
      | "failed"
      | "refunded"
      | "pending"
      | "partially_refunded";
    daysAgo?: number;
  },
) {
  const { organizationId } = await prisma.checkoutPage.findUniqueOrThrow({
    select: { organizationId: true },
    where: { id: checkoutPageId },
  });
  return prisma.payment.create({
    data: {
      amountMinor,
      checkoutPageId,
      organizationId,
      createdAt: subDays(now, daysAgo),
      currency,
      customerEmail: `${createId()}@example.com`,
      customerName: "Ada Customer",
      items: [],
      provider: "paystack",
      providerPaymentId: createId(),
      status,
    },
  });
}

describe("getDashboardData()", () => {
  let organization: Organization;
  let user: UserAccount;

  beforeEach(async () => {
    ({ organization, user } = await createUserWithOrgAndAddAsMember());
  });

  afterEach(async () => {
    await teardownOrganizationAndMember({ organization, user });
  });

  test("given: an organization with no checkout pages or payments, should: return the first-run setup state", async () => {
    const result = await getDashboardData({
      now,
      organizationId: organization.id,
      period: 30,
      requestedCurrency: null,
    });

    expect(result).toEqual({
      currency: "USD",
      isFirstRun: true,
      period: 30,
      setup: {
        hasCheckoutPage: false,
        hasPayment: false,
        hasTeammates: false,
        hasTemplate: false,
      },
    });
  });

  test("given: an organization that skipped the setup guide, should: return the full dashboard with empty totals", async () => {
    await dismissSetupGuide(organization.id);

    const result = await getDashboardData({
      now,
      organizationId: organization.id,
      period: 30,
      requestedCurrency: null,
    });

    if (result.isFirstRun) {
      throw new Error("Expected the full dashboard");
    }
    expect(result.stats.collected.amountMinor).toEqual(0);
    expect(result.stats.payments.succeeded).toEqual(0);
    expect(result.stats.daily).toHaveLength(30);
    expect(result.recentPayments).toEqual([]);
    expect(result.currencies).toEqual(["USD"]);
  });

  test("given: payments in both periods and currencies, should: total the chosen currency and compare it with the previous period", async () => {
    const deposit = await createCheckoutPage(organization.id);
    const workshop = await createCheckoutPage(organization.id, {
      name: "Workshop ticket",
    });
    // Current 30 days, NGN.
    await createPayment(deposit.id, { amountMinor: 5_000_000, daysAgo: 1 });
    await createPayment(deposit.id, { amountMinor: 3_000_000, daysAgo: 3 });
    await createPayment(workshop.id, { amountMinor: 2_000_000, daysAgo: 2 });
    await createPayment(workshop.id, {
      amountMinor: 2_000_000,
      daysAgo: 2,
      status: "failed",
    });
    await createPayment(deposit.id, {
      amountMinor: 1_000_000,
      daysAgo: 4,
      status: "refunded",
    });
    // Previous 30 days, NGN.
    await createPayment(deposit.id, { amountMinor: 4_000_000, daysAgo: 40 });
    // Current 30 days, USD: kept out of the NGN totals.
    await createPayment(deposit.id, {
      amountMinor: 10_000,
      currency: "USD",
      daysAgo: 1,
    });

    const result = await getDashboardData({
      now,
      organizationId: organization.id,
      period: 30,
      requestedCurrency: null,
    });

    if (result.isFirstRun) {
      throw new Error("Expected the full dashboard");
    }
    expect(result.currency).toEqual("NGN");
    expect(result.currencies).toEqual(["NGN", "USD"]);
    expect(result.stats.collected.amountMinor).toEqual(10_000_000);
    expect(result.stats.collected.previousAmountMinor).toEqual(4_000_000);
    expect(result.stats.collected.changePercent).toEqual(150);
    expect(result.stats.payments).toMatchObject({
      changeCount: 2,
      failed: 1,
      refunded: 1,
      succeeded: 3,
    });
    expect(result.stats.average.amountMinor).toEqual(3_333_333);
    expect(result.stats.daily).toHaveLength(30);
    expect(
      result.stats.daily.reduce((sum, day) => sum + day.amountMinor, 0),
    ).toEqual(10_000_000);
    expect(result.recentPayments).toHaveLength(6);
  });

  test("given: a requested currency, should: show that currency's totals", async () => {
    const page = await createCheckoutPage(organization.id);
    await createPayment(page.id, { amountMinor: 5_000_000 });
    await createPayment(page.id, { amountMinor: 10_000, currency: "USD" });

    const result = await getDashboardData({
      now,
      organizationId: organization.id,
      period: 7,
      requestedCurrency: "usd",
    });

    if (result.isFirstRun) {
      throw new Error("Expected the full dashboard");
    }
    expect(result.currency).toEqual("USD");
    expect(result.stats.collected.amountMinor).toEqual(10_000);
    expect(result.stats.daily).toHaveLength(7);
  });

  test("given: checkout pages but no deals, should: have nothing needing attention and no open deals", async () => {
    await createCheckoutPage(organization.id, {
      expiresAt: subDays(now, -3),
      name: "Workshop ticket",
    });

    const result = await getDashboardData({
      now,
      organizationId: organization.id,
      period: 30,
      requestedCurrency: null,
    });

    if (result.isFirstRun) {
      throw new Error("Expected the full dashboard");
    }
    expect(result.attention).toEqual([]);
    expect(result.openDeals).toMatchObject({
      counts: { awaitingPayment: 0, toSend: 0, total: 0, withCustomer: 0 },
      deals: [],
      valueMinor: 0,
    });
    expect(result.stats.collected.amountMinor).toEqual(0);
    expect(result.stats.collected.changePercent).toBeNull();
  });
});
