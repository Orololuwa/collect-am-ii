-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "purchaseOrderFileId" TEXT,
ADD COLUMN     "purchaseOrderFileName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "purchaseOrderNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "purchaseOrderReceivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DealStep" ADD COLUMN     "requestsPurchaseOrder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN     "requestsPurchaseOrder" BOOLEAN NOT NULL DEFAULT false;


-- Purchase orders come from the customer, so workflows no longer send them.
-- Steps that did now send a sales order, the seller's side of the same order.
UPDATE "WorkflowStep" SET "documentType" = 'salesOrder' WHERE "documentType" = 'purchaseOrder';
