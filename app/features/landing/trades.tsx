import { useTranslation } from "react-i18next";

/** The trades CollectAm ships sample workflows for. */
const TRADES = [
  "eventCentre",
  "shortLet",
  "agency",
  "construction",
  "catering",
  "freelance",
  "madeToOrder",
  "photography",
  "supply",
  "shop",
  "wholesale",
] as const;

export function Trades() {
  const { t } = useTranslation("landing", { keyPrefix: "trades" });

  return (
    <section className="border-y py-10">
      <div className="container mx-auto px-4">
        <p className="text-muted-foreground text-center font-mono text-xs tracking-wider uppercase">
          {t("title")}
        </p>
        <ul className="mx-auto mt-5 flex max-w-4xl flex-wrap justify-center gap-2">
          {TRADES.map((trade) => (
            <li
              className="bg-muted/50 rounded-full border px-3 py-1 text-sm"
              key={trade}
            >
              {t(`items.${trade}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
