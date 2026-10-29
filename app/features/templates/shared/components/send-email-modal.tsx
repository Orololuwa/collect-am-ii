import { Loader2, Mail, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { useBuilderStore } from "../store/builder-store";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

// Rich Text Editor types and options (reused from properties-panel)
type ReactQuillProps = {
  value: string;
  onChange: (
    value: string,
    delta?: unknown,
    source?: unknown,
    editor?: unknown,
  ) => void;
  theme: string;
  style?: React.CSSProperties;
  modules?: {
    toolbar: (
      | string[]
      | {
          list: string;
        }[]
      | {
          link: boolean;
        }[]
    )[];
  };
};

const quillOptions: ReactQuillProps["modules"] = {
  toolbar: [
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ link: true }],
  ],
};

// Form validation schema
const emailFormSchema = z.object({
  // Optional: the server uses the signed-in user's email when it's empty.
  replyTo: z.union([z.string().email("Invalid email address"), z.literal("")]),
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string(),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

export function SendEmailModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentTemplate } = useBuilderStore();
  const params = useParams();
  const [ReactQuill, setReactQuill] =
    useState<React.ComponentType<ReactQuillProps> | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof EmailFormData, string>>
  >({});

  const [formData, setFormData] = useState<EmailFormData>({
    replyTo: "",
    to: "",
    subject: "",
    body: "",
  });

  // Load ReactQuill dynamically
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      Promise.all([
        import("react-quill-new"),
        import("react-quill-new/dist/quill.snow.css"),
      ]).then(([quillModule]) => {
        const Quill =
          quillModule.default as unknown as React.ComponentType<ReactQuillProps>;
        setReactQuill(() => Quill);
      });
    }
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        replyTo: "",
        to: "",
        subject: "",
        body: "",
      });
      setFormErrors({});
    }
  }, [open]);

  const handleFieldChange = (field: keyof EmailFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const result = emailFormSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof EmailFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof EmailFormData;
        if (field) {
          errors[field] = issue.message;
        }
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleSend = async () => {
    if (!currentTemplate || !params.templateId || !params.organizationSlug) {
      toast.error("Template information missing");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before sending");
      return;
    }

    setIsSending(true);

    try {
      // Extract section data and create sections object keyed by section ID
      const sectionsData: Record<string, Record<string, unknown>> = {};
      currentTemplate.sections.forEach((section) => {
        sectionsData[section.id] = section.data;
      });

      const response = await fetch(
        `/organizations/${params.organizationSlug}/templates/${params.templateId}/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            replyTo: formData.replyTo,
            to: formData.to,
            subject: formData.subject,
            body: formData.body,
            sections: sectionsData,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send email");
      }

      toast.success("Email sent successfully!", {
        description:
          result.message || "Your template has been sent as an attachment.",
      });

      // Close modal on success
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Email
          </DialogTitle>
          <DialogDescription>
            Send this template as a PDF attachment via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reply-to Field */}
          <div className="space-y-2">
            <Label htmlFor="email-reply-to">Reply-to (optional)</Label>
            <Input
              aria-describedby="email-reply-to-description"
              id="email-reply-to"
              onChange={(e) => handleFieldChange("replyTo", e.target.value)}
              placeholder="you@yourcompany.com"
              type="email"
              value={formData.replyTo}
            />
            <p
              className="text-muted-foreground text-sm"
              id="email-reply-to-description"
            >
              The email is sent in your organization's name. Replies go to this
              address, or to your account email if you leave it empty.
            </p>
            {formErrors.replyTo && (
              <p className="text-sm text-destructive">{formErrors.replyTo}</p>
            )}
          </div>

          {/* To Field */}
          <div className="space-y-2">
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              onChange={(e) => handleFieldChange("to", e.target.value)}
              placeholder="recipient@example.com"
              type="email"
              value={formData.to}
            />
            {formErrors.to && (
              <p className="text-sm text-destructive">{formErrors.to}</p>
            )}
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              onChange={(e) => handleFieldChange("subject", e.target.value)}
              placeholder="Email subject"
              value={formData.subject}
            />
            {formErrors.subject && (
              <p className="text-sm text-destructive">{formErrors.subject}</p>
            )}
          </div>

          {/* Body Field - Rich Text Editor */}
          <div className="space-y-2">
            <Label>Message</Label>
            {isMounted ? (
              <div className="border rounded-md overflow-hidden bg-background min-h-[200px]">
                {ReactQuill ? (
                  <>
                    <ReactQuill
                      modules={quillOptions}
                      onChange={(value) => handleFieldChange("body", value)}
                      style={{ minHeight: "200px" }}
                      theme="snow"
                      value={formData.body}
                    />
                    <style>{`
                      /* Light mode - use default snow theme colors */
                      .ql-container {
                        min-height: 200px !important;
                        border: none !important;
                        border-radius: 0 !important;
                      }
                      .ql-toolbar {
                        border: none !important;
                        border-bottom: 1px solid hsl(var(--border)) !important;
                        border-radius: 0 !important;
                      }
                      .ql-container,
                      .ql-toolbar,
                      .ql-editor {
                        pointer-events: auto !important;
                      }

                      /* Dark mode - apply dark theme */
                      .dark .ql-snow {
                        background-color: #1f2937 !important;
                        border: none !important;
                        border-radius: 0 !important;
                      }
                      .dark .ql-toolbar {
                        background-color: #1f2937 !important;
                        border: none !important;
                        border-bottom: 1px solid #374151 !important;
                        border-radius: 0 !important;
                      }
                      .dark .ql-toolbar .ql-stroke {
                        stroke: #d1d5db !important;
                      }
                      .dark .ql-toolbar .ql-fill {
                        fill: #d1d5db !important;
                      }
                      .dark .ql-toolbar button:hover,
                      .dark .ql-toolbar button.ql-active {
                        background-color: #374151 !important;
                      }
                      .dark .ql-container {
                        background-color: #1f2937 !important;
                        border: none !important;
                        border-radius: 0 !important;
                      }
                      .dark .ql-editor {
                        color: #f9fafb !important;
                        background-color: #1f2937 !important;
                      }
                      .dark .ql-editor.ql-blank::before {
                        color: #9ca3af !important;
                      }
                    `}</style>
                  </>
                ) : (
                  <div className="min-h-[200px] p-4">
                    <p className="text-sm text-muted-foreground">
                      Loading editor...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="min-h-[200px] p-4 border rounded bg-muted animate-pulse">
                <p className="text-sm text-muted-foreground">
                  Loading editor...
                </p>
              </div>
            )}
            {formErrors.body && (
              <p className="text-sm text-destructive">{formErrors.body}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSending} onClick={handleSend} type="button">
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
