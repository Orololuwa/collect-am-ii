import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { sendDocumentEmail } from "./email-sender.server";
import { setupMockServerLifecycle } from "~/test/msw-test-utils";

type CapturedRequest = {
  body: Record<string, unknown>;
  headers: Headers;
};

let captured: CapturedRequest | undefined;
let nextResponse: () => Response;

setupMockServerLifecycle(
  http.post("https://api.resend.com/emails", async ({ request }) => {
    captured = {
      body: (await request.json()) as Record<string, unknown>,
      headers: request.headers,
    };
    return nextResponse();
  }),
);

beforeEach(() => {
  captured = undefined;
  nextResponse = () => HttpResponse.json({ id: "email_123" });
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("EMAIL_FROM", "CollectAm <documents@example.com>");
  return () => {
    vi.unstubAllEnvs();
  };
});

describe("sendDocumentEmail()", () => {
  test("given: a document email, should: send it through Resend with the PDF attached", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4 test");

    const result = await sendDocumentEmail({
      html: "<p>Hello <strong>there</strong></p>",
      pdfBuffer,
      pdfFilename: "invoice.pdf",
      replyTo: "sender@example.org",
      subject: "Your invoice",
      to: "client@example.com",
    });

    expect(result).toEqual({ messageId: "email_123", success: true });
    expect(captured?.headers.get("Authorization")).toEqual(
      "Bearer re_test_key",
    );
    expect(captured?.body).toEqual({
      attachments: [
        { content: pdfBuffer.toString("base64"), filename: "invoice.pdf" },
      ],
      from: "CollectAm <documents@example.com>",
      html: "<p>Hello <strong>there</strong></p>",
      reply_to: "sender@example.org",
      subject: "Your invoice",
      text: "Hello there",
      to: "client@example.com",
    });
  });

  test("given: an idempotency key, should: send it as the Idempotency-Key header", async () => {
    await sendDocumentEmail({
      html: "<p>Receipt</p>",
      idempotencyKey: "receipt-email-abc",
      pdfBuffer: Buffer.from("pdf"),
      subject: "Your receipt",
      to: "client@example.com",
    });

    expect(captured?.headers.get("Idempotency-Key")).toEqual(
      "receipt-email-abc",
    );
    expect(captured?.body.reply_to).toBeUndefined();
  });

  test("given: Resend rejects the email, should: return its error message", async () => {
    nextResponse = () =>
      HttpResponse.json(
        {
          message:
            "The example.org domain is not verified. Please, add and verify your domain on https://resend.com/domains",
          name: "validation_error",
          statusCode: 403,
        },
        { status: 403 },
      );

    const result = await sendDocumentEmail({
      from: "someone@example.org",
      html: "<p>Hi</p>",
      pdfBuffer: Buffer.from("pdf"),
      subject: "Hi",
      to: "client@example.com",
    });

    expect(result).toEqual({
      error:
        "The example.org domain is not verified. Please, add and verify your domain on https://resend.com/domains",
      success: false,
    });
    expect(captured?.body.from).toEqual("someone@example.org");
  });
});
