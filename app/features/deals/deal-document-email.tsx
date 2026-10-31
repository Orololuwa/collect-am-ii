import {
  EmailButton,
  EmailHighlight,
  EmailLayout,
  EmailLinkFallback,
  EmailText,
} from "~/components/email/email-layout";

type DealDocumentEmailProps = {
  customerName: string;
  organizationName: string;
  /** e.g. "estimate EST-0004". */
  documentLabel: string;
  dealTitle: string;
  total: string;
  shareUrl: string;
  buttonText: string;
  /** What the customer can do on the share page. */
  nextSteps: string;
  appName: string;
};

/** The email a customer gets with each deal document, linking to the share page. */
export function DealDocumentEmail({
  customerName,
  organizationName,
  documentLabel,
  dealTitle,
  total,
  shareUrl,
  buttonText,
  nextSteps,
  appName,
}: DealDocumentEmailProps) {
  return (
    <EmailLayout
      appName={appName}
      footer={`Sent by ${organizationName} with ${appName}. Reply to this email to reach ${organizationName}.`}
      preview={`${organizationName} sent you ${documentLabel} · ${total}`}
    >
      <EmailText>Hi {customerName},</EmailText>
      <EmailText>
        {organizationName} sent you <strong>{documentLabel}</strong> for{" "}
        {dealTitle}.
      </EmailText>
      <EmailHighlight label="Total" value={total} />
      <EmailButton href={shareUrl}>{buttonText}</EmailButton>
      <EmailText muted>{nextSteps} The PDF is attached too.</EmailText>
      <EmailLinkFallback href={shareUrl} />
    </EmailLayout>
  );
}
