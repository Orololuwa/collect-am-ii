import { z } from "zod";

import {
  MAX_DEAL_ITEMS,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_QUANTITY,
  roundQuantity,
} from "./deal-items";
import {
  ACCEPT_DOCUMENT_INTENT,
  CLOSE_DEAL_INTENT,
  DECLINE_DOCUMENT_INTENT,
  MAX_MESSAGE_LENGTH,
  PAYMENT_METHODS,
  POST_MESSAGE_INTENT,
  RECORD_PAYMENT_INTENT,
  RESEND_DOCUMENT_INTENT,
  REVISE_DOCUMENT_INTENT,
  SEND_DOCUMENT_INTENT,
  START_DEAL_INTENT,
} from "./deals-constants";
import { COMMON_CURRENCIES } from "~/features/templates/shared/common-currencies";

z.config({ jitless: true });

const currencyCodes = COMMON_CURRENCIES.map((currency) => currency.code) as [
  string,
  ...string[],
];

/** Browsers submit textarea line breaks as \r\n; store plain \n. */
const normalizeNewlines = (value: string) => value.replace(/\r\n?/g, "\n");

export const dealItemSchema = z.object({
  description: z
    .string()
    .trim()
    .max(MAX_ITEM_DESCRIPTION_LENGTH)
    .transform(normalizeNewlines),
  name: z.string().trim().min(1).max(MAX_ITEM_NAME_LENGTH),
  productId: z.string().min(1).nullable(),
  quantity: z
    .number()
    .positive()
    .max(MAX_ITEM_QUANTITY)
    .transform(roundQuantity)
    .refine((quantity) => quantity > 0),
  taxRateBps: z.number().int().min(0).max(10_000),
  unit: z.string().trim().min(1).max(30),
  unitPriceMinor: z.number().int().min(0).max(100_000_000_000),
});

// The line items are sent as one JSON field from the items editor.
const itemsField = z
  .string({ message: "deals:items.itemsRequired" })
  .transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "deals:items.itemsInvalid" });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(dealItemSchema, { message: "deals:items.itemsInvalid" })
      .min(1, { message: "deals:items.itemsRequired" })
      .max(MAX_DEAL_ITEMS, { message: "deals:items.tooManyItems" }),
  );

export const startDealFormSchema = z.object({
  currency: z.enum(currencyCodes, { message: "deals:new.currencyRequired" }),
  customerId: z
    .string({ message: "deals:new.customerRequired" })
    .min(1, { message: "deals:new.customerRequired" }),
  intent: z.literal(START_DEAL_INTENT),
  items: itemsField,
  title: z
    .string({ message: "deals:new.titleRequired" })
    .trim()
    .min(1, { message: "deals:new.titleRequired" })
    .max(120, { message: "deals:new.titleTooLong" }),
  workflowId: z
    .string({ message: "deals:new.workflowRequired" })
    .min(1, { message: "deals:new.workflowRequired" }),
});

export const reviseDocumentFormSchema = z.object({
  documentId: z.string().min(1),
  intent: z.literal(REVISE_DOCUMENT_INTENT),
  items: itemsField,
  note: z
    .string()
    .trim()
    .max(500)
    .transform(normalizeNewlines)
    .optional()
    .default(""),
});

export const documentIdFormSchema = z.object({
  documentId: z.string().min(1),
  intent: z.enum([SEND_DOCUMENT_INTENT, RESEND_DOCUMENT_INTENT]),
});

export const acceptDocumentFormSchema = z.object({
  acceptedByName: z
    .string({ message: "deals:detail.acceptedByRequired" })
    .trim()
    .min(1, { message: "deals:detail.acceptedByRequired" })
    .max(120),
  documentId: z.string().min(1),
  intent: z.literal(ACCEPT_DOCUMENT_INTENT),
});

export const declineDocumentFormSchema = z.object({
  documentId: z.string().min(1),
  intent: z.literal(DECLINE_DOCUMENT_INTENT),
  reason: z
    .string()
    .trim()
    .max(500)
    .transform(normalizeNewlines)
    .optional()
    .default(""),
});

export const recordPaymentFormSchema = z.object({
  intent: z.literal(RECORD_PAYMENT_INTENT),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(120).optional().default(""),
  stepId: z.string().min(1),
});

export const postMessageFormSchema = z.object({
  body: z
    .string({ message: "deals:messages.bodyRequired" })
    .trim()
    .min(1, { message: "deals:messages.bodyRequired" })
    .max(MAX_MESSAGE_LENGTH, { message: "deals:messages.bodyTooLong" })
    .transform(normalizeNewlines),
  intent: z.literal(POST_MESSAGE_INTENT),
});

export const closeDealFormSchema = z.object({
  intent: z.literal(CLOSE_DEAL_INTENT),
  status: z.enum(["lost", "cancelled"]),
});
