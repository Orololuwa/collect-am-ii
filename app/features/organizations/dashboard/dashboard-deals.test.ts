import { describe, expect, test } from "vitest";

import type { DashboardDeal, DashboardDealStep } from "./dashboard-deals";
import { sortByAttention, summarizeDeal } from "./dashboard-deals";

const now = new Date("2026-10-31T12:00:00Z");
const daysFromNow = (days: number) =>
  new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const step = (overrides: Partial<DashboardDealStep>): DashboardDealStep => ({
  carryForward: "items",
  document: null,
  kind: "document",
  name: "Quote",
  requiresAcceptance: false,
  status: "pending",
  ...overrides,
});

const document = (
  overrides: Partial<NonNullable<DashboardDealStep["document"]>> = {},
) => ({
  dueAt: null,
  number: "QUO-0001",
  status: "sent",
  totalMinor: 100_000,
  type: "quote",
  ...overrides,
});

const deal = (
  steps: DashboardDealStep[],
  overrides: Partial<DashboardDeal> = {},
): DashboardDeal => ({
  currency: "NGN",
  customerName: "Ada",
  id: "deal",
  lastMessageAuthor: null,
  steps,
  title: "Kitchen",
  updatedAt: now,
  ...overrides,
});

describe("summarizeDeal()", () => {
  test("given: a draft final invoice, should: be ready to send", () => {
    const summary = summarizeDeal(
      deal([
        step({ document: document({ status: "accepted" }), status: "done" }),
        step({
          carryForward: "balance",
          document: document({
            number: null,
            status: "draft",
            type: "invoice",
          }),
          name: "Final invoice",
          status: "active",
        }),
      ]),
      now,
    );

    expect(summary).toMatchObject({
      attention: { reason: "draft" },
      stage: "toSend",
      stepName: "Final invoice",
      valueMinor: 100_000,
    });
  });

  test("given: a payment step after an invoice past its due date, should: be overdue", () => {
    const invoice = document({
      dueAt: daysFromNow(-2),
      number: "INV-0004",
      type: "invoice",
    });
    const summary = summarizeDeal(
      deal([
        step({ document: invoice, status: "done" }),
        step({ kind: "payment", name: "Payment", status: "active" }),
      ]),
      now,
    );

    expect(summary).toMatchObject({
      attention: {
        document: { number: "INV-0004", type: "invoice" },
        reason: "overdue",
      },
      stage: "awaitingPayment",
    });
  });

  test("given: a quote waiting for an answer, should: flag it when it expires soon or has expired", () => {
    const waiting = (dueAt: Date) =>
      deal([
        step({
          document: document({ dueAt }),
          requiresAcceptance: true,
          status: "active",
        }),
      ]);

    expect(
      summarizeDeal(waiting(daysFromNow(2)), now).attention?.reason,
    ).toEqual("expiring");
    expect(
      summarizeDeal(waiting(daysFromNow(-1)), now).attention?.reason,
    ).toEqual("expired");
    expect(summarizeDeal(waiting(daysFromNow(10)), now)).toMatchObject({
      attention: null,
      stage: "withCustomer",
    });
  });

  test("given: suggested changes and an unanswered message, should: put the suggestion first", () => {
    const summary = summarizeDeal(
      deal(
        [
          step({
            document: document({ status: "changesRequested" }),
            requiresAcceptance: true,
            status: "active",
          }),
        ],
        { lastMessageAuthor: "customer" },
      ),
      now,
    );

    expect(summary.attention?.reason).toEqual("proposal");
  });
});

describe("sortByAttention()", () => {
  test("given: several deals, should: keep only those needing someone, most urgent first", () => {
    const message = summarizeDeal(
      deal([step({ document: document(), status: "active" })], {
        id: "message",
        lastMessageAuthor: "customer",
      }),
      now,
    );
    const draft = summarizeDeal(
      deal(
        [step({ document: document({ status: "draft" }), status: "active" })],
        {
          id: "draft",
        },
      ),
      now,
    );
    const quiet = summarizeDeal(
      deal([step({ document: document(), status: "active" })], { id: "quiet" }),
      now,
    );

    expect(sortByAttention([message, quiet, draft]).map((d) => d.id)).toEqual([
      "draft",
      "message",
    ]);
  });
});
