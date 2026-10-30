-- CreateEnum
CREATE TYPE "WorkflowStepKind" AS ENUM ('document', 'payment', 'receipt');

-- CreateEnum
CREATE TYPE "StepAdvanceMode" AS ENUM ('automatic', 'manual');

-- CreateEnum
CREATE TYPE "StepCarryForward" AS ENUM ('items', 'deposit', 'balance');

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sampleKey" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "WorkflowStepKind" NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "TemplateType",
    "templateId" TEXT,
    "requiresAcceptance" BOOLEAN NOT NULL DEFAULT false,
    "advanceMode" "StepAdvanceMode" NOT NULL DEFAULT 'manual',
    "carryForward" "StepCarryForward" NOT NULL DEFAULT 'items',
    "depositPercentBps" INTEGER,
    "validityDays" INTEGER,
    "paymentTermsDays" INTEGER,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workflow_organizationId_archivedAt_idx" ON "Workflow"("organizationId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_workflowId_position_key" ON "WorkflowStep"("workflowId", "position");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

