import { createId } from "@paralleldrive/cuid2";
import { HandCoinsIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import { MAX_CAUTION_DEDUCTIONS } from "../deal-caution";
import {
  MARK_CAUTION_REFUNDED_INTENT,
  SEND_CAUTION_SETTLEMENT_INTENT,
} from "../deals-constants";
import type { UploadedEvidence } from "./caution-evidence";
import { EvidenceGallery, EvidenceUploader } from "./caution-evidence";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { formatMoney } from "~/features/organizations/dashboard/dashboard-format";
import {
  getCurrencyExponent,
  majorToMinorUnits,
} from "~/features/products/products-format";
import { cn } from "~/lib/utils";

export type CautionDeductionView = {
  reason: string;
  amountMinor: number;
  evidence: Array<{ kind: "image" | "video"; name: string; url: string }>;
};

export type CautionSettlementView = {
  heldMinor: number;
  deductions: CautionDeductionView[];
  refundMinor: number;
  sentAt: Date | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
  accountGivenAt: Date | null;
  refundedAt: Date | null;
  refundReference: string;
};

type DraftDeduction = {
  key: string;
  reason: string;
  amount: string;
  evidence: UploadedEvidence[];
};

function toMinor(amount: string, currency: string) {
  if (!/^\d+(\.\d+)?$/.test(amount.trim())) return null;
  return majorToMinorUnits(amount.trim(), currency);
}

function Totals({
  rows,
}: {
  rows: Array<{ label: string; value: string; strong?: boolean }>;
}) {
  return (
    <dl className="divide-y rounded-lg border text-sm">
      {rows.map((row) => (
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-3 py-2",
            row.strong && "font-semibold",
          )}
          key={row.label}
        >
          <dt className={row.strong ? undefined : "text-muted-foreground"}>
            {row.label}
          </dt>
          <dd className="tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The deal's caution refund step: what's kept and why, the customer's refund
 * account, and marking the refund as sent once the business has paid it.
 */
export function CautionRefundStep({
  currency,
  customerName,
  settleAfter,
  stepId,
  stepName,
  settlement,
}: {
  currency: string;
  customerName: string;
  settleAfter: Date | null;
  stepId: string;
  stepName: string;
  settlement: CautionSettlementView;
}) {
  const { t, i18n } = useTranslation("deals", {
    keyPrefix: "detail.caution",
  });
  const fetcher = useFetcher();
  const id = useId();
  const busy = fetcher.state !== "idle";
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency, locale: i18n.language });
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(
      new Date(date),
    );
  const [drafts, setDrafts] = useState<DraftDeduction[]>([]);

  const parsed = drafts.map((draft) => ({
    amountMinor: toMinor(draft.amount, currency),
    evidence: draft.evidence.map(({ id, kind, name }) => ({ id, kind, name })),
    reason: draft.reason.trim(),
  }));
  const keptMinor = parsed.reduce(
    (sum, deduction) => sum + (deduction.amountMinor ?? 0),
    0,
  );
  const tooMuch = keptMinor > settlement.heldMinor;
  const incomplete = parsed.some(
    (deduction) =>
      !deduction.reason || !deduction.amountMinor || deduction.amountMinor <= 0,
  );
  const refundMinor = Math.max(0, settlement.heldMinor - keptMinor);
  const early = settleAfter !== null && new Date(settleAfter) > new Date();
  const step = 1 / 10 ** getCurrencyExponent(currency);

  const update = (key: string, changes: Partial<DraftDeduction>) =>
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...changes } : draft,
      ),
    );

  const header = (description: string) => (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <HandCoinsIcon aria-hidden="true" className="size-4" />
        {stepName}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );

  if (!settlement.sentAt) {
    return (
      <Card>
        {header(
          early && settleAfter
            ? t("settleEarly", { date: formatDate(settleAfter) })
            : t("settleNow"),
        )}
        <CardContent>
          <fetcher.Form className="space-y-4" method="POST">
            <input name="stepId" type="hidden" value={stepId} />
            <input
              name="deductions"
              type="hidden"
              value={JSON.stringify(
                parsed.map((deduction) => ({
                  amountMinor: deduction.amountMinor ?? 0,
                  evidence: deduction.evidence,
                  reason: deduction.reason,
                })),
              )}
            />
            <div className="space-y-2">
              <p className="font-medium text-sm">{t("deductionsTitle")}</p>
              {drafts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("noDeductions")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {drafts.map((draft, index) => (
                    <li
                      className="space-y-3 rounded-lg border p-3"
                      key={draft.key}
                    >
                      <div className="grid grid-cols-[1fr_9rem_auto] items-end gap-2">
                        <div className="space-y-1">
                          <Label
                            className={index > 0 ? "sr-only" : undefined}
                            htmlFor={`${id}-${draft.key}-reason`}
                          >
                            {t("reasonLabel")}
                          </Label>
                          <Input
                            id={`${id}-${draft.key}-reason`}
                            maxLength={200}
                            onChange={(event) =>
                              update(draft.key, { reason: event.target.value })
                            }
                            placeholder={t("reasonPlaceholder")}
                            value={draft.reason}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label
                            className={index > 0 ? "sr-only" : undefined}
                            htmlFor={`${id}-${draft.key}-amount`}
                          >
                            {t("amountLabel", { currency })}
                          </Label>
                          <Input
                            id={`${id}-${draft.key}-amount`}
                            inputMode="decimal"
                            min={0}
                            onChange={(event) =>
                              update(draft.key, { amount: event.target.value })
                            }
                            step={step}
                            type="number"
                            value={draft.amount}
                          />
                        </div>
                        <Button
                          aria-label={t("removeDeduction")}
                          onClick={() =>
                            setDrafts((current) =>
                              current.filter((item) => item.key !== draft.key),
                            )
                          }
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2Icon aria-hidden="true" />
                        </Button>
                      </div>
                      <EvidenceUploader
                        label={t("evidenceFor", {
                          reason: draft.reason || t("reasonPlaceholder"),
                        })}
                        onChange={(evidence) => update(draft.key, { evidence })}
                        stepId={stepId}
                        value={draft.evidence}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {drafts.length < MAX_CAUTION_DEDUCTIONS ? (
                <Button
                  onClick={() =>
                    setDrafts((current) => [
                      ...current,
                      {
                        amount: "",
                        evidence: [],
                        key: createId(),
                        reason: "",
                      },
                    ])
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <PlusIcon aria-hidden="true" />
                  {t("addDeduction")}
                </Button>
              ) : null}
            </div>
            <Totals
              rows={[
                { label: t("held"), value: money(settlement.heldMinor) },
                { label: t("kept"), value: money(keptMinor) },
                {
                  label: t("toRefund"),
                  strong: true,
                  value: money(refundMinor),
                },
              ]}
            />
            {tooMuch ? (
              <p className="text-destructive text-sm" role="alert">
                {t("tooMuch")}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              {refundMinor > 0
                ? t("sendHint", { name: customerName })
                : t("sendHintNothing", { name: customerName })}
            </p>
            <Button
              disabled={busy || tooMuch || incomplete}
              name="intent"
              type="submit"
              value={SEND_CAUTION_SETTLEMENT_INTENT}
            >
              {busy ? <Spinner /> : null}
              {refundMinor > 0 ? t("send") : t("sendNothing")}
            </Button>
          </fetcher.Form>
        </CardContent>
      </Card>
    );
  }

  const statement = (
    <div className="space-y-3">
      <Totals
        rows={[
          { label: t("held"), value: money(settlement.heldMinor) },
          ...settlement.deductions.map((deduction) => ({
            label: t("keptFor", { reason: deduction.reason }),
            value: `−${money(deduction.amountMinor)}`,
          })),
          {
            label: t("toRefund"),
            strong: true,
            value: money(settlement.refundMinor),
          },
        ]}
      />
      {settlement.deductions
        .filter((deduction) => deduction.evidence.length > 0)
        .map((deduction) => (
          <div className="space-y-2" key={deduction.reason}>
            <p className="font-medium text-muted-foreground text-xs">
              {t("evidenceFor", { reason: deduction.reason })}
            </p>
            <EvidenceGallery
              items={deduction.evidence}
              label={t("evidenceFor", { reason: deduction.reason })}
            />
          </div>
        ))}
    </div>
  );

  if (!settlement.accountGivenAt) {
    return (
      <Card>
        {header(t("waitingForAccount", { name: customerName }))}
        <CardContent>{statement}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {header(t("sendRefund", { amount: money(settlement.refundMinor) }))}
      <CardContent className="space-y-4">
        <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs">{t("bank")}</dt>
            <dd className="font-medium">{settlement.bankName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              {t("accountNumber")}
            </dt>
            <dd className="font-medium font-mono tabular-nums">
              {settlement.accountNumber}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              {t("accountName")}
            </dt>
            <dd className="font-medium">{settlement.accountName}</dd>
          </div>
        </dl>
        {statement}
        <fetcher.Form
          className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_auto] sm:items-end"
          method="POST"
        >
          <input name="stepId" type="hidden" value={stepId} />
          <div className="space-y-2">
            <Label htmlFor={`${id}-reference`}>{t("referenceLabel")}</Label>
            <Input
              id={`${id}-reference`}
              maxLength={120}
              name="reference"
              placeholder={t("referencePlaceholder")}
            />
          </div>
          <Button
            disabled={busy}
            name="intent"
            type="submit"
            value={MARK_CAUTION_REFUNDED_INTENT}
          >
            {busy ? <Spinner /> : null}
            {t("markRefunded")}
          </Button>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}
