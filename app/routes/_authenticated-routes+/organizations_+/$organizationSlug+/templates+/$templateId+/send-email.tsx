import { render } from "@react-email/components";
import { z } from "zod";

import type { Route } from "./+types/send-email";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { DocumentEmail } from "~/features/templates/shared/components/document-email";
import { getTemplateById } from "~/features/templates/shared/templates";
import { retrieveTemplateFromDatabaseById } from "~/features/templates/shared/templates-model.server";
import {
  getDocumentSender,
  sendDocumentEmail,
} from "~/features/templates/shared/utils/email-sender.server";
import { generateExportHTML } from "~/features/templates/shared/utils/html-generator.server";
import { mergeDataIntoTemplate } from "~/features/templates/shared/utils/merge-template-data.server";
import { generatePDF } from "~/features/templates/shared/utils/pdf-generator.server";
import { sanitizeQuillHtml } from "~/features/templates/shared/utils/sanitize-quill-html.server";
import { validateJson } from "~/utils/validate-json.server";

const sendEmailSchema = z.object({
  // Emails are sent from the app's verified address on the organization's
  // behalf; replies go here (the sender's account email when left empty).
  replyTo: z
    .union([z.string().email("Invalid email address"), z.literal("")])
    .optional(),
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string(),
  sections: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional()
    .default({}),
});

export async function action({ request, context, params }: Route.ActionArgs) {
  const { organization, user, headers } = context.get(
    organizationMembershipContext,
  );
  const typedParams = params as {
    organizationSlug: string;
    templateId: string;
  };

  const result = await validateJson(request, sendEmailSchema);

  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: "Invalid request data",
        details: result.response,
      },
      { headers: Object.fromEntries(headers), status: 400 },
    );
  }

  const { data: body } = result;

  try {
    // Load template from database or predefined templates
    let template = await retrieveTemplateFromDatabaseById({
      organizationId: organization.id,
      templateId: typedParams.templateId,
    });

    // Fallback to predefined templates if not found in database
    if (!template) {
      template = getTemplateById(typedParams.templateId) || null;
    }

    if (!template) {
      return Response.json(
        {
          success: false,
          error: "Template not found",
          message: `Template with ID ${typedParams.templateId} not found`,
        },
        { headers: Object.fromEntries(headers), status: 404 },
      );
    }

    // Merge provided data into template sections
    const mergedSections = mergeDataIntoTemplate(template, body.sections || {});

    // Generate PDF using template config and merged sections
    const html = generateExportHTML(
      mergedSections,
      template.globalStyles,
      template.type,
      template.colorPalette,
    );

    const pdfBuffer = await generatePDF(html);

    const appName = getInstance(context).t("translation:appName");
    const email = (
      <DocumentEmail
        appName={appName}
        bodyHtml={sanitizeQuillHtml(body.body)}
        organizationName={organization.name}
        subject={body.subject}
      />
    );
    const [emailHtml, emailText] = await Promise.all([
      render(email),
      render(email, { plainText: true }),
    ]);

    // Send email via Resend
    const emailResult = await sendDocumentEmail({
      from: getDocumentSender({
        appName,
        organizationName: organization.name,
      }),
      replyTo: body.replyTo || user.email,
      to: body.to,
      subject: body.subject,
      html: emailHtml,
      text: emailText,
      pdfBuffer,
      pdfFilename: `${template.name || "template"}.pdf`,
    });

    if (!emailResult.success) {
      return Response.json(
        {
          success: false,
          error: emailResult.error || "Failed to send email",
        },
        { headers: Object.fromEntries(headers), status: 500 },
      );
    }

    return Response.json(
      {
        success: true,
        messageId: emailResult.messageId,
        message: "Email sent successfully",
      },
      { headers: Object.fromEntries(headers) },
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to send email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { headers: Object.fromEntries(headers), status: 500 },
    );
  }
}
