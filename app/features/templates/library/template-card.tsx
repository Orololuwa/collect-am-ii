import { MoreHorizontalIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { href, Link, useFetcher } from "react-router";

import { getTemplateTypeInfo } from "../shared/template-types";
import type { TemplateType } from "../shared/types";
import { TemplateThumbnail } from "./template-thumbnail";
import {
  DELETE_TEMPLATE_INTENT,
  DUPLICATE_TEMPLATE_INTENT,
  MAKE_DEFAULT_TEMPLATE_INTENT,
  RENAME_TEMPLATE_INTENT,
} from "./templates-library-constants";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatRelativeTime } from "~/features/organizations/dashboard/dashboard-format";

export type TemplateSummary = {
  id: string;
  name: string;
  type: TemplateType;
  updatedAt: Date;
  isDefault: boolean;
};

export function TemplateCard({
  template,
  workflowCount,
  organizationSlug,
}: {
  template: TemplateSummary;
  /** How many active workflows pick this template for a step. */
  workflowCount: number;
  organizationSlug: string;
}) {
  const { i18n } = useTranslation();
  const fetcher = useFetcher();
  const id = useId();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const typeInfo = getTemplateTypeInfo(template.type);
  const listUrl = href("/organizations/:organizationSlug/templates", {
    organizationSlug,
  });
  const openUrl = `${href(
    "/organizations/:organizationSlug/templates/:templateId",
    { organizationSlug, templateId: template.id },
  )}?mode=edit`;
  const previewUrl = href(
    "/organizations/:organizationSlug/templates/:templateId/preview",
    { organizationSlug, templateId: template.id },
  );

  const submit = (intent: string, extra: Record<string, string> = {}) =>
    fetcher.submit(
      { intent, templateId: template.id, ...extra },
      { action: listUrl, method: "POST" },
    );

  // Close the rename dialog once the new name is saved.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setRenaming(false);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Link
        aria-label={`Open ${template.name}`}
        className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        prefetch="intent"
        to={openUrl}
      >
        <TemplateThumbnail className="border-b" src={previewUrl} />
        <div className="flex flex-col gap-0.5 px-4 pt-3 pb-1">
          <span className="truncate pr-8 font-semibold text-sm">
            {template.name}
          </span>
          <span className="text-muted-foreground text-xs">
            Edited {formatRelativeTime(template.updatedAt, i18n.language)}
          </span>
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2 pb-3">
        {template.isDefault ? (
          <span className="inline-flex h-[22px] items-center rounded-md bg-primary/10 px-2 font-semibold text-primary text-xs">
            Default
          </span>
        ) : null}
        <span className="inline-flex h-[22px] items-center rounded-md bg-muted px-2 font-medium text-muted-foreground text-xs">
          {workflowCount === 0
            ? "Not used in a workflow"
            : workflowCount === 1
              ? "Used in 1 workflow"
              : `Used in ${workflowCount} workflows`}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`More actions for ${template.name}`}
            className="absolute right-2 bottom-[52px]"
            size="icon-sm"
            variant="ghost"
          >
            <MoreHorizontalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link to={openUrl}>Open</Link>
          </DropdownMenuItem>
          {template.isDefault ? null : (
            <DropdownMenuItem
              onSelect={() => submit(MAKE_DEFAULT_TEMPLATE_INTENT)}
            >
              Make default for {typeInfo?.plural.toLowerCase() ?? "this type"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => submit(DUPLICATE_TEMPLATE_INTENT)}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleting(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={setRenaming} open={renaming}>
        <DialogContent>
          <fetcher.Form action={listUrl} className="space-y-4" method="POST">
            <DialogHeader>
              <DialogTitle>Rename template</DialogTitle>
              <DialogDescription>
                The name is only for you; customers never see it.
              </DialogDescription>
            </DialogHeader>
            <input name="templateId" type="hidden" value={template.id} />
            <div className="space-y-2">
              <Label htmlFor={`${id}-name`}>Name</Label>
              <Input
                autoFocus
                defaultValue={template.name}
                id={`${id}-name`}
                maxLength={120}
                name="name"
                required
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setRenaming(false)}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={fetcher.state !== "idle"}
                name="intent"
                type="submit"
                value={RENAME_TEMPLATE_INTENT}
              >
                Save
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setDeleting} open={deleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {template.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {workflowCount > 0
                ? "Workflow steps that use it will fall back to your default template for this type."
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => submit(DELETE_TEMPLATE_INTENT)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
