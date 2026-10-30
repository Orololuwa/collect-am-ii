-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('open', 'won', 'lost', 'cancelled');

-- CreateEnum
CREATE TYPE "DealParty" AS ENUM ('business', 'customer', 'system');

-- CreateEnum
CREATE TYPE "DealStepStatus" AS ENUM ('pending', 'active', 'done');

-- CreateEnum
CREATE TYPE "DealDocumentStatus" AS ENUM ('draft', 'sent', 'viewed', 'changesRequested', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "DealVersionState" AS ENUM ('current', 'superseded', 'proposed', 'rejected');

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowId" TEXT,
    "workflowName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'open',
    "closedAt" TIMESTAMP(3),
    "shareNonce" TEXT NOT NULL,
    "shareRevokedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealStep" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
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
    "status" "DealStepStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "amountDueMinor" INTEGER,
    "amountPaidMinor" INTEGER,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT NOT NULL DEFAULT '',
    "paymentReference" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DealStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dealId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "number" TEXT,
    "status" "DealDocumentStatus" NOT NULL DEFAULT 'draft',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedVersionId" TEXT,
    "acceptedByName" TEXT NOT NULL DEFAULT '',
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DealDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealDocumentVersion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dealDocumentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "proposedBy" "DealParty" NOT NULL,
    "state" "DealVersionState" NOT NULL,
    "items" JSONB NOT NULL,
    "subtotalMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "sections" JSONB,
    "globalStyles" JSONB,
    "colorPalette" JSONB,

    CONSTRAINT "DealDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dealId" TEXT NOT NULL,
    "author" "DealParty" NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,

    CONSTRAINT "DealMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" "DealParty" NOT NULL,
    "userId" TEXT,
    "documentId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DealEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSequence" (
    "organizationId" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("organizationId","type")
);

-- CreateIndex
CREATE INDEX "Deal_organizationId_status_updatedAt_idx" ON "Deal"("organizationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Deal_customerId_idx" ON "Deal"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "DealStep_dealId_position_key" ON "DealStep"("dealId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DealDocument_stepId_key" ON "DealDocument"("stepId");

-- CreateIndex
CREATE INDEX "DealDocument_dealId_idx" ON "DealDocument"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "DealDocumentVersion_dealDocumentId_version_key" ON "DealDocumentVersion"("dealDocumentId", "version");

-- CreateIndex
CREATE INDEX "DealMessage_dealId_createdAt_idx" ON "DealMessage"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "DealEvent_dealId_createdAt_idx" ON "DealEvent"("dealId", "createdAt");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStep" ADD CONSTRAINT "DealStep_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStep" ADD CONSTRAINT "DealStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDocument" ADD CONSTRAINT "DealDocument_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDocument" ADD CONSTRAINT "DealDocument_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "DealStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDocumentVersion" ADD CONSTRAINT "DealDocumentVersion_dealDocumentId_fkey" FOREIGN KEY ("dealDocumentId") REFERENCES "DealDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDocumentVersion" ADD CONSTRAINT "DealDocumentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealMessage" ADD CONSTRAINT "DealMessage_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealMessage" ADD CONSTRAINT "DealMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEvent" ADD CONSTRAINT "DealEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEvent" ADD CONSTRAINT "DealEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSequence" ADD CONSTRAINT "DocumentSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

