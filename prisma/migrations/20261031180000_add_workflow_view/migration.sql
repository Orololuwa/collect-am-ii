-- CreateEnum
CREATE TYPE "WorkflowView" AS ENUM ('steps', 'canvas');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "workflowView" "WorkflowView" NOT NULL DEFAULT 'steps',
ADD COLUMN     "workflowViewSwitchable" BOOLEAN NOT NULL DEFAULT true;

