import {
  CoinsIcon,
  HandCoinsIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MailIcon,
  PackageIcon,
  PaletteIcon,
  UsersIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "~/lib/utils";

const FEATURES = [
  { icon: HandCoinsIcon, key: "caution", wide: true },
  { icon: LayoutDashboardIcon, key: "dashboard", wide: true },
  { icon: PackageIcon, key: "products", wide: false },
  { icon: HistoryIcon, key: "timeline", wide: false },
  { icon: UsersIcon, key: "team", wide: false },
  { icon: CoinsIcon, key: "currencies", wide: false },
  { icon: PaletteIcon, key: "templates", wide: true },
  { icon: MailIcon, key: "emails", wide: true },
] as const satisfies ReadonlyArray<{
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  key: string;
  wide: boolean;
}>;

export function Features() {
  const { t } = useTranslation("landing", { keyPrefix: "features" });

  return (
    <section className="scroll-mt-20 py-24 sm:py-32" id="features">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-sm font-medium">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h2>
        </div>

        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <li
              className={cn(
                "bg-card group relative overflow-hidden rounded-2xl border p-6",
                feature.wide && "lg:col-span-2",
              )}
              key={feature.key}
            >
              {feature.wide ? (
                <feature.icon
                  aria-hidden="true"
                  className="text-primary/5 absolute -right-6 -bottom-6 size-40"
                />
              ) : null}
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <feature.icon aria-hidden="true" className="size-5" />
              </div>
              <h3 className="mt-5 font-semibold">
                {t(`items.${feature.key}.title`)}
              </h3>
              <p
                className={cn(
                  "text-muted-foreground relative mt-2 text-sm leading-relaxed",
                  feature.wide && "max-w-md",
                )}
              >
                {t(`items.${feature.key}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
