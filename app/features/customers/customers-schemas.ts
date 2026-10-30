import { z } from "zod";

import {
  ARCHIVE_CUSTOMER_INTENT,
  RESTORE_CUSTOMER_INTENT,
  SAVE_CUSTOMER_INTENT,
} from "./customers-constants";

z.config({ jitless: true });

// Browsers submit textarea line breaks as \r\n; store plain \n.
const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, { message: tooLong })
    .transform((value) => value.replace(/\r\n?/g, "\n"))
    .optional()
    .default("");

export const saveCustomerFormSchema = z.object({
  billingAddress: optionalText(500, "customers:form.addressTooLong"),
  companyName: optionalText(200, "customers:form.companyTooLong"),
  email: z
    .email({ message: "customers:form.emailInvalid" })
    .trim()
    .toLowerCase()
    .max(254, { message: "customers:form.emailInvalid" }),
  intent: z.literal(SAVE_CUSTOMER_INTENT),
  name: z
    .string({ message: "customers:form.nameRequired" })
    .trim()
    .min(1, { message: "customers:form.nameRequired" })
    .max(200, { message: "customers:form.nameTooLong" }),
  notes: optionalText(2000, "customers:form.notesTooLong"),
  phone: optionalText(40, "customers:form.phoneTooLong"),
  shippingAddress: optionalText(500, "customers:form.addressTooLong"),
});

export const customerIdFormSchema = z.object({
  customerId: z.string().min(1),
  intent: z.enum([ARCHIVE_CUSTOMER_INTENT, RESTORE_CUSTOMER_INTENT]),
});

export type SaveCustomerFormData = z.infer<typeof saveCustomerFormSchema>;
