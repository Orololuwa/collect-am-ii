import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";
import {
  RENSTUDIO_LOGO_DARK_MODE_URL,
  RENSTUDIO_LOGO_URL,
} from "~/utils/static-assets";

export function RenStudioLogo({ className, ...props }: ComponentProps<"img">) {
  return (
    <>
      <img
        alt="Ren Studio"
        className={cn("h-8 w-auto dark:hidden", className)}
        src={RENSTUDIO_LOGO_URL}
        {...props}
      />
      <img
        alt="Ren Studio"
        className={cn("hidden h-8 w-auto dark:block", className)}
        src={RENSTUDIO_LOGO_DARK_MODE_URL}
        {...props}
      />
    </>
  );
}
