import { render } from "@react-email/components";
import { describe, expect, test } from "vitest";

import { ReceiptEmail } from "~/features/checkout/components/receipt-email";
import { DocumentEmail } from "~/features/templates/shared/components/document-email";

describe("app emails", () => {
  test("given: a sender's message, should: render it inside the layout with the logo", async () => {
    const html = await render(
      <DocumentEmail
        appName="CollectAm"
        bodyHtml="<p>Please find our <strong>invoice</strong> attached.</p>"
        organizationName="Studio"
        subject="Invoice INV-0042"
      />,
    );

    expect(html).toContain("<strong>invoice</strong>");
    expect(html).toContain("collectam-logo-email");
    expect(html).toContain("Sent by Studio with CollectAm");
  });

  test("given: a receipt, should: link to it with a button and in plain text", async () => {
    const email = (
      <ReceiptEmail
        amount="₦25,500.00"
        appName="CollectAm"
        receiptNumber="RCP-2026-A1B2C3"
        receiptUrl="https://example.com/receipts/abc"
        storeName="Studio"
      />
    );

    expect(await render(email)).toContain(
      'href="https://example.com/receipts/abc"',
    );
    expect(await render(email, { plainText: true })).toContain(
      "https://example.com/receipts/abc",
    );
  });
});
