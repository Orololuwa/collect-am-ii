import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  CreditCardIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileTextIcon,
  Link2Icon,
  PencilIcon,
  ReceiptIcon,
  SendIcon,
  TrophyIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { href, useFetcher, useRevalidator } from "react-router";

import { paymentMethodName } from "../deal-documents";
import type { DealLineItem } from "../deal-items";
import { lineNetMinor } from "../deal-items";
import type { DealEventType } from "../deals-constants";
import {
  ACCEPT_DOCUMENT_INTENT,
  APPROVE_PROPOSAL_INTENT,
  CLOSE_DEAL_INTENT,
  DECLINE_DOCUMENT_INTENT,
  DOCUMENT_TYPE_KEYS,
  EVENT_KEYS,
  MAX_MESSAGE_LENGTH,
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHODS,
  POST_MESSAGE_INTENT,
  RECORD_PAYMENT_INTENT,
  REJECT_PROPOSAL_INTENT,
  RESEND_DOCUMENT_INTENT,
  RESET_SHARE_LINK_INTENT,
  REVISE_DOCUMENT_INTENT,
  SEND_DOCUMENT_INTENT,
} from "../deals-constants";
import type { LineChange } from "../proposal-diff";
import { diffDealItems } from "../proposal-diff";
import { DealStatusBadge, DocumentStatusBadge } from "./deal-badges";
import type { DealProductOption } from "./deal-items-editor";
import { DealItemsEditor } from "./deal-items-editor";
import { DealItemsTable } from "./deal-items-table";
import { DocumentTypeIcon } from "./document-type-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input, inputClassName } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import {
  formatMoney,
  formatRelativeTime,
} from "~/features/organizations/dashboard/dashboard-format";
import { basisPointsToPercent } from "~/features/products/products-format";
import type {
  DealDocumentStatus,
  DealParty,
  DealStatus,
  DealStepStatus,
  PaymentStatus,
  TemplateType,
  WorkflowStepKind,
} from "~/generated/browser";
import { cn } from "~/lib/utils";

type DocumentRef = { type: TemplateType; number: string | null };

export type DealDocumentView = {
  id: string;
  type: TemplateType;
  number: string | null;
  status: DealDocumentStatus;
  sentAt: Date | null;
  dueAt: Date | null;
  acceptedAt: Date | null;
  acceptedByName: string;
  declineReason: string;
  versionCount: number;
  /** A change the customer suggested on the share link, awaiting review. */
  proposal: {
    id: string;
    version: number;
    items: DealLineItem[];
    note: string;
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    createdAt: Date;
  } | null;
  current: {
    version: number;
    items: DealLineItem[];
    note: string;
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
  };
};

export type DealStepView = {
  id: string;
  kind: WorkflowStepKind;
  name: string;
  status: DealStepStatus;
  requiresAcceptance: boolean;
  validityDays: number | null;
  amountDueMinor: number | null;
  amountPaidMinor: number | null;
  paidAt: Date | null;
  paymentMethod: string;
  paymentReference: string;
  /** Online payment attempts for a payment step, newest first. */
  payments: Array<{
    id: string;
    provider: string;
    status: PaymentStatus;
    amountMinor: number;
    createdAt: Date;
  }>;
  document: DealDocumentView | null;
};

export type DealView = {
  id: string;
  title: string;
  shareUrl: string;
  status: DealStatus;
  currency: string;
  workflowName: string;
  createdAt: Date;
  closedAt: Date | null;
  createdByName: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    companyName: string;
  };
  steps: DealStepView[];
  events: Array<{
    id: string;
    type: DealEventType;
    actor: DealParty;
    userName: string | null;
    createdAt: Date;
    document: DocumentRef | null;
    payload: Record<string, unknown>;
  }>;
  messages: Array<{
    id: string;
    author: DealParty;
    userName: string | null;
    body: string;
    createdAt: Date;
  }>;
};

type DocumentLinks = { preview: string; pdf: string };

const kindIcons = {
  document: FileTextIcon,
  payment: CreditCardIcon,
  receipt: ReceiptIcon,
} as const satisfies Record<WorkflowStepKind, unknown>;

const selectClassName = cn(inputClassName, "read-only:opacity-100");

const PAYMENT_STATUS_KEYS = {
  canceled: "paymentStatus.canceled",
  failed: "paymentStatus.failed",
  partially_refunded: "paymentStatus.refunded",
  pending: "paymentStatus.pending",
  processing: "paymentStatus.pending",
  refunded: "paymentStatus.refunded",
  succeeded: "paymentStatus.succeeded",
} as const satisfies Record<PaymentStatus, string>;

const stepStatusKeys = {
  active: "stepStatus.active",
  done: "stepStatus.done",
  pending: "stepStatus.pending",
} as const satisfies Record<DealStepStatus, string>;

function useDocumentTypeName() {
  const { t } = useTranslation("deals");
  return (type: TemplateType) =>
    t(DOCUMENT_TYPE_KEYS[type as keyof typeof DOCUMENT_TYPE_KEYS]);
}

function useDocumentLabel() {
  const { t } = useTranslation("deals");
  const typeName = useDocumentTypeName();
  return (document: DocumentRef) =>
    `${typeName(document.type)} ${document.number ?? t("detail.draftNumber")}`;
}

function useFormatDate() {
  const { i18n } = useTranslation();
  return (date: Date | string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
}

/** Runs `onDone` once a fetcher's submission has come back successfully. */
function useOnSuccess(
  fetcher: ReturnType<typeof useFetcher>,
  onDone: () => void,
) {
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (fetcher.state === "submitting") {
      setSubmitted(true);
    } else if (fetcher.state === "idle" && submitted) {
      setSubmitted(false);
      if ((fetcher.data as { ok?: boolean } | undefined)?.ok) {
        onDone();
      }
    }
  }, [fetcher.state, fetcher.data, submitted, onDone]);
}

export function StepsProgress({
  steps,
}: {
  steps: Array<Pick<DealStepView, "id" | "kind" | "name" | "status">>;
}) {
  const { t } = useTranslation("deals", { keyPrefix: "detail" });
  return (
    <nav aria-label={t("steps")} className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2">
        {steps.map((step, index) => {
          const Icon = kindIcons[step.kind];
          return (
            <li className="flex items-center gap-2" key={step.id}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px w-6",
                    step.status === "pending" ? "bg-border" : "bg-primary",
                  )}
                />
              ) : null}
              <span
                aria-current={step.status === "active" ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                  step.status === "done" &&
                    "border-transparent bg-primary/10 text-primary",
                  step.status === "active" &&
                    "border-primary bg-card font-medium text-foreground",
                  step.status === "pending" && "text-muted-foreground",
                )}
              >
                {step.status === "done" ? (
                  <CheckIcon aria-hidden="true" className="size-3.5" />
                ) : (
                  <Icon aria-hidden="true" className="size-3.5" />
                )}
                {step.name}
                <span className="sr-only">
                  ({t(stepStatusKeys[step.status])})
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function IntentButton({
  intent,
  fields,
  children,
  variant = "outline",
  pendingLabel,
}: {
  intent: string;
  fields: Record<string, string>;
  children: ReactNode;
  variant?: "default" | "outline" | "ghost";
  pendingLabel?: string;
}) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";
  return (
    <fetcher.Form method="POST">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <Button
        disabled={busy}
        name="intent"
        size="sm"
        type="submit"
        value={intent}
        variant={variant}
      >
        {busy ? <Spinner /> : null}
        {busy && pendingLabel ? pendingLabel : children}
      </Button>
    </fetcher.Form>
  );
}

function AcceptDialog({
  documentId,
  defaultName,
  open,
  onOpenChange,
}: {
  documentId: string;
  defaultName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("deals", { keyPrefix: "detail" });
  const fetcher = useFetcher();
  const id = useId();
  useOnSuccess(fetcher, () => onOpenChange(false));
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <fetcher.Form className="space-y-4" method="POST">
          <DialogHeader>
            <DialogTitle>{t("acceptTitle")}</DialogTitle>
            <DialogDescription>{t("acceptDescription")}</DialogDescription>
          </DialogHeader>
          <input name="documentId" type="hidden" value={documentId} />
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>{t("acceptedByLabel")}</Label>
            <Input
              defaultValue={defaultName}
              id={`${id}-name`}
              maxLength={120}
              name="acceptedByName"
              required
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              {t("cancel")}
            </Button>
            <Button
              disabled={fetcher.state !== "idle"}
              name="intent"
              type="submit"
              value={ACCEPT_DOCUMENT_INTENT}
            >
              {fetcher.state !== "idle" ? <Spinner /> : null}
              {t("confirm")}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}

function DeclineDialog({
  documentId,
  open,
  onOpenChange,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("deals", { keyPrefix: "detail" });
  const fetcher = useFetcher();
  const id = useId();
  useOnSuccess(fetcher, () => onOpenChange(false));
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <fetcher.Form className="space-y-4" method="POST">
          <DialogHeader>
            <DialogTitle>{t("declineTitle")}</DialogTitle>
            <DialogDescription>{t("declineDescription")}</DialogDescription>
          </DialogHeader>
          <input name="documentId" type="hidden" value={documentId} />
          <div className="space-y-2">
            <Label htmlFor={`${id}-reason`}>{t("reasonLabel")}</Label>
            <Textarea
              id={`${id}-reason`}
              maxLength={500}
              name="reason"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              {t("cancel")}
            </Button>
            <Button
              disabled={fetcher.state !== "idle"}
              name="intent"
              type="submit"
              value={DECLINE_DOCUMENT_INTENT}
              variant="destructive"
            >
              {fetcher.state !== "idle" ? <Spinner /> : null}
              {t("confirm")}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}

function ReviseForm({
  document,
  currency,
  products,
  onDone,
}: {
  document: DealDocumentView;
  currency: string;
  products: DealProductOption[];
  onDone: () => void;
}) {
  const { t } = useTranslation("deals", { keyPrefix: "detail" });
  const fetcher = useFetcher();
  const [valid, setValid] = useState(true);
  const id = useId();
  const busy = fetcher.state !== "idle";
  useOnSuccess(fetcher, onDone);
  const createsVersion = document.sentAt !== null;

  return (
    <fetcher.Form className="space-y-4" method="POST">
      <input name="documentId" type="hidden" value={document.id} />
      <DealItemsEditor
        currency={currency}
        initialItems={document.current.items}
        onValidityChange={setValid}
        products={products}
      />
      {createsVersion ? (
        <div className="space-y-2">
          <Label htmlFor={`${id}-note`}>{t("noteLabel")}</Label>
          <Textarea id={`${id}-note`} maxLength={500} name="note" rows={2} />
          <p className="text-muted-foreground text-xs">
            {t("reviseHint", { version: document.versionCount + 1 })}
          </p>
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button onClick={onDone} type="button" variant="ghost">
          {t("cancel")}
        </Button>
        <Button
          disabled={busy || !valid}
          name="intent"
          type="submit"
          value={REVISE_DOCUMENT_INTENT}
        >
          {busy ? <Spinner /> : null}
          {busy ? t("savingItems") : t("saveItems")}
        </Button>
      </div>
    </fetcher.Form>
  );
}

function DocumentMeta({ document }: { document: DealDocumentView }) {
  const { t } = useTranslation("deals", { keyPrefix: "detail" });
  const formatDate = useFormatDate();
  const parts = [
    t("version", { version: document.current.version }),
    document.sentAt ? t("sentOn", { date: formatDate(document.sentAt) }) : null,
    document.dueAt
      ? document.type === "invoice"
        ? t("dueOn", { date: formatDate(document.dueAt) })
        : t("validUntil", { date: formatDate(document.dueAt) })
      : null,
  ].filter(Boolean);
  return <p className="text-muted-foreground text-sm">{parts.join(" · ")}</p>;
}

function CurrentDocument({
  deal,
  step,
  document,
  products,
  links,
  onPreview,
}: {
  deal: DealView;
  step: DealStepView;
  document: DealDocumentView;
  products: DealProductOption[];
  links: DocumentLinks;
  onPreview: () => void;
}) {
  const { t } = useTranslation("deals", { keyPrefix: "detail" });
  const label = useDocumentLabel();
  const typeName = useDocumentTypeName();
  const formatDate = useFormatDate();
  const [editing, setEditing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const isDraft = document.status === "draft";
  const awaitingAnswer =
    step.requiresAcceptance &&
    ["sent", "viewed", "changesRequested"].includes(document.status);
  const canRevise = document.status !== "accepted";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {label(document)}
          <DocumentStatusBadge status={document.status} />
        </CardTitle>
        {/* The step's own name, when it says more than the document type. */}
        {step.name !== typeName(document.type) ? (
          <CardDescription>{step.name}</CardDescription>
        ) : null}
        <CardAction className="flex gap-2">
          <Button onClick={onPreview} size="sm" variant="ghost">
            <EyeIcon aria-hidden="true" />
            {t("preview")}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a download href={links.pdf}>
              <DownloadIcon aria-hidden="true" />
              {t("downloadPdf")}
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <DocumentMeta document={document} />
        {isDraft ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
            {t("draftHint", { email: deal.customer.email })}
          </p>
        ) : null}
        {awaitingAnswer && !document.proposal ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
            {t("awaitingHint", { name: deal.customer.name })}
          </p>
        ) : null}
        {document.status === "declined" ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {document.declineReason
              ? t("declinedReason", { reason: document.declineReason })
              : t("declinedNoReason")}
          </p>
        ) : null}
        {document.status === "accepted" && document.acceptedAt ? (
          <p className="text-muted-foreground text-sm">
            {t("acceptedBy", {
              date: formatDate(document.acceptedAt),
              name: document.acceptedByName,
            })}
          </p>
        ) : null}

        {document.proposal && !editing ? (
          <ProposalReview
            currency={deal.currency}
            customerName={deal.customer.name}
            document={document}
            proposal={document.proposal}
          />
        ) : null}

        {editing ? (
          <ReviseForm
            currency={deal.currency}
            document={document}
            onDone={() => setEditing(false)}
            products={products}
          />
        ) : (
          <DealItemsTable
            currency={deal.currency}
            items={document.current.items}
            totals={document.current}
          />
        )}

        {editing ? null : (
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {canRevise ? (
              <Button
                onClick={() => setEditing(true)}
                size="sm"
                variant="outline"
              >
                <PencilIcon aria-hidden="true" />
                {isDraft ? t("editItems") : t("revise")}
              </Button>
            ) : null}
            {!isDraft ? (
              <IntentButton
                fields={{ documentId: document.id }}
                intent={RESEND_DOCUMENT_INTENT}
                pendingLabel={t("sending")}
              >
                <SendIcon aria-hidden="true" />
                {t("resend")}
              </IntentButton>
            ) : null}
            {awaitingAnswer ? (
              <>
                <Button
                  onClick={() => setDeclining(true)}
                  size="sm"
                  variant="outline"
                >
                  {t("markDeclined")}
                </Button>
                <Button onClick={() => setAccepting(true)} size="sm">
                  <CheckIcon aria-hidden="true" />
                  {t("markAccepted")}
                </Button>
              </>
            ) : null}
            {isDraft ? (
              <IntentButton
                fields={{ documentId: document.id }}
                intent={SEND_DOCUMENT_INTENT}
                pendingLabel={t("sending")}
                variant="default"
              >
                <SendIcon aria-hidden="true" />
                {t("send")}
              </IntentButton>
            ) : null}
          </div>
        )}
      </CardContent>
      <AcceptDialog
        defaultName={deal.customer.name}
        documentId={document.id}
        onOpenChange={setAccepting}
        open={accepting}
      />
      <DeclineDialog
        documentId={document.id}
        onOpenChange={setDeclining}
        open={declining}
      />
    </Card>
  );
}

const changeLabelKeys = {
  added: "detail.proposalAdded",
  changed: "detail.proposalChanged",
  removed: "detail.proposalRemoved",
} as const;

/**
 * The customer's suggested lines next to the current ones: changed figures
 * show the old value struck through, and removed or added lines are marked.
 */
function ProposalDiffTable({
  current,
  proposed,
  currency,
}: {
  current: DealLineItem[];
  proposed: DealLineItem[];
  currency: string;
}) {
  const { t, i18n } = useTranslation("deals");
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency, locale: i18n.language });
  const percent = (basisPoints: number) =>
    basisPoints > 0 ? `${basisPointsToPercent(basisPoints)}%` : "—";
  const changes = diffDealItems(current, proposed);

  const cell = (change: LineChange, show: (item: DealLineItem) => string) => {
    if (change.kind === "removed") {
      return (
        <span className="text-muted-foreground line-through">
          {show(change.before)}
        </span>
      );
    }
    if (change.kind === "added") {
      return show(change.after);
    }
    const before = show(change.before);
    const after = show(change.after);
    return before === after ? (
      after
    ) : (
      <span className="flex flex-col items-end">
        <span className="rounded bg-amber-200/70 px-1 font-medium dark:bg-amber-400/25">
          {after}
        </span>
        <span className="text-muted-foreground text-xs line-through">
          {before}
        </span>
      </span>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-xs">
          <tr>
            <th className="px-3 py-2 text-left font-medium">
              {t("items.product")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("items.quantity")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("items.unitPrice")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("items.tax")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("items.discount")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("items.amount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change, index) => {
            const item =
              change.kind === "removed" ? change.before : change.after;
            return (
              <tr
                className={cn(
                  "border-t align-top",
                  change.kind === "removed" && "bg-muted/40",
                  change.kind === "added" && "bg-primary/5",
                )}
                // biome-ignore lint/suspicious/noArrayIndexKey: lines have no id and the diff never reorders
                key={index}
              >
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "font-medium",
                      change.kind === "removed" &&
                        "text-muted-foreground line-through",
                    )}
                  >
                    {item.name}
                  </span>
                  {change.kind !== "same" ? (
                    <span className="block text-muted-foreground text-xs">
                      {t(changeLabelKeys[change.kind])}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {cell(change, (line) => `${line.quantity} ${line.unit}`)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {cell(change, (line) => money(line.unitPriceMinor))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {cell(change, (line) => percent(line.taxRateBps))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {cell(change, (line) => percent(line.discountBps))}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {cell(change, (line) => money(lineNetMinor(line)))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProposalReview({
  document,
  proposal,
  currency,
  customerName,
}: {
  document: DealDocumentView;
  proposal: NonNullable<DealDocumentView["proposal"]>;
  currency: string;
  customerName: string;
}) {
  const { t, i18n } = useTranslation("deals", { keyPrefix: "detail" });
  const { t: tItems } = useTranslation("deals", { keyPrefix: "items" });
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency, locale: i18n.language });
  return (
    <div className="space-y-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-400/10">
      <div className="space-y-1">
        <p className="font-medium">
          {t("proposalTitle", { name: customerName })}
        </p>
        <p className="text-muted-foreground text-sm">
          {t("proposalDescription")}
        </p>
        {proposal.note ? (
          <p className="whitespace-pre-line text-sm">
            {t("proposalNote", { note: proposal.note })}
          </p>
        ) : null}
      </div>
      <ProposalDiffTable
        currency={currency}
        current={document.current.items}
        proposed={proposal.items}
      />
      <dl className="ml-auto grid w-fit min-w-56 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
        <dt className="text-muted-foreground">{tItems("subtotal")}</dt>
        <dd className="text-right">{money(proposal.subtotalMinor)}</dd>
        {proposal.discountMinor > 0 ? (
          <>
            <dt className="text-muted-foreground">{tItems("discountTotal")}</dt>
            <dd className="text-right">−{money(proposal.discountMinor)}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">{tItems("taxTotal")}</dt>
        <dd className="text-right">{money(proposal.taxMinor)}</dd>
      </dl>
      <p className="text-right font-medium text-sm">
        {t("proposalTotal", {
          previous: money(document.current.totalMinor),
          total: money(proposal.totalMinor),
        })}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <IntentButton
          fields={{ versionId: proposal.id }}
          intent={REJECT_PROPOSAL_INTENT}
        >
          {t("rejectProposal")}
        </IntentButton>
        <IntentButton
          fields={{ versionId: proposal.id }}
          intent={APPROVE_PROPOSAL_INTENT}
          pendingLabel={t("sending")}
          variant="default"
        >
          <CheckIcon aria-hidden="true" />
          {t("approveProposal")}
        </IntentButton>
      </div>
    </div>
  );
}

function ShareLink({ deal }: { deal: DealView }) {
  const { t } = useTranslation("deals", { keyPrefix: "detail" });
  const fetcher = useFetcher();
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const id = useId();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(deal.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the link stays selectable.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2Icon aria-hidden="true" className="size-4" />
          {t("shareLink")}
        </CardTitle>
        <CardDescription>{t("shareLinkDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          aria-label={t("shareLink")}
          className="font-mono text-xs"
          id={`${id}-link`}
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          value={deal.shareUrl}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={copy} size="sm" type="button">
            {copied ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <CopyIcon aria-hidden="true" />
            )}
            {copied ? t("copied") : t("copyLink")}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={deal.shareUrl} rel="noreferrer" target="_blank">
              <ExternalLinkIcon aria-hidden="true" />
              {t("openLink")}
            </a>
          </Button>
          <Button
            onClick={() => setResetting(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("resetLink")}
          </Button>
        </div>
      </CardContent>
      <AlertDialog onOpenChange={setResetting} open={resetting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("resetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("resetDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                fetcher.submit(
                  { intent: RESET_SHARE_LINK_INTENT },
                  { method: "POST" },
                )
              }
            >
              {t("confirmReset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Reloads the deal every few seconds while the tab is visible, so customer answers show up. */
function usePolling() {
  const revalidator = useRevalidator();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        revalidator.state === "idle"
      ) {
        void revalidator.revalidate();
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [revalidator]);
}

function PaymentStep({ deal, step }: { deal: DealView; step: DealStepView }) {
  const { t, i18n } = useTranslation("deals", { keyPrefix: "detail" });
  const { t: tDeals } = useTranslation("deals");
  const fetcher = useFetcher();
  const id = useId();
  const busy = fetcher.state !== "idle";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon aria-hidden="true" className="size-4" />
          {step.name}
        </CardTitle>
        <CardDescription>{t("recordPaymentDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-muted-foreground text-sm">{t("amountDue")}</p>
          <p className="font-semibold text-3xl tabular-nums tracking-tight">
            {formatMoney({
              amountMinor: step.amountDueMinor ?? 0,
              currency: deal.currency,
              locale: i18n.language,
            })}
          </p>
        </div>
        {step.payments.length > 0 ? (
          <div className="space-y-2">
            <p className="font-medium text-sm">{t("onlineAttempts")}</p>
            <ul className="divide-y rounded-lg border text-sm">
              {step.payments.map((payment) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  key={payment.id}
                >
                  <span>
                    {paymentMethodName(payment.provider)} ·{" "}
                    {formatMoney({
                      amountMinor: payment.amountMinor,
                      currency: deal.currency,
                      locale: i18n.language,
                    })}
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground text-xs">
                    {tDeals(PAYMENT_STATUS_KEYS[payment.status])} ·{" "}
                    {formatRelativeTime(payment.createdAt, i18n.language)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <fetcher.Form
          className="grid gap-4 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          method="POST"
        >
          <input name="stepId" type="hidden" value={step.id} />
          <div className="space-y-2">
            <Label htmlFor={`${id}-method`}>{t("methodLabel")}</Label>
            <select
              className={selectClassName}
              defaultValue="bankTransfer"
              id={`${id}-method`}
              name="method"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {tDeals(PAYMENT_METHOD_KEYS[method])}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-reference`}>{t("referenceLabel")}</Label>
            <Input
              id={`${id}-reference`}
              maxLength={120}
              name="reference"
              placeholder={t("referencePlaceholder")}
            />
          </div>
          <Button
            disabled={busy}
            name="intent"
            type="submit"
            value={RECORD_PAYMENT_INTENT}
          >
            {busy ? <Spinner /> : null}
            {t("recordPayment")}
          </Button>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function CloseDealMenu() {
  const { t } = useTranslation("deals", { keyPrefix: "detail" });
  const fetcher = useFetcher();
  const [closing, setClosing] = useState<"lost" | "cancelled" | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            {t("closeDeal")}
            <ChevronDownIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setClosing("lost")}>
            {t("markLost")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setClosing("cancelled")}>
            {t("cancelDeal")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog
        onOpenChange={(open) => (open ? null : setClosing(null))}
        open={closing !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {closing === "lost" ? t("closeLostTitle") : t("closeCancelTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("closeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keepOpen")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                closing &&
                fetcher.submit(
                  { intent: CLOSE_DEAL_INTENT, status: closing },
                  { method: "POST" },
                )
              }
            >
              {t("confirmClose")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DocumentsList({
  deal,
  linksFor,
  onPreview,
}: {
  deal: DealView;
  linksFor: (documentId: string) => DocumentLinks;
  onPreview: (documentId: string) => void;
}) {
  const { t, i18n } = useTranslation("deals", { keyPrefix: "detail" });
  const label = useDocumentLabel();
  const documents = deal.steps.flatMap((step) =>
    step.document ? [step.document] : [],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("documents")}</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noDocuments")}</p>
        ) : (
          <ul className="divide-y">
            {documents.map((document) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                key={document.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <DocumentTypeIcon type={document.type} />
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-sm">
                      {label(document)}
                      <DocumentStatusBadge status={document.status} />
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatMoney({
                        amountMinor: document.current.totalMinor,
                        currency: deal.currency,
                        locale: i18n.language,
                      })}{" "}
                      · {t("versions", { count: document.versionCount })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => onPreview(document.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <EyeIcon aria-hidden="true" />
                    {t("preview")}
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a download href={linksFor(document.id).pdf}>
                      <DownloadIcon aria-hidden="true" />
                      {t("downloadPdf")}
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Messages({ deal }: { deal: DealView }) {
  const { t, i18n } = useTranslation("deals", { keyPrefix: "messages" });
  const fetcher = useFetcher();
  const [formKey, setFormKey] = useState(0);
  const busy = fetcher.state !== "idle";
  useOnSuccess(fetcher, () => setFormKey((key) => key + 1));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deal.messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ol className="max-h-96 space-y-3 overflow-y-auto">
            {deal.messages.map((message) => {
              const mine = message.author === "business";
              return (
                <li
                  className={cn(
                    "flex flex-col gap-1",
                    mine ? "items-end" : "items-start",
                  )}
                  key={message.id}
                >
                  <span
                    className={cn(
                      "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
                      mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted",
                    )}
                  >
                    {message.body}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {(mine ? message.userName : null) ??
                      (mine ? t("you") : deal.customer.name)}{" "}
                    · {formatRelativeTime(message.createdAt, i18n.language)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <fetcher.Form className="space-y-2" key={formKey} method="POST">
          <Textarea
            aria-label={t("placeholder")}
            maxLength={MAX_MESSAGE_LENGTH}
            name="body"
            placeholder={t("placeholder")}
            required
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              disabled={busy}
              name="intent"
              size="sm"
              type="submit"
              value={POST_MESSAGE_INTENT}
            >
              {busy ? <Spinner /> : <SendIcon aria-hidden="true" />}
              {t("send")}
            </Button>
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function Activity({ deal }: { deal: DealView }) {
  const { t, i18n } = useTranslation("deals");
  const label = useDocumentLabel();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.activity")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l pl-4">
          {deal.events.map((event) => {
            const actor =
              event.actor === "system"
                ? t("events.system")
                : event.actor === "customer"
                  ? t("events.customer")
                  : (event.userName ?? t("events.someone"));
            const amount =
              typeof event.payload.amountMinor === "number"
                ? formatMoney({
                    amountMinor: event.payload.amountMinor,
                    currency: deal.currency,
                    locale: i18n.language,
                  })
                : "";
            return (
              <li className="relative" key={event.id}>
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-border ring-4 ring-card"
                />
                <p className="text-sm">
                  {t(
                    event.type === "paymentRecorded" && event.payload.online
                      ? "events.paymentReceivedOnline"
                      : EVENT_KEYS[event.type],
                    {
                      actor,
                      amount,
                      document: event.document ? label(event.document) : "",
                      method: paymentMethodName(
                        String(event.payload.method ?? ""),
                      ),
                      name: String(event.payload.acceptedByName ?? ""),
                      version: String(event.payload.version ?? ""),
                    },
                  )}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatRelativeTime(event.createdAt, i18n.language)}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

export function DealDetail({
  deal,
  products,
  organizationSlug,
}: {
  deal: DealView;
  products: DealProductOption[];
  organizationSlug: string;
}) {
  const { t } = useTranslation("deals", { keyPrefix: "detail" });
  const label = useDocumentLabel();
  const formatDate = useFormatDate();
  const [previewId, setPreviewId] = useState<string | null>(null);
  usePolling();
  const activeStep = deal.steps.find((step) => step.status === "active");
  const linksFor = (documentId: string): DocumentLinks => {
    const params = { dealId: deal.id, documentId, organizationSlug };
    return {
      pdf: href(
        "/organizations/:organizationSlug/deals/:dealId/documents/:documentId/pdf",
        params,
      ),
      preview: href(
        "/organizations/:organizationSlug/deals/:dealId/documents/:documentId/preview",
        params,
      ),
    };
  };
  const previewDocument = deal.steps.find(
    (step) => step.document?.id === previewId,
  )?.document;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">
              {deal.title}
            </h1>
            <DealStatusBadge status={deal.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {deal.customer.companyName
              ? `${deal.customer.name} · ${deal.customer.companyName}`
              : deal.customer.name}{" "}
            · {deal.workflowName} ·{" "}
            {t("startedBy", {
              date: formatDate(deal.createdAt),
              name: deal.createdByName ?? "—",
            })}
          </p>
        </div>
        {deal.status === "open" ? <CloseDealMenu /> : null}
      </header>

      <StepsProgress steps={deal.steps} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {deal.status === "won" ? (
            <Card>
              <CardContent className="flex items-center gap-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TrophyIcon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{t("dealWon")}</p>
                  <p className="text-muted-foreground text-sm">
                    {t("dealWonDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : deal.status !== "open" ? (
            <Card>
              <CardContent>
                <p className="font-medium">{t("dealClosed")}</p>
              </CardContent>
            </Card>
          ) : activeStep?.kind === "payment" ? (
            <PaymentStep deal={deal} step={activeStep} />
          ) : activeStep?.document ? (
            <CurrentDocument
              deal={deal}
              document={activeStep.document}
              key={`${activeStep.document.id}-${activeStep.document.current.version}`}
              links={linksFor(activeStep.document.id)}
              onPreview={() => setPreviewId(activeStep.document?.id ?? null)}
              products={products}
              step={activeStep}
            />
          ) : null}

          <DocumentsList
            deal={deal}
            linksFor={linksFor}
            onPreview={setPreviewId}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("customer")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{deal.customer.name}</p>
              {deal.customer.companyName ? (
                <p>{deal.customer.companyName}</p>
              ) : null}
              <p className="text-muted-foreground">{deal.customer.email}</p>
              {deal.customer.phone ? (
                <p className="text-muted-foreground">{deal.customer.phone}</p>
              ) : null}
            </CardContent>
          </Card>
          <ShareLink deal={deal} />
          <Messages deal={deal} />
          <Activity deal={deal} />
        </div>
      </div>

      <Dialog
        onOpenChange={(open) => (open ? null : setPreviewId(null))}
        open={previewDocument !== undefined && previewDocument !== null}
      >
        <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-3 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {previewDocument ? label(previewDocument) : ""}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("preview")}
            </DialogDescription>
          </DialogHeader>
          {previewId ? (
            <iframe
              className="w-full flex-1 rounded-lg border bg-white"
              // Same-origin so the login cookie goes along; scripts stay off.
              sandbox="allow-same-origin"
              src={linksFor(previewId).preview}
              title={previewDocument ? label(previewDocument) : t("preview")}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
