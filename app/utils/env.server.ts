import { z } from "zod";

const schema = z.object({
  ALLOW_INDEXING: z.enum(["true", "false"]).optional(),
  API_KEY_ENCRYPTION_KEY: z.string().optional(), // Optional, falls back to COOKIE_SECRET
  APP_URL: z.url(),
  AUTH0_CLIENT_ID: z.string(),
  AUTH0_CLIENT_SECRET: z.string(),
  AUTH0_DOMAIN: z.string(),
  CLOUDINARY_URL: z.string().startsWith("cloudinary://"),
  COOKIE_SECRET: z.string(),
  EMAIL_FROM: z.string().optional(),
  DATABASE_URL: z.string(),
  HONEYPOT_SECRET: z.string(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MOCKS: z.literal("true").optional(),
  NODE_ENV: z.enum(["production", "development", "test"] as const),
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof schema> {}
  }
}

export function init() {
  const parsed = schema.safeParse(process.env);

  if (parsed.success === false) {
    console.error(
      "❌ Invalid environment variables:",
      z.flattenError(parsed.error).fieldErrors,
    );

    throw new Error("Invalid environment variables");
  }
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getEnv() {
  return {
    ALLOW_INDEXING: process.env.ALLOW_INDEXING,
    MODE: process.env.NODE_ENV,
  };
}

type Env = ReturnType<typeof getEnv>;

declare global {
  var ENV: Env;
  interface Window {
    ENV: Env;
  }
}
