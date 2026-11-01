import { Menu } from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { href, Link } from "react-router";

import { ThemeToggle } from "../color-scheme/theme-toggle";
import { CollectAmLogo } from "~/components/collectam-logo";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { cn } from "~/lib/utils";

const NAV_LINKS = [
  { key: "features", to: "/#features" },
  { key: "howItWorks", to: "/#how-it-works" },
  { key: "pricing", to: "/pricing" },
  { key: "documentation", to: "/docs" },
] as const;

export function Header({ className, ...props }: ComponentProps<"header">) {
  const { t } = useTranslation("landing", { keyPrefix: "header" });
  const { t: tCommon } = useTranslation("translation");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "bg-background/70 fixed top-0 left-0 z-50 w-full border-b backdrop-blur-md",
        className,
      )}
      {...props}
    >
      <div className="container mx-auto flex h-(--header-height) items-center justify-between gap-2 px-4">
        <Link className="flex items-center gap-2 font-semibold" to="/">
          <CollectAmLogo alt="" className="size-7 sm:size-6" />
          <span className="font-mono">{tCommon("appName")}</span>
        </Link>

        <nav
          aria-label={t("mainNav")}
          className="hidden gap-1 md:absolute md:top-1/2 md:left-1/2 md:flex md:-translate-x-1/2 md:-translate-y-1/2"
        >
          {NAV_LINKS.map((link) => (
            <Button asChild key={link.key} size="sm" variant="ghost">
              <Link to={link.to}>{t(`navLinks.${link.key}`)}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            className="hidden sm:inline-flex"
            size="sm"
            variant="ghost"
          >
            <Link to={href("/login")}>{t("login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={href("/register")}>{t("register")}</Link>
          </Button>
          <ThemeToggle />

          <Sheet onOpenChange={setIsMobileMenuOpen} open={isMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                aria-label={t("openMenu")}
                className="md:hidden"
                size="icon"
                variant="ghost"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{tCommon("appName")}</SheetTitle>
              </SheetHeader>
              <nav
                aria-label={t("mainNav")}
                className="flex flex-col gap-1 px-4"
              >
                {NAV_LINKS.map((link) => (
                  <Button
                    asChild
                    className="justify-start"
                    key={link.key}
                    variant="ghost"
                  >
                    <Link
                      onClick={() => setIsMobileMenuOpen(false)}
                      to={link.to}
                    >
                      {t(`navLinks.${link.key}`)}
                    </Link>
                  </Button>
                ))}
                <Button asChild className="justify-start" variant="ghost">
                  <Link
                    onClick={() => setIsMobileMenuOpen(false)}
                    to={href("/login")}
                  >
                    {t("login")}
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
