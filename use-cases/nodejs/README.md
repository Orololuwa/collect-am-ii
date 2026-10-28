# Node.js Document Email Use Case

This example demonstrates how to:
1. Call the export API endpoint to generate a PDF document
2. Send the PDF as an email attachment via multiple email providers

## Supported Email Providers

- **Mailgun** - Transactional email API
- **Resend** - Modern email API for developers
- **SendGrid** - Email delivery service
- **SMTP** - Generic SMTP via Nodemailer (works with Gmail, Outlook, AWS SES, etc.)

## Prerequisites

- Node.js 18+ (for native `fetch` and `FormData` support)
- A valid API key from your organization settings
- Credentials for at least one email provider
- Access to a template ID

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your values:**
   - Set `EMAIL_PROVIDER` to one of: `mailgun`, `resend`, `sendgrid`, or `smtp`
   - Configure the required variables for your chosen provider (see below)

## Email Provider Configuration

### Mailgun

```env
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=mg.yourdomain.com
EMAIL_FROM=sender@yourdomain.com  # Must be verified in Mailgun
```

### Resend

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=sender@yourdomain.com  # Must be verified in Resend
```

### SendGrid

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key
EMAIL_FROM=sender@yourdomain.com  # Must be verified in SendGrid
```

### SMTP (Nodemailer)

Works with any SMTP server (Gmail, Outlook, AWS SES, etc.):

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true for port 465, false for 587/25
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

**Note for Gmail:** You'll need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

## Running

```bash
npm start
```

Or directly:
```bash
node send-document-email.js
```

## Expected Output

```
🚀 Starting document export and email process...
📮 Using email provider: MAILGUN

📄 Exporting document from: http://localhost:3001/api/v1/templates/resume-modern-professional/export
✅ PDF generated successfully (123456 bytes)
📧 Sending email via Mailgun to: recipient@example.com
✅ Email sent successfully!
   Message ID: <20240101123456.abc123@mg.yourdomain.com>

✨ Process completed successfully!
```

## Customizing Document Data

To override template data, modify the `sections` object in `send-document-email.js`:

```javascript
body: JSON.stringify({
  sections: {
    "resume-header": {
      "name": "John Doe",
      "title": "Software Engineer",
      "email": "john@example.com"
    }
  }
})
```

## Error Handling

The script will exit with an error code if:
- Required environment variables are missing
- Invalid `EMAIL_PROVIDER` value
- Provider-specific configuration is incomplete
- API key is invalid (401)
- Template not found (404)
- Export generation fails (500)
- Email provider API fails
- Email sending fails

## Notes

- The script uses native Node.js `fetch` (available in Node 18+)
- PDF is sent as binary attachment (or base64 for Resend/SendGrid)
- The sender email (`EMAIL_FROM`) must be verified in your email provider account
- The API key must have access to the specified template
- For SMTP, use App Passwords for Gmail/Outlook instead of regular passwords
- SMTP `SMTP_SECURE` should be `true` for port 465 (SSL/TLS) and `false` for ports 587/25 (STARTTLS)
