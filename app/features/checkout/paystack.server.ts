import crypto from "node:crypto";

const paystackBaseUrl = "https://api.paystack.co";

function requirePaystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Missing PAYSTACK_SECRET_KEY");
  return key;
}

export function verifyPaystackSignature({
  payload,
  signature,
}: {
  payload: string;
  signature: string | null;
}) {
  if (!signature) return false;
  const secret = requirePaystackSecretKey();
  const digest = crypto
    .createHmac("sha512", secret)
    .update(payload, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function stringifyMetadata(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return out;
}

export async function initializePaystackTransaction({
  amountMinor,
  callbackUrl,
  currency,
  email,
  reference,
  metadata,
}: {
  amountMinor: number;
  /** Where Paystack sends the customer after payment (`reference` / `trxref` are appended). */
  callbackUrl?: string;
  currency: string;
  email: string;
  reference: string;
  metadata: Record<string, unknown>;
}) {
  const secret = requirePaystackSecretKey();
  const body: Record<string, unknown> = {
    amount: amountMinor,
    currency,
    email,
    metadata: stringifyMetadata(metadata),
    reference,
  };
  if (callbackUrl) {
    body.callback_url = callbackUrl;
  }

  const response = await fetch(`${paystackBaseUrl}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => null)) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; reference: string };
  } | null;

  if (!response.ok || !json?.status || !json.data) {
    throw new Error(
      json?.message ?? `Paystack init failed (${response.status})`,
    );
  }

  return {
    authorizationUrl: json.data.authorization_url,
    reference: json.data.reference,
  };
}

export async function verifyPaystackTransaction({
  reference,
}: {
  reference: string;
}) {
  const secret = requirePaystackSecretKey();
  const response = await fetch(
    `${paystackBaseUrl}/transaction/verify/${reference}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    },
  );

  const json = (await response.json().catch(() => null)) as {
    status: boolean;
    message: string;
    data?: {
      status: string;
      reference: string;
      amount: number;
      currency: string;
      customer?: { email?: string };
    };
  } | null;

  if (!response.ok || !json?.status || !json.data) {
    throw new Error(
      json?.message ?? `Paystack verify failed (${response.status})`,
    );
  }

  return json.data;
}

/**
 * Whether a verified Paystack transaction charged exactly what the stored
 * Payment row expects. A mismatch must never mark the payment as succeeded.
 */
export function getIsPaystackTransactionMatchingPayment({
  payment,
  transaction,
}: {
  payment: { amountMinor: number; currency: string };
  transaction: { amount: number; currency: string };
}) {
  return (
    transaction.amount === payment.amountMinor &&
    transaction.currency.toUpperCase() === payment.currency.toUpperCase()
  );
}
