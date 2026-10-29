import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { FaGithub, FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { Link } from "react-router";

import { ThemeToggle } from "../color-scheme/theme-toggle";
import { CollectAmLogo } from "~/components/collectam-logo";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";

export function Footer({ className, ...props }: ComponentProps<"footer">) {
  const { t } = useTranslation("landing", { keyPrefix: "footer" });

  return (
    <footer
      className={cn("border-t md:h-(--header-height)", className)}
      {...props}
    >
      <div className="container mx-auto flex h-full flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row md:py-0">
        <div className="flex items-center gap-2">
          <Button
            aria-label={t("social.github")}
            asChild
            className="size-8"
            size="icon"
            variant="outline"
          >
            <Link to="https://github.com/Orololuwa">
              <FaGithub />
            </Link>
          </Button>

          <Button
            aria-label={t("social.twitter")}
            asChild
            className="size-8"
            size="icon"
            variant="outline"
          >
            <a href="https://x.com/Orololuwa">
              <FaXTwitter />
            </a>
          </Button>

          <Button
            aria-label={t("social.linkedin")}
            asChild
            className="size-8"
            size="icon"
            variant="outline"
          >
            <a href="https://www.linkedin.com/in/Orololuwa/">
              <FaLinkedin />
            </a>
          </Button>

          <div className="h-6">
            <Separator orientation="vertical" />
          </div>

          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2">
          <Link to="/">
            <CollectAmLogo />
          </Link>
        </div>
      </div>
    </footer>
  );
}
