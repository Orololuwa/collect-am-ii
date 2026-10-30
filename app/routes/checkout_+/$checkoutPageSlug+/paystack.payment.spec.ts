import { HttpResponse, http } from "msw";
import { describe, expect, onTestFinished, test } from "vitest";

import { action } from "./paystack.payment";
import { setupCheckoutPageWithOrganization } from "~/features/checkout/checkout-factories.server";
import { setCheckoutAccessSession } from "~/features/checkout/public-checkout-session.server";
import { paystackHandlers } from "~/test/mocks/handlers/paystack";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";
import { createTestContextProvider } from "~/test/test-utils";
import { prisma } from "~/utils/database.server";
import { notFound } from "~/utils/http-responses.server";

const createUrl = (checkoutPageSlug: string) =>
  `http://localhost:3000/checkout/${checkoutPageSlug}/paystack/payment`;

const pattern = "/checkout/:checkoutPageSlug/paystack/payment";

async function sendRequest({
  body,
  checkoutPageSlug,
  cookie,
}: {
  body: Record<string, unknown>;
  checkoutPageSlug: string;
  cookie?: string;
}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) headers.set("Cookie", cookie);
  const request = new Request(createUrl(checkoutPageSlug), {
    body: JSON.stringify(body),
    headers,
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
  currency: "NGN",
  customerEmail: "customer@example.com",
  customerName: "Ada Customer",
  provider: "paystack",
  ...overrides,
});

const server = setupMockServerLifecycle(...paystackHandlers);

function captureInitializedAmounts() {
  const amounts: number[] = [];
  onTestFinished(() => {
    server.events.removeAllListeners();
  });
  server.events.on("request:start", async ({ request }) => {
    if (request.url.endsWith("/transaction/initialize")) {
      const body = (await request.clone().json()) as { amount: number };
      amounts.push(body.amount);
    }
  });
  return amounts;
}

describe("/checkout/:checkoutPageSlug/paystack/payment route action", () => {
  test("given: no client amount, should: charge the total of the stored items and store the items in minor units", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization();
    const initializedAmounts = captureInitializedAmounts();

    const response = await sendRequest({
      body: createBody(),
      checkoutPageSlug: checkoutPage.slug,
    });

    expect(response).toMatchObject({
      data: { authorizationUrl: expect.stringContaining("paystack.com") },
    });
    expect(initializedAmounts).toEqual([2550]);
    const payment = await prisma.payment.findFirstOrThrow({
      where: { checkoutPageId: checkoutPage.id },
    });
    expect(payment).toMatchObject({
      amountMinor: 2550,
      currency: "NGN",
      items: [
        { description: "Widget", quantity: 2, unitPriceMinor: 1000 },
        { description: "Gadget", quantity: 1, unitPriceMinor: 550 },
      ],
      status: "pending",
    });
  });

  test("given: a client amount that matches the stored total, should: start the payment", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization();

    const response = await sendRequest({
      body: createBody({ amountMajor: "25.5" }),
      checkoutPageSlug: checkoutPage.slug,
    });

    expect(response).toMatchObject({
      data: { reference: expect.stringMatching(/^chk_/) },
    });
  });

  test("given: a tampered client amount and items, should: reject it without starting a payment", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization();
    const initializedAmounts = captureInitializedAmounts();

    const response = await sendRequest({
      body: createBody({
        amountMajor: "1.00",
        items: [{ description: "Widget", quantity: "1", unitPrice: "1.00" }],
      }),
      checkoutPageSlug: checkoutPage.slug,
    });

    expect(response).toMatchObject({
      data: {
        error: "The order total has changed. Reload the page and try again.",
      },
      init: { status: 400 },
    });
    expect(initializedAmounts).toEqual([]);
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

  test("given: an inactive page, should: return a 404", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization({
      isActive: false,
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

    expect(response).toMatchObject({
      data: { error: "Enter the checkout password before paying" },
      init: { status: 403 },
    });
  });

  test("given: a password-protected page and an access cookie for another page, should: return a 403", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization({
      isPasswordProtected: true,
      passwordHash: "not-checked-here",
    });
    const setCookie = await setCheckoutAccessSession({
      checkoutPageSlug: "some-other-page",
    });

    const response = await sendRequest({
      body: createBody(),
      checkoutPageSlug: checkoutPage.slug,
      cookie: setCookie.split(";")[0],
    });

    expect(response).toMatchObject({ init: { status: 403 } });
  });

  test("given: a password-protected page and a valid access cookie, should: start the payment", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization({
      isPasswordProtected: true,
      passwordHash: "not-checked-here",
    });
    const setCookie = await setCheckoutAccessSession({
      checkoutPageSlug: checkoutPage.slug,
    });

    const response = await sendRequest({
      body: createBody(),
      checkoutPageSlug: checkoutPage.slug,
      cookie: setCookie.split(";")[0],
    });

    expect(response).toMatchObject({
      data: { authorizationUrl: expect.any(String) },
    });
  });

  test("given: Paystack failing to initialize, should: return a 502", async () => {
    const { checkoutPage } = await setupCheckoutPageWithOrganization();
    server.use(
      http.post("https://api.paystack.co/transaction/initialize", () =>
        HttpResponse.json(
          { message: "Invalid key", status: false },
          { status: 401 },
        ),
      ),
    );

    const response = await sendRequest({
      body: createBody(),
      checkoutPageSlug: checkoutPage.slug,
    });

    expect(response).toMatchObject({
      data: { error: "Invalid key" },
      init: { status: 502 },
    });
  });
});
