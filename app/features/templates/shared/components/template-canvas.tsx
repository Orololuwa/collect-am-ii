import { useDndMonitor, useDroppable } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FilePlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useBuilderStore } from "../store/builder-store";
import type { Template, TemplateSection } from "../types";
import { generateSectionId } from "../utils/generate-section-id";
import { componentLibrary } from "./component-library-registry";
import { SectionRenderer } from "./section-renderer";
import { SectionWrapper } from "./section-wrapper";
import { cn } from "~/lib/utils";

// Create default section config for new sections using template data
export function createDefaultSectionConfig(
  type: string,
  existingSections: TemplateSection[] = [],
  sourceTemplate: Template | null = null,
): Omit<TemplateSection, "id" | "order"> {
  const component = componentLibrary[type];
  if (!component) {
    throw new Error(`Component type ${type} not found`);
  }

  // Try to find an existing section of the same type to inherit styles from
  const existingSectionOfType = existingSections.find(
    (section) => section.type === type,
  );

  // Build default styles from template or component defaults
  let defaultStyles: Record<string, string>;

  // Priority 1: If we have an existing section of the same type, use its styles directly
  if (existingSectionOfType) {
    defaultStyles = { ...existingSectionOfType.styles };
  } else if (sourceTemplate) {
    // Priority 2: Check source template for the section type (original default template)
    const sourceSectionOfType = sourceTemplate.sections.find(
      (s: TemplateSection) => s.type === type,
    );
    if (sourceSectionOfType) {
      defaultStyles = { ...sourceSectionOfType.styles };
    } else {
      // Priority 3: Fall back to component defaults if not in source template
      defaultStyles = { ...component.defaultStyles };
    }
  } else {
    // No source template available, use component defaults
    defaultStyles = { ...component.defaultStyles };
  }

  // Build default data from template or component defaults
  let defaultData: Record<string, unknown>;

  // If we have an existing section of the same type, use its data
  if (existingSectionOfType) {
    defaultData = { ...existingSectionOfType.data };
  } else if (sourceTemplate) {
    // Check source template for section data
    const sourceSectionOfType = sourceTemplate.sections.find(
      (s: TemplateSection) => s.type === type,
    );
    if (sourceSectionOfType) {
      defaultData = { ...sourceSectionOfType.data };
    } else {
      // No existing section of this type, use component defaults
      defaultData = { ...component.defaultData };
    }
  } else {
    // No existing section of this type, use component defaults
    defaultData = { ...component.defaultData };
  }

  return {
    data: defaultData,
    styles: defaultStyles,
    type: component.type as TemplateSection["type"],
    // New sections default to using the global palette
    usingGlobalPalette: true,
  };
}

/** A4 at 96 dpi. */
const PAGE_WIDTH = 794;

export function TemplateCanvas({ zoom = 1 }: { zoom?: number } = {}) {
  const {
    currentTemplate,
    selectedSectionId,
    selectSection,
    addSection,
    reorderSections,
    sourceTemplate,
  } = useBuilderStore();

  // Monitor drag and drop events from parent DndContext
  useDndMonitor({
    onDragEnd(event) {
      const { active, over } = event;

      if (!over || !currentTemplate) return;

      const activeId = active.id.toString();
      const overId = over.id.toString();

      // Check if dragging from palette to canvas
      if (activeId.startsWith("palette-")) {
        const sectionType = activeId.replace(
          "palette-",
          "",
        ) as TemplateSection["type"];

        // Check if section type already exists (prevent duplicates)
        const existingSectionOfType = currentTemplate.sections.find(
          (s) => s.type === sectionType,
        );
        if (existingSectionOfType) {
          // Section type already exists, don't allow duplicate
          return;
        }

        const baseSection = createDefaultSectionConfig(
          sectionType,
          currentTemplate.sections,
          sourceTemplate,
        );
        const maxOrder = Math.max(
          ...currentTemplate.sections.map((s) => s.order),
          -1,
        );

        // Generate predictable section ID
        const sectionId = generateSectionId(currentTemplate.type, sectionType);

        // If dropping on a specific section, insert at that position
        if (overId !== "canvas-droppable") {
          const targetIndex = currentTemplate.sections.findIndex(
            (s) => s.id === overId,
          );
          if (targetIndex !== -1) {
            // Insert at the target position
            const newSectionWithId: TemplateSection = {
              ...baseSection,
              id: sectionId,
              order: targetIndex,
            };

            // Update all sections to reorder
            const updatedSections = [
              ...currentTemplate.sections.slice(0, targetIndex),
              newSectionWithId,
              ...currentTemplate.sections.slice(targetIndex),
            ].map((s, index) => ({ ...s, order: index }));

            reorderSections(updatedSections);
          } else {
            // Fallback: add to the end
            const newSection: TemplateSection = {
              ...baseSection,
              id: sectionId,
              order: maxOrder + 1,
            };
            addSection(newSection);
          }
        } else {
          // Dropped on empty canvas, just add to the end
          const newSection: TemplateSection = {
            ...baseSection,
            id: sectionId,
            order: maxOrder + 1,
          };
          addSection(newSection);
        }
        return;
      }

      // Reordering sections within canvas
      if (
        activeId !== overId &&
        !activeId.startsWith("palette-") &&
        !overId.startsWith("palette-")
      ) {
        // Sort sections by order to ensure correct indices
        const sortedSections = [...currentTemplate.sections].sort(
          (a, b) => a.order - b.order,
        );

        const oldIndex = sortedSections.findIndex((s) => s.id === activeId);

        if (oldIndex === -1) return;

        // If dropped on canvas-droppable (empty area), move to end
        if (overId === "canvas-droppable") {
          const reordered = arrayMove(
            sortedSections,
            oldIndex,
            sortedSections.length - 1,
          );
          const reorderedWithOrder = reordered.map((section, index) => ({
            ...section,
            order: index,
          }));
          reorderSections(reorderedWithOrder);
          return;
        }

        // Dropped on another section - insert at that position
        const newIndex = sortedSections.findIndex((s) => s.id === overId);

        if (newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(sortedSections, oldIndex, newIndex);
          // Update order values to match new positions
          const reorderedWithOrder = reordered.map((section, index) => ({
            ...section,
            order: index,
          }));
          reorderSections(reorderedWithOrder);
        }
      }
    },
  });

  // Below A4 width, scale the page down so the whole width stays visible.
  const containerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const available = entry?.contentRect.width ?? PAGE_WIDTH;
      setFit(Math.min(1, available / PAGE_WIDTH));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const scale = zoom * fit;

  if (!currentTemplate) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No template selected
      </div>
    );
  }

  const sortedSections = [...currentTemplate.sections].sort(
    (a, b) => a.order - b.order,
  );

  // Create a droppable canvas area
  const DroppableCanvas = () => {
    const { setNodeRef, isOver } = useDroppable({
      id: "canvas-droppable",
    });

    return (
      <div
        className={cn(
          "flex min-h-[400px] flex-col gap-3 rounded-[3px] transition-colors md:min-h-[600px]",
          isOver && "bg-primary/5 outline-2 outline-primary/40 outline-dashed",
          sortedSections.length === 0 && "items-center justify-center",
        )}
        data-testid="canvas-droppable"
        ref={setNodeRef}
      >
        {sortedSections.length === 0 ? (
          <div className="flex max-w-xs flex-col items-center gap-2 py-16 text-center">
            <FilePlusIcon
              aria-hidden="true"
              className="size-10 text-muted-foreground/50"
            />
            <h3 className="font-semibold text-foreground">
              This page is empty
            </h3>
            <p className="text-muted-foreground text-sm">
              Use Add section on the left to put the header, line items and
              totals back.
            </p>
          </div>
        ) : (
          <SortableContext
            items={sortedSections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedSections.map((section) => (
              <SectionWrapper
                isSelected={selectedSectionId === section.id}
                key={section.id}
                onSelect={() => selectSection(section.id)}
                section={section}
              >
                <SectionRenderer
                  onSelect={() => selectSection(section.id)}
                  section={section}
                />
              </SectionWrapper>
            ))}
          </SortableContext>
        )}
      </div>
    );
  };

  return (
    <div
      className="w-0 min-w-0 flex-1 overflow-auto bg-muted px-3 py-6 md:px-8 md:py-10"
      data-testid="template-canvas"
      ref={containerRef}
    >
      {/* An A4 sheet, scaled by the zoom and to fit narrow screens. */}
      <div
        className="mx-auto min-h-[1123px] w-[794px] bg-white px-12 pt-12 pb-12 text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]"
        style={scale === 1 ? undefined : { zoom: scale }}
      >
        <DroppableCanvas />
      </div>
    </div>
  );
}
