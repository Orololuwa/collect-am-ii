import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

/** The app's primary colour, as hex for email clients. */
export const EMAIL_PRIMARY = "#f44250";

const LOGO_URL =
  "https://res.cloudinary.com/df1fw15ei/image/upload/v1793261538/CollectAm/app-assets/collectam-logo-email_abjxmi.png";

const colors = {
  border: "#e7e7ea",
  faint: "#a1a1aa",
  muted: "#52525b",
  page: "#f6f6f7",
  subtle: "#71717a",
  text: "#18181b",
};

const fontFamily =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/**
 * The frame every email the app sends sits in: the logo, a white card for the
 * content and a short footer.
 */
export function EmailLayout({
  preview,
  appName,
  footer,
  children,
}: {
  /** The line inboxes show next to the subject. */
  preview: string;
  appName: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Html dir="ltr" lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.page,
          fontFamily,
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: `1px solid ${colors.border}`,
            borderRadius: "12px",
            maxWidth: "520px",
            padding: "32px",
          }}
        >
          <Section style={{ marginBottom: "24px" }}>
            <Row>
              <Column style={{ width: "48px" }}>
                <Img
                  alt=""
                  height="40"
                  src={LOGO_URL}
                  style={{ borderRadius: "10px", display: "block" }}
                  width="40"
                />
              </Column>
              <Column>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: "17px",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {appName}
                </Text>
              </Column>
            </Row>
          </Section>

          {children}

          {footer ? (
            <>
              <Hr
                style={{ borderColor: colors.border, margin: "24px 0 16px" }}
              />
              <Text
                style={{
                  color: colors.faint,
                  fontSize: "12px",
                  lineHeight: "18px",
                  margin: 0,
                }}
              >
                {footer}
              </Text>
            </>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: colors.text,
        fontSize: "20px",
        fontWeight: 600,
        lineHeight: "28px",
        margin: "0 0 8px",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailText({
  children,
  muted = false,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: CSSProperties;
}) {
  return (
    <Text
      style={{
        color: muted ? colors.muted : colors.text,
        fontSize: muted ? "14px" : "15px",
        lineHeight: muted ? "22px" : "24px",
        margin: "0 0 12px",
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

/** A label and a big figure on a grey panel, e.g. the total. */
export function EmailHighlight({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Section
      style={{
        backgroundColor: colors.page,
        borderRadius: "10px",
        margin: "8px 0 24px",
        padding: "16px 20px",
      }}
    >
      <Text style={{ color: colors.subtle, fontSize: "13px", margin: 0 }}>
        {label}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontSize: "24px",
          fontWeight: 600,
          margin: "4px 0 0",
        }}
      >
        {value}
      </Text>
    </Section>
  );
}

/** The email's main action, with the plain link underneath for clients that drop buttons. */
export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: EMAIL_PRIMARY,
        borderRadius: "10px",
        color: "#ffffff",
        display: "block",
        fontSize: "15px",
        fontWeight: 600,
        margin: "8px 0 20px",
        padding: "12px 20px",
        textAlign: "center",
        textDecoration: "none",
      }}
    >
      {children}
    </Button>
  );
}

export function EmailLinkFallback({ href }: { href: string }) {
  return (
    <Text
      style={{
        color: colors.faint,
        fontSize: "12px",
        lineHeight: "18px",
        margin: "16px 0 0",
        wordBreak: "break-all",
      }}
    >
      If the button doesn't work, open this link:{" "}
      <Link href={href} style={{ color: colors.subtle }}>
        {href}
      </Link>
    </Text>
  );
}
