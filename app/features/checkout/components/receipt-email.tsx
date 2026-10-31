import {
  EmailButton,
  EmailHeading,
  EmailHighlight,
  EmailLayout,
  EmailLinkFallback,
  EmailText,
} from "~/components/email/email-layout";

/** The email a customer gets with the receipt for a checkout payment. */
export function ReceiptEmail({
  storeName,
  receiptNumber,
  amount,
  receiptUrl,
  appName,
}: {
  storeName: string;
  receiptNumber: string;
  amount: string;
  receiptUrl: string;
  appName: string;
}) {
  return (
    <EmailLayout
      appName={appName}
      footer={`Sent by ${storeName} with ${appName}.`}
      preview={`Your receipt ${receiptNumber} from ${storeName}`}
    >
      <EmailHeading>Thanks for your payment</EmailHeading>
      <EmailText>
        {storeName} received your payment. Your receipt{" "}
        <strong>{receiptNumber}</strong> is below and attached as a PDF.
      </EmailText>
      <EmailHighlight label="Amount paid" value={amount} />
      <EmailButton href={receiptUrl}>View receipt</EmailButton>
      <EmailLinkFallback href={receiptUrl} />
    </EmailLayout>
  );
}
