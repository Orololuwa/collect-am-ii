import { CheckCircle2Icon, HandCoinsIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";

import type { DealRoomView } from "../deal-room.server";
import { GIVE_REFUND_ACCOUNT_INTENT } from "../deals-constants";
import { EvidenceGallery } from "./caution-evidence";
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
import { cn } from "~/lib/utils";

type RoomSettlement = NonNullable<DealRoomView["steps"][number]["settlement"]>;

function useMoney(currency: string) {
  const { i18n } = useTranslation();
  return (amountMinor: number) =>
    formatMoney({ amountMinor, currency, locale: i18n.language });
}

function Statement({
  settlement,
  currency,
}: {
  settlement: RoomSettlement;
  currency: string;
}) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "refund" });
  const money = useMoney(currency);
  const rows = [
    { label: t("held"), value: money(settlement.heldMinor) },
    ...settlement.deductions.map((deduction) => ({
      label: t("keptFor", { reason: deduction.reason }),
      value: `−${money(deduction.amountMinor)}`,
    })),
  ];
  return (
    <dl className="divide-y rounded-lg border text-sm">
      {rows.map((row) => (
        <div
          className="flex items-center justify-between gap-3 px-3 py-2"
          key={row.label}
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="tabular-nums">{row.value}</dd>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 px-3 py-2 font-semibold">
        <dt>{settlement.refundedAt ? t("refunded") : t("toRefund")}</dt>
        <dd className="tabular-nums">{money(settlement.refundMinor ?? 0)}</dd>
      </div>
    </dl>
  );
}

/** The photos and videos the business attached to its deductions. */
function DeductionEvidence({ settlement }: { settlement: RoomSettlement }) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "refund" });
  const withEvidence = settlement.deductions.filter(
    (deduction) => deduction.evidence.length > 0,
  );
  if (withEvidence.length === 0) return null;
  return (
    <div className="space-y-3">
      {withEvidence.map((deduction) => (
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
}

function AccountForm({
  stepId,
  organization,
  onDone,
}: {
  stepId: string;
  organization: string;
  onDone?: () => void;
}) {
  const { t } = useTranslation("dealRoom", { keyPrefix: "refund" });
  const fetcher = useFetcher<{ ok?: boolean }>();
  const id = useId();
  const busy = fetcher.state !== "idle";
  const saved = fetcher.state === "idle" && fetcher.data?.ok === true;
  useEffect(() => {
    if (saved) onDone?.();
  }, [saved, onDone]);
  return (
    <fetcher.Form className="space-y-4" method="POST">
      <HoneypotInputs />
      <input name="stepId" type="hidden" value={stepId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-bank`}>{t("bankLabel")}</Label>
          <Input
            autoComplete="off"
            id={`${id}-bank`}
            maxLength={80}
            minLength={2}
            name="bankName"
            placeholder={t("bankPlaceholder")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-number`}>{t("accountNumberLabel")}</Label>
          <Input
            autoComplete="off"
            id={`${id}-number`}
            inputMode="numeric"
            maxLength={34}
            name="accountNumber"
            pattern="[0-9][0-9 \-]{4,32}[0-9]"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${id}-name`}>{t("accountNameLabel")}</Label>
          <Input
            autoComplete="name"
            id={`${id}-name`}
            maxLength={120}
            minLength={2}
            name="accountName"
            required
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        {t("accountPrivacy", { organization })}
      </p>
      <Button
        disabled={busy}
        name="intent"
        type="submit"
        value={GIVE_REFUND_ACCOUNT_INTENT}
      >
        {busy ? <Spinner /> : null}
        {t("submit")}
      </Button>
    </fetcher.Form>
  );
}

/** The customer's view of their caution being settled and refunded. */
export function CautionRefundRoom({
  room,
  stepId,
  stepName,
  settlement,
}: {
  room: DealRoomView;
  stepId: string;
  stepName: string;
  settlement: RoomSettlement;
}) {
  const { t, i18n } = useTranslation("dealRoom", { keyPrefix: "refund" });
  const money = useMoney(room.currency);
  const organization = room.organization.name;
  const [changing, setChanging] = useState(false);
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "long" }).format(
      new Date(date),
    );

  const header = (title: string, description: string, done = false) => (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {done ? (
          <CheckCircle2Icon aria-hidden="true" className="size-4" />
        ) : (
          <HandCoinsIcon aria-hidden="true" className="size-4" />
        )}
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );

  if (!settlement.sentAt) {
    return (
      <Card>
        {header(
          t("heldTitle", { amount: money(settlement.heldMinor) }),
          room.cautionSettleAfter
            ? t("heldUntil", {
                date: formatDate(room.cautionSettleAfter),
                organization,
              })
            : t("heldDescription", { organization }),
        )}
      </Card>
    );
  }

  if (settlement.refundedAt) {
    return (
      <Card>
        {header(
          t("refundedTitle", { amount: money(settlement.refundMinor ?? 0) }),
          settlement.account
            ? t("refundedDescription", {
                account: `${settlement.account.bankName} ${settlement.account.masked}`,
                date: formatDate(settlement.refundedAt),
              })
            : t("settledDescription", {
                date: formatDate(settlement.refundedAt),
              }),
          true,
        )}
        <CardContent className="space-y-3">
          <Statement currency={room.currency} settlement={settlement} />
          <DeductionEvidence settlement={settlement} />
          {settlement.refundReference ? (
            <p className="text-muted-foreground text-xs">
              {t("reference", { reference: settlement.refundReference })}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const hasAccount = Boolean(settlement.account) && !changing;
  return (
    <Card>
      {header(
        stepName,
        hasAccount && settlement.account
          ? t("accountGiven", {
              account: `${settlement.account.bankName} ${settlement.account.masked}`,
              organization,
            })
          : t("askAccount", {
              amount: money(settlement.refundMinor ?? 0),
              organization,
            }),
      )}
      <CardContent className="space-y-4">
        <Statement currency={room.currency} settlement={settlement} />
        <DeductionEvidence settlement={settlement} />
        {hasAccount ? (
          <Button onClick={() => setChanging(true)} size="sm" variant="outline">
            {t("changeAccount")}
          </Button>
        ) : (
          <div className={cn("rounded-xl border bg-muted/30 p-4")}>
            <AccountForm
              onDone={() => setChanging(false)}
              organization={organization}
              stepId={stepId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
