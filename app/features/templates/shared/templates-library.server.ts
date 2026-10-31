import { componentLibrary } from "./components/component-library-registry";
import { getTemplateById, getTemplatesByType } from "./templates";
import {
  convertPrismaTemplateTypeToTS,
  convertTSTemplateTypeToPrisma,
} from "./templates-model.server";
import type { Template, TemplateSection, TemplateType } from "./types";
import { generateSectionId } from "./utils/generate-section-id";
import type { Prisma } from "~/generated/client";
import { prisma } from "~/utils/database.server";

/** The organization's templates for the templates page, without their content. */
export async function retrieveTemplateSummariesFromDatabase({
  organizationId,
  search,
}: {
  organizationId: string;
  search?: string;
}) {
  const templates = await prisma.template.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      isDefault: true,
      name: true,
      type: true,
      updatedAt: true,
    },
    where: {
      organizationId,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
  });
  return templates.map((template) => ({
    ...template,
    type: convertPrismaTemplateTypeToTS(template.type),
  }));
}

/**
 * How the organization's active workflows use templates: how many workflows
 * pick each template, and how many have a step of each document type.
 */
export async function retrieveTemplateUsageFromDatabase(
  organizationId: string,
) {
  const steps = await prisma.workflowStep.findMany({
    select: {
      documentType: true,
      kind: true,
      templateId: true,
      workflowId: true,
    },
    where: {
      kind: { in: ["document", "receipt"] },
      workflow: { archivedAt: null, organizationId },
    },
  });

  const byTemplate = new Map<string, Set<string>>();
  const byType = new Map<string, Set<string>>();
  for (const step of steps) {
    const type =
      step.kind === "receipt"
        ? "receipt"
        : step.documentType
          ? convertPrismaTemplateTypeToTS(step.documentType)
          : null;
    if (type) {
      byType.set(type, (byType.get(type) ?? new Set()).add(step.workflowId));
    }
    if (step.templateId) {
      byTemplate.set(
        step.templateId,
        (byTemplate.get(step.templateId) ?? new Set()).add(step.workflowId),
      );
    }
  }

  const counts = (map: Map<string, Set<string>>) =>
    Object.fromEntries(
      [...map.entries()].map(([key, workflows]) => [key, workflows.size]),
    );
  return {
    workflowsByTemplate: counts(byTemplate) as Record<string, number>,
    workflowsByType: counts(byType) as Record<string, number>,
  };
}

/** Makes a template the one deals use for its type, and no other. */
export async function setDefaultTemplateInDatabase({
  organizationId,
  templateId,
}: {
  organizationId: string;
  templateId: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const template = await tx.template.findFirst({
      select: { id: true, type: true },
      where: { id: templateId, organizationId },
    });
    if (!template) {
      return null;
    }
    await tx.template.updateMany({
      data: { isDefault: false },
      where: { isDefault: true, organizationId, type: template.type },
    });
    return await tx.template.update({
      data: { isDefault: true },
      where: { id: template.id },
    });
  });
}

export async function renameTemplateInDatabase({
  organizationId,
  templateId,
  name,
}: {
  organizationId: string;
  templateId: string;
  name: string;
}) {
  const { count } = await prisma.template.updateMany({
    data: { name },
    where: { id: templateId, organizationId },
  });
  return count > 0;
}

export async function hasDefaultTemplateInDatabase({
  organizationId,
  type,
}: {
  organizationId: string;
  type: TemplateType;
}) {
  const template = await prisma.template.findFirst({
    select: { id: true },
    where: {
      isDefault: true,
      organizationId,
      type: convertTSTemplateTypeToPrisma(type),
    },
  });
  return template !== null;
}

/** The built-in designs a new template of this type can start from. */
export function getStarterTemplates(type: TemplateType) {
  return getTemplatesByType(type).map((template) => ({
    id: template.id,
    name: template.name,
  }));
}

/**
 * A template with just the type's sections and their default content, in the
 * look of the type's first built-in design.
 */
function buildBlankTemplate(type: TemplateType) {
  const [base] = getTemplatesByType(type);
  const sections = Object.values(componentLibrary)
    .filter((component) => component.type.startsWith(`${type}-`))
    .map(
      (component, order): TemplateSection => ({
        data: { ...component.defaultData },
        id: generateSectionId(type, component.type),
        order,
        styles: { ...component.defaultStyles },
        type: component.type,
        usingGlobalPalette: true,
      }),
    );
  return {
    colorPalette: base?.colorPalette ?? [],
    globalStyles: base?.globalStyles ?? {},
    sections,
  };
}

/**
 * Creates a template from a built-in design (or blank) and, when asked or when
 * the type has none yet, makes it the type's default.
 */
export async function createTemplateFromStarterInDatabase({
  organizationId,
  type,
  starterId,
  name,
  makeDefault,
}: {
  organizationId: string;
  type: TemplateType;
  /** A built-in template's id, or null for a blank one. */
  starterId: string | null;
  name: string;
  makeDefault: boolean;
}) {
  const starter: Template | undefined = starterId
    ? getTemplateById(starterId)
    : undefined;
  const content =
    starter && starter.type === type
      ? {
          colorPalette: starter.colorPalette,
          globalStyles: starter.globalStyles,
          sections: starter.sections,
        }
      : buildBlankTemplate(type);

  const created = await prisma.template.create({
    data: {
      colorPalette: content.colorPalette as unknown as Prisma.InputJsonValue,
      globalStyles: content.globalStyles as unknown as Prisma.InputJsonValue,
      name,
      organizationId,
      sections: content.sections as unknown as Prisma.InputJsonValue,
      sourceTemplateId: starter?.id ?? null,
      type: convertTSTemplateTypeToPrisma(type),
    },
  });
  if (makeDefault) {
    await setDefaultTemplateInDatabase({
      organizationId,
      templateId: created.id,
    });
  }
  return created;
}
