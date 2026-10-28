import * as z from "zod";

import { LOGIN_INTENTS } from "./login-constants";

z.config({ jitless: true });

export const loginWithEmailSchema = z.object({
  email: z.email({ message: "userAuthentication:login.errors.invalidEmail" }),
  intent: z.literal(LOGIN_INTENTS.loginWithEmail),
});

export const verifyLoginCodeSchema = z.object({
  code: z
    .string({ message: "userAuthentication:login.code.invalidCode" })
    .regex(/^\d{6}$/, { message: "userAuthentication:login.code.invalidCode" }),
  email: z.email({ message: "userAuthentication:login.errors.invalidEmail" }),
  intent: z.literal(LOGIN_INTENTS.verifyCode),
});

export const loginWithGoogleSchema = z.object({
  intent: z.literal(LOGIN_INTENTS.loginWithGoogle),
});
