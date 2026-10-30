-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "dealId" TEXT,
ADD COLUMN     "dealStepId" TEXT,
ADD COLUMN     "organizationId" TEXT,
ALTER COLUMN "checkoutPageId" DROP NOT NULL;

-- Existing payments all came from checkout pages: take their organization.
UPDATE "Payment" AS p
SET "organizationId" = c."organizationId"
FROM "CheckoutPage" AS c
WHERE p."checkoutPageId" = c."id";

ALTER TABLE "Payment" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Payment_organizationId_createdAt_idx" ON "Payment"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_dealId_idx" ON "Payment"("dealId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_dealStepId_fkey" FOREIGN KEY ("dealStepId") REFERENCES "DealStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

