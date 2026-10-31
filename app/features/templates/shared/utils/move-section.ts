import type { TemplateSection } from "../types";

export function sortSections(sections: TemplateSection[]) {
  return [...sections].sort((a, b) => a.order - b.order);
}

/** Moves a section one place up or down; null when it can't go further. */
export function moveSection(
  sections: TemplateSection[],
  id: string,
  direction: -1 | 1,
) {
  const sorted = sortSections(sections);
  const index = sorted.findIndex((section) => section.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= sorted.length) {
    return null;
  }
  const next = [...sorted];
  const [moved] = next.splice(index, 1);
  if (moved) next.splice(target, 0, moved);
  return next;
}
