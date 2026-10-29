import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";
import {
  COLLECTAM_LOGO_DARK_MODE_URL,
  COLLECTAM_LOGO_URL,
} from "~/utils/static-assets";

export function CollectAmLogo({ className, ...props }: ComponentProps<"img">) {
  return (
    <>
      <img
        alt="CollectAm"
        className={cn("h-8 w-auto dark:hidden", className)}
        src={COLLECTAM_LOGO_URL}
        {...props}
      />
      <img
        alt="CollectAm"
        className={cn("hidden h-8 w-auto dark:block", className)}
        src={COLLECTAM_LOGO_DARK_MODE_URL}
        {...props}
      />
    </>
  );
}
