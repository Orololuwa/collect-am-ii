-- Cautions are now a line on the organization's own quote or invoice, so
-- workflows no longer collect them in a separate step. Remove those steps and
-- the receipt straight after each, then close the gaps in positions.
DELETE FROM "WorkflowStep" AS receipt
USING "WorkflowStep" AS caution
WHERE caution."kind" = 'caution'
  AND receipt."workflowId" = caution."workflowId"
  AND receipt."position" = caution."position" + 1
  AND receipt."kind" = 'receipt';

DELETE FROM "WorkflowStep" WHERE "kind" = 'caution';

-- Two passes, so the unique (workflowId, position) never clashes midway.
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "workflowId" ORDER BY "position") - 1 AS "next"
  FROM "WorkflowStep"
)
UPDATE "WorkflowStep" AS step
SET "position" = -1 - ordered."next"
FROM ordered
WHERE step."id" = ordered."id";

UPDATE "WorkflowStep" SET "position" = -1 - "position" WHERE "position" < 0;
