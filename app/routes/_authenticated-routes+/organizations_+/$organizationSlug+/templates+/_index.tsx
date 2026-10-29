import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Eye,
  FilePenLine,
  FileText,
  Loader2,
  MessageSquareQuote,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  data,
  href,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router";

import type { Route } from "./+types/_index";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { TemplatePreviewThumbnail } from "~/features/templates/shared/components/template-preview-thumbnail";
import { getTemplatesByType } from "~/features/templates/shared/templates";
import {
  createTemplateInDatabase,
  deleteTemplateFromDatabase,
  retrieveTemplateFromDatabaseById,
  retrieveTemplatesByOrganizationIdAndType,
} from "~/features/templates/shared/templates-model.server";
import type { Template } from "~/features/templates/shared/types";
import { cn } from "~/lib/utils";
import { getPageTitle } from "~/utils/get-page-title.server";
import { createToastHeaders } from "~/utils/toast.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);
  const t = i18n.t.bind(i18n);

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");

  // Default matches first template type in the sidebar (resume is app-only, not listed there).
  const activeType = (typeParam || "estimate") as BuilderType;

  // Fetch saved templates for the active type
  const savedTemplates = await retrieveTemplatesByOrganizationIdAndType({
    organizationId: organization.id,
    type: activeType,
  });

  // Get all default templates for all types (for the modal)
  const allDefaultTemplates = {
    contract: getTemplatesByType("contract"),
    estimate: getTemplatesByType("estimate"),
    invoice: getTemplatesByType("invoice"),
    "order-confirmation": getTemplatesByType("order-confirmation"),
    "packing-slip": getTemplatesByType("packing-slip"),
    "delivery-note": getTemplatesByType("delivery-note"),
    "purchase-order": getTemplatesByType("purchase-order"),
    quote: getTemplatesByType("quote"),
    receipt: getTemplatesByType("receipt"),
    resume: getTemplatesByType("resume"),
    "sales-order": getTemplatesByType("sales-order"),
  };

  return data(
    {
      breadcrumb: {
        title: t("organizations:templates.breadcrumb"),
        to: href("/organizations/:organizationSlug/templates", {
          organizationSlug: params.organizationSlug,
        }),
      },
      activeType,
      allDefaultTemplates,
      organizationSlug: params.organizationSlug,
      pageTitle: getPageTitle(t, "organizations:templates.pageTitle"),
      savedTemplates,
    },
    { headers },
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const templateId = formData.get("templateId") as string;

    if (!templateId) {
      return data(
        { success: false, error: "Template ID is required" },
        { status: 400, headers },
      );
    }

    const deleted = await deleteTemplateFromDatabase({
      organizationId: organization.id,
      templateId,
    });

    if (!deleted) {
      return data(
        { success: false, error: "Template not found" },
        { status: 404, headers },
      );
    }

    const toastHeaders = await createToastHeaders({
      description: "Your template has been deleted.",
      title: "Template deleted",
    });

    return data(
      { success: true },
      {
        headers: {
          ...Object.fromEntries(headers),
          ...Object.fromEntries(toastHeaders),
        },
      },
    );
  }

  if (intent === "duplicate") {
    const templateId = formData.get("templateId") as string;

    if (!templateId) {
      return data(
        { success: false, error: "Template ID is required" },
        { status: 400, headers },
      );
    }

    // Fetch the template to duplicate
    const templateToDuplicate = await retrieveTemplateFromDatabaseById({
      organizationId: organization.id,
      templateId,
    });

    if (!templateToDuplicate) {
      return data(
        { success: false, error: "Template not found" },
        { status: 404, headers },
      );
    }

    // Create a duplicate with a modified name
    const duplicateName = `${templateToDuplicate.name} (Copy)`;
    const duplicated = await createTemplateInDatabase({
      colorPalette: templateToDuplicate.colorPalette,
      globalStyles: templateToDuplicate.globalStyles,
      name: duplicateName,
      organizationId: organization.id,
      sections: templateToDuplicate.sections,
      type: templateToDuplicate.type,
      sourceTemplateId: templateToDuplicate.sourceTemplateId,
    });

    const toastHeaders = await createToastHeaders({
      description: "Your template has been duplicated.",
      title: "Template duplicated",
    });

    return data(
      { success: true, templateId: duplicated.id },
      {
        headers: {
          ...Object.fromEntries(headers),
          ...Object.fromEntries(toastHeaders),
        },
      },
    );
  }

  return data({ success: false, error: "Unknown action" }, { status: 400 });
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

const builderTypes = [
  {
    icon: Calculator,
    label: "Estimate",
    value: "estimate",
  },
  {
    icon: MessageSquareQuote,
    label: "Quote",
    value: "quote",
  },
  {
    icon: ShoppingCart,
    label: "Purchase Order",
    value: "purchase-order",
  },
  {
    icon: FileText,
    label: "Invoice",
    value: "invoice",
  },
  {
    icon: ClipboardList,
    label: "Sales Order",
    value: "sales-order",
  },
  {
    icon: BadgeCheck,
    label: "Order Confirmation",
    value: "order-confirmation",
  },
  {
    icon: Package,
    label: "Packing Slip",
    value: "packing-slip",
  },
  {
    icon: Truck,
    label: "Delivery Note",
    value: "delivery-note",
  },
  {
    icon: FilePenLine,
    label: "Contract",
    value: "contract",
  },
  {
    icon: Receipt,
    label: "Receipt",
    value: "receipt",
  },
] as const;

const VALID_BUILDER_TYPES = [
  "resume",
  "invoice",
  "certificate",
  "report-cards",
  "quote",
  "proposal",
  "contract",
  "purchase-order",
  "receipt",
  "sales-order",
  "order-confirmation",
  "packing-slip",
  "delivery-note",
  "estimate",
  "statement",
  "letter",
  "form",
  "label",
] as const;
type BuilderType = (typeof VALID_BUILDER_TYPES)[number];

export default function BuilderRoute({ loaderData }: Route.ComponentProps) {
  const [, setSearchParams] = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateSelectionModalOpen, setTemplateSelectionModalOpen] =
    useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null,
  );
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(
    null,
  );
  const [duplicatingTemplateId, setDuplicatingTemplateId] = useState<
    string | null
  >(null);
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { activeType, allDefaultTemplates, organizationSlug, savedTemplates } =
    loaderData;

  const handleTypeTabChange = (type: BuilderType) => {
    setSearchParams(
      (prev) => {
        prev.set("type", type);
        return prev;
      },
      { replace: true },
    );
  };

  const handleCreateNew = () => {
    setTemplateSelectionModalOpen(true);
  };

  const handleCustomize = (templateId: string, isDefault: boolean) => {
    const url = `/organizations/${organizationSlug}/templates/${templateId}?mode=customize&source=${templateId}`;
    navigate(url);
    if (isDefault) {
      setTemplateSelectionModalOpen(false);
    }
  };

  const handleDuplicate = async (templateId: string) => {
    setDuplicatingTemplateId(templateId);

    try {
      const formData = new FormData();
      formData.set("intent", "duplicate");
      formData.set("templateId", templateId);

      const response = await fetch(window.location.pathname, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();

        if (result.success) {
          // Revalidate to refresh the list with the new duplicated template
          revalidator.revalidate();
        } else {
          // Show error toast if duplication failed
          const errorMessage = result.error || "Failed to duplicate template";
          alert(errorMessage);
        }
      } else {
        alert("Failed to duplicate template. Please try again.");
      }
    } finally {
      setDuplicatingTemplateId(null);
    }
  };

  const handlePreview = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewTemplateId(templateId);
    setPreviewModalOpen(true);
  };

  const handleEdit = (templateId: string) => {
    const url = `/organizations/${organizationSlug}/templates/${templateId}?mode=edit`;
    navigate(url);
  };

  const handleDeleteClick = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    const formData = new FormData();
    formData.set("intent", "delete");
    formData.set("templateId", templateToDelete.id);

    await fetch(window.location.pathname, {
      method: "POST",
      body: formData,
    });

    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
    revalidator.revalidate();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Builder Type Sidebar */}
        <aside
          className={cn(
            "border-r bg-sidebar flex flex-col shrink-0 transition-all duration-200 ease-linear",
            isCollapsed ? "w-12" : "w-64",
          )}
        >
          <div
            className={cn(
              "border-b flex items-center transition-all duration-200",
              isCollapsed ? "justify-center p-2" : "justify-between p-4",
            )}
          >
            {!isCollapsed && (
              <h2 className="text-lg font-semibold">Template Types</h2>
            )}
            <Button
              className={cn("h-7 w-7", isCollapsed && "mx-auto")}
              data-testid="template-builder-collapse-sidebar-button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              size="icon"
              variant="ghost"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </span>
            </Button>
          </div>
          <nav className="flex-1 p-2">
            <div className="space-y-1">
              {builderTypes.map((type) => {
                const Icon = type.icon;
                const isActive = activeType === type.value;
                const button = (
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground",
                      isCollapsed && "justify-center px-2",
                    )}
                    data-testid={`template-type-button-${type.value}`}
                    key={type.value}
                    onClick={() =>
                      handleTypeTabChange(type.value as BuilderType)
                    }
                    type="button"
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span>{type.label}</span>}
                  </button>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={type.value}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right">{type.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return button;
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <section
          aria-label={`${activeType} templates`}
          className="flex-1 flex flex-col overflow-y-auto"
        >
          <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-2xl font-semibold"
                  data-testid="template-builder-heading"
                >
                  Template Builder
                </h1>
                <p
                  className="text-muted-foreground text-sm mt-1"
                  data-testid="template-builder-description"
                >
                  Manage your saved templates
                </p>
              </div>
              <Button
                data-testid="create-new-template-button"
                onClick={handleCreateNew}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>

            {/* Saved Templates Grid */}
            <TemplateGrid
              duplicatingTemplateId={duplicatingTemplateId}
              handleDeleteClick={handleDeleteClick}
              handleDuplicate={handleDuplicate}
              handleEdit={handleEdit}
              organizationSlug={organizationSlug}
              templates={savedTemplates}
            />
          </div>
        </section>
      </div>

      {/* Template Selection Modal */}
      <Dialog
        onOpenChange={setTemplateSelectionModalOpen}
        open={templateSelectionModalOpen}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
            <DialogDescription>
              Choose a template to customize and create your own version
            </DialogDescription>
          </DialogHeader>
          <TemplateSelectionModal
            activeType={activeType}
            allDefaultTemplates={allDefaultTemplates}
            handleCustomize={handleCustomize}
            handlePreview={handlePreview}
            organizationSlug={organizationSlug}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewTemplateId && (
        <DefaultTemplatePreviewModal
          onOpenChange={setPreviewModalOpen}
          open={previewModalOpen}
          organizationSlug={organizationSlug}
          templateId={previewTemplateId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function TemplateSelectionModal({
  activeType,
  allDefaultTemplates,
  handleCustomize,
  handlePreview,
  organizationSlug,
}: {
  activeType: BuilderType;
  allDefaultTemplates: Record<string, Template[]>;
  handleCustomize: (id: string, isDefault: boolean) => void;
  handlePreview: (id: string, e: React.MouseEvent) => void;
  organizationSlug: string;
}) {
  const templates = allDefaultTemplates[activeType] || [];

  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No templates available for this type.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card
              className="flex flex-col cursor-pointer hover:border-primary transition-colors"
              data-testid={`default-template-card-${template.id}`}
              key={template.id}
              onClick={() => handleCustomize(template.id, true)}
            >
              <CardHeader>
                <TemplatePreviewThumbnail
                  organizationSlug={organizationSlug}
                  template={template}
                />
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>
                  {template.type
                    ? template.type.charAt(0).toUpperCase() +
                      template.type.slice(1)
                    : "Template"}{" "}
                  Template
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter>
                <Button
                  className="w-full"
                  data-testid={`default-template-preview-button-${template.id}`}
                  onClick={(e) => handlePreview(template.id, e)}
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DefaultTemplatePreviewModal({
  onOpenChange,
  open,
  organizationSlug,
  templateId,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationSlug: string;
  templateId: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePreview = useCallback(async () => {
    if (!templateId) return;

    setIsGenerating(true);
    setPreviewUrl(null);

    try {
      const response = await fetch(
        `/organizations/${organizationSlug}/templates/${templateId}/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sections: {} }),
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.message ||
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Failed to generate preview",
        );
      }

      const html = await response.text();
      if (!html || html.trim().length === 0) {
        throw new Error("Received empty response from server");
      }

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      console.error("Error generating preview:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate preview. Please try again.";
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [templateId, organizationSlug]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onOpenChange(newOpen);
  };

  useEffect(() => {
    if (open && templateId && !previewUrl && !isGenerating) {
      handleGeneratePreview();
    }
  }, [open, templateId, previewUrl, isGenerating, handleGeneratePreview]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="w-[95vw]! max-w-[210mm]! h-[90vh]! flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
        </DialogHeader>

        {previewUrl ? (
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
            <iframe
              className="w-full h-full border-0"
              src={previewUrl}
              title="Template Preview"
            />
          </div>
        ) : (
          <div className="mt-4 border rounded-lg overflow-hidden p-8 text-center text-muted-foreground">
            {isGenerating ? (
              <p>Generating preview...</p>
            ) : (
              <p>Loading preview...</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateGrid({
  templates,
  organizationSlug,
  handleEdit,
  handleDeleteClick,
  handleDuplicate,
  duplicatingTemplateId,
}: {
  templates: Template[];
  organizationSlug: string;
  handleEdit: (id: string) => void;
  handleDeleteClick: (template: Template) => void;
  handleDuplicate: (id: string) => void;
  duplicatingTemplateId: string | null;
}) {
  if (templates.length === 0) {
    return (
      <div
        className="text-center py-12 text-muted-foreground"
        data-testid="no-templates-message"
      >
        <p>
          No saved templates yet. Click "Create New" to select a template and
          get started.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-6"
      data-testid="template-grid"
    >
      {templates
        .filter((template) => template?.id && template.name)
        .map((template) => (
          <Card
            className="flex flex-col"
            data-testid={`template-card-${template.id}`}
            key={template.id}
          >
            <CardHeader>
              <TemplatePreviewThumbnail
                organizationSlug={organizationSlug}
                template={template}
              />
              <CardTitle data-testid={`template-card-title-${template.id}`}>
                {template.name}
              </CardTitle>
              <CardDescription
                data-testid={`template-card-description-${template.id}`}
              >
                {template.type
                  ? template.type.charAt(0).toUpperCase() +
                    template.type.slice(1)
                  : "Template"}{" "}
                Template
                {template.updatedAt && (
                  <span className="block text-xs mt-1">
                    Last modified:{" "}
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            {/* Wraps instead of overflowing when the grid makes the card narrow. */}
            <CardFooter className="flex-wrap gap-2">
              <Button
                className="min-w-fit flex-1"
                data-testid={`template-edit-button-${template.id}`}
                onClick={() => handleEdit(template.id)}
                variant="default"
              >
                Open
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                className="min-w-fit flex-1"
                data-testid={`template-duplicate-button-${template.id}`}
                disabled={duplicatingTemplateId === template.id}
                onClick={() => handleDuplicate(template.id)}
                variant="outline"
              >
                {duplicatingTemplateId === template.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Duplicate
              </Button>
              <Button
                className="ml-auto shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid={`template-delete-button-${template.id}`}
                onClick={() => handleDeleteClick(template)}
                size="icon"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </CardFooter>
          </Card>
        ))}
    </div>
  );
}
