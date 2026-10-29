import { Menu } from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

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

export function Header({ className, ...props }: ComponentProps<"header">) {
  const { t } = useTranslation("landing", { keyPrefix: "header" });
  const { t: tCommon } = useTranslation("translation");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 z-50 w-full border-b backdrop-blur-md",
        className,
      )}
      {...props}
    >
      <div className="container mx-auto flex h-(--header-height) items-center justify-between gap-2 px-4">
        <Link
          className="flex items-center gap-2 self-center font-medium"
          to="/"
        >
          <div className="flex items-center gap-2">
            <CollectAmLogo className="size-8 sm:size-6" />

            <Sheet onOpenChange={setIsMobileMenuOpen} open={isMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  aria-label="Open navigation menu"
                  className="sm:hidden"
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
                <nav className="mt-8 flex flex-col gap-4">
                  <Button
                    asChild
                    className="justify-start"
                    size="sm"
                    variant="ghost"
                  >
                    <Link
                      onClick={() => setIsMobileMenuOpen(false)}
                      to="/pricing"
                    >
                      {t("navLinks.pricing")}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="justify-start"
                    size="sm"
                    variant="ghost"
                  >
                    <Link onClick={() => setIsMobileMenuOpen(false)} to="/docs">
                      {t("navLinks.documentation")}
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <span className="hidden font-mono sm:block">
            {tCommon("appName")}
          </span>
        </Link>

        <nav className="hidden gap-2 sm:flex sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/pricing">{t("navLinks.pricing")}</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/docs">{t("navLinks.documentation")}</Link>
          </Button>
        </nav>

        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/login">{t("login")}</Link>
          </Button>

          <Button asChild size="sm">
            <Link to="/login">{t("register")}</Link>
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
