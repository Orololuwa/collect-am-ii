import { useTranslation } from "react-i18next";

import { DEAL_STATUS_KEYS, DOCUMENT_STATUS_KEYS } from "../deals-constants";
import type { DealDocumentStatus, DealStatus } from "~/generated/browser";
import { cn } from "~/lib/utils";

const pill =
  "inline-flex items-center rounded-md px-2 py-0.5 font-medium text-xs";
const green =
  "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-400";
const amber =
  "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300";
const red = "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-400";
const blue = "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300";
const muted = "bg-muted text-muted-foreground";

const dealStatusClasses = {
  cancelled: muted,
  lost: red,
  open: blue,
  won: green,
} as const satisfies Record<DealStatus, string>;

const documentStatusClasses = {
  accepted: green,
  changesRequested: amber,
  declined: red,
  draft: muted,
  sent: blue,
  viewed: blue,
} as const satisfies Record<DealDocumentStatus, string>;

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const { t } = useTranslation("deals");
  return (
    <span className={cn(pill, dealStatusClasses[status])}>
      {t(DEAL_STATUS_KEYS[status])}
    </span>
  );
}

export function DocumentStatusBadge({
  status,
}: {
  status: DealDocumentStatus;
}) {
  const { t } = useTranslation("deals");
  return (
    <span className={cn(pill, documentStatusClasses[status])}>
      {t(DOCUMENT_STATUS_KEYS[status])}
    </span>
  );
}
