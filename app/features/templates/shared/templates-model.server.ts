import type { Template, TemplateSection } from "./types";
import type { Prisma } from "~/generated/client";
import { TemplateType } from "~/generated/enums";
import { prisma } from "~/utils/database.server";

// Helper to convert Prisma TemplateType enum to TypeScript TemplateType
export function convertPrismaTemplateTypeToTS(
  prismaType: string,
): Template["type"] {
  if (!prismaType) {
    return "resume"; // Default fallback
  }
  // Map Prisma camelCase to TypeScript kebab-case
  const typeMap: Record<string, Template["type"]> = {
    [TemplateType.reportCards]: "report-cards",
    [TemplateType.purchaseOrder]: "purchase-order",
    [TemplateType.salesOrder]: "sales-order",
    [TemplateType.orderConfirmation]: "order-confirmation",
    [TemplateType.packingSlip]: "packing-slip",
    [TemplateType.deliveryNote]: "delivery-note",
  };

  if (typeMap[prismaType]) {
    return typeMap[prismaType];
  }

  return prismaType as Template["type"];
}

// Helper to convert TypeScript TemplateType to Prisma TemplateType enum
export function convertTSTemplateTypeToPrisma(
  tsType: Template["type"],
): (typeof TemplateType)[keyof typeof TemplateType] {
  // Map TypeScript kebab-case to Prisma camelCase
  const typeMap: Record<
    string,
    (typeof TemplateType)[keyof typeof TemplateType]
  > = {
    "report-cards": TemplateType.reportCards,
    "purchase-order": TemplateType.purchaseOrder,
    "sales-order": TemplateType.salesOrder,
    "order-confirmation": TemplateType.orderConfirmation,
    "packing-slip": TemplateType.packingSlip,
    "delivery-note": TemplateType.deliveryNote,
    // Direct mappings (same name in both)
    resume: TemplateType.resume,
    invoice: TemplateType.invoice,
    certificate: TemplateType.certificate,
    receipt: TemplateType.receipt,
    quote: TemplateType.quote,
    proposal: TemplateType.proposal,
    contract: TemplateType.contract,
    estimate: TemplateType.estimate,
    statement: TemplateType.statement,
    letter: TemplateType.letter,
    form: TemplateType.form,
    label: TemplateType.label,
  };

  if (typeMap[tsType]) {
    return typeMap[tsType];
  }

  // Fallback - should not happen if all types are mapped
  return tsType as (typeof TemplateType)[keyof typeof TemplateType];
}

/* READ */

/**
 * Retrieves a template from the database by ID.
 * Validates that the template belongs to the specified organization.
 *
 * @param templateId - The ID of the template to retrieve.
 * @param organizationId - The ID of the organization that owns the template.
 * @returns The template or null if not found or doesn't belong to the organization.
 */
export async function retrieveTemplateFromDatabaseById({
  templateId,
  organizationId,
}: {
  templateId: string;
  organizationId: string;
}): Promise<Template | null> {
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      organizationId,
    },
  });

  if (!template) {
    return null;
  }

  return {
    createdAt: template.createdAt,
    colorPalette: (template.colorPalette as unknown as string[]) || [],
    globalStyles: template.globalStyles as unknown as Record<string, string>,
    id: template.id,
    name: template.name,
    organizationId: template.organizationId,
    sections: template.sections as unknown as TemplateSection[],
    sourceTemplateId: template.sourceTemplateId || undefined,
    isDefault: template.isDefault,
    type: convertPrismaTemplateTypeToTS(template.type),
    updatedAt: template.updatedAt,
  };
}

/**
 * Retrieves all templates for an organization, optionally filtered by type.
 *
 * @param organizationId - The ID of the organization.
 * @param type - Optional template type filter.
 * @returns Array of templates sorted by creation date (newest first).
 */
export async function retrieveTemplatesByOrganizationIdAndType({
  organizationId,
  type,
}: {
  organizationId: string;
  type?: Template["type"];
}): Promise<Template[]> {
  const where: Prisma.TemplateWhereInput = {
    organizationId,
  };

  if (type) {
    where.type = convertTSTemplateTypeToPrisma(type);
  }

  const templates = await prisma.template.findMany({
    orderBy: {
      createdAt: "desc",
    },
    where,
  });

  return templates.map((template) => ({
    createdAt: template.createdAt,
    colorPalette: (template.colorPalette as unknown as string[]) || [],
    globalStyles: template.globalStyles as unknown as Record<string, string>,
    id: template.id,
    name: template.name,
    organizationId: template.organizationId,
    sections: template.sections as unknown as TemplateSection[],
    type: convertPrismaTemplateTypeToTS(template.type),
    updatedAt: template.updatedAt,
    isDefault: template.isDefault,
  }));
}

/**
 * Counts templates for an organization, optionally filtered by type.
 *
 * @param organizationId - The ID of the organization.
 * @param type - Optional template type filter.
 * @returns Number of templates.
 */
export async function countTemplatesByOrganizationIdAndType({
  organizationId,
  type,
}: {
  organizationId: string;
  type?: Template["type"];
}): Promise<number> {
  const where: Prisma.TemplateWhereInput = {
    organizationId,
  };

  if (type) {
    where.type = convertTSTemplateTypeToPrisma(type);
  }

  return await prisma.template.count({
    where,
  });
}

/* CREATE */

/**
 * Creates a new template in the database.
 *
 * @param template - The template data to create.
 * @returns The created template.
 */
export async function createTemplateInDatabase(
  template: Omit<Template, "id" | "createdAt" | "updatedAt">,
): Promise<Template> {
  const created = await prisma.template.create({
    data: {
      colorPalette: template.colorPalette
        ? (template.colorPalette as unknown as Prisma.JsonArray)
        : undefined,
      globalStyles: template.globalStyles as unknown as Prisma.JsonObject,
      name: template.name,
      organizationId: template.organizationId,
      sections: template.sections as unknown as Prisma.JsonArray,
      type: convertTSTemplateTypeToPrisma(template.type),
      sourceTemplateId: template.sourceTemplateId || null,
    },
  });

  return {
    createdAt: created.createdAt,
    colorPalette: (created.colorPalette as unknown as string[]) || [],
    globalStyles: created.globalStyles as unknown as Record<string, string>,
    id: created.id,
    name: created.name,
    organizationId: created.organizationId,
    sections: created.sections as unknown as TemplateSection[],
    sourceTemplateId: created.sourceTemplateId || undefined,
    type: convertPrismaTemplateTypeToTS(created.type),
    updatedAt: created.updatedAt,
  };
}

/* UPDATE */

/**
 * Updates an existing template in the database.
 * Validates that the template belongs to the specified organization.
 *
 * @param templateId - The ID of the template to update.
 * @param organizationId - The ID of the organization that owns the template.
 * @param data - The data to update.
 * @returns The updated template or null if not found or doesn't belong to the organization.
 */
export async function updateTemplateInDatabase({
  templateId,
  organizationId,
  data,
}: {
  templateId: string;
  organizationId: string;
  data: Partial<
    Omit<Template, "id" | "organizationId" | "createdAt" | "updatedAt">
  >;
}): Promise<Template | null> {
  // First verify the template exists and belongs to the organization
  const existing = await prisma.template.findFirst({
    where: {
      id: templateId,
      organizationId,
    },
  });

  if (!existing) {
    return null;
  }

  const updateData: Prisma.TemplateUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.type !== undefined) {
    updateData.type = convertTSTemplateTypeToPrisma(data.type);
  }

  if (data.sections !== undefined) {
    updateData.sections = data.sections as unknown as Prisma.JsonArray;
  }

  if (data.globalStyles !== undefined) {
    updateData.globalStyles = data.globalStyles as unknown as Prisma.JsonObject;
  }

  if (data.colorPalette !== undefined) {
    updateData.colorPalette = data.colorPalette
      ? (data.colorPalette as unknown as Prisma.JsonArray)
      : undefined;
  }

  const updated = await prisma.template.update({
    data: updateData,
    where: {
      id: templateId,
    },
  });

  return {
    createdAt: updated.createdAt,
    colorPalette: (updated.colorPalette as unknown as string[]) || [],
    globalStyles: updated.globalStyles as unknown as Record<string, string>,
    id: updated.id,
    name: updated.name,
    organizationId: updated.organizationId,
    sections: updated.sections as unknown as TemplateSection[],
    type: convertPrismaTemplateTypeToTS(updated.type),
    updatedAt: updated.updatedAt,
  };
}

/**
 * Saves a template to the database. Creates a new template if it doesn't exist,
 * or updates an existing one.
 *
 * @param template - The template to save.
 * @param organizationId - The ID of the organization that owns the template.
 * @returns The saved template.
 */
export async function saveTemplateToDatabase({
  template,
  organizationId,
}: {
  template: Omit<Template, "createdAt" | "updatedAt">;
  organizationId: string;
}): Promise<Template> {
  // Check if template exists
  if (template.id) {
    const existing = await prisma.template.findFirst({
      where: {
        id: template.id,
        organizationId,
      },
    });

    if (existing) {
      // Update existing template
      return (await updateTemplateInDatabase({
        data: {
          colorPalette: template.colorPalette,
          globalStyles: template.globalStyles,
          name: template.name,
          sections: template.sections,
          type: template.type,
        },
        organizationId,
        templateId: template.id,
      })) as Template;
    }
  }

  // Create new template
  return await createTemplateInDatabase({
    colorPalette: template.colorPalette,
    globalStyles: template.globalStyles,
    name: template.name,
    organizationId,
    sections: template.sections,
    type: template.type,
  });
}

/* DELETE */

/**
 * Deletes a template from the database.
 * Validates that the template belongs to the specified organization.
 *
 * @param templateId - The ID of the template to delete.
 * @param organizationId - The ID of the organization that owns the template.
 * @returns True if the template was deleted, false if not found or doesn't belong to the organization.
 */
export async function deleteTemplateFromDatabase({
  templateId,
  organizationId,
}: {
  templateId: string;
  organizationId: string;
}): Promise<boolean> {
  // First verify the template exists and belongs to the organization
  const existing = await prisma.template.findFirst({
    where: {
      id: templateId,
      organizationId,
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.template.delete({
    where: {
      id: templateId,
    },
  });

  return true;
}

/**
 * Deletes all templates for an organization.
 * Useful for test cleanup.
 *
 * @param organizationId - The ID of the organization.
 * @returns The number of templates deleted.
 */
export async function deleteAllTemplatesForOrganization(
  organizationId: string,
): Promise<number> {
  const result = await prisma.template.deleteMany({
    where: {
      organizationId,
    },
  });

  return result.count;
}
