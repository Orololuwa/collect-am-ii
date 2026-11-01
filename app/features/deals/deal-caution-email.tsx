import { Section, Text } from "@react-email/components";

import {
  EmailButton,
  EmailHighlight,
  EmailLayout,
  EmailLinkFallback,
  EmailText,
} from "~/components/email/email-layout";

type CautionEmailProps = {
  /** Asking for the refund account, or saying the refund went out. */
  kind: "cautionSettlement" | "cautionRefunded";
  customerName: string;
  organizationName: string;
  dealTitle: string;
  held: string;
  deductions: Array<{ reason: string; amount: string }>;
  /** The business attached photos or videos to its deductions. */
  hasEvidence?: boolean;
  refund: string;
  /** The bank and masked account the refund went to, once sent. */
  refundedTo?: string;
  reference?: string;
  shareUrl: string;
  appName: string;
};

/** Tells the customer how their caution was settled. */
export function CautionEmail({
  kind,
  customerName,
  organizationName,
  dealTitle,
  held,
  deductions,
  hasEvidence = false,
  refund,
  refundedTo,
  reference,
  shareUrl,
  appName,
}: CautionEmailProps) {
  const settling = kind === "cautionSettlement";
  return (
    <EmailLayout
      appName={appName}
      footer={`Sent by ${organizationName} with ${appName}. Reply to this email to reach ${organizationName}.`}
      preview={
        settling
          ? `${organizationName} will refund ${refund} of your caution`
          : `${organizationName} sent your caution refund of ${refund}`
      }
    >
      <EmailText>Hi {customerName},</EmailText>
      <EmailText>
        {settling
          ? `${organizationName} has settled the caution you paid for ${dealTitle}.`
          : `${organizationName} has sent your caution refund for ${dealTitle}.`}
      </EmailText>
      <Section style={{ margin: "0 0 8px" }}>
        <Text style={{ fontSize: "14px", margin: "0 0 4px" }}>
          Caution held: {held}
        </Text>
        {deductions.map((deduction) => (
          <Text
            key={`${deduction.reason}-${deduction.amount}`}
            style={{ color: "#525252", fontSize: "14px", margin: "0 0 4px" }}
          >
            Kept for {deduction.reason}: {deduction.amount}
          </Text>
        ))}
      </Section>
      {hasEvidence ? (
        <EmailText muted>
          {organizationName} added photos or videos to explain what they kept.
          You'll find them on the deal page.
        </EmailText>
      ) : null}
      <EmailHighlight
        label={settling ? "To be refunded" : "Refunded"}
        value={refund}
      />
      {settling ? (
        <EmailText>
          Tell {organizationName} which account to send it to. It only takes a
          minute.
        </EmailText>
      ) : (
        <EmailText>
          {refundedTo ? `Sent to ${refundedTo}.` : null}
          {reference ? ` Reference: ${reference}.` : null} Allow a little time
          for it to reach your account.
        </EmailText>
      )}
      <EmailButton href={shareUrl}>
        {settling ? "Give your refund account" : "View the settlement"}
      </EmailButton>
      <EmailText muted>
        If anything looks wrong, reply to this email or send a message from the
        same page.
      </EmailText>
      <EmailLinkFallback href={shareUrl} />
    </EmailLayout>
  );
}
