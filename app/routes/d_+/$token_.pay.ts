import { data, redirect } from "react-router";

import type { Route } from "./+types/$token_.pay";
import {
  DEAL_PAYMENT_PROVIDERS,
  DealPaymentError,
  startDealOnlinePayment,
} from "~/features/deals/deal-payments.server";
import { retrieveDealForShareToken } from "~/features/deals/deal-room.server";
import { DEAL_ROOM_ACTION_LIMIT } from "~/features/deals/deal-room-action.server";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { notFound } from "~/utils/http-responses.server";
import { consumeRateLimit, getClientIp } from "~/utils/rate-limit.server";

const ERROR_KEYS = {
  notPayable: "payment.errors.notPayable",
  providerFailed: "payment.errors.providerFailed",
  providerUnavailable: "payment.errors.providerUnavailable",
} as const;

export const loader = ({ params }: Route.LoaderArgs) =>
  redirect(`/d/${params.token}`);

/**
 * Starts a Stripe or Paystack payment for the deal's current step and returns
 * the provider's checkout URL, which the page then opens. Errors come back as
 * a message to show on the page.
 */
export async function action({ request, params, context }: Route.ActionArgs) {
  const i18n = getInstance(context);
  const deal = await retrieveDealForShareToken(params.token);
  if (!deal) {
    throw notFound();
  }
  const fail = (message: string, status: number) =>
    data({ error: message, url: null }, { status });

  if (
    !consumeRateLimit({
      key: `deal-room:${deal.id}:${getClientIp(request)}`,
      limit: DEAL_ROOM_ACTION_LIMIT,
      windowMs: 10 * 60 * 1000,
    })
  ) {
    return fail(i18n.t("errors.rateLimited", { ns: "dealRoom" }), 429);
  }

  const formData = await request.formData();
  await checkHoneypot(Object.fromEntries(formData));
  const provider = DEAL_PAYMENT_PROVIDERS.find(
    (candidate) => candidate === formData.get("provider"),
  );
  if (!provider) {
    return fail(
      i18n.t(ERROR_KEYS.providerUnavailable, { ns: "dealRoom" }),
      400,
    );
  }

  try {
    const url = await startDealOnlinePayment({ dealId: deal.id, provider });
    return data({ error: null, url });
  } catch (error) {
    if (!(error instanceof DealPaymentError)) {
      throw error;
    }
    return fail(
      i18n.t(ERROR_KEYS[error.code], { ns: "dealRoom" }),
      error.code === "providerFailed" ? 502 : 400,
    );
  }
}
