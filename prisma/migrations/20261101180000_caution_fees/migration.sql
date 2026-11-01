-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('sale', 'caution');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowStepKind" ADD VALUE 'caution';
ALTER TYPE "WorkflowStepKind" ADD VALUE 'cautionRefund';

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "cautionAmountMinor" INTEGER,
ADD COLUMN     "cautionSettleAfter" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "purpose" "PaymentPurpose" NOT NULL DEFAULT 'sale';

-- CreateTable
CREATE TABLE "DealCautionSettlement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stepId" TEXT NOT NULL,
    "heldMinor" INTEGER NOT NULL,
    "deductions" JSONB NOT NULL DEFAULT '[]',
    "refundMinor" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3),
    "bankName" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL DEFAULT '',
    "accountGivenAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundReference" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DealCautionSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealCautionSettlement_stepId_key" ON "DealCautionSettlement"("stepId");

-- AddForeignKey
ALTER TABLE "DealCautionSettlement" ADD CONSTRAINT "DealCautionSettlement_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "DealStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

