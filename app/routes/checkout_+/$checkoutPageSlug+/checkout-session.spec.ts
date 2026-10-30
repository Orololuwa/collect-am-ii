import { describe, expect, onTestFinished, test } from "vitest";

import { action } from "./checkout-session";
import { setupCheckoutPageWithOrganization } from "~/features/checkout/checkout-factories.server";
import { stripeHandlers } from "~/test/mocks/handlers/stripe";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { createTestContextProvider } from "~/test/test-utils";
import { notFound } from "~/utils/http-responses.server";

const createUrl = (checkoutPageSlug: string) =>
  `http://localhost:3000/checkout/${checkoutPageSlug}/checkout-session`;

const pattern = "/checkout/:checkoutPageSlug/checkout-session";

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

const server = setupMockServerLifecycle(...stripeHandlers);

/** Collects the form params of each Checkout Session the route creates. */
function captureCreatedSessions() {
  const sessions: URLSearchParams[] = [];
  onTestFinished(() => {
    server.events.removeAllListeners();
  });
  server.events.on("request:start", async ({ request }) => {
    if (request.url.endsWith("/v1/checkout/sessions")) {
      sessions.push(new URLSearchParams(await request.clone().text()));
    }
  });
  return sessions;
}

describe("/checkout/:checkoutPageSlug/checkout-session route action", () => {
  test("given: a matching client amount, should: charge the stored total and send the items in minor units", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization();
    const sessions = captureCreatedSessions();

    const response = await sendRequest({
      body: createBody({ amountMajor: "25.50" }),
      checkoutPageSlug: checkoutPage.slug,
    });

    expect(response).toMatchObject({
      data: { url: expect.stringContaining("checkout.stripe.com") },
    });
    expect(sessions).toHaveLength(1);
    const [session] = sessions;
    expect(session?.get("line_items[0][price_data][unit_amount]")).toBe("2550");
    expect(
      JSON.parse(
        session?.get("payment_intent_data[metadata][itemsJson]") ?? "null",
      ),
    ).toEqual([
      { description: "Widget", quantity: 2, unitPriceMinor: 1000 },
      { description: "Gadget", quantity: 1, unitPriceMinor: 550 },
    ]);
  });

  test("given: a tampered client amount, should: reject it without creating a session", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization();
    const sessions = captureCreatedSessions();

    const response = await sendRequest({
      body: createBody({ amountMajor: "0.50" }),
      checkoutPageSlug: checkoutPage.slug,
    });

    expect(response).toMatchObject({ init: { status: 400 } });
    expect(sessions).toEqual([]);
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
