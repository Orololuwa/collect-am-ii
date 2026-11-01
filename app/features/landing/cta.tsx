import { ArrowRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { href, Link } from "react-router";

import { Button } from "~/components/ui/button";

export function CTA() {
  const { t } = useTranslation("landing", { keyPrefix: "cta" });

  return (
    <section className="px-4 pt-8 pb-24">
      <div className="bg-foreground text-background relative isolate mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-16 sm:py-20">
        <div
          aria-hidden="true"
          className="bg-primary/40 absolute -top-24 left-1/2 -z-10 size-96 -translate-x-1/2 rounded-full blur-3xl"
        />
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h2>
        <p className="text-background/70 mx-auto mt-4 max-w-xl text-lg text-pretty">
          {t("description")}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to={href("/register")}>
              {t("buttons.primary")}
              <ArrowRightIcon />
            </Link>
          </Button>
          <Button
            asChild
            className="text-background hover:bg-background/10 hover:text-background"
            size="lg"
            variant="ghost"
          >
            <Link to={href("/pricing")}>{t("buttons.secondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
