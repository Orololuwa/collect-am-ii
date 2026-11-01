import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { FaGithub, FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { href, Link } from "react-router";

import { CollectAmLogo } from "~/components/collectam-logo";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const FOOTER_LINKS = [
  { key: "pricing", to: "/pricing" },
  { key: "documentation", to: "/docs" },
  { key: "terms", to: "/terms-of-service" },
  { key: "privacy", to: "/privacy-policy" },
] as const;

const SOCIAL_LINKS = [
  { href: "https://github.com/Orololuwa", icon: FaGithub, key: "github" },
  { href: "https://x.com/Orololuwa", icon: FaXTwitter, key: "twitter" },
  {
    href: "https://www.linkedin.com/in/Orololuwa/",
    icon: FaLinkedin,
    key: "linkedin",
  },
] as const;

export function Footer({ className, ...props }: ComponentProps<"footer">) {
  const { t } = useTranslation("landing", { keyPrefix: "footer" });
  const { t: tCommon } = useTranslation("translation");

  return (
    <footer className={cn("border-t", className)} {...props}>
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-[1fr_auto]">
        <div className="max-w-xs">
          <Link
            className="flex items-center gap-2 font-semibold"
            to={href("/")}
          >
            <CollectAmLogo alt="" className="size-6" />
            <span className="font-mono">{tCommon("appName")}</span>
          </Link>
          <p className="text-muted-foreground mt-3 text-sm">{t("tagline")}</p>
        </div>

        <nav
          aria-label={t("nav")}
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm md:justify-end"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              className="text-muted-foreground hover:text-foreground"
              key={link.key}
              to={link.to}
            >
              {t(`links.${link.key}`)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="container mx-auto flex flex-col items-center justify-between gap-4 border-t px-4 py-6 sm:flex-row">
        <p className="text-muted-foreground text-xs">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
        <div className="flex items-center gap-1">
          {SOCIAL_LINKS.map((social) => (
            <Button
              aria-label={t(`social.${social.key}`)}
              asChild
              className="size-8"
              key={social.key}
              size="icon"
              variant="ghost"
            >
              <a href={social.href} rel="noopener" target="_blank">
                <social.icon />
              </a>
            </Button>
          ))}
        </div>
      </div>
    </footer>
  );
}
