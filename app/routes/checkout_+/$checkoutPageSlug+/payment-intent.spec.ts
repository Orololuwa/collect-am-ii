import { describe, expect, test } from "vitest";

import { action } from "./payment-intent";
import { setupCheckoutPageWithOrganization } from "~/features/checkout/checkout-factories.server";
import { stripeHandlers } from "~/test/mocks/handlers/stripe";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { createTestContextProvider } from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { notFound } from "~/utils/http-responses.server";

const createUrl = (checkoutPageSlug: string) =>
  `http://localhost:3000/checkout/${checkoutPageSlug}/payment-intent`;

const pattern = "/checkout/:checkoutPageSlug/payment-intent";

async function sendRequest({
  body,
  checkoutPageSlug,
}: {
  body: Record<string, unknown>;
  checkoutPageSlug: string;
}) {
  const request = new Request(createUrl(checkoutPageSlug), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const params = { checkoutPageSlug };

  return await action({
    context: await createTestContextProvider({ params, pattern, request }),
    params,
    request,
    unstable_pattern: pattern,
  });
}

const createBody = (overrides: Record<string, unknown> = {}) => ({
  currency: "USD",
  customerEmail: "customer@example.com",
  provider: "stripe",
  ...overrides,
});

setupMockServerLifecycle(...stripeHandlers);

describe("/checkout/:checkoutPageSlug/payment-intent route action", () => {
  test("given: no client amount and client items, should: store the stored total and items, not the client's", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization();

    const response = await sendRequest({
      body: createBody({
        items: [{ description: "Free", quantity: "1", unitPrice: "0.01" }],
      }),
      checkoutPageSlug: checkoutPage.slug,
    });

    expect(response).toMatchObject({
      data: { clientSecret: expect.any(String) },
    });
    const payment = await prisma.payment.findFirstOrThrow({
      where: { checkoutPageId: checkoutPage.id },
    });
    expect(payment).toMatchObject({
      amountMinor: 2550,
      currency: "USD",
      items: [
        { description: "Widget", quantity: 2, unitPriceMinor: 1000 },
        { description: "Gadget", quantity: 1, unitPriceMinor: 550 },
      ],
    });
  });

  test("given: a tampered client amount, should: reject it without storing a payment", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization();

    const response = await sendRequest({
      body: createBody({ amountMajor: "2.55" }),
      checkoutPageSlug: checkoutPage.slug,
    });

    expect(response).toMatchObject({ init: { status: 400 } });
    expect(
      await prisma.payment.count({
        where: { checkoutPageId: checkoutPage.id },
      }),
    ).toBe(0);
  });

  test("given: a page past its expiry date, should: return a 404", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization({
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(
      sendRequest({ body: createBody(), checkoutPageSlug: checkoutPage.slug }),
    ).rejects.toEqual(notFound());
  });

  test("given: a password-protected page and no access cookie, should: return a 403", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization({
      isPasswordProtected: true,
      passwordHash: "not-checked-here",
    });

    const response = await sendRequest({
      body: createBody(),
      checkoutPageSlug: checkoutPage.slug,
    });

    expect(response).toMatchObject({ init: { status: 403 } });
  });
});
