import { z } from "zod";

import { WORKFLOW_SAMPLE_KEYS } from "./workflow-samples";
import { MAX_WORKFLOW_STEPS, WORKFLOW_DOCUMENT_TYPES } from "./workflow-steps";
import {
  ARCHIVE_WORKFLOW_INTENT,
  BLANK_WORKFLOW_KEY,
  CREATE_WORKFLOW_INTENT,
  RESTORE_WORKFLOW_INTENT,
  SAVE_WORKFLOW_INTENT,
} from "./workflows-constants";

z.config({ jitless: true });

export const createWorkflowFormSchema = z.object({
  intent: z.literal(CREATE_WORKFLOW_INTENT),
  sampleKey: z.enum([...WORKFLOW_SAMPLE_KEYS, BLANK_WORKFLOW_KEY]),
});

const optionalDays = z.number().int().min(0).max(365).nullable();

export const workflowStepSchema = z.object({
  advanceMode: z.enum(["automatic", "manual"]),
  carryForward: z.enum(["items", "deposit", "balance"]),
  depositPercentBps: z.number().int().min(0).max(10_000).nullable(),
  documentType: z.enum(WORKFLOW_DOCUMENT_TYPES).nullable(),
  kind: z.enum(["document", "payment", "receipt"]),
  name: z.string().max(200),
  paymentTermsDays: optionalDays,
  requiresAcceptance: z.boolean(),
  negotiable: z.boolean().optional().default(false),
  requestsPurchaseOrder: z.boolean().optional().default(false),
  templateId: z.string().min(1).nullable(),
  validityDays: optionalDays,
});

export const saveWorkflowFormSchema = z.object({
  description: z.string().trim().max(500).optional().default(""),
  intent: z.literal(SAVE_WORKFLOW_INTENT),
  name: z
    .string({ message: "workflows:editor.nameRequired" })
    .trim()
    .min(1, { message: "workflows:editor.nameRequired" })
    .max(120, { message: "workflows:editor.nameTooLong" }),
  // The step list is sent as one JSON field from the editor.
  steps: z
    .string()
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Invalid steps" });
        return z.NEVER;
      }
    })
    .pipe(z.array(workflowStepSchema).max(MAX_WORKFLOW_STEPS + 5)),
});

export const workflowIdFormSchema = z.object({
  intent: z.enum([ARCHIVE_WORKFLOW_INTENT, RESTORE_WORKFLOW_INTENT]),
  workflowId: z.string().min(1),
});
