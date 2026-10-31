import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
} from "lucide-react";

import { getSectionInfo } from "../section-info";
import { useBuilderStore } from "../store/builder-store";
import type { TemplateSection } from "../types";
import { moveSection } from "../utils/move-section";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface SectionWrapperProps {
  section: TemplateSection;
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}

export function SectionWrapper({
  section,
  children,
  isSelected,
  onSelect,
}: SectionWrapperProps) {
  const { currentTemplate, deleteSection, updateSection, reorderSections } =
    useBuilderStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
  });

  const style = {
    opacity: isDragging ? 0.5 : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const info = currentTemplate
    ? getSectionInfo(currentTemplate.type, section.type)
    : { name: section.type };
  const isVisible = section.styles.visibility !== "hidden";

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSection(section.id, {
      styles: {
        ...section.styles,
        visibility: isVisible ? "hidden" : "visible",
      },
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSection(section.id);
  };

  const handleMove = (e: React.MouseEvent, direction: -1 | 1) => {
    e.stopPropagation();
    if (!currentTemplate) return;
    const next = moveSection(currentTemplate.sections, section.id, direction);
    if (next) reorderSections(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <section
      aria-label={`${info.name} section`}
      className={cn(
        "group/section relative cursor-pointer rounded-[3px] outline-offset-4 transition-[outline-color]",
        isSelected
          ? "outline-2 outline-primary outline-solid"
          : "outline-1 outline-transparent outline-dashed hover:outline-primary/50",
      )}
      data-testid={`section-${section.id}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      ref={setNodeRef}
      style={style}
    >
      {/* Name chip, on the outline's top-left corner */}
      <span
        className={cn(
          "pointer-events-none absolute -top-[22px] -left-1 z-10 rounded-t-[4px] px-1.5 py-0.5 font-medium text-[11px] leading-4",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "hidden bg-primary/80 text-primary-foreground group-hover/section:block",
        )}
      >
        {info.name}
        {isVisible ? null : " · hidden"}
      </span>

      {/* Toolbar, in the page's right margin */}
      <div
        className={cn(
          "absolute top-0 -right-11 z-10 flex-col items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm",
          isSelected ? "flex" : "hidden group-hover/section:flex",
        )}
      >
        <Button
          aria-label={`Move ${info.name.toLowerCase()} up`}
          className="size-7"
          onClick={(e) => handleMove(e, -1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowUpIcon aria-hidden="true" className="size-3.5" />
        </Button>
        <Button
          aria-label={`Move ${info.name.toLowerCase()} down`}
          className="size-7"
          onClick={(e) => handleMove(e, 1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowDownIcon aria-hidden="true" className="size-3.5" />
        </Button>
        <Button
          aria-label={
            isVisible
              ? `Hide ${info.name.toLowerCase()}`
              : `Show ${info.name.toLowerCase()}`
          }
          className="size-7"
          data-testid={`section-visibility-toggle-${section.id}`}
          onClick={handleToggleVisibility}
          size="icon"
          title={isVisible ? "Hide section" : "Show section"}
          type="button"
          variant="ghost"
        >
          {isVisible ? (
            <Eye aria-hidden="true" className="size-3.5" />
          ) : (
            <EyeOff aria-hidden="true" className="size-3.5" />
          )}
        </Button>
        <Button
          aria-label={`Delete ${info.name.toLowerCase()}`}
          className="size-7 text-destructive hover:text-destructive"
          data-testid={`section-delete-${section.id}`}
          onClick={handleDelete}
          size="icon"
          title="Delete section"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
        </Button>
        <Button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${info.name.toLowerCase()} to reorder`}
          className="size-7 cursor-grab active:cursor-grabbing"
          data-testid={`section-drag-handle-${section.id}`}
          size="icon"
          title="Drag to reorder"
          variant="ghost"
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </Button>
      </div>

      {/* Hidden sections stay readable here, faded, so they can be found again. */}
      <div
        className={cn(
          "overflow-hidden",
          !isVisible &&
            "bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(0_0_0/0.03)_6px_12px)] opacity-40 [&_*]:visible!",
        )}
      >
        {children}
      </div>
    </section>
  );
}
