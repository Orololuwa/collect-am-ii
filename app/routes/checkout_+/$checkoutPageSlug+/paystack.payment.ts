import { init } from "@paralleldrive/cuid2";
import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/paystack.payment";
import { retrieveCheckoutPageFromDatabaseBySlug } from "~/features/checkout/checkout-pages-model.server";
import {
  computeCheckoutPagePayment,
  getHasCheckoutPaymentAccess,
  getIsCheckoutPageOpenForPayment,
  getIsClientAmountMatching,
} from "~/features/checkout/checkout-payment-start.server";
import { upsertPaymentToDatabaseByProviderAndProviderPaymentId } from "~/features/checkout/payments-model.server";
import { initializePaystackTransaction } from "~/features/checkout/paystack.server";
import type { Prisma } from "~/generated/client";
import { notFound } from "~/utils/http-responses.server";

const cuid = init({ length: 10 });

const schema = z.object({
  provider: z.literal("paystack"),
  /** What the customer saw; only checked against the server total, never charged. */
  amountMajor: z.string().optional(),
  currency: z.string().min(3),
  customerEmail: z.string().email(),
  customerName: z.string().optional().default(""),
});

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ message: "Method Not Allowed" }, { status: 405 });
  }

  const checkoutPage = await retrieveCheckoutPageFromDatabaseBySlug({
    slug: params.checkoutPageSlug,
  });
  if (!checkoutPage || !getIsCheckoutPageOpenForPayment(checkoutPage)) {
    throw notFound();
  }
  if (!(await getHasCheckoutPaymentAccess({ checkoutPage, request }))) {
    return data(
      { error: "Enter the checkout password before paying" },
      { status: 403 },
    );
  }
  if (!checkoutPage.paymentProviders.includes("paystack")) {
    return data(
      { error: "Paystack is not enabled for this checkout page" },
      { status: 400 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = await schema.safeParseAsync(payload);
  if (!parsed.success) {
    return data({ error: parsed.error.flatten() }, { status: 400 });
  }

  const currency = parsed.data.currency.toUpperCase();
  if (!checkoutPage.allowedCurrencies.includes(currency)) {
    return data({ error: "Currency not allowed" }, { status: 400 });
  }

  const payment = computeCheckoutPagePayment({ checkoutPage, currency });
  if (!payment) {
    return data(
      { error: "This checkout has no payable total" },
      { status: 400 },
    );
  }
  if (
    parsed.data.amountMajor !== undefined &&
    !getIsClientAmountMatching({
      amountMajor: parsed.data.amountMajor,
      amountMinor: payment.amountMinor,
      currency,
    })
  ) {
    return data(
      { error: "The order total has changed. Reload the page and try again." },
      { status: 400 },
    );
  }
  const { amountMinor, items } = payment;
  const reference = `chk_${cuid()}`;

  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!appUrl) {
    return data(
      { error: "APP_URL is not configured on the server" },
      { status: 500 },
    );
  }

  const slug = params.checkoutPageSlug;
  const callbackUrl = `${appUrl}/checkout/${slug}/payment-complete`;

  let authorizationUrl: string;
  try {
    const result = await initializePaystackTransaction({
      amountMinor,
      callbackUrl,
      currency,
      email: parsed.data.customerEmail,
      reference,
      metadata: {
        checkoutPageId: checkoutPage.id,
        organizationId: checkoutPage.organizationId,
      },
    });
    authorizationUrl = result.authorizationUrl;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Paystack initialization failed";
    return data({ error: message }, { status: 502 });
  }

  await upsertPaymentToDatabaseByProviderAndProviderPaymentId({
    provider: "paystack",
    providerPaymentId: reference,
    create: {
      amountMinor,
      checkoutPage: { connect: { id: checkoutPage.id } },
      organization: { connect: { id: checkoutPage.organizationId } },
      currency,
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName || null,
      customerPhone: null,
      items: items as unknown as Prisma.InputJsonValue,
      metadata: { paystack: { reference } } as unknown as Prisma.InputJsonValue,
      provider: "paystack",
      providerCustomerId: null,
      providerPaymentId: reference,
      status: "pending",
    },
    update: {
      amountMinor,
      currency,
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName || null,
      items: items as unknown as Prisma.InputJsonValue,
      status: "pending",
    },
  });

  return data({ authorizationUrl, reference });
}
