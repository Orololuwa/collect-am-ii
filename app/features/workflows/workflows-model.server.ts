import type { WorkflowStepInput } from "./workflow-steps";
import { WORKFLOW_DOCUMENT_TYPES } from "./workflow-steps";
import type { Prisma } from "~/generated/client";
import { prisma } from "~/utils/database.server";

const stepsInOrder = { orderBy: { position: "asc" } } as const;

export async function retrieveWorkflowsFromDatabaseByOrganizationId({
  organizationId,
  archived,
}: {
  organizationId: string;
  archived: boolean;
}) {
  return await prisma.workflow.findMany({
    include: { steps: stepsInOrder },
    orderBy: { updatedAt: "desc" },
    where: { archivedAt: archived ? { not: null } : null, organizationId },
  });
}

export async function retrieveWorkflowFromDatabaseById({
  workflowId,
  organizationId,
}: {
  workflowId: string;
  organizationId: string;
}) {
  return await prisma.workflow.findFirst({
    include: { steps: stepsInOrder },
    where: { id: workflowId, organizationId },
  });
}

export async function saveWorkflowWithStepsToDatabase({
  organizationId,
  name,
  description,
  sampleKey,
  steps,
}: {
  organizationId: string;
  name: string;
  description: string;
  sampleKey: string | null;
  steps: WorkflowStepInput[];
}) {
  return await prisma.workflow.create({
    data: {
      description,
      name,
      organizationId,
      sampleKey,
      steps: {
        create: steps.map((step, position) => ({ ...step, position })),
      },
    },
  });
}

/**
 * Renames a workflow and replaces all of its steps in one transaction.
 * Returns false if the workflow isn't in the organization.
 */
export async function replaceWorkflowStepsInDatabase({
  workflowId,
  organizationId,
  name,
  description,
  steps,
}: {
  workflowId: string;
  organizationId: string;
  name: string;
  description: string;
  steps: WorkflowStepInput[];
}) {
  return await prisma.$transaction(async (tx) => {
    const { count } = await tx.workflow.updateMany({
      data: { description, name },
      where: { id: workflowId, organizationId },
    });
    if (count === 0) {
      return false;
    }
    await tx.workflowStep.deleteMany({ where: { workflowId } });
    await tx.workflowStep.createMany({
      data: steps.map((step, position) => ({ ...step, position, workflowId })),
    });
    return true;
  });
}

export async function updateWorkflowInDatabaseById({
  workflowId,
  organizationId,
  data,
}: {
  workflowId: string;
  organizationId: string;
  data: Prisma.WorkflowUpdateManyMutationInput;
}) {
  const { count } = await prisma.workflow.updateMany({
    data,
    where: { id: workflowId, organizationId },
  });
  return count > 0;
}

/**
 * The organization's templates a workflow step can use: priced documents and
 * receipts.
 */
export async function retrieveWorkflowStepTemplatesFromDatabase(
  organizationId: string,
) {
  return await prisma.template.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
    where: {
      organizationId,
      type: { in: [...WORKFLOW_DOCUMENT_TYPES, "receipt"] },
    },
  });
}

/** Whether the organization has a workflow deals can be started from. */
export async function hasActiveWorkflowInDatabase(organizationId: string) {
  const workflow = await prisma.workflow.findFirst({
    select: { id: true },
    where: { archivedAt: null, organizationId },
  });
  return workflow !== null;
}
