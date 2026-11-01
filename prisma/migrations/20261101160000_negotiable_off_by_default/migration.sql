-- AlterTable
ALTER TABLE "DealStep" ALTER COLUMN "negotiable" SET DEFAULT false;

-- AlterTable
ALTER TABLE "WorkflowStep" ALTER COLUMN "negotiable" SET DEFAULT false;

-- Existing steps keep whatever they had; only new steps start without negotiation.
