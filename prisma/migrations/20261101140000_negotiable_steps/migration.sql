-- AlterTable
ALTER TABLE "DealStep" ADD COLUMN     "negotiable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN     "negotiable" BOOLEAN NOT NULL DEFAULT true;

