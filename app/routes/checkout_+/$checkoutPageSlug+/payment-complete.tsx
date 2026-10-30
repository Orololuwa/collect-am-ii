import confetti from "canvas-confetti";
import { BadgeCheckIcon, CircleXIcon } from "lucide-react";
import * as React from "react";
import { data, Link, useSearchParams } from "react-router";

import type { Route } from "./+types/payment-complete";
import { stripeAdmin } from "~/features/billing/stripe-admin.server";
import { retrieveCheckoutPageFromDatabaseBySlug } from "~/features/checkout/checkout-pages-model.server";
import { deactivateCheckoutPageAfterSuccessfulPaymentInDatabase } from "~/features/checkout/deactivate-checkout-after-payment.server";
import {
  getIsPaystackTransactionMatchingPayment,
  verifyPaystackTransaction,
} from "~/features/checkout/paystack.server";
import { prisma } from "~/utils/database.server";
import { notFound } from "~/utils/http-responses.server";

export type CheckoutPaymentVerification = "paid" | "failed" | "unknown";

export async function loader({ params, request }: Route.LoaderArgs) {
  const checkoutPage = await retrieveCheckoutPageFromDatabaseBySlug({
    slug: params.checkoutPageSlug,
  });
  if (!checkoutPage) {
    throw notFound();
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  const paystackRef =
    url.searchParams.get("reference") ?? url.searchParams.get("trxref");
  const redirectStatus = url.searchParams.get("redirect_status");

  let serverPaymentVerified: CheckoutPaymentVerification = "unknown";

  if (sessionId) {
    try {
      const session = await stripeAdmin.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      });
      const pi = session.payment_intent;
      const meta =
        pi && typeof pi === "object" && "metadata" in pi
          ? (pi as { metadata?: Record<string, string> }).metadata
          : undefined;
      const pageIdFromMeta = meta?.checkoutPageId;
      const matchesPage =
        typeof pageIdFromMeta === "string" &&
        pageIdFromMeta === checkoutPage.id;

      if (matchesPage && session.payment_status === "paid") {
        serverPaymentVerified = "paid";
        await deactivateCheckoutPageAfterSuccessfulPaymentInDatabase({
          checkoutPageId: checkoutPage.id,
        });
      } else if (
        matchesPage &&
        (session.payment_status === "unpaid" ||
          session.status === "expired" ||
          session.status === "open")
      ) {
        serverPaymentVerified = "failed";
      }
    } catch {
      serverPaymentVerified = "unknown";
    }
  }

  if (paystackRef && serverPaymentVerified === "unknown") {
    try {
      const verified = await verifyPaystackTransaction({
        reference: paystackRef,
      });
      const payment = await prisma.payment.findUnique({
        where: {
          provider_providerPaymentId: {
            provider: "paystack",
            providerPaymentId: paystackRef,
          },
        },
        select: { amountMinor: true, checkoutPageId: true, currency: true },
      });
      const matchesPage = payment?.checkoutPageId === checkoutPage.id;
      const matchesAmount =
        payment != null &&
        getIsPaystackTransactionMatchingPayment({
          payment,
          transaction: verified,
        });
      if (matchesPage && verified.status === "success" && matchesAmount) {
        serverPaymentVerified = "paid";
        await deactivateCheckoutPageAfterSuccessfulPaymentInDatabase({
          checkoutPageId: checkoutPage.id,
        });
      } else if (matchesPage && verified.status !== "success") {
        serverPaymentVerified = "failed";
      }
    } catch {
      serverPaymentVerified = "unknown";
    }
  }

  if (
    (redirectStatus === "failed" ||
      redirectStatus === "canceled" ||
      redirectStatus === "cancelled") &&
    serverPaymentVerified === "unknown"
  ) {
    serverPaymentVerified = "failed";
  }

  const refreshed = await retrieveCheckoutPageFromDatabaseBySlug({
    slug: params.checkoutPageSlug,
  });

  return data({
    checkoutPageSlug: checkoutPage.slug,
    pageName: checkoutPage.name,
    checkoutAcceptsNewPayments: refreshed?.isActive ?? false,
    serverPaymentVerified,
  });
}

export default function CheckoutPaymentCompleteRoute({
  loaderData,
}: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const redirectStatus = searchParams.get("redirect_status");
  const paystackReturn =
    Boolean(searchParams.get("reference")) ||
    Boolean(searchParams.get("trxref"));

  const clientHeuristicSuccess =
    redirectStatus === "succeeded" ||
    Boolean(searchParams.get("session_id")) ||
    paystackReturn;

  const clientHeuristicFailed =
    redirectStatus === "failed" ||
    redirectStatus === "canceled" ||
    redirectStatus === "cancelled";

  const { serverPaymentVerified } = loaderData;

  const succeeded =
    serverPaymentVerified === "paid" ||
    (serverPaymentVerified === "unknown" && clientHeuristicSuccess);

  const failed =
    serverPaymentVerified === "failed" ||
    (serverPaymentVerified === "unknown" && clientHeuristicFailed);

  const verifiedWithProvider = serverPaymentVerified === "paid";

  React.useEffect(() => {
    if (!succeeded || !verifiedWithProvider) return;

    const end = Date.now() + 1800;
    const colors = ["#22c55e", "#3b82f6", "#eab308"];

    const frame = () => {
      if (Date.now() > end) return;
      void confetti({
        angle: 60,
        colors,
        origin: { x: 0, y: 0.55 },
        particleCount: 4,
        spread: 50,
        startVelocity: 35,
      });
      void confetti({
        angle: 120,
        colors,
        origin: { x: 1, y: 0.55 },
        particleCount: 4,
        spread: 50,
        startVelocity: 35,
      });
      requestAnimationFrame(frame);
    };

    frame();
  }, [succeeded, verifiedWithProvider]);

  const showReturnToCheckout =
    loaderData.checkoutAcceptsNewPayments && !succeeded;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
        {succeeded ? (
          <>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-500/15">
              <BadgeCheckIcon
                aria-hidden
                className="size-10 text-green-600 dark:text-green-400"
              />
            </div>
            <h1 className="mt-5 text-xl font-semibold tracking-tight">
              Payment successful
            </h1>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              Thank you
              {loaderData.pageName ? ` — ${loaderData.pageName}` : ""}.
            </p>
            <p className="text-muted-foreground mt-3 text-sm text-pretty border-t border-border pt-4">
              This link was for a one-time payment. It can&apos;t be used again;
              if you need another invoice, ask the business for a new checkout
              link.
            </p>
            {verifiedWithProvider ? (
              <p className="text-muted-foreground mt-2 text-xs">
                You should receive a confirmation email shortly.
              </p>
            ) : null}
          </>
        ) : failed ? (
          <>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <CircleXIcon aria-hidden className="size-10 text-destructive" />
            </div>
            <h1 className="mt-5 text-xl font-semibold tracking-tight">
              Payment could not be completed
            </h1>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              {redirectStatus
                ? `Status: ${redirectStatus}. You can try again if this checkout link is still open.`
                : "Something went wrong. You can try again from the checkout page if it is still available."}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Payment</h1>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              If you completed a payment, you should receive a confirmation
              email. Otherwise return to checkout to try again.
            </p>
          </>
        )}

        {showReturnToCheckout ? (
          <Link
            className="mt-8 inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            to={`/checkout/${loaderData.checkoutPageSlug}`}
          >
            Back to checkout
          </Link>
        ) : succeeded ? (
          <p className="text-muted-foreground mt-8 text-xs">
            You can close this window.
          </p>
        ) : null}
      </div>
    </div>
  );
}
