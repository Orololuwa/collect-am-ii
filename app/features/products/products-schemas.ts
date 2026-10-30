import { z } from "zod";

import {
  ARCHIVE_PRODUCT_INTENT,
  DELETE_PRODUCT_INTENT,
  PRODUCT_IMAGE_MAX_SIZE,
  PRODUCT_IMAGE_TYPES,
  RESTORE_PRODUCT_INTENT,
  SAVE_PRODUCT_INTENT,
} from "./products-constants";
import { COMMON_CURRENCIES } from "~/features/templates/shared/common-currencies";

z.config({ jitless: true });

const currencyCodes = COMMON_CURRENCIES.map((currency) => currency.code) as [
  string,
  ...string[],
];

/** A non-negative amount in major units with up to 2 decimals, e.g. "1500.50". */
const amountString = z
  .string({ message: "products:form.priceRequired" })
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, { message: "products:form.priceInvalid" });

export const saveProductFormSchema = z.object({
  currency: z.enum(currencyCodes, {
    message: "products:form.currencyRequired",
  }),
  description: z
    .string()
    .trim()
    .max(2000, { message: "products:form.descriptionTooLong" })
    // Browsers submit textarea line breaks as \r\n; store plain \n.
    .transform((value) => value.replace(/\r\n?/g, "\n"))
    .optional()
    .default(""),
  image: z
    .file()
    .max(PRODUCT_IMAGE_MAX_SIZE, { message: "products:form.imageTooLarge" })
    .mime(PRODUCT_IMAGE_TYPES, { message: "products:form.imageInvalidType" })
    .optional(),
  intent: z.literal(SAVE_PRODUCT_INTENT),
  name: z
    .string({ message: "products:form.nameRequired" })
    .trim()
    .min(1, { message: "products:form.nameRequired" })
    .max(200, { message: "products:form.nameTooLong" }),
  removeImage: z.boolean().optional().default(false),
  sku: z
    .string()
    .trim()
    .max(64, { message: "products:form.skuTooLong" })
    .optional()
    .default(""),
  taxRate: z
    .string()
    .trim()
    .regex(/^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/, {
      message: "products:form.taxRateInvalid",
    })
    .optional()
    .default("0"),
  unit: z
    .string()
    .trim()
    .min(1, { message: "products:form.unitRequired" })
    .max(32, { message: "products:form.unitTooLong" })
    .optional()
    .default("item"),
  unitPrice: amountString,
});

export const productIdFormSchema = z.object({
  intent: z.enum([
    ARCHIVE_PRODUCT_INTENT,
    RESTORE_PRODUCT_INTENT,
    DELETE_PRODUCT_INTENT,
  ]),
  productId: z.string().min(1),
});

export type SaveProductFormData = z.infer<typeof saveProductFormSchema>;
