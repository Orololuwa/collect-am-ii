import type { DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ArrowLeft,
  Check,
  CloudOff,
  DownloadIcon,
  Eye,
  FileCode,
  Layers,
  Loader2,
  Mail,
  MinusIcon,
  MoreHorizontal,
  PlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { data, href, Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import type { Route } from "./+types/_index";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { getInstance } from "~/features/localization/i18next-middleware.server";
import { organizationMembershipContext } from "~/features/organizations/organizations-middleware.server";
import { ApiPayloadModal } from "~/features/templates/shared/components/api-payload-modal";
import { BuilderSectionsPanel } from "~/features/templates/shared/components/builder-sections-panel";
import { PreviewModal } from "~/features/templates/shared/components/preview-modal";
import { PropertiesPanel } from "~/features/templates/shared/components/properties-panel";
import { SendEmailModal } from "~/features/templates/shared/components/send-email-modal";
import { TemplateCanvas } from "~/features/templates/shared/components/template-canvas";
import { useBuilderStore } from "~/features/templates/shared/store/builder-store";
import { getTemplateTypeInfo } from "~/features/templates/shared/template-types";
import { getTemplateById } from "~/features/templates/shared/templates";
import {
  createTemplateInDatabase,
  retrieveTemplateFromDatabaseById,
  saveTemplateToDatabase,
} from "~/features/templates/shared/templates-model.server";
import type {
  Template,
  TemplateSection,
} from "~/features/templates/shared/types";
import { cn } from "~/lib/utils";
import { getPageTitle } from "~/utils/get-page-title.server";
import { validateFormData } from "~/utils/validate-form-data.server";

const saveTemplateSchema = z.object({
  globalStyles: z
    .union([z.record(z.string(), z.string()), z.string()])
    .transform((val) => {
      if (typeof val === "string") {
        return JSON.parse(val) as Record<string, string>;
      }
      return val;
    }),
  intent: z.literal("save"),
  name: z.string(),
  sections: z.union([z.array(z.any()), z.string()]).transform((val) => {
    if (typeof val === "string") {
      return JSON.parse(val) as unknown[];
    }
    return val;
  }),
  templateId: z.string().optional(),
  type: z.enum([
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
  ]),
  colorPalette: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === "string") {
        return JSON.parse(val) as string[];
      }
      return val;
    }),
});

const initTemplateSchema = z.object({
  intent: z.literal("init"),
  sourceTemplateId: z.string(),
  mode: z.enum(["edit", "customize"]),
});

const actionSchema = z.discriminatedUnion("intent", [
  saveTemplateSchema,
  initTemplateSchema,
]);

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const { organization } = context.get(organizationMembershipContext);
  const i18n = getInstance(context);
  const t = i18n.t.bind(i18n);
  const typedParams = params as {
    organizationSlug: string;
    templateId: string;
  };

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "edit";
  const source = url.searchParams.get("source");

  // Try to fetch from database first
  let template: Template | null = null;
  let isNewFromDefault = false;

  try {
    template = await retrieveTemplateFromDatabaseById({
      organizationId: organization.id,
      templateId: typedParams.templateId,
    });
  } catch {
    // If not found in database, fall back to predefined templates
  }

  // If mode=customize with source, we need to create a new template from source
  if (mode === "customize" && source && !template) {
    // Get source template (could be from DB or predefined)
    let sourceTemplate: Template | null = null;

    try {
      sourceTemplate = await retrieveTemplateFromDatabaseById({
        organizationId: organization.id,
        templateId: source,
      });
    } catch {
      // Try predefined
    }

    if (!sourceTemplate) {
      sourceTemplate = getTemplateById(source) || null;
    }

    if (sourceTemplate) {
      // Create a new template from the source
      template = await createTemplateInDatabase({
        colorPalette: sourceTemplate.colorPalette,
        globalStyles: sourceTemplate.globalStyles,
        name: `${sourceTemplate.name} (Copy)`,
        organizationId: organization.id,
        sections: sourceTemplate.sections,
        sourceTemplateId: sourceTemplate.id, // Store reference to source template
        type: sourceTemplate.type,
      });
      isNewFromDefault = true;
    }
  }

  // Fallback to predefined templates if not found in database (for viewing only)
  if (!template && mode === "edit") {
    template = getTemplateById(typedParams.templateId) || null;
  }

  // Load source template if available
  let sourceTemplate: Template | null = null;
  if (template?.sourceTemplateId) {
    sourceTemplate = getTemplateById(template.sourceTemplateId) || null;
    if (!sourceTemplate) {
      // Try to get from database
      try {
        sourceTemplate = await retrieveTemplateFromDatabaseById({
          organizationId: organization.id,
          templateId: template.sourceTemplateId,
        });
      } catch {
        // Source template not found, continue without it
      }
    }
  }

  return {
    breadcrumb: {
      title: t("organizations:templates.breadcrumb"),
      to: href("/organizations/:organizationSlug/templates/:templateId", {
        organizationSlug: typedParams.organizationSlug,
        templateId: typedParams.templateId,
      }),
    },
    isNewFromDefault,
    mode,
    organizationSlug: typedParams.organizationSlug,
    pageTitle: getPageTitle(t, "organizations:templates.pageTitle"),
    sourceTemplate,
    template,
    templateId: template?.id || typedParams.templateId,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { organization, headers } = context.get(organizationMembershipContext);

  const result = await validateFormData(request, actionSchema);

  if (!result.success) {
    console.error("Validation failed:", result.response);
    return result.response;
  }

  const { data: body } = result;

  switch (body.intent) {
    case "save": {
      const template: Omit<Template, "createdAt" | "updatedAt"> = {
        colorPalette: body.colorPalette || [],
        globalStyles: body.globalStyles as Record<string, string>,
        id: body.templateId || "",
        name: body.name,
        organizationId: organization.id,
        sections: body.sections as TemplateSection[],
        type: body.type,
      };

      const savedTemplate = await saveTemplateToDatabase({
        organizationId: organization.id,
        template,
      });

      return data({ success: true, template: savedTemplate }, { headers });
    }

    case "init": {
      // Handle initial template creation for customize mode
      // This is handled in the loader now, so just return success
      return data({ success: true }, { headers });
    }
  }
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData?.pageTitle },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

const ZOOM_LEVELS = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5];

function useExportPdf({
  currentTemplate,
  organizationSlug,
  templateId,
}: {
  currentTemplate: Template | null;
  organizationSlug: string;
  templateId: string | undefined;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = async () => {
    if (!currentTemplate || !templateId) return;

    setIsExporting(true);

    // Extract section data and create sections object keyed by section ID
    const sectionsData: Record<string, Record<string, unknown>> = {};
    currentTemplate.sections.forEach((section) => {
      sectionsData[section.id] = section.data;
    });

    try {
      const response = await fetch(
        `/organizations/${organizationSlug}/templates/${templateId}/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sections: sectionsData }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to export PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentTemplate.name || "template"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Couldn't download the PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportPdf, isExporting };
}

function SaveStatusText({
  status,
  lastSavedAt,
  onRetry,
}: {
  status: SaveStatus;
  lastSavedAt: Date | null;
  onRetry: () => void;
}) {
  return (
    <output
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap text-xs",
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
      data-testid="save-status-badge"
    >
      {status === "saving" ? (
        <>
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          Saving…
        </>
      ) : status === "error" ? (
        <>
          <CloudOff aria-hidden="true" className="size-3.5" />
          Couldn't save.
          <button
            className="font-medium underline underline-offset-2"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        </>
      ) : (
        <>
          <Check aria-hidden="true" className="size-3.5" />
          {status === "saved" || !lastSavedAt
            ? "Saved"
            : `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </>
      )}
    </output>
  );
}

export default function BuilderEditorRoute({
  loaderData,
}: Route.ComponentProps) {
  const params = useParams();
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [apiPayloadOpen, setApiPayloadOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [templateNotFound, setTemplateNotFound] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [sectionsPanelOpen, setSectionsPanelOpen] = useState(false);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const {
    currentTemplate,
    setCurrentTemplate,
    selectSection,
    selectedSectionId,
    setSourceTemplate,
    isDirty,
    setDirty,
    setTemplateSessionId,
    templateSessionId,
    updateTemplateId,
    updateTemplateName,
  } = useBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // Auto-save refs
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use params directly to ensure we get the latest templateId from the URL
  const templateId = params.templateId;
  const organizationSlug =
    params.organizationSlug || loaderData.organizationSlug;
  const templatesUrl = href("/organizations/:organizationSlug/templates", {
    organizationSlug,
  });
  const { exportPdf, isExporting } = useExportPdf({
    currentTemplate,
    organizationSlug,
    templateId,
  });

  // Auto-save function
  const performSave = useCallback(async () => {
    if (!currentTemplate || !templateSessionId) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setSaveStatus("saving");

    try {
      const formData = new FormData();
      formData.set("intent", "save");
      formData.set("templateId", templateSessionId);
      formData.set("name", currentTemplate.name.trim() || "Untitled template");
      formData.set("type", currentTemplate.type || "resume");
      formData.set("sections", JSON.stringify(currentTemplate.sections || []));
      formData.set(
        "globalStyles",
        JSON.stringify(currentTemplate.globalStyles || {}),
      );
      if (currentTemplate.colorPalette) {
        formData.set(
          "colorPalette",
          JSON.stringify(currentTemplate.colorPalette),
        );
      }

      // Use pathname only to avoid duplicate requests from query params
      const response = await fetch(window.location.pathname, {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (response.ok) {
        // Try to parse JSON, but don't fail if response is not JSON
        let result: { template?: { id?: string } } = {};
        try {
          const text = await response.text();
          if (text) {
            result = JSON.parse(text);
          }
        } catch {
          // Response may not be JSON (e.g., redirect response)
        }

        // Update template ID if it changed (new template created)
        if (result.template?.id && result.template.id !== templateSessionId) {
          updateTemplateId(result.template.id);
          setTemplateSessionId(result.template.id);
        }
        setSaveStatus("saved");
        setLastSavedAt(new Date());
        setDirty(false);
        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus((current) => (current === "saved" ? "idle" : current));
        }, 2000);
      } else {
        console.error(
          "Auto-save failed:",
          response.status,
          response.statusText,
        );
        setSaveStatus("error");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Auto-save error:", error);
      setSaveStatus("error");
    }
  }, [
    currentTemplate,
    templateSessionId,
    setDirty,
    updateTemplateId,
    setTemplateSessionId,
  ]);

  // Trigger auto-save when template changes
  useEffect(() => {
    if (!isDirty || !templateSessionId) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce for 1 second
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, templateSessionId, performSave]);

  // Load template on mount from loader data
  useEffect(() => {
    if (!templateId) return;

    const template = loaderData.template;

    if (template) {
      // Determine currency for document types with monetary amounts
      let currencyToUse: string | undefined = template.globalStyles.currency as
        | string
        | undefined;

      if (getTemplateTypeInfo(template.type)?.usedInDeals && !currencyToUse) {
        currencyToUse = "USD";
      }

      const editableTemplate = {
        ...template,
        organizationId: organizationSlug || "",
        globalStyles: {
          ...template.globalStyles,
          ...(currencyToUse ? { currency: currencyToUse } : {}),
        },
      };

      setCurrentTemplate(editableTemplate);
      setSourceTemplate(loaderData.sourceTemplate || null);
      setTemplateSessionId(template.id);
      selectSection(null);
      setTemplateNotFound(false);
      setPropertiesPanelOpen(false);
      setSectionsPanelOpen(false);

      // If it's a new template from customize, redirect to the new URL
      if (loaderData.isNewFromDefault && template.id !== templateId) {
        navigate(
          `/organizations/${organizationSlug}/templates/${template.id}?mode=edit`,
          { replace: true },
        );
      }
    } else {
      setTemplateNotFound(true);
    }
  }, [
    templateId,
    organizationSlug,
    loaderData.template,
    loaderData.isNewFromDefault,
    loaderData.sourceTemplate,
    setCurrentTemplate,
    setSourceTemplate,
    selectSection,
    setTemplateSessionId,
    navigate,
  ]);

  // Open properties panel sheet on mobile when section is selected
  useEffect(() => {
    if (selectedSectionId) {
      const isMobile = window.innerWidth < 768; // md breakpoint
      if (isMobile) {
        setPropertiesPanelOpen(true);
        setSectionsPanelOpen(false);
      }
    } else {
      setPropertiesPanelOpen(false);
    }
  }, [selectedSectionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (templateNotFound) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h2 className="mb-2 font-semibold text-xl">Template not found</h2>
          <p className="mb-4 text-muted-foreground">
            It may have been deleted.
          </p>
          <Button asChild variant="outline">
            <Link to={templatesUrl}>Back to templates</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!currentTemplate) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const typeInfo = getTemplateTypeInfo(currentTemplate.type);
  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);

  const finish = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (isDirty) {
      await performSave();
    }
    navigate(templatesUrl);
  };

  return (
    <DndContext onDragStart={handleDragStart} sensors={sensors}>
      <div className="flex h-[calc(100svh-var(--header-height))] min-h-0 min-w-0 flex-col overflow-hidden md:h-[calc(100svh-var(--header-height)-1rem)]">
        {/* Top bar */}
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background px-3 py-2.5 md:px-4">
          <Button
            asChild
            className="shrink-0 text-muted-foreground"
            size="sm"
            variant="ghost"
          >
            <Link to={templatesUrl}>
              <ArrowLeft aria-hidden="true" />
              <span className="hidden sm:inline">Templates</span>
              <span className="sr-only sm:hidden">Back to templates</span>
            </Link>
          </Button>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="min-w-0 flex-1 md:flex-none">
              <input
                aria-label="Template name"
                className="w-full min-w-0 truncate rounded-md border border-transparent bg-transparent px-2 py-1 font-semibold text-base outline-none transition-colors hover:border-input focus:border-ring focus:ring-2 focus:ring-ring/30 md:w-72"
                data-testid="template-editor-title"
                maxLength={120}
                onBlur={(event) => {
                  if (!event.target.value.trim()) {
                    updateTemplateName("Untitled template");
                  }
                }}
                onChange={(event) => updateTemplateName(event.target.value)}
                value={currentTemplate.name}
              />
            </h1>
            {typeInfo ? (
              <Badge
                className="hidden gap-1 sm:inline-flex"
                variant="secondary"
              >
                <typeInfo.icon aria-hidden="true" className="size-3" />
                {typeInfo.label}
              </Badge>
            ) : null}
            {loaderData.template?.isDefault ? (
              <Badge className="hidden bg-primary/10 text-primary sm:inline-flex">
                Default
              </Badge>
            ) : null}
            <div className="hidden lg:block">
              <SaveStatusText
                lastSavedAt={lastSavedAt}
                onRetry={() => performSave()}
                status={saveStatus}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <fieldset
              aria-label="Zoom"
              className="mr-1 hidden items-center rounded-md border xl:flex"
            >
              <Button
                aria-label="Zoom out"
                className="rounded-r-none"
                disabled={zoomIndex <= 0}
                onClick={() => setZoom(ZOOM_LEVELS[zoomIndex - 1] ?? zoom)}
                size="icon-sm"
                variant="ghost"
              >
                <MinusIcon aria-hidden="true" />
              </Button>
              <button
                className="w-12 text-center font-medium text-xs tabular-nums"
                onClick={() => setZoom(1)}
                title="Reset zoom"
                type="button"
              >
                {Math.round(zoom * 100)}%
              </button>
              <Button
                aria-label="Zoom in"
                className="rounded-l-none"
                disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
                onClick={() => setZoom(ZOOM_LEVELS[zoomIndex + 1] ?? zoom)}
                size="icon-sm"
                variant="ghost"
              >
                <PlusIcon aria-hidden="true" />
              </Button>
            </fieldset>
            <Button
              className="lg:hidden"
              data-testid="mobile-component-palette-button"
              onClick={() => setSectionsPanelOpen(true)}
              size="sm"
              variant="outline"
            >
              <Layers aria-hidden="true" />
              <span className="hidden sm:inline">Sections</span>
            </Button>
            <Button
              data-testid="preview-button"
              onClick={() => setPreviewOpen(true)}
              size="sm"
              variant="outline"
            >
              <Eye aria-hidden="true" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              className="hidden md:inline-flex"
              data-testid="export-button"
              disabled={isExporting}
              onClick={() => exportPdf()}
              size="sm"
              variant="outline"
            >
              {isExporting ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <DownloadIcon aria-hidden="true" />
              )}
              Download PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="More actions"
                  data-testid="actions-button"
                  size="icon-sm"
                  variant="ghost"
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  className="md:hidden"
                  disabled={isExporting}
                  onSelect={() => exportPdf()}
                >
                  <DownloadIcon aria-hidden="true" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="send-email-button"
                  onSelect={() => setSendEmailOpen(true)}
                >
                  <Mail aria-hidden="true" />
                  Send a test email
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="api-payload-button"
                  onSelect={() => setApiPayloadOpen(true)}
                >
                  <FileCode aria-hidden="true" />
                  API details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={finish} size="sm">
              Done
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Left: sections and document style */}
          <aside
            aria-label="Sections and style"
            className="hidden w-64 shrink-0 border-r bg-background lg:flex"
          >
            <BuilderSectionsPanel className="w-full" />
          </aside>

          <TemplateCanvas zoom={zoom} />

          {/* Right: the selected section's content */}
          <div className="hidden md:block">
            <PropertiesPanel />
          </div>
        </div>

        {/* Below lg: sections and style in a drawer */}
        <Sheet onOpenChange={setSectionsPanelOpen} open={sectionsPanelOpen}>
          <SheetContent className="w-72 p-0" side="left">
            <SheetHeader className="border-b">
              <SheetTitle>Sections and style</SheetTitle>
            </SheetHeader>
            <BuilderSectionsPanel className="flex-1" />
          </SheetContent>
        </Sheet>

        {/* Mobile: Sheet drawer for Properties Panel */}
        {selectedSectionId && (
          <Sheet
            onOpenChange={(open) => {
              setPropertiesPanelOpen(open);
              if (!open) {
                selectSection(null);
              }
            }}
            open={propertiesPanelOpen}
          >
            <SheetContent className="w-full p-0 sm:w-80">
              <PropertiesPanel />
            </SheetContent>
          </Sheet>
        )}

        <PreviewModal onOpenChange={setPreviewOpen} open={previewOpen} />
        <SendEmailModal onOpenChange={setSendEmailOpen} open={sendEmailOpen} />
        <ApiPayloadModal
          onOpenChange={setApiPayloadOpen}
          open={apiPayloadOpen}
        />
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="rounded-lg border-2 border-primary bg-background p-3 opacity-80 shadow-xl">
            <span className="font-medium text-sm">Moving section…</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
