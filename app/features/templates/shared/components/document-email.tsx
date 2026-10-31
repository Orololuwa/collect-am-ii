import { EmailLayout } from "~/components/email/email-layout";

/**
 * A document sent from the template builder: the sender's own message, in
 * the app's email frame. `bodyHtml` must already be sanitized.
 */
export function DocumentEmail({
  bodyHtml,
  subject,
  organizationName,
  appName,
}: {
  bodyHtml: string;
  subject: string;
  organizationName: string;
  appName: string;
}) {
  return (
    <EmailLayout
      appName={appName}
      footer={`Sent by ${organizationName} with ${appName}. The document is attached as a PDF. Reply to this email to reach ${organizationName}.`}
      preview={subject}
    >
      <div
        // biome-ignore lint/security/noDangerouslySetInnerHtml: the sender's rich-text message, sanitized by the caller
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
        style={{ color: "#18181b", fontSize: "15px", lineHeight: "24px" }}
      />
    </EmailLayout>
  );
}
