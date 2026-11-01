import {
  CheckCircle2Icon,
  CreditCardIcon,
  FileCheckIcon,
  MessagesSquareIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import { formatMoney } from "~/features/organizations/dashboard/dashboard-format";

const POINTS = [
  { icon: CheckCircle2Icon, key: "accept" },
  { icon: MessagesSquareIcon, key: "negotiate" },
  { icon: FileCheckIcon, key: "purchaseOrder" },
  { icon: CreditCardIcon, key: "pay" },
] as const satisfies ReadonlyArray<{
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: string;
}>;

const MOCK_LINES = [
  { amountMinor: 60_000_000, key: "hall" },
  { amountMinor: 15_000_000, key: "chairs" },
  { amountMinor: 10_000_000, key: "caution" },
] as const;

export function DealRoomSection() {
  const { t } = useTranslation("landing", { keyPrefix: "dealRoom" });

  return (
    <section className="bg-muted/40 border-y py-24 sm:py-32">
      <div className="container mx-auto grid grid-cols-1 items-center gap-16 px-4 lg:grid-cols-2">
        <div>
          <p className="text-primary font-mono text-sm font-medium">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg text-lg text-pretty">
            {t("description")}
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {POINTS.map((point) => (
              <li className="flex gap-3" key={point.key}>
                <point.icon
                  aria-hidden="true"
                  className="text-primary mt-0.5 size-5 shrink-0"
                />
                <div>
                  <h3 className="font-medium">
                    {t(`points.${point.key}.title`)}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {t(`points.${point.key}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <DealRoomMock />
      </div>
    </section>
  );
}

/** The customer's side: a quote they can accept or push back on. */
function DealRoomMock() {
  const { t, i18n } = useTranslation("landing", { keyPrefix: "dealRoom.mock" });
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency: "NGN", locale: i18n.language });

  return (
    <div
      aria-hidden="true"
      className="bg-card mx-auto w-full max-w-md rounded-2xl border shadow-2xl shadow-black/5 dark:shadow-black/40"
    >
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <div className="bg-foreground text-background flex size-7 items-center justify-center rounded-md text-xs font-bold">
          EH
        </div>
        <span className="font-medium">{t("business")}</span>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold">{t("document")}</p>
          <p className="text-muted-foreground text-xs">{t("validUntil")}</p>
        </div>

        <ul className="space-y-2.5 text-sm">
          {MOCK_LINES.map((line) => (
            <li className="flex justify-between gap-4" key={line.key}>
              <span className="text-muted-foreground">
                {t(`lines.${line.key}`)}
              </span>
              <span className="tabular-nums">{money(line.amountMinor)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-4 border-t pt-2.5 font-semibold">
            <span>{t("total")}</span>
            <span className="tabular-nums">{money(85_000_000)}</span>
          </li>
        </ul>

        <div>
          <p className="text-sm font-medium">{t("purchaseOrder")}</p>
          <div className="text-muted-foreground mt-1.5 rounded-md border px-3 py-2 text-sm">
            {t("purchaseOrderPlaceholder")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border py-2 text-center text-sm font-medium">
            {t("suggest")}
          </div>
          <div className="bg-primary text-primary-foreground rounded-md py-2 text-center text-sm font-medium">
            {t("accept")}
          </div>
        </div>
      </div>
    </div>
  );
}
