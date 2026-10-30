import {
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  PlusIcon,
  SendIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, useFetcher, useNavigation, useRevalidator } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";

import type { DealLineItem } from "../deal-items";
import {
  calculateDealTotals,
  lineNetMinor,
  MAX_ITEM_QUANTITY,
} from "../deal-items";
import type { DealPaymentProvider } from "../deal-payments.server";
import type { DealRoomView } from "../deal-room.server";
import {
  ACCEPT_DOCUMENT_INTENT,
  DECLINE_DOCUMENT_INTENT,
  DOCUMENT_TYPE_KEYS,
  MAX_MESSAGE_LENGTH,
  POST_MESSAGE_INTENT,
  PROPOSE_CHANGES_INTENT,
} from "../deals-constants";
import { DealStatusBadge, DocumentStatusBadge } from "./deal-badges";
import { StepsProgress } from "./deal-detail";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input, inputClassName } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import {
  formatMoney,
  formatRelativeTime,
} from "~/features/organizations/dashboard/dashboard-format";
import {
  basisPointsToPercent,
  getCurrencyExponent,
  minorUnitsToMajorString,
} from "~/features/products/products-format";
import { cn } from "~/lib/utils";

type RoomStep = DealRoomView["steps"][number];

export type RoomPayment = {
  /** Ways the customer can pay online right now; empty means pay offline. */
  providers: DealPaymentProvider[];
  /** The customer just came back from the payment provider. */
  processing: boolean;
};
type RoomDocument = NonNullable<RoomStep["document"]>;
type Links = {
  pdf: (documentId: string) => string;
  preview: (documentId: string) => string;
};

const POLL_INTERVAL_MS = 10_000;

/** Reloads the page's data every few seconds while the tab is visible. */
function usePolling() {
  const revalidator = useRevalidator();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        revalidator.state === "idle"
      ) {
        void revalidator.revalidate();
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [revalidator]);
}

/** True once a fetcher's submission has come back with `{ ok: true }`. */
function useSucceeded(fetcher: ReturnType<typeof useFetcher>) {
  return (
    fetcher.state === "idle" &&
    (fetcher.data as { ok?: boolean } | undefined)?.ok === true
  );
}

function useMoney(currency: string) {
  const { i18n } = useTranslation();
  return (amountMinor: number) =>
    formatMoney({ amountMinor, currency, locale: i18n.language });
}

function useFormatDate() {
  const { i18n } = useTranslation();
  return (date: Date | string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
}

function useTypeName() {
  const { t } = useTranslation("deals");
  return (type: string) =>
    t(DOCUMENT_TYPE_KEYS[type as keyof typeof DOCUMENT_TYPE_KEYS]);
}

function ItemsTable({
  items,
  currency,
}: {
  items: DealLineItem[];
  currency: string;
}) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "items" });
  const money = useMoney(currency);
  const totals = calculateDealTotals(items);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("item")}</th>
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

function AcceptForm({
  document,
  currency,
  defaultName,
}: {
  document: RoomDocument;
  currency: string;
  defaultName: string;
}) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "accept" });
  const typeName = useTypeName();
  const money = useMoney(currency);
  const fetcher = useFetcher();
  const id = useId();
  const [agreed, setAgreed] = useState(false);
  const busy = fetcher.state !== "idle";
  const type = typeName(document.type).toLowerCase();

  return (
    <fetcher.Form className="space-y-4" method="POST">
      <HoneypotInputs />
      <input name="documentId" type="hidden" value={document.id} />
      <input name="versionId" type="hidden" value={document.current.id} />
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>{t("nameLabel")}</Label>
        <Input
          autoComplete="name"
          defaultValue={defaultName}
          id={`${id}-name`}
          maxLength={120}
          minLength={2}
          name="acceptedByName"
          required
        />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          checked={agreed}
          id={`${id}-agree`}
          name="agree"
          onCheckedChange={(checked) => setAgreed(checked === true)}
        />
        <Label className="font-normal leading-snug" htmlFor={`${id}-agree`}>
          {t("agree", { total: money(document.current.totalMinor), type })}
        </Label>
      </div>
      <Button
        disabled={busy || !agreed}
        name="intent"
        type="submit"
        value={ACCEPT_DOCUMENT_INTENT}
      >
        {busy ? <Spinner /> : <CheckCircle2Icon aria-hidden="true" />}
        {busy ? t("submitting") : t("submit", { type })}
      </Button>
    </fetcher.Form>
  );
}

/** The figures a customer can change on a line, as typed. */
type Figures = {
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
};

type ChangeRow = Figures & { removed: boolean };
type Addition = Figures & { key: number; productId: string };

function toFigures(
  item: Pick<
    DealLineItem,
    "quantity" | "unitPriceMinor" | "taxRateBps" | "discountBps"
  >,
  currency: string,
): Figures {
  return {
    discount: basisPointsToPercent(item.discountBps),
    quantity: String(item.quantity),
    taxRate: basisPointsToPercent(item.taxRateBps),
    unitPrice: minorUnitsToMajorString(item.unitPriceMinor, currency),
  };
}

/** Typed figures as numbers, or null when one of them isn't valid. */
function parseFigures(figures: Figures, currency: string) {
  const exponent = getCurrencyExponent(currency);
  const pricePattern =
    exponent > 0 ? new RegExp(`^\\d+(\\.\\d{1,${exponent}})?$`) : /^\d+$/;
  const quantity = Number(figures.quantity);
  const taxRate = Number(figures.taxRate || "0");
  const discount = Number(figures.discount || "0");
  const price = figures.unitPrice.trim();
  if (
    !figures.quantity.trim() ||
    !Number.isFinite(quantity) ||
    quantity < 0 ||
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
    discountBps: Math.round(discount * 100),
    quantity: Math.round(quantity * 1000) / 1000,
    taxRateBps: Math.round(taxRate * 100),
    unitPriceMinor: Math.round(Number(price) * 10 ** exponent),
  };
}

const FIGURE_KEYS = [
  "quantity",
  "unitPriceMinor",
  "taxRateBps",
  "discountBps",
] as const;

function FigureInputs({
  figures,
  original,
  name,
  onChange,
}: {
  figures: Figures;
  /** The document's figures, to mark what the customer changed. */
  original: Figures | null;
  name: string;
  onChange: (changes: Partial<Figures>) => void;
}) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "changes" });
  const fields = [
    ["quantity", t("quantity"), "w-20"],
    ["unitPrice", t("unitPrice"), "w-32"],
    ["taxRate", t("taxRate"), "w-20"],
    ["discount", t("discount"), "w-20"],
  ] as const;
  return (
    <>
      {fields.map(([field, label, width]) => {
        const changed =
          original !== null &&
          Number(figures[field] || "0") !== Number(original[field] || "0");
        return (
          <td className="px-1.5 py-2" key={field}>
            <Input
              aria-label={`${label}: ${name}`}
              className={cn(
                "h-9 text-right tabular-nums",
                width,
                changed && "border-amber-500 bg-amber-50 dark:bg-amber-400/10",
              )}
              inputMode="decimal"
              onChange={(event) => onChange({ [field]: event.target.value })}
              value={figures[field]}
            />
            {changed && original ? (
              <span className="mt-1 block text-right text-muted-foreground text-xs line-through">
                {original[field] || "0"}
              </span>
            ) : null}
          </td>
        );
      })}
    </>
  );
}

function ChangesForm({
  document,
  room,
}: {
  document: RoomDocument;
  room: DealRoomView;
}) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "changes" });
  const money = useMoney(room.currency);
  const fetcher = useFetcher();
  const id = useId();
  const items = document.current.items;
  const originals = useMemo(
    () => items.map((item) => toFigures(item, room.currency)),
    [items, room.currency],
  );
  const [rows, setRows] = useState<ChangeRow[]>(() =>
    originals.map((figures) => ({ ...figures, removed: false })),
  );
  const [additions, setAdditions] = useState<Addition[]>([]);
  const busy = fetcher.state !== "idle";

  const { changes, valid, hasChanges, totals, lineTotals } = useMemo(() => {
    const lines: Record<string, Partial<ReturnType<typeof parseFigures>>> = {};
    const proposed: DealLineItem[] = [];
    const amounts: Array<number | null> = [];
    let ok = true;
    rows.forEach((row, index) => {
      const item = items[index];
      if (!item) return;
      if (row.removed) {
        lines[index] = { quantity: 0 };
        amounts.push(null);
        return;
      }
      const parsed = parseFigures(row, room.currency);
      if (!parsed) {
        ok = false;
        amounts.push(null);
        return;
      }
      const changed: Partial<NonNullable<typeof parsed>> = {};
      for (const key of FIGURE_KEYS) {
        if (parsed[key] !== item[key]) changed[key] = parsed[key];
      }
      if (Object.keys(changed).length > 0) lines[index] = changed;
      const line = { ...item, ...parsed };
      if (parsed.quantity > 0) proposed.push(line);
      amounts.push(parsed.quantity > 0 ? lineNetMinor(line) : null);
    });
    const added = additions.flatMap((addition) => {
      const product = room.products.find((p) => p.id === addition.productId);
      const parsed = parseFigures(addition, room.currency);
      if (!product || !parsed) {
        ok = false;
        amounts.push(null);
        return [];
      }
      const line = { ...product, ...parsed, productId: product.id };
      amounts.push(parsed.quantity > 0 ? lineNetMinor(line) : null);
      if (parsed.quantity === 0) return [];
      proposed.push(line);
      return [{ productId: product.id, ...parsed }];
    });
    return {
      changes: { additions: added, lines },
      hasChanges: Object.keys(lines).length > 0 || added.length > 0,
      lineTotals: amounts,
      totals: calculateDealTotals(proposed),
      valid: ok && proposed.length > 0,
    };
  }, [rows, additions, items, room.products, room.currency]);

  if (useSucceeded(fetcher)) {
    return null;
  }

  const updateRow = (index: number, update: Partial<ChangeRow>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...update } : row)),
    );
  const updateAddition = (key: number, update: Partial<Addition>) =>
    setAdditions((current) =>
      current.map((addition) =>
        addition.key === key ? { ...addition, ...update } : addition,
      ),
    );

  return (
    <fetcher.Form className="space-y-4" method="POST">
      <HoneypotInputs />
      <input name="documentId" type="hidden" value={document.id} />
      <input name="changes" type="hidden" value={JSON.stringify(changes)} />
      <p className="text-muted-foreground text-sm">
        {t("description", { organization: room.organization.name })}
      </p>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="min-w-44 px-3 py-2 text-left font-medium">
                {t("item")}
              </th>
              <th className="px-1.5 py-2 text-right font-medium">
                {t("quantity")}
              </th>
              <th className="px-1.5 py-2 text-right font-medium">
                {t("unitPrice")}
              </th>
              <th className="px-1.5 py-2 text-right font-medium">
                {t("taxRate")}
              </th>
              <th className="px-1.5 py-2 text-right font-medium">
                {t("discount")}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {t("amount")}
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const row = rows[index];
              const original = originals[index];
              if (!row || !original) return null;
              return (
                <tr
                  className={cn(
                    "border-t align-top",
                    row.removed && "bg-muted/50",
                  )}
                  // biome-ignore lint/suspicious/noArrayIndexKey: lines are matched to the document by index
                  key={index}
                >
                  <td className="px-3 py-2 pt-4">
                    <span
                      className={cn(
                        "font-medium",
                        row.removed && "text-muted-foreground line-through",
                      )}
                    >
                      {item.name}
                    </span>
                    <span className="block text-muted-foreground text-xs">
                      {item.unit}
                    </span>
                  </td>
                  {row.removed ? (
                    <td
                      className="px-3 py-2 pt-4 text-muted-foreground text-xs"
                      colSpan={5}
                    >
                      {t("removed")}
                    </td>
                  ) : (
                    <>
                      <FigureInputs
                        figures={row}
                        name={item.name}
                        onChange={(update) => updateRow(index, update)}
                        original={original}
                      />
                      <td className="px-3 py-2 pt-4 text-right font-medium tabular-nums">
                        {lineTotals[index] != null
                          ? money(lineTotals[index] ?? 0)
                          : "—"}
                      </td>
                    </>
                  )}
                  <td className="py-2 pr-2">
                    <Button
                      aria-label={`${row.removed ? t("undo") : t("remove")}: ${item.name}`}
                      onClick={() =>
                        updateRow(index, { removed: !row.removed })
                      }
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      {row.removed ? (
                        <Undo2Icon aria-hidden="true" />
                      ) : (
                        <XIcon aria-hidden="true" />
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {additions.map((addition, offset) => {
              const product = room.products.find(
                (p) => p.id === addition.productId,
              );
              if (!product) return null;
              const amount = lineTotals[items.length + offset];
              return (
                <tr
                  className="border-t bg-primary/5 align-top"
                  key={addition.key}
                >
                  <td className="px-3 py-2 pt-4">
                    <span className="font-medium">
                      <PlusIcon
                        aria-hidden="true"
                        className="mr-1 inline size-3.5"
                      />
                      {product.name}
                    </span>
                    <span className="block text-muted-foreground text-xs">
                      {product.unit}
                    </span>
                  </td>
                  <FigureInputs
                    figures={addition}
                    name={product.name}
                    onChange={(update) => updateAddition(addition.key, update)}
                    original={toFigures(
                      { ...product, discountBps: 0, quantity: 1 },
                      room.currency,
                    )}
                  />
                  <td className="px-3 py-2 pt-4 text-right font-medium tabular-nums">
                    {amount != null ? money(amount) : "—"}
                  </td>
                  <td className="py-2 pr-2">
                    <Button
                      aria-label={`${t("remove")}: ${product.name}`}
                      onClick={() =>
                        setAdditions((current) =>
                          current.filter((a) => a.key !== addition.key),
                        )
                      }
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {room.products.length > 0 ? (
        <div>
          <label className="sr-only" htmlFor={`${id}-product`}>
            {t("addProduct")}
          </label>
          <select
            className={cn(
              inputClassName,
              "h-9 w-full read-only:opacity-100 sm:w-72",
            )}
            id={`${id}-product`}
            onChange={(event) => {
              const product = room.products.find(
                (p) => p.id === event.target.value,
              );
              if (!product) return;
              setAdditions((current) => [
                ...current,
                {
                  key: Date.now(),
                  productId: product.id,
                  ...toFigures(
                    { ...product, discountBps: 0, quantity: 1 },
                    room.currency,
                  ),
                },
              ]);
            }}
            value=""
          >
            <option value="">{t("addProductPlaceholder")}</option>
            {room.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {money(product.unitPriceMinor)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${id}-note`}>{t("noteLabel")}</Label>
        <Textarea id={`${id}-note`} maxLength={500} name="note" rows={2} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
          <dt className="text-muted-foreground">{t("subtotal")}</dt>
          <dd className="text-right">
            {valid ? money(totals.subtotalMinor) : "—"}
          </dd>
          {valid && totals.discountMinor > 0 ? (
            <>
              <dt className="text-muted-foreground">{t("discountTotal")}</dt>
              <dd className="text-right">−{money(totals.discountMinor)}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{t("taxTotal")}</dt>
          <dd className="text-right">{valid ? money(totals.taxMinor) : "—"}</dd>
          <dt className="font-medium">{t("estimatedTotal")}</dt>
          <dd className="text-right font-semibold">
            {valid ? money(totals.totalMinor) : "—"}
          </dd>
        </dl>
        <Button
          disabled={busy || !valid || !hasChanges}
          name="intent"
          type="submit"
          value={PROPOSE_CHANGES_INTENT}
        >
          {busy ? <Spinner /> : <SendIcon aria-hidden="true" />}
          {busy ? t("submitting") : t("submit")}
        </Button>
      </div>
      {!valid ? (
        <p className="text-destructive text-sm">{t("invalid")}</p>
      ) : !hasChanges ? (
        <p className="text-muted-foreground text-xs">{t("noChanges")}</p>
      ) : null}
    </fetcher.Form>
  );
}

function DeclineForm({ document }: { document: RoomDocument }) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "decline" });
  const fetcher = useFetcher();
  const id = useId();
  const busy = fetcher.state !== "idle";
  return (
    <fetcher.Form className="space-y-4" method="POST">
      <HoneypotInputs />
      <input name="documentId" type="hidden" value={document.id} />
      <div className="space-y-2">
        <Label htmlFor={`${id}-reason`}>{t("reasonLabel")}</Label>
        <Textarea id={`${id}-reason`} maxLength={500} name="reason" rows={3} />
      </div>
      <Button
        disabled={busy}
        name="intent"
        type="submit"
        value={DECLINE_DOCUMENT_INTENT}
        variant="destructive"
      >
        {busy ? <Spinner /> : null}
        {busy ? t("submitting") : t("submit")}
      </Button>
    </fetcher.Form>
  );
}

type AnswerTab = "accept" | "changes" | "decline";

function AnswerPanel({
  document,
  room,
}: {
  document: RoomDocument;
  room: DealRoomView;
}) {
  const { t } = useTranslation("dealRoom");
  const [tab, setTab] = useState<AnswerTab>("accept");
  const tabs = [
    ["accept", t("accept.tab")],
    ["changes", t("changes.tab")],
    ["decline", t("decline.tab")],
  ] as const;
  return (
    <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
      <div
        className="flex flex-wrap gap-1 rounded-lg border bg-card p-0.5"
        role="tablist"
      >
        {tabs.map(([value, label]) => (
          <button
            aria-selected={tab === value}
            className={cn(
              "flex h-9 items-center rounded-md px-3 font-medium text-sm transition-colors",
              tab === value
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={value}
            onClick={() => setTab(value)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "accept" ? (
        <AcceptForm
          currency={room.currency}
          defaultName={room.customer.name}
          document={document}
        />
      ) : tab === "changes" ? (
        <ChangesForm
          document={document}
          key={document.current.id}
          room={room}
        />
      ) : (
        <DeclineForm document={document} />
      )}
    </div>
  );
}

const PROVIDER_KEYS = {
  paystack: "payment.payWithPaystack",
  stripe: "payment.payWithStripe",
} as const satisfies Record<DealPaymentProvider, string>;

function PaymentStep({
  amountMinor,
  currency,
  organization,
  payment,
  token,
}: {
  amountMinor: number;
  currency: string;
  organization: string;
  payment: RoomPayment;
  token: string;
}) {
  const { t } = useTranslation("dealRoom");
  const money = useMoney(currency);
  const navigation = useNavigation();
  const paying =
    navigation.state !== "idle" && navigation.formAction?.endsWith("/pay");
  const canPayOnline = payment.providers.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon aria-hidden="true" className="size-4" />
          {t("current.paymentTitle")}
        </CardTitle>
        <CardDescription>
          {canPayOnline
            ? t("payment.onlineDescription", { organization })
            : t("current.paymentDescription", { organization })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-semibold text-3xl tabular-nums tracking-tight">
          {money(amountMinor)}
        </p>
        {payment.processing ? (
          <output className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <Spinner />
            {t("payment.processing")}
          </output>
        ) : null}
        {canPayOnline ? (
          <Form
            action={`/d/${token}/pay`}
            className="flex flex-wrap gap-2"
            method="POST"
            reloadDocument
          >
            <HoneypotInputs />
            {payment.providers.map((provider, index) => (
              <Button
                disabled={paying}
                key={provider}
                name="provider"
                type="submit"
                value={provider}
                variant={index === 0 ? "default" : "outline"}
              >
                {t(PROVIDER_KEYS[provider], { amount: money(amountMinor) })}
              </Button>
            ))}
          </Form>
        ) : null}
        {canPayOnline ? (
          <p className="text-muted-foreground text-xs">
            {t("payment.secureNote", { organization })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CurrentStep({
  room,
  links,
  payment,
  token,
}: {
  room: DealRoomView;
  links: Links;
  payment: RoomPayment;
  token: string;
}) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "current" });
  const { t: tRoom, i18n } = useTranslation("dealRoom");
  const typeName = useTypeName();
  const money = useMoney(room.currency);
  const formatDate = useFormatDate();
  const organization = room.organization.name;
  const active = room.steps.find((step) => step.status === "active");

  if (room.status === "won") {
    return (
      <StatusCard
        description={t("wonDescription")}
        icon={CheckCircle2Icon}
        title={t("wonTitle")}
      />
    );
  }
  if (room.status !== "open" || !active) {
    return (
      <StatusCard
        description={t("closedDescription", { organization })}
        icon={ClockIcon}
        title={t("closedTitle")}
      />
    );
  }
  if (active.kind === "payment") {
    return (
      <PaymentStep
        amountMinor={active.amountDueMinor ?? 0}
        currency={room.currency}
        organization={organization}
        payment={payment}
        token={token}
      />
    );
  }
  const document = active.document;
  if (!document) {
    return (
      <StatusCard
        description={t("preparingDescription")}
        icon={ClockIcon}
        title={t("preparingTitle", { organization })}
      />
    );
  }

  const type = typeName(document.type);
  const awaiting =
    active.requiresAcceptance &&
    ["sent", "viewed", "changesRequested"].includes(document.status);
  const title = awaiting
    ? t("awaitingTitle", { type: type.toLowerCase() })
    : document.status === "accepted"
      ? t("acceptedTitle", { type: type.toLowerCase() })
      : document.status === "declined"
        ? t("declinedTitle", { type: type.toLowerCase() })
        : t("sentTitle", { type: type.toLowerCase() });
  const description = awaiting
    ? t("awaitingDescription", { organization })
    : document.status === "accepted" && document.acceptedAt
      ? t("acceptedDescription", {
          date: formatDate(document.acceptedAt),
          name: document.acceptedByName,
        })
      : document.status === "declined"
        ? t("declinedDescription", { organization })
        : t("sentDescription");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">
              {type} {document.number}
            </span>
            <DocumentStatusBadge status={document.status} />
            {document.dueAt ? (
              <span className="text-muted-foreground">
                {document.type === "invoice"
                  ? t("dueOn", { date: formatDate(document.dueAt) })
                  : t("validUntil", { date: formatDate(document.dueAt) })}
              </span>
            ) : null}
          </div>
          <Button asChild size="sm" variant="outline">
            <a download href={links.pdf(document.id)}>
              <DownloadIcon aria-hidden="true" />
              {t("downloadPdf")}
            </a>
          </Button>
        </div>
        <iframe
          className="h-[70vh] min-h-[480px] w-full rounded-lg border bg-white"
          // No scripts; same-origin is safe without them.
          sandbox="allow-same-origin"
          src={links.preview(document.id)}
          title={t("documentFrame", { number: document.number, type })}
        />
        <ItemsTable currency={room.currency} items={document.current.items} />
        {document.proposal ? (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm dark:border-amber-400/30 dark:bg-amber-400/10">
            <p className="font-medium">{tRoom("proposal.title")}</p>
            <p className="text-muted-foreground">
              {tRoom("proposal.description", {
                date: formatRelativeTime(
                  document.proposal.createdAt,
                  i18n.language,
                ),
                organization,
                total: money(document.proposal.totalMinor),
              })}
            </p>
          </div>
        ) : null}
        {awaiting ? <AnswerPanel document={document} room={room} /> : null}
      </CardContent>
    </Card>
  );
}

function StatusCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ClockIcon;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Documents({
  room,
  links,
  onPreview,
}: {
  room: DealRoomView;
  links: Links;
  onPreview: (documentId: string) => void;
}) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "documents" });
  const { t: tCurrent } = useTranslation("dealRoom", { keyPrefix: "current" });
  const typeName = useTypeName();
  const money = useMoney(room.currency);
  const documents = room.steps.flatMap((step) =>
    step.document ? [step.document] : [],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ul className="divide-y">
            {documents.map((document) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                key={document.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileTextIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-sm">
                      {typeName(document.type)} {document.number}
                      <DocumentStatusBadge status={document.status} />
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {money(document.current.totalMinor)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => onPreview(document.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <EyeIcon aria-hidden="true" />
                    {tCurrent("preview")}
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a download href={links.pdf(document.id)}>
                      <DownloadIcon aria-hidden="true" />
                      {tCurrent("downloadPdf")}
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Messages({ room }: { room: DealRoomView }) {
  const { t, i18n } = useTranslation("dealRoom", { keyPrefix: "messages" });
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";
  const [formKey, setFormKey] = useState(0);
  const succeeded = useSucceeded(fetcher);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset after each successful send
  useEffect(() => {
    if (succeeded) setFormKey((key) => key + 1);
  }, [succeeded, fetcher.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { organization: room.organization.name })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {room.messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ol className="max-h-96 space-y-3 overflow-y-auto">
            {room.messages.map((message) => {
              const mine = message.author === "customer";
              return (
                <li
                  className={cn(
                    "flex flex-col gap-1",
                    mine ? "items-end" : "items-start",
                  )}
                  key={message.id}
                >
                  <span
                    className={cn(
                      "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
                      mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted",
                    )}
                  >
                    {message.body}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {mine ? t("you") : (message.name ?? room.organization.name)}{" "}
                    · {formatRelativeTime(message.createdAt, i18n.language)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <fetcher.Form className="space-y-2" key={formKey} method="POST">
          <HoneypotInputs />
          <Textarea
            aria-label={t("placeholder")}
            maxLength={MAX_MESSAGE_LENGTH}
            name="body"
            placeholder={t("placeholder")}
            required
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              disabled={busy}
              name="intent"
              size="sm"
              type="submit"
              value={POST_MESSAGE_INTENT}
            >
              {busy ? <Spinner /> : <SendIcon aria-hidden="true" />}
              {t("send")}
            </Button>
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

const TIMELINE_KEYS = {
  changesProposed: "timeline.changesProposed",
  dealWon: "timeline.dealWon",
  documentAccepted: "timeline.documentAccepted",
  documentDeclined: "timeline.documentDeclined",
  documentSent: "timeline.documentSent",
  paymentRecorded: "timeline.paymentRecorded",
  proposalApproved: "timeline.proposalApproved",
  proposalRejected: "timeline.proposalRejected",
} as const satisfies Record<DealRoomView["events"][number]["type"], string>;

function Timeline({ room }: { room: DealRoomView }) {
  const { t, i18n } = useTranslation("dealRoom");
  const typeName = useTypeName();
  const money = useMoney(room.currency);
  if (room.events.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("timeline.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l pl-4">
          {room.events.map((event) => (
            <li className="relative" key={event.id}>
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-border ring-4 ring-card"
              />
              <p className="text-sm">
                {t(TIMELINE_KEYS[event.type], {
                  amount:
                    typeof event.payload.amountMinor === "number"
                      ? money(event.payload.amountMinor)
                      : "",
                  document: event.document
                    ? `${typeName(event.document.type)} ${event.document.number ?? ""}`.trim()
                    : "",
                  organization: room.organization.name,
                })}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatRelativeTime(event.createdAt, i18n.language)}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/** The page a customer opens from a deal's share link. */
export function DealRoom({
  room,
  token,
  appName,
  payment,
}: {
  payment: RoomPayment;
  room: DealRoomView;
  token: string;
  appName: string;
}) {
  const { t } = useTranslation("dealRoom");
  const typeName = useTypeName();
  const [previewId, setPreviewId] = useState<string | null>(null);
  usePolling();
  const previewDocument =
    room.steps.find((step) => step.document && step.document.id === previewId)
      ?.document ?? undefined;
  const links: Links = {
    pdf: (documentId) => `/d/${token}/documents/${documentId}/pdf`,
    preview: (documentId) => `/d/${token}/documents/${documentId}/preview`,
  };

  return (
    <div className="min-h-svh bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {room.organization.imageUrl ? (
              <img
                alt=""
                className="size-10 rounded-lg border bg-card object-contain"
                src={room.organization.imageUrl}
              />
            ) : null}
            <div>
              <p className="font-semibold">{room.organization.name}</p>
              {room.organization.billingEmail ? (
                <a
                  className="text-muted-foreground text-xs hover:underline"
                  href={`mailto:${room.organization.billingEmail}`}
                >
                  {room.organization.billingEmail}
                </a>
              ) : null}
            </div>
          </div>
          <DealStatusBadge status={room.status} />
        </header>

        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">
            {room.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("preparedFor", {
              name: room.customer.companyName
                ? `${room.customer.name}, ${room.customer.companyName}`
                : room.customer.name,
            })}
          </p>
        </div>

        <StepsProgress steps={room.steps} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <CurrentStep
              links={links}
              payment={payment}
              room={room}
              token={token}
            />
            <Documents links={links} onPreview={setPreviewId} room={room} />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <Messages room={room} />
            <Timeline room={room} />
          </div>
        </div>

        <p className="text-center text-muted-foreground text-xs">
          {t("poweredBy", { appName })}
        </p>
      </div>

      <Dialog
        onOpenChange={(open) => (open ? null : setPreviewId(null))}
        open={previewDocument !== undefined}
      >
        <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-3 sm:max-w-4xl">
          <DialogHeader className="flex-row items-center justify-between gap-3 pr-8">
            <DialogTitle>
              {previewDocument
                ? `${typeName(previewDocument.type)} ${previewDocument.number ?? ""}`
                : ""}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("current.preview")}
            </DialogDescription>
            {previewDocument ? (
              <Button asChild size="sm" variant="outline">
                <a download href={links.pdf(previewDocument.id)}>
                  <DownloadIcon aria-hidden="true" />
                  {t("current.downloadPdf")}
                </a>
              </Button>
            ) : null}
          </DialogHeader>
          {previewDocument ? (
            <iframe
              className="w-full flex-1 rounded-lg border bg-white"
              // No scripts; same-origin is safe without them.
              sandbox="allow-same-origin"
              src={links.preview(previewDocument.id)}
              title={`${typeName(previewDocument.type)} ${previewDocument.number ?? ""}`}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
