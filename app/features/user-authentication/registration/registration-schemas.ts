import * as z from "zod";

import { registerIntents } from "./registration-constants";

z.config({ jitless: true });

export const registerWithEmailSchema = z.object({
  email: z.email({
    message: "userAuthentication:register.errors.invalidEmail",
  }),
  intent: z.literal(registerIntents.registerWithEmail),
});

export const verifyRegistrationCodeSchema = z.object({
  code: z
    .string({ message: "userAuthentication:register.code.invalidCode" })
    .regex(/^\d{6}$/, {
      message: "userAuthentication:register.code.invalidCode",
    }),
  email: z.email({
    message: "userAuthentication:register.errors.invalidEmail",
  }),
  intent: z.literal(registerIntents.verifyCode),
});

export const registerWithGoogleSchema = z.object({
  intent: z.literal(registerIntents.registerWithGoogle),
});
