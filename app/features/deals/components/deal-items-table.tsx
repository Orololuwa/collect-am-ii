import { useTranslation } from "react-i18next";

import type { DealLineItem, DealTotals } from "../deal-items";
import { lineNetMinor } from "../deal-items";
import { formatMoney } from "~/features/organizations/dashboard/dashboard-format";
import { basisPointsToPercent } from "~/features/products/products-format";

/** A document version's lines and totals, read-only. */
export function DealItemsTable({
  items,
  totals,
  currency,
}: {
  items: DealLineItem[];
  totals: DealTotals;
  currency: string;
}) {
  const { t, i18n } = useTranslation("deals", { keyPrefix: "items" });
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency, locale: i18n.language });

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">
                {t("product")}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {t("quantity")}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {t("unitPrice")}
              </th>
              <th className="px-3 py-2 text-right font-medium">{t("tax")}</th>
              <th className="px-3 py-2 text-right font-medium">
                {t("discount")}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {t("amount")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stored lines have no id and never reorder
              <tr className="border-t align-top" key={index}>
                <td className="px-3 py-2">
                  <span className="font-medium">{item.name}</span>
                  {item.description ? (
                    <span className="block whitespace-pre-line text-muted-foreground text-xs">
                      {item.description}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {item.quantity}{" "}
                  <span className="text-muted-foreground text-xs">
                    {item.unit}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {money(item.unitPriceMinor)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                  {item.taxRateBps > 0
                    ? `${basisPointsToPercent(item.taxRateBps)}%`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                  {item.discountBps > 0
                    ? `${basisPointsToPercent(item.discountBps)}%`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {money(lineNetMinor(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto grid w-fit min-w-56 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
        <dt className="text-muted-foreground">{t("subtotal")}</dt>
        <dd className="text-right">{money(totals.subtotalMinor)}</dd>
        {totals.discountMinor > 0 ? (
          <>
            <dt className="text-muted-foreground">{t("discountTotal")}</dt>
            <dd className="text-right">−{money(totals.discountMinor)}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">{t("taxTotal")}</dt>
        <dd className="text-right">{money(totals.taxMinor)}</dd>
        <dt className="border-t pt-1 font-medium">{t("total")}</dt>
        <dd className="border-t pt-1 text-right font-semibold">
          {money(totals.totalMinor)}
        </dd>
      </dl>
    </div>
  );
}
