import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { DealLineItem } from "../deal-items";
import {
  calculateDealTotals,
  lineNetMinor,
  MAX_DEAL_ITEMS,
  MAX_ITEM_QUANTITY,
} from "../deal-items";
import { Button } from "~/components/ui/button";
import { Input, inputClassName } from "~/components/ui/input";
import { formatMoney } from "~/features/organizations/dashboard/dashboard-format";
import {
  basisPointsToPercent,
  getCurrencyExponent,
  minorUnitsToMajorString,
} from "~/features/products/products-format";
import { cn } from "~/lib/utils";

export type DealProductOption = {
  id: string;
  name: string;
  description: string;
  sku: string | null;
  unit: string;
  unitPriceMinor: number;
  taxRateBps: number;
  currency: string;
};

type Row = {
  key: number;
  productId: string | null;
  name: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
  /** Edited since it was added; a fresh blank line isn't flagged yet. */
  touched?: boolean;
};

let nextKey = 0;

const untouched = (row: Row): Row => ({ ...row, touched: false });

function toRow(item: DealLineItem, currency: string): Row {
  nextKey += 1;
  return {
    description: item.description,
    key: nextKey,
    name: item.name,
    productId: item.productId,
    quantity: String(item.quantity),
    taxRate: basisPointsToPercent(item.taxRateBps),
    discount: basisPointsToPercent(item.discountBps),
    unit: item.unit,
    unitPrice: minorUnitsToMajorString(item.unitPriceMinor, currency),
  };
}

/** The row as a line item, or null while one of its fields isn't valid. */
function toItem(row: Row, currency: string): DealLineItem | null {
  const exponent = getCurrencyExponent(currency);
  const pricePattern =
    exponent > 0 ? new RegExp(`^\\d+(\\.\\d{1,${exponent}})?$`) : /^\d+$/;
  const quantity = Number(row.quantity);
  const taxRate = Number(row.taxRate || "0");
  const discount = Number(row.discount || "0");
  const price = row.unitPrice.trim();
  if (
    !row.name.trim() ||
    !row.quantity.trim() ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > MAX_ITEM_QUANTITY ||
    !pricePattern.test(price) ||
    !Number.isFinite(taxRate) ||
    taxRate < 0 ||
    taxRate > 100 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100
  ) {
    return null;
  }
  return {
    description: row.description.trim(),
    name: row.name.trim(),
    productId: row.productId,
    quantity: Math.round(quantity * 1000) / 1000,
    taxRateBps: Math.round(taxRate * 100),
    discountBps: Math.round(discount * 100),
    unit: row.unit,
    unitPriceMinor: Math.round(Number(price) * 10 ** exponent),
  };
}

/**
 * Edits a document's lines: add products from the catalogue or custom lines,
 * change quantities, prices and tax, and see the totals as you go. Submits
 * the lines as JSON in a hidden `items` field.
 */
export function DealItemsEditor({
  currency,
  products,
  initialItems = [],
  onValidityChange,
  name = "items",
}: {
  currency: string;
  products: DealProductOption[];
  initialItems?: DealLineItem[];
  onValidityChange?: (valid: boolean) => void;
  name?: string;
}) {
  const { t, i18n } = useTranslation("deals", { keyPrefix: "items" });
  const id = useId();
  const [rows, setRows] = useState<Row[]>(() =>
    initialItems.map((item) => toRow(item, currency)),
  );
  const availableProducts = products.filter(
    (product) => product.currency === currency,
  );

  const parsed = useMemo(
    () => rows.map((row) => toItem(row, currency)),
    [rows, currency],
  );
  const items = parsed.filter((item): item is DealLineItem => item !== null);
  const allValid = rows.length > 0 && items.length === rows.length;
  const totals = calculateDealTotals(items);
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency, locale: i18n.language });

  useEffect(() => {
    onValidityChange?.(allValid);
  }, [allValid, onValidityChange]);

  const updateRow = (key: number, changes: Partial<Row>) =>
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, ...changes, touched: true } : row,
      ),
    );

  const addProduct = (productId: string) => {
    const product = availableProducts.find(
      (candidate) => candidate.id === productId,
    );
    if (!product) return;
    setRows((current) => [
      ...current,
      toRow(
        {
          description: product.description,
          name: product.name,
          productId: product.id,
          quantity: 1,
          taxRateBps: product.taxRateBps,
          discountBps: 0,
          unit: product.unit,
          unitPriceMinor: product.unitPriceMinor,
        },
        currency,
      ),
    ]);
  };

  const addCustomLine = () =>
    setRows((current) => [
      ...current,
      untouched(
        toRow(
          {
            description: "",
            name: "",
            productId: null,
            quantity: 1,
            taxRateBps: 0,
            discountBps: 0,
            unit: "item",
            unitPriceMinor: 0,
          },
          currency,
        ),
      ),
    ]);

  const canAdd = rows.length < MAX_DEAL_ITEMS;

  return (
    <div className="space-y-4">
      <input name={name} type="hidden" value={JSON.stringify(items)} />

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  {t("product")}
                </th>
                <th className="w-24 px-2 py-2 text-right font-medium">
                  {t("quantity")}
                </th>
                <th className="w-36 px-2 py-2 text-right font-medium">
                  {t("unitPrice")}
                </th>
                <th className="w-20 px-2 py-2 text-right font-medium">
                  {t("tax")}
                </th>
                <th className="w-20 px-2 py-2 text-right font-medium">
                  {t("discount")}
                </th>
                <th className="w-32 px-3 py-2 text-right font-medium">
                  {t("amount")}
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const item = parsed[index];
                const invalid = item === null && row.touched !== false;
                return (
                  <tr
                    className={cn(
                      "border-t align-top",
                      invalid && "bg-destructive/5",
                    )}
                    key={row.key}
                  >
                    <td className="space-y-1.5 px-3 py-2">
                      <Input
                        aria-invalid={
                          (row.touched !== false && !row.name.trim()) ||
                          undefined
                        }
                        aria-label={t("namePlaceholder")}
                        className="h-9"
                        maxLength={200}
                        onChange={(event) =>
                          updateRow(row.key, { name: event.target.value })
                        }
                        placeholder={t("namePlaceholder")}
                        value={row.name}
                      />
                      <Input
                        aria-label={t("descriptionPlaceholder")}
                        className="h-8 text-xs"
                        maxLength={1000}
                        onChange={(event) =>
                          updateRow(row.key, {
                            description: event.target.value,
                          })
                        }
                        placeholder={t("descriptionPlaceholder")}
                        value={row.description}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        aria-label={t("quantity")}
                        className="h-9 text-right tabular-nums"
                        inputMode="decimal"
                        onChange={(event) =>
                          updateRow(row.key, { quantity: event.target.value })
                        }
                        value={row.quantity}
                      />
                      <span className="mt-1 block text-right text-muted-foreground text-xs">
                        {row.unit}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        aria-label={t("unitPrice")}
                        className="h-9 text-right tabular-nums"
                        inputMode="decimal"
                        onChange={(event) =>
                          updateRow(row.key, { unitPrice: event.target.value })
                        }
                        value={row.unitPrice}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        aria-label={t("tax")}
                        className="h-9 text-right tabular-nums"
                        inputMode="decimal"
                        onChange={(event) =>
                          updateRow(row.key, { taxRate: event.target.value })
                        }
                        value={row.taxRate}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        aria-label={t("discount")}
                        className="h-9 text-right tabular-nums"
                        inputMode="decimal"
                        onChange={(event) =>
                          updateRow(row.key, { discount: event.target.value })
                        }
                        value={row.discount}
                      />
                    </td>
                    <td className="px-3 py-2 pt-4 text-right font-medium tabular-nums">
                      {item ? money(lineNetMinor(item)) : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      <Button
                        aria-label={t("remove", {
                          name: row.name || t("namePlaceholder"),
                        })}
                        onClick={() =>
                          setRows((current) =>
                            current.filter(
                              (candidate) => candidate.key !== row.key,
                            ),
                          )
                        }
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
          {t("empty")}
        </p>
      )}

      {rows.some(
        (row, index) => parsed[index] === null && row.touched !== false,
      ) ? (
        <p className="text-destructive text-sm" role="alert">
          {t("invalidLines")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`${id}-product`}>
            {t("addProduct")}
          </label>
          <select
            className={cn(inputClassName, "h-9 w-64 read-only:opacity-100")}
            disabled={!canAdd || availableProducts.length === 0}
            id={`${id}-product`}
            onChange={(event) => {
              addProduct(event.target.value);
              event.target.value = "";
            }}
            value=""
          >
            <option value="">
              {availableProducts.length === 0
                ? t("noProducts", { currency })
                : t("addProductPlaceholder")}
            </option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {money(product.unitPriceMinor)}{" "}
                {t("perUnit", { unit: product.unit })}
              </option>
            ))}
          </select>
          <Button
            disabled={!canAdd}
            onClick={addCustomLine}
            size="sm"
            type="button"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" />
            {t("addCustomLine")}
          </Button>
        </div>

        <dl className="ml-auto grid min-w-56 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
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
    </div>
  );
}
