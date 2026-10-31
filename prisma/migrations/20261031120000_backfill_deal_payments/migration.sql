-- Payments recorded on deals before payments were linked to deals only exist
-- on the deal step. Add the matching payment rows, dated when they were paid,
-- so the dashboard counts them like every other payment.
INSERT INTO "Payment" (
    "id",
    "createdAt",
    "updatedAt",
    "organizationId",
    "dealId",
    "dealStepId",
    "provider",
    "providerPaymentId",
    "amountMinor",
    "currency",
    "status",
    "customerEmail",
    "customerName",
    "items",
    "metadata"
)
SELECT
    'backfill' || md5(s."id"),
    s."paidAt",
    NOW(),
    d."organizationId",
    d."id",
    s."id",
    'manual',
    'manual_' || s."id",
    COALESCE(s."amountPaidMinor", 0),
    d."currency",
    'succeeded'::"PaymentStatus",
    c."email",
    c."name",
    jsonb_build_array(
        jsonb_build_object(
            'description', s."name",
            'quantity', 1,
            'unitPriceMinor', COALESCE(s."amountPaidMinor", 0)
        )
    ),
    jsonb_build_object(
        'method', s."paymentMethod",
        'reference', s."paymentReference"
    )
FROM "DealStep" AS s
JOIN "Deal" AS d ON d."id" = s."dealId"
JOIN "Customer" AS c ON c."id" = d."customerId"
WHERE s."kind" = 'payment'
  AND s."paidAt" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM "Payment" AS p WHERE p."dealStepId" = s."id"
  );
