import { sendEmail } from "~/utils/email.server";

export interface SendEmailOptions {
  /** Defaults to EMAIL_FROM; must be on a domain verified in Resend. */
  from?: string;
  /** Where replies go, e.g. the person sending the document. */
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  pdfBuffer: Buffer;
  pdfFilename?: string;
  /** Stops a retried job from sending the same email twice (24 hours). */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Builds the From header for documents an organization sends: its name as the
 * display name, on the app's own (Resend-verified) address, e.g.
 * `"Acme via CollectAm" <documents@example.com>`.
 */
export function getDocumentSender({
  organizationName,
  appName,
  emailFrom = process.env.EMAIL_FROM || "onboarding@resend.dev",
}: {
  organizationName: string;
  appName: string;
  emailFrom?: string;
}) {
  const address = (/<([^>]+)>\s*$/.exec(emailFrom)?.[1] ?? emailFrom).trim();
  // Characters that would break out of a quoted display name or the header.
  const displayName = `${organizationName} via ${appName}`
    .replace(/["\\<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `"${displayName}" <${address}>`;
}

/**
 * Converts the email's HTML body into its plain-text version.
 */
function htmlToText(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Sends an email with a PDF attachment via Resend.
 * @param options - Email sending options
 * @returns Result with success status and message ID or error
 */
export async function sendDocumentEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const {
    from,
    replyTo,
    to,
    subject,
    html,
    pdfBuffer,
    pdfFilename = "document.pdf",
    idempotencyKey,
  } = options;

  try {
    const result = await sendEmail({
      attachments: [{ content: pdfBuffer, filename: pdfFilename }],
      from,
      html,
      idempotencyKey,
      replyTo,
      subject,
      text: htmlToText(html) || "Please see attached document.",
      to,
    });

    if (result.status === "error") {
      return { error: result.error.message, success: false };
    }

    return { messageId: result.data.id, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      error: `Failed to send email: ${errorMessage}`,
      success: false,
    };
  }
}
