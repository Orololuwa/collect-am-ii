import { CheckIcon, PlusIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Form, href, useNavigation } from "react-router";

import { TEMPLATE_TYPES } from "../shared/template-types";
import type { TemplateType } from "../shared/types";
import { TemplateThumbnail } from "./template-thumbnail";
import {
  BLANK_STARTER,
  CREATE_TEMPLATE_INTENT,
} from "./templates-library-constants";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

export type NewTemplateOptions = {
  starters: Record<string, Array<{ id: string; name: string }>>;
  templateCounts: Record<string, number>;
  workflowsByType: Record<string, number>;
  typesWithDefault: string[];
};

function typeHint(templates: number, workflows: number) {
  const made =
    templates === 0
      ? "None yet"
      : templates === 1
        ? "1 template"
        : `${templates} templates`;
  return workflows > 0
    ? `${made} · in ${workflows} ${workflows === 1 ? "workflow" : "workflows"}`
    : made;
}

/** "Professional Estimate" → "Professional estimate". */
function sentenceCase(name: string) {
  return name.charAt(0) + name.slice(1).toLowerCase();
}

/** Pick a document type and a design to start from, then open the builder. */
export function NewTemplateDialog({
  open,
  onOpenChange,
  initialType,
  options,
  organizationSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType: TemplateType;
  options: NewTemplateOptions;
  organizationSlug: string;
}) {
  const id = useId();
  const navigation = useNavigation();
  const [type, setType] = useState<TemplateType>(initialType);
  const starters = options.starters[type] ?? [];
  const [starterId, setStarterId] = useState(starters[0]?.id ?? BLANK_STARTER);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const hasDefault = options.typesWithDefault.includes(type);
  const [makeDefault, setMakeDefault] = useState(!hasDefault);
  const typeInfo = TEMPLATE_TYPES.find((info) => info.value === type);
  const creating =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === CREATE_TEMPLATE_INTENT;

  useEffect(() => {
    if (open) setType(initialType);
  }, [open, initialType]);

  // A new type starts on its first design, and on default if it has none.
  useEffect(() => {
    setStarterId(options.starters[type]?.[0]?.id ?? BLANK_STARTER);
    setMakeDefault(!options.typesWithDefault.includes(type));
  }, [type, options]);

  // Suggest a name from the design until the person types their own.
  useEffect(() => {
    if (nameTouched) return;
    const starter = (options.starters[type] ?? []).find(
      (candidate) => candidate.id === starterId,
    );
    setName(
      starter
        ? sentenceCase(starter.name)
        : `New ${typeInfo?.label.toLowerCase() ?? "template"}`,
    );
  }, [type, starterId, nameTouched, options, typeInfo]);

  const dealTypes = TEMPLATE_TYPES.filter((info) => info.usedInDeals);
  const otherTypes = TEMPLATE_TYPES.filter((info) => !info.usedInDeals);
  const previewUrl = (templateId: string) =>
    href("/organizations/:organizationSlug/templates/:templateId/preview", {
      organizationSlug,
      templateId,
    });

  const typeButton = (info: (typeof TEMPLATE_TYPES)[number]) => {
    const selected = info.value === type;
    return (
      // biome-ignore lint/a11y/useSemanticElements: a card-sized choice, announced as a radio
      <button
        aria-checked={selected}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
          selected
            ? "bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]"
            : "hover:bg-accent",
        )}
        key={info.value}
        onClick={() => setType(info.value)}
        role="radio"
        type="button"
      >
        <info.icon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="flex min-w-0 flex-col">
          <span className="font-medium text-sm">{info.label}</span>
          <span className="text-muted-foreground text-xs">
            {typeHint(
              options.templateCounts[info.value] ?? 0,
              options.workflowsByType[info.value] ?? 0,
            )}
          </span>
        </span>
      </button>
    );
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>
            Pick the document, then a design to start from. You can change
            everything afterwards.
          </DialogDescription>
        </DialogHeader>

        <Form
          action={href("/organizations/:organizationSlug/templates", {
            organizationSlug,
          })}
          className="flex min-h-0 flex-1 flex-col"
          method="POST"
        >
          <input name="type" type="hidden" value={type} />
          <input name="starterId" type="hidden" value={starterId} />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div
              aria-label="Document"
              className="flex max-h-48 shrink-0 flex-col gap-0.5 overflow-auto border-b p-3 md:max-h-none md:w-64 md:border-r md:border-b-0"
              role="radiogroup"
            >
              <span className="px-2.5 pt-1 pb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                Used in your deals
              </span>
              {dealTypes.map(typeButton)}
              <span className="px-2.5 pt-4 pb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                Other documents
              </span>
              {otherTypes.map(typeButton)}
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto p-6">
              <h3 className="font-semibold">
                Choose a design for your {typeInfo?.label.toLowerCase()}
              </h3>
              <div
                aria-label="Starting design"
                className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3"
                role="radiogroup"
              >
                {[...starters, { id: BLANK_STARTER, name: "Blank" }].map(
                  (starter) => {
                    const selected = starter.id === starterId;
                    return (
                      // biome-ignore lint/a11y/useSemanticElements: a card-sized choice, announced as a radio
                      <button
                        aria-checked={selected}
                        className={cn(
                          "relative flex flex-col overflow-hidden rounded-xl bg-card text-left transition-shadow",
                          selected
                            ? "ring-2 ring-primary"
                            : "ring-1 ring-border hover:shadow-md",
                        )}
                        key={starter.id}
                        onClick={() => setStarterId(starter.id)}
                        role="radio"
                        type="button"
                      >
                        {starter.id === BLANK_STARTER ? (
                          <span className="flex h-44 items-end justify-center bg-muted px-4 pt-4">
                            <span className="flex h-full w-[140px] items-center justify-center rounded-t-[3px] border-[1.5px] border-dashed border-b-0 bg-white text-muted-foreground">
                              <PlusIcon aria-hidden="true" className="size-5" />
                            </span>
                          </span>
                        ) : (
                          <TemplateThumbnail src={previewUrl(starter.id)} />
                        )}
                        <span className="flex flex-col gap-0.5 border-t px-3 py-2.5">
                          <span className="font-semibold text-sm">
                            {starter.id === BLANK_STARTER
                              ? "Blank"
                              : sentenceCase(starter.name)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {starter.id === BLANK_STARTER
                              ? "Just the sections, no styling"
                              : "Ready-made design"}
                          </span>
                        </span>
                        {selected ? (
                          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <CheckIcon
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          </span>
                        ) : null}
                      </button>
                    );
                  },
                )}
              </div>

              <div className="mt-auto flex max-w-md flex-col gap-2 pt-2">
                <Label htmlFor={`${id}-name`}>Name</Label>
                <Input
                  id={`${id}-name`}
                  maxLength={120}
                  name="name"
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameTouched(true);
                  }}
                  required
                  value={name}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 px-6 py-3.5">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={makeDefault}
                id={`${id}-default`}
                onCheckedChange={(checked) => setMakeDefault(checked === true)}
              />
              <input
                name="makeDefault"
                type="hidden"
                value={makeDefault ? "on" : ""}
              />
              <Label className="font-normal" htmlFor={`${id}-default`}>
                Make it the default for {typeInfo?.plural.toLowerCase()}
              </Label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={creating || !name.trim()}
                name="intent"
                type="submit"
                value={CREATE_TEMPLATE_INTENT}
              >
                {creating ? <Spinner /> : null}
                Create and open
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
