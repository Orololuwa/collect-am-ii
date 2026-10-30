import { redirect } from "react-router";

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
import { redirectWithToast } from "~/utils/toast.server";

const ERROR_KEYS = {
  notPayable: "payment.errors.notPayable",
  providerFailed: "payment.errors.providerFailed",
  providerUnavailable: "payment.errors.providerUnavailable",
} as const;

export const loader = ({ params }: Route.LoaderArgs) =>
  redirect(`/d/${params.token}`);

/** Sends the customer to Stripe or Paystack to pay the deal's current step. */
export async function action({ request, params, context }: Route.ActionArgs) {
  const i18n = getInstance(context);
  const deal = await retrieveDealForShareToken(params.token);
  if (!deal) {
    throw notFound();
  }
  const roomUrl = `/d/${params.token}`;

  if (
    !consumeRateLimit({
      key: `deal-room:${deal.id}:${getClientIp(request)}`,
      limit: DEAL_ROOM_ACTION_LIMIT,
      windowMs: 10 * 60 * 1000,
    })
  ) {
    return redirectWithToast(roomUrl, {
      title: i18n.t("errors.rateLimited", { ns: "dealRoom" }),
      type: "error",
    });
  }

  const formData = await request.formData();
  await checkHoneypot(Object.fromEntries(formData));
  const provider = DEAL_PAYMENT_PROVIDERS.find(
    (candidate) => candidate === formData.get("provider"),
  );
  if (!provider) {
    return redirectWithToast(roomUrl, {
      title: i18n.t(ERROR_KEYS.providerUnavailable, { ns: "dealRoom" }),
      type: "error",
    });
  }

  try {
    return redirect(
      await startDealOnlinePayment({ dealId: deal.id, provider }),
    );
  } catch (error) {
    if (!(error instanceof DealPaymentError)) {
      throw error;
    }
    return redirectWithToast(roomUrl, {
      title: i18n.t(ERROR_KEYS[error.code], { ns: "dealRoom" }),
      type: "error",
    });
  }
}
