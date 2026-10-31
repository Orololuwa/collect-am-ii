import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailLinkFallback,
  EmailText,
} from "~/components/email/email-layout";

type InviteEmailProps = {
  /**
   * Pre-translated and interpolated strings from:
   * organizations.settings.team-members.invite-email.*
   */
  title: string;
  description: string;
  callToAction: string;
  buttonText: string;
  buttonUrl: string;
  footer: string;
  appName: string;
};

/**
 * Email template for organization invites.
 */
export function InviteEmail({
  title,
  description,
  callToAction,
  buttonText,
  buttonUrl,
  footer,
  appName,
}: InviteEmailProps) {
  return (
    <EmailLayout appName={appName} footer={footer} preview={description}>
      <EmailHeading>{title}</EmailHeading>
      <EmailText>{description}</EmailText>
      <EmailText muted>{callToAction}</EmailText>
      <EmailButton href={buttonUrl}>{buttonText}</EmailButton>
      <EmailLinkFallback href={buttonUrl} />
    </EmailLayout>
  );
}
