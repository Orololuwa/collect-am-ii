import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Share links look like `/d/<dealId>.<signature>`. The signature covers the
 * deal's `shareNonce`, so changing the nonce makes every older link stop
 * working, while the current link can be shown again at any time.
 */

function getSecret() {
  const secret = process.env.DEAL_LINK_SECRET || process.env.COOKIE_SECRET;
  if (!secret) {
    throw new Error("DEAL_LINK_SECRET or COOKIE_SECRET must be set");
  }
  return secret;
}

function sign(dealId: string, shareNonce: string) {
  return createHmac("sha256", getSecret())
    .update(`deal-link:${dealId}:${shareNonce}`)
    .digest("base64url");
}

export function createDealShareToken(deal: { id: string; shareNonce: string }) {
  return `${deal.id}.${sign(deal.id, deal.shareNonce)}`;
}

export function createDealShareUrl(deal: { id: string; shareNonce: string }) {
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  return `${appUrl}/d/${createDealShareToken(deal)}`;
}

/** The deal id a token names, before its signature has been checked. */
export function parseDealShareToken(token: string) {
  const [dealId, signature, ...rest] = token.split(".");
  if (!dealId || !signature || rest.length > 0 || dealId.length > 64) {
    return null;
  }
  return { dealId, signature };
}

/** Whether the token's signature matches the deal's current nonce. */
export function isDealShareTokenValid(
  token: string,
  deal: { id: string; shareNonce: string },
) {
  const parsed = parseDealShareToken(token);
  if (!parsed || parsed.dealId !== deal.id) {
    return false;
  }
  const expected = Buffer.from(sign(deal.id, deal.shareNonce));
  const actual = Buffer.from(parsed.signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
