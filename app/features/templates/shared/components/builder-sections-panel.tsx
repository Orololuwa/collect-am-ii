import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";

import { COMMON_CURRENCIES } from "../common-currencies";
import { getSectionInfo, getSectionTypesFor } from "../section-info";
import { useBuilderStore } from "../store/builder-store";
import { getTemplateTypeInfo } from "../template-types";
import { resolveColorReference } from "../utils/color-resolver";
import { generateSectionId } from "../utils/generate-section-id";
import { moveSection, sortSections } from "../utils/move-section";
import { ColorPaletteEditor } from "./color-palette-editor";
import { createDefaultSectionConfig } from "./template-canvas";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

function SectionsList() {
  const {
    currentTemplate,
    selectedSectionId,
    selectSection,
    updateSection,
    reorderSections,
    addSection,
    sourceTemplate,
  } = useBuilderStore();
  if (!currentTemplate) return null;

  const sections = sortSections(currentTemplate.sections);
  const present = new Set(sections.map((section) => section.type));
  const missing = getSectionTypesFor(currentTemplate.type).filter(
    (type) => !present.has(type),
  );

  const add = (type: string) => {
    const config = createDefaultSectionConfig(
      type,
      currentTemplate.sections,
      sourceTemplate,
    );
    const id = generateSectionId(currentTemplate.type, config.type);
    addSection({ ...config, id, order: sections.length });
    selectSection(id);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="px-1.5 pb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Sections
      </h2>
      <ul className="flex flex-col gap-0.5">
        {sections.map((section, index) => {
          const info = getSectionInfo(currentTemplate.type, section.type);
          const selected = section.id === selectedSectionId;
          const hidden = section.styles.visibility === "hidden";
          const move = (direction: -1 | 1) => {
            const next = moveSection(sections, section.id, direction);
            if (next) reorderSections(next);
          };
          return (
            <li
              className={cn(
                "group flex items-center gap-1 rounded-lg py-1 pr-1 pl-1.5",
                selected
                  ? "bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]"
                  : "hover:bg-accent",
              )}
              key={section.id}
            >
              <button
                aria-current={selected ? "true" : undefined}
                className="flex min-w-0 flex-1 flex-col rounded-md px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid={`sections-list-${section.id}`}
                onClick={() => selectSection(section.id)}
                type="button"
              >
                <span
                  className={cn(
                    "truncate font-medium text-sm",
                    hidden && "text-muted-foreground line-through",
                  )}
                >
                  {info.name}
                </span>
                {info.summary ? (
                  <span className="truncate text-muted-foreground text-xs">
                    {hidden ? "Hidden" : info.summary}
                  </span>
                ) : null}
              </button>
              <div
                className={cn(
                  "hidden shrink-0 items-center group-focus-within:flex group-hover:flex",
                  (selected || hidden) && "flex",
                )}
              >
                <Button
                  aria-label={`Move ${info.name.toLowerCase()} up`}
                  disabled={index === 0}
                  onClick={() => move(-1)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ArrowUpIcon aria-hidden="true" />
                </Button>
                <Button
                  aria-label={`Move ${info.name.toLowerCase()} down`}
                  disabled={index === sections.length - 1}
                  onClick={() => move(1)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ArrowDownIcon aria-hidden="true" />
                </Button>
                <Button
                  aria-label={`${hidden ? "Show" : "Hide"} ${info.name.toLowerCase()}`}
                  aria-pressed={hidden}
                  onClick={() =>
                    updateSection(section.id, {
                      styles: {
                        ...section.styles,
                        visibility: hidden ? "visible" : "hidden",
                      },
                    })
                  }
                  size="icon-sm"
                  variant="ghost"
                >
                  {hidden ? (
                    <EyeOffIcon aria-hidden="true" />
                  ) : (
                    <EyeIcon aria-hidden="true" />
                  )}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {sections.length === 0 ? (
        <p className="px-1.5 py-2 text-muted-foreground text-sm">
          This template has no sections yet.
        </p>
      ) : null}
      {missing.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="mt-1 justify-start text-muted-foreground"
              size="sm"
              variant="ghost"
            >
              <PlusIcon aria-hidden="true" />
              Add section
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {missing.map((type) => {
              const info = getSectionInfo(currentTemplate.type, type);
              return (
                <DropdownMenuItem key={type} onSelect={() => add(type)}>
                  <span className="flex flex-col">
                    <span>{info.name}</span>
                    {info.summary ? (
                      <span className="text-muted-foreground text-xs">
                        {info.summary}
                      </span>
                    ) : null}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

function CurrencyPicker() {
  const { currentTemplate, updateGlobalStyles } = useBuilderStore();
  const [open, setOpen] = useState(false);
  const current = currentTemplate?.globalStyles.currency as string | undefined;
  const currency = COMMON_CURRENCIES.find((option) => option.code === current);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-full justify-between font-normal"
          data-testid="currency-picker"
          role="combobox"
          variant="outline"
        >
          <span className="truncate">
            {currency ? currency.name : (current ?? "Choose currency")}
          </span>
          <ChevronsUpDownIcon aria-hidden="true" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search currency" />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {COMMON_CURRENCIES.map((option) => (
                <CommandItem
                  key={option.code}
                  onSelect={() => {
                    updateGlobalStyles({ currency: option.code });
                    setOpen(false);
                  }}
                  value={`${option.code} ${option.name}`}
                >
                  <CheckIcon
                    aria-hidden="true"
                    className={cn(
                      "size-4",
                      option.code === current ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DocumentStyle() {
  const { currentTemplate } = useBuilderStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  if (!currentTemplate) return null;
  const palette = currentTemplate.colorPalette ?? [];
  const typeInfo = getTemplateTypeInfo(currentTemplate.type);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="px-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Document style
      </h2>
      {palette.length > 0 ? (
        <div className="flex flex-col gap-2 px-1.5">
          <span className="font-medium text-sm">Colours</span>
          <ColorPaletteEditor
            onOpenChange={setPaletteOpen}
            open={paletteOpen}
            trigger={
              <button
                aria-label="Edit colours"
                className="flex w-fit flex-wrap items-center gap-2 rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="color-palette-button"
                type="button"
              >
                {palette.map((color, index) => {
                  const resolved = resolveColorReference(color, palette);
                  return (
                    <span
                      className="size-7 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                      // Palette colours are the document's own, so they stay inline.
                      key={`${resolved}-${index.toString()}`}
                      style={{ background: resolved }}
                    />
                  );
                })}
                <span className="pl-1 text-muted-foreground text-xs underline-offset-2 hover:underline">
                  Edit
                </span>
              </button>
            }
          />
        </div>
      ) : null}
      {typeInfo?.usedInDeals ? (
        <div className="flex flex-col gap-2 px-1.5">
          <span className="font-medium text-sm">Currency</span>
          <CurrencyPicker />
          <span className="text-muted-foreground text-xs">
            For the sample values here. Deals use their own currency.
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** The builder's left panel: the document's sections and its look. */
export function BuilderSectionsPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col gap-6 overflow-y-auto p-3", className)}
      data-testid="builder-sections-panel"
    >
      <SectionsList />
      <div className="border-t" />
      <DocumentStyle />
    </div>
  );
}
