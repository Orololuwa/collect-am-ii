/**
 * biome-ignore-all lint/suspicious/noConsole:helpful local dev error messages
 */
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { z } from "zod";

const internalServerErrorStatusCode = 500;

const resendErrorSchema = z.object({
  message: z.string(),
  name: z.string().optional(),
  statusCode: z.number().optional(),
});

type ResendError = {
  cause?: unknown;
  message: string;
  name: string;
  statusCode: number;
};

function toResendError(data: unknown, statusCode: number): ResendError {
  const parsed = resendErrorSchema.safeParse(data);
  if (parsed.success) {
    return {
      message: parsed.data.message,
      name: parsed.data.name ?? "ResendError",
      statusCode: parsed.data.statusCode ?? statusCode,
    };
  }

  if (typeof data === "string" && data.trim()) {
    return {
      cause: data,
      message: data.trim().slice(0, 300),
      name: "UnknownError",
      statusCode,
    };
  }

  return {
    cause: data,
    message: "Unknown Error",
    name: "UnknownError",
    statusCode,
  };
}

const resendSuccessSchema = z.object({
  id: z.string(),
});

export async function sendEmail({
  react,
  ...options
}: {
  to: string;
  subject: string;
} & (
  | { html: string; text: string; react?: never }
  | { react: ReactElement; html?: never; text?: never }
)) {
  // Resend only delivers from a verified domain. The test sender can email
  // the Resend account owner until EMAIL_FROM uses that domain.
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  const email = {
    from,
    ...options,
    ...(react ? await renderReactEmail(react) : {}),
  };

  // feel free to remove this condition once you've set up resend
  if (!process.env.RESEND_API_KEY && !process.env.MOCKS) {
    if (process.env.NODE_ENV !== "test") {
      console.error(`RESEND_API_KEY not set and we're not in mocks mode.`);
      console.error(
        `To send emails, set the RESEND_API_KEY environment variable.`,
      );
      console.error(
        `Would have sent the following email:`,
        JSON.stringify(email),
      );
    }

    return {
      data: { id: "mocked" },
      status: "success",
    } as const;
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify(email),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const rawBody = await response.text();
  let data: unknown = rawBody;
  try {
    data = JSON.parse(rawBody);
  } catch {
    data = rawBody;
  }
  const parsedData = resendSuccessSchema.safeParse(data);

  if (response.ok && parsedData.success) {
    return { data: parsedData, status: "success" } as const;
  }

  return {
    error: toResendError(
      data,
      response.status || internalServerErrorStatusCode,
    ),
    status: "error",
  } as const;
}

async function renderReactEmail(react: ReactElement) {
  const [html, text] = await Promise.all([
    render(react),
    render(react, { plainText: true }),
  ]);
  return { html, text };
}
