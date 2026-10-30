import type { HttpHandler } from "msw";
import { HttpResponse, http } from "msw";

import { requireHeader } from "../utils";

const { json } = HttpResponse;

/** Transactions initialized through the mock, so verify can echo them back. */
const transactions = new Map<string, { amount: number; currency: string }>();

export const paystackHandlers: Array<HttpHandler> = [
  http.post(
    "https://api.paystack.co/transaction/initialize",
    async ({ request }) => {
      requireHeader(request.headers, "Authorization");
      const body = (await request.json()) as {
        amount: number;
        currency: string;
        reference: string;
      };
      transactions.set(body.reference, {
        amount: body.amount,
        currency: body.currency,
      });

      return json({
        data: {
          access_code: `access_${body.reference}`,
          authorization_url: `https://checkout.paystack.com/${body.reference}`,
          reference: body.reference,
        },
        message: "Authorization URL created",
        status: true,
      });
    },
  ),
  http.get(
    "https://api.paystack.co/transaction/verify/:reference",
    ({ params, request }) => {
      requireHeader(request.headers, "Authorization");
      const reference = params.reference as string;
      const transaction = transactions.get(reference);
      if (!transaction) {
        return json(
          { message: "Transaction reference not found", status: false },
          { status: 400 },
        );
      }

      return json({
        data: {
          ...transaction,
          customer: { email: "customer@example.com" },
          reference,
          status: "success",
        },
        message: "Verification successful",
        status: true,
      });
    },
  ),
];
