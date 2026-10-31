import { InfoIcon, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { getSectionInfo } from "../section-info";
import { useBuilderStore } from "../store/builder-store";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  InvoiceItem,
  LanguageEntry,
  ProjectEntry,
  SocialLink,
} from "../types";
import {
  calculateDiscount,
  calculateTax,
  calculateTotal,
  recalculateFooterFromItems,
} from "../utils/calculations";
import { CurrencyInput, NumberInput, QuantityInput } from "./number-input";
import { SectionColorPaletteEditor } from "./section-color-palette-editor";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// Inline Rich Text Editor Component
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

function RichTextEditor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [ReactQuill, setReactQuill] =
    useState<React.ComponentType<ReactQuillProps> | null>(null);
  const [isMounted, setIsMounted] = useState(false);

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

  if (!isMounted) {
    return (
      <div className="min-h-[200px] p-4 border rounded bg-muted animate-pulse">
        <p className="text-sm text-muted-foreground">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="border rounded-md overflow-hidden bg-background">
        {ReactQuill ? (
          <>
            <ReactQuill
              modules={quillOptions}
              onChange={onChange}
              style={{ minHeight: "200px" }}
              theme="snow"
              value={value}
            />
            <style>{`
              /* Light mode - use default snow theme colors */
              .ql-container,
              .ql-toolbar,
              .ql-editor {
                pointer-events: auto !important;
              }

              /* Dark mode - apply dark theme */
              .dark .ql-snow {
                background-color: #1f2937 !important;
                border-color: #374151 !important;
              }
              .dark .ql-toolbar {
                background-color: #1f2937 !important;
                border-color: #374151 !important;
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
                border-color: #374151 !important;
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
            <p className="text-sm text-muted-foreground">Loading editor...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { currentTemplate, selectedSectionId, updateSection, selectSection } =
    useBuilderStore();

  const section = currentTemplate?.sections.find(
    (s) => s.id === selectedSectionId,
  );

  if (!section) {
    return (
      <div
        className="h-full w-80 bg-muted/30 border-l border-border p-4 md:p-6 hidden md:block"
        data-testid="properties-panel"
      >
        <div className="text-center text-muted-foreground">
          <p className="text-sm">
            Click a part of the page, or pick a section on the left, to edit it.
          </p>
        </div>
      </div>
    );
  }

  const sectionInfo = currentTemplate
    ? getSectionInfo(currentTemplate.type, section.type)
    : null;

  const updateData = (key: string, value: unknown) => {
    updateSection(section.id, {
      data: { ...section.data, [key]: value },
    });
  };

  // Helper function to calculate subtotal from items and update footer
  const calculateAndUpdateSubtotal = (items: InvoiceItem[]) => {
    if (!currentTemplate) return;

    const footerSection = currentTemplate.sections.find(
      (s) =>
        s.type === "invoice-footer" ||
        s.type === "receipt-footer" ||
        s.type === "quote-footer" ||
        s.type === "estimate-footer" ||
        s.type === "purchase-order-footer" ||
        s.type === "sales-order-footer" ||
        s.type === "order-confirmation-footer",
    );

    if (footerSection) {
      const updatedFooter = recalculateFooterFromItems(
        items,
        footerSection.data,
      );
      updateSection(footerSection.id, { data: updatedFooter });
    }
  };

  const renderContentEditor = () => {
    switch (section.type) {
      case "header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="name">
                Name
              </Label>
              <Input
                className="mt-1"
                id="name"
                onChange={(e) => updateData("name", e.target.value)}
                placeholder="Full Name"
                value={String(section.data.name || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="title">
                Title
              </Label>
              <Input
                className="mt-1"
                id="title"
                onChange={(e) => updateData("title", e.target.value)}
                placeholder="Job Title"
                value={String(section.data.title || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="contact">
                Contact
              </Label>
              <Input
                className="mt-1"
                id="contact"
                onChange={(e) => updateData("contact", e.target.value)}
                placeholder="Contact information"
                value={String(section.data.contact || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="email">
                Email
              </Label>
              <Input
                className="mt-1"
                id="email"
                onChange={(e) => updateData("email", e.target.value)}
                placeholder="email@example.com"
                type="email"
                value={String(section.data.email || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="phone">
                Phone
              </Label>
              <Input
                className="mt-1"
                id="phone"
                onChange={(e) => updateData("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                value={String(section.data.phone || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="location">
                Location
              </Label>
              <Input
                className="mt-1"
                id="location"
                onChange={(e) => updateData("location", e.target.value)}
                placeholder="City, State"
                value={String(section.data.location || "")}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Social Links</Label>
                <Button
                  onClick={() => {
                    const socialLinks = Array.isArray(section.data.socialLinks)
                      ? [...(section.data.socialLinks as SocialLink[])]
                      : [];
                    updateData("socialLinks", [
                      ...socialLinks,
                      { link: "", name: "" },
                    ]);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Link
                </Button>
              </div>
              <div className="space-y-2">
                {Array.isArray(section.data.socialLinks) &&
                  (section.data.socialLinks as SocialLink[]).map(
                    (link, idx) => (
                      <div
                        className="p-3 border rounded-lg space-y-2 bg-background"
                        key={`${section.id}-social-${idx}`}
                      >
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">
                            Link {idx + 1}
                          </Label>
                          <Button
                            onClick={() => {
                              const socialLinks = Array.isArray(
                                section.data.socialLinks,
                              )
                                ? [
                                    ...(section.data
                                      .socialLinks as SocialLink[]),
                                  ]
                                : [];
                              updateData(
                                "socialLinks",
                                socialLinks.filter((_, i) => i !== idx),
                              );
                            }}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div>
                          <Label
                            className="text-xs"
                            htmlFor={`social-name-${idx}`}
                          >
                            Name
                          </Label>
                          <Input
                            className="mt-1"
                            id={`social-name-${idx}`}
                            onChange={(e) => {
                              const socialLinks = Array.isArray(
                                section.data.socialLinks,
                              )
                                ? [
                                    ...(section.data
                                      .socialLinks as SocialLink[]),
                                  ]
                                : [];
                              socialLinks[idx] = {
                                link: socialLinks[idx]?.link || "",
                                name: e.target.value,
                              };
                              updateData("socialLinks", socialLinks);
                            }}
                            placeholder="LinkedIn"
                            value={link.name || ""}
                          />
                        </div>
                        <div>
                          <Label
                            className="text-xs"
                            htmlFor={`social-link-${idx}`}
                          >
                            URL
                          </Label>
                          <Input
                            className="mt-1"
                            id={`social-link-${idx}`}
                            onChange={(e) => {
                              const socialLinks = Array.isArray(
                                section.data.socialLinks,
                              )
                                ? [
                                    ...(section.data
                                      .socialLinks as SocialLink[]),
                                  ]
                                : [];
                              socialLinks[idx] = {
                                link: e.target.value,
                                name: socialLinks[idx]?.name || "",
                              };
                              updateData("socialLinks", socialLinks);
                            }}
                            placeholder="https://linkedin.com/in/username"
                            type="url"
                            value={link.link || ""}
                          />
                        </div>
                      </div>
                    ),
                  )}
              </div>
            </div>
          </div>
        );
      }

      case "summary": {
        return (
          <div className="space-y-4">
            <RichTextEditor
              label="Summary Content"
              onChange={(value) => updateData("content", value)}
              value={String(section.data.content || "")}
            />
          </div>
        );
      }

      case "experience": {
        const entries = (
          Array.isArray(section.data.entries) ? section.data.entries : []
        ) as ExperienceEntry[];

        const addEntry = () => {
          const newEntry: ExperienceEntry = {
            company: "" as string,
            description: "" as string,
            endDate: "" as string,
            position: "" as string,
            startDate: "" as string,
          };
          updateData("entries", [...entries, newEntry]);
        };

        const updateEntry = (index: number, field: string, value: string) => {
          const updated = [...entries];
          updated[index] = {
            ...updated[index],
            [field]: value,
          } as ExperienceEntry;
          updateData("entries", updated);
        };

        const deleteEntry = (index: number) => {
          const updated = entries.filter((_, i) => i !== index);
          updateData("entries", updated);
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Work Experience</Label>
              <Button
                onClick={addEntry}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </Button>
            </div>
            {entries.map((entry, idx) => (
              <div
                className="p-3 border rounded-lg space-y-3 bg-background"
                key={`${section.id}-experience-${idx}`}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Entry {idx + 1}</Label>
                  <Button
                    onClick={() => deleteEntry(idx)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`exp-company-${idx}`}>
                    Company
                  </Label>
                  <Input
                    className="mt-1"
                    id={`exp-company-${idx}`}
                    onChange={(e) =>
                      updateEntry(idx, "company", e.target.value)
                    }
                    placeholder="Company Name"
                    value={entry.company || ""}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`exp-position-${idx}`}>
                    Position
                  </Label>
                  <Input
                    className="mt-1"
                    id={`exp-position-${idx}`}
                    onChange={(e) =>
                      updateEntry(idx, "position", e.target.value)
                    }
                    placeholder="Job Title"
                    value={entry.position || ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs" htmlFor={`exp-start-${idx}`}>
                      Start Date
                    </Label>
                    <Input
                      className="mt-1"
                      id={`exp-start-${idx}`}
                      onChange={(e) =>
                        updateEntry(idx, "startDate", e.target.value)
                      }
                      placeholder="2020"
                      value={entry.startDate || ""}
                    />
                  </div>
                  <div>
                    <Label className="text-xs" htmlFor={`exp-end-${idx}`}>
                      End Date
                    </Label>
                    <Input
                      className="mt-1"
                      id={`exp-end-${idx}`}
                      onChange={(e) =>
                        updateEntry(idx, "endDate", e.target.value)
                      }
                      placeholder="Present"
                      value={entry.endDate || ""}
                    />
                  </div>
                </div>
                <div>
                  <RichTextEditor
                    label="Description"
                    onChange={(value) => updateEntry(idx, "description", value)}
                    value={entry.description || ""}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "education": {
        const entries = (
          Array.isArray(section.data.entries) ? section.data.entries : []
        ) as EducationEntry[];

        const addEntry = () => {
          const newEntry: EducationEntry = {
            degree: "" as string,
            institution: "" as string,
            year: "" as string,
          };
          updateData("entries", [...entries, newEntry]);
        };

        const updateEntry = (index: number, field: string, value: string) => {
          const updated = [...entries];
          updated[index] = {
            ...updated[index],
            [field]: value,
          } as EducationEntry;
          updateData("entries", updated);
        };

        const deleteEntry = (index: number) => {
          const updated = entries.filter((_, i) => i !== index);
          updateData("entries", updated);
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Education</Label>
              <Button
                onClick={addEntry}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </Button>
            </div>
            {entries.map((entry, idx) => (
              <div
                className="p-3 border rounded-lg space-y-3 bg-background"
                key={`${section.id}-education-${idx}`}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Entry {idx + 1}</Label>
                  <Button
                    onClick={() => deleteEntry(idx)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`edu-institution-${idx}`}>
                    Institution
                  </Label>
                  <Input
                    className="mt-1"
                    id={`edu-institution-${idx}`}
                    onChange={(e) =>
                      updateEntry(idx, "institution", e.target.value)
                    }
                    placeholder="University Name"
                    value={entry.institution || ""}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`edu-degree-${idx}`}>
                    Degree
                  </Label>
                  <Input
                    className="mt-1"
                    id={`edu-degree-${idx}`}
                    onChange={(e) => updateEntry(idx, "degree", e.target.value)}
                    placeholder="Degree Name"
                    value={entry.degree || ""}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`edu-year-${idx}`}>
                    Year
                  </Label>
                  <Input
                    className="mt-1"
                    id={`edu-year-${idx}`}
                    onChange={(e) => updateEntry(idx, "year", e.target.value)}
                    placeholder="2020"
                    value={entry.year || ""}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "skills": {
        const items = Array.isArray(section.data.items)
          ? section.data.items
          : [];
        const category = String(section.data.category || "");

        const addSkill = () => {
          updateData("items", [...items, ""]);
        };

        const updateSkill = (index: number, value: string) => {
          const updated = [...items];
          updated[index] = value;
          updateData("items", updated);
        };

        const deleteSkill = (index: number) => {
          const updated = items.filter((_, i) => i !== index);
          updateData("items", updated);
        };

        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="category">
                Category
              </Label>
              <Input
                className="mt-1"
                id="category"
                onChange={(e) => updateData("category", e.target.value)}
                placeholder="Technical Skills"
                value={category}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Skills</Label>
                <Button
                  onClick={addSkill}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Skill
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((skill, idx) => (
                  <div
                    className="flex gap-2"
                    key={`${section.id}-skill-${idx}`}
                  >
                    <Input
                      className="flex-1"
                      onChange={(e) => updateSkill(idx, e.target.value)}
                      placeholder="Skill name"
                      value={String(skill || "")}
                    />
                    <Button
                      onClick={() => deleteSkill(idx)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case "certifications": {
        const entries = (
          Array.isArray(section.data.entries) ? section.data.entries : []
        ) as CertificationEntry[];

        const addEntry = () => {
          const newEntry: CertificationEntry = {
            date: "",
            issuer: "",
            link: "",
            name: "",
          };
          updateData("entries", [...entries, newEntry]);
        };

        const updateEntry = (index: number, field: string, value: string) => {
          const updated = [...entries];
          updated[index] = {
            ...updated[index],
            [field]: value,
          } as CertificationEntry;
          updateData("entries", updated);
        };

        const deleteEntry = (index: number) => {
          const updated = entries.filter((_, i) => i !== index);
          updateData("entries", updated);
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Certifications</Label>
              <Button
                onClick={addEntry}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </Button>
            </div>
            {entries.map((entry, idx) => (
              <div
                className="p-3 border rounded-lg space-y-3 bg-background"
                key={`${section.id}-certification-${idx}`}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Entry {idx + 1}</Label>
                  <Button
                    onClick={() => deleteEntry(idx)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`cert-name-${idx}`}>
                    Certification Name
                  </Label>
                  <Input
                    className="mt-1"
                    id={`cert-name-${idx}`}
                    onChange={(e) => updateEntry(idx, "name", e.target.value)}
                    placeholder="AWS Certified Solutions Architect"
                    value={entry.name || ""}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`cert-issuer-${idx}`}>
                    Issuer
                  </Label>
                  <Input
                    className="mt-1"
                    id={`cert-issuer-${idx}`}
                    onChange={(e) => updateEntry(idx, "issuer", e.target.value)}
                    placeholder="Amazon Web Services"
                    value={entry.issuer || ""}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`cert-date-${idx}`}>
                    Date
                  </Label>
                  <Input
                    className="mt-1"
                    id={`cert-date-${idx}`}
                    onChange={(e) => updateEntry(idx, "date", e.target.value)}
                    placeholder="2023"
                    value={entry.date || ""}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`cert-link-${idx}`}>
                    Link (Optional)
                  </Label>
                  <Input
                    className="mt-1"
                    id={`cert-link-${idx}`}
                    onChange={(e) => updateEntry(idx, "link", e.target.value)}
                    placeholder="https://www.credly.com/badges/..."
                    type="url"
                    value={entry.link || ""}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "projects": {
        const entries = (
          Array.isArray(section.data.entries) ? section.data.entries : []
        ) as ProjectEntry[];

        const addEntry = () => {
          const newEntry: ProjectEntry = {
            date: "",
            description: "",
            link: "",
            name: "",
            technologies: [],
          };
          updateData("entries", [...entries, newEntry]);
        };

        const updateEntry = (
          index: number,
          field: string,
          value: string | string[],
        ) => {
          const updated = [...entries];
          updated[index] = {
            ...updated[index],
            [field]: value,
          } as ProjectEntry;
          updateData("entries", updated);
        };

        const deleteEntry = (index: number) => {
          const updated = entries.filter((_, i) => i !== index);
          updateData("entries", updated);
        };

        const addTechnology = (index: number) => {
          const entry = entries[index];
          if (!entry) return;
          const technologies = Array.isArray(entry.technologies)
            ? [...entry.technologies]
            : [];
          updateEntry(index, "technologies", [...technologies, ""]);
        };

        const updateTechnology = (
          entryIndex: number,
          techIndex: number,
          value: string,
        ) => {
          const entry = entries[entryIndex];
          if (!entry) return;
          const technologies = Array.isArray(entry.technologies)
            ? [...entry.technologies]
            : [];
          technologies[techIndex] = value;
          updateEntry(entryIndex, "technologies", technologies);
        };

        const deleteTechnology = (entryIndex: number, techIndex: number) => {
          const entry = entries[entryIndex];
          if (!entry) return;
          const technologies = Array.isArray(entry.technologies)
            ? [...entry.technologies]
            : [];
          updateEntry(
            entryIndex,
            "technologies",
            technologies.filter((_, i) => i !== techIndex),
          );
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Projects</Label>
              <Button
                onClick={addEntry}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </Button>
            </div>
            {entries.map((entry, idx) => (
              <div
                className="p-3 border rounded-lg space-y-3 bg-background"
                key={`${section.id}-project-${idx}`}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Entry {idx + 1}</Label>
                  <Button
                    onClick={() => deleteEntry(idx)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`project-name-${idx}`}>
                    Project Name
                  </Label>
                  <Input
                    className="mt-1"
                    id={`project-name-${idx}`}
                    onChange={(e) => updateEntry(idx, "name", e.target.value)}
                    placeholder="E-commerce Platform"
                    value={entry.name || ""}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`project-date-${idx}`}>
                    Date
                  </Label>
                  <Input
                    className="mt-1"
                    id={`project-date-${idx}`}
                    onChange={(e) => updateEntry(idx, "date", e.target.value)}
                    placeholder="2023"
                    value={entry.date || ""}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`project-link-${idx}`}>
                    Link (Optional)
                  </Label>
                  <Input
                    className="mt-1"
                    id={`project-link-${idx}`}
                    onChange={(e) => updateEntry(idx, "link", e.target.value)}
                    placeholder="https://github.com/user/project"
                    type="url"
                    value={entry.link || ""}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-medium">Technologies</Label>
                    <Button
                      onClick={() => addTechnology(idx)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Technology
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {Array.isArray(entry.technologies) &&
                      entry.technologies.map((tech, techIdx) => (
                        <div
                          className="flex gap-2"
                          key={`${section.id}-project-${idx}-tech-${techIdx}`}
                        >
                          <Input
                            className="flex-1"
                            onChange={(e) =>
                              updateTechnology(idx, techIdx, e.target.value)
                            }
                            placeholder="React"
                            value={String(tech || "")}
                          />
                          <Button
                            onClick={() => deleteTechnology(idx, techIdx)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <RichTextEditor
                    label="Description"
                    onChange={(value) => updateEntry(idx, "description", value)}
                    value={entry.description || ""}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "languages": {
        const entries = (
          Array.isArray(section.data.entries) ? section.data.entries : []
        ) as LanguageEntry[];

        const addEntry = () => {
          const newEntry: LanguageEntry = {
            language: "",
            proficiency: "Intermediate",
          };
          updateData("entries", [...entries, newEntry]);
        };

        const updateEntry = (index: number, field: string, value: string) => {
          const updated = [...entries];
          updated[index] = {
            ...updated[index],
            [field]: value,
          } as LanguageEntry;
          updateData("entries", updated);
        };

        const deleteEntry = (index: number) => {
          const updated = entries.filter((_, i) => i !== index);
          updateData("entries", updated);
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Languages</Label>
              <Button
                onClick={addEntry}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </Button>
            </div>
            {entries.map((entry, idx) => (
              <div
                className="p-3 border rounded-lg space-y-3 bg-background"
                key={`${section.id}-language-${idx}`}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Entry {idx + 1}</Label>
                  <Button
                    onClick={() => deleteEntry(idx)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`lang-name-${idx}`}>
                    Language
                  </Label>
                  <Input
                    className="mt-1"
                    id={`lang-name-${idx}`}
                    onChange={(e) =>
                      updateEntry(idx, "language", e.target.value)
                    }
                    placeholder="English"
                    value={entry.language || ""}
                  />
                </div>
                <div>
                  <Label
                    className="text-xs"
                    htmlFor={`lang-proficiency-${idx}`}
                  >
                    Proficiency
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      updateEntry(idx, "proficiency", value)
                    }
                    value={entry.proficiency}
                  >
                    <SelectTrigger
                      className="mt-1"
                      id={`lang-proficiency-${idx}`}
                    >
                      <SelectValue placeholder="Select proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                      <SelectItem value="Fluent">Fluent</SelectItem>
                      <SelectItem value="Native">Native</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "invoice-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="companyLogo">
                Company Logo URL
              </Label>
              <Input
                className="mt-1"
                id="companyLogo"
                onChange={(e) => updateData("companyLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={String(section.data.companyLogo || "")}
              />
              {Boolean(section.data.companyLogo) && (
                <div className="mt-2">
                  <img
                    alt="Logo Preview"
                    className="h-12 object-contain border rounded"
                    src={String(section.data.companyLogo)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyName">
                Company Name
              </Label>
              <Input
                className="mt-1"
                id="companyName"
                onChange={(e) => updateData("companyName", e.target.value)}
                placeholder="Your Company Name"
                value={String(section.data.companyName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyAddress">
                Company Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="companyAddress"
                onChange={(e) => updateData("companyAddress", e.target.value)}
                placeholder="123 Business St&#10;City, State 12345"
                value={String(section.data.companyAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyEmail">
                Company Email
              </Label>
              <Input
                className="mt-1"
                id="companyEmail"
                onChange={(e) => updateData("companyEmail", e.target.value)}
                placeholder="contact@company.com"
                type="email"
                value={String(section.data.companyEmail || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyPhone">
                Company Phone
              </Label>
              <Input
                className="mt-1"
                id="companyPhone"
                onChange={(e) => updateData("companyPhone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                type="tel"
                value={String(section.data.companyPhone || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="invoiceNumber">
                Invoice Number
              </Label>
              <Input
                className="mt-1"
                id="invoiceNumber"
                onChange={(e) => updateData("invoiceNumber", e.target.value)}
                placeholder="INV-001"
                value={String(section.data.invoiceNumber || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="invoiceDate">
                Invoice Date
              </Label>
              <Input
                className="mt-1"
                id="invoiceDate"
                onChange={(e) => updateData("invoiceDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.invoiceDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="dueDate">
                Due Date
              </Label>
              <Input
                className="mt-1"
                id="dueDate"
                onChange={(e) => updateData("dueDate", e.target.value)}
                placeholder="02/15/2024"
                value={String(section.data.dueDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToName">
                Bill To Name
              </Label>
              <Input
                className="mt-1"
                id="billToName"
                onChange={(e) => updateData("billToName", e.target.value)}
                placeholder="Client Name"
                value={String(section.data.billToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToAddress">
                Bill To Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="billToAddress"
                onChange={(e) => updateData("billToAddress", e.target.value)}
                placeholder="456 Client Ave&#10;City, State 67890"
                value={String(section.data.billToAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToName">
                Ship To Name (Optional)
              </Label>
              <Input
                className="mt-1"
                id="shipToName"
                onChange={(e) => updateData("shipToName", e.target.value)}
                placeholder="Shipping Name"
                value={String(section.data.shipToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToAddress">
                Ship To Address (Optional)
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="shipToAddress"
                onChange={(e) => updateData("shipToAddress", e.target.value)}
                placeholder="789 Shipping St&#10;City, State 54321"
                value={String(section.data.shipToAddress || "")}
              />
            </div>
          </div>
        );
      }

      case "quote-items":
      case "estimate-items":
      case "invoice-items":
      case "purchase-order-items":
      case "sales-order-items":
      case "order-confirmation-items":
      case "packing-slip-items":
      case "delivery-note-items": {
        const items = (
          Array.isArray(section.data.items) ? section.data.items : []
        ) as InvoiceItem[];

        const addItem = () => {
          const newItem: InvoiceItem = {
            description: "",
            quantity: "1",
            unitPrice: "0.00",
            total: "0.00",
          };
          const newItems = [...items, newItem];
          updateData("items", newItems);
          // Auto-calculate subtotal in footer
          calculateAndUpdateSubtotal(newItems);
        };

        const deleteItem = (idx: number) => {
          const newItems = items.filter((_, i) => i !== idx);
          updateData("items", newItems);
          // Auto-calculate subtotal in footer
          calculateAndUpdateSubtotal(newItems);
        };

        const updateItem = (
          idx: number,
          field: keyof InvoiceItem,
          value: string,
        ) => {
          const newItems = [...items];
          if (newItems[idx]) {
            newItems[idx] = { ...newItems[idx], [field]: value };
            // Auto-calculate total if quantity or unitPrice changes
            if (field === "quantity" || field === "unitPrice") {
              const qty = Number.parseFloat(newItems[idx].quantity || "0");
              const price = Number.parseFloat(newItems[idx].unitPrice || "0");
              newItems[idx].total = (qty * price).toFixed(2);
            }
          }
          updateData("items", newItems);
          // Auto-calculate subtotal in footer
          calculateAndUpdateSubtotal(newItems);
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                {section.type === "quote-items"
                  ? "Quote Items"
                  : section.type === "estimate-items"
                    ? "Estimate Items"
                    : section.type === "purchase-order-items"
                      ? "Purchase Order Items"
                      : section.type === "sales-order-items"
                        ? "Sales Order Items"
                        : section.type === "order-confirmation-items"
                          ? "Order Confirmation Items"
                          : section.type === "packing-slip-items"
                            ? "Packing Slip Items"
                            : section.type === "delivery-note-items"
                              ? "Delivery Note Items"
                              : "Invoice Items"}
              </Label>
              <Button
                onClick={addItem}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  className="p-3 border rounded-lg space-y-3 bg-background"
                  key={`${section.id}-item-${idx}`}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Item {idx + 1}
                    </Label>
                    <Button
                      onClick={() => deleteItem(idx)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs" htmlFor={`item-desc-${idx}`}>
                      Description
                    </Label>
                    <Input
                      className="mt-1"
                      id={`item-desc-${idx}`}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                      placeholder="Service or Product Description"
                      value={item.description || ""}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs" htmlFor={`item-qty-${idx}`}>
                        Quantity
                      </Label>
                      <QuantityInput
                        className="mt-1"
                        id={`item-qty-${idx}`}
                        onChange={(value: string) =>
                          updateItem(idx, "quantity", value)
                        }
                        placeholder="1"
                        value={item.quantity || ""}
                      />
                    </div>
                    <div>
                      <Label className="text-xs" htmlFor={`item-price-${idx}`}>
                        Unit Price
                      </Label>
                      <CurrencyInput
                        className="mt-1"
                        id={`item-price-${idx}`}
                        onChange={(value: string) =>
                          updateItem(idx, "unitPrice", value)
                        }
                        value={item.unitPrice || ""}
                      />
                    </div>
                    <div>
                      <Label className="text-xs" htmlFor={`item-total-${idx}`}>
                        Total
                      </Label>
                      <CurrencyInput
                        className="mt-1"
                        disabled
                        id={`item-total-${idx}`}
                        value={item.total || ""}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No items added. Click "Add Item" to add line items.
                </div>
              )}
            </div>
          </div>
        );
      }

      case "delivery-note-footer": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="receivedByName">
                Received By Name
              </Label>
              <Input
                className="mt-1"
                id="receivedByName"
                onChange={(e) => updateData("receivedByName", e.target.value)}
                placeholder="Recipient name who received goods"
                value={String(section.data.receivedByName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="receivedByTitle">
                Received By Title
              </Label>
              <Input
                className="mt-1"
                id="receivedByTitle"
                onChange={(e) => updateData("receivedByTitle", e.target.value)}
                placeholder="Receiving Manager, etc."
                value={String(section.data.receivedByTitle || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="receivedDate">
                Received Date
              </Label>
              <Input
                className="mt-1"
                id="receivedDate"
                onChange={(e) => updateData("receivedDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.receivedDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="conditionReceived">
                Condition Received
              </Label>
              <Input
                className="mt-1"
                id="conditionReceived"
                onChange={(e) =>
                  updateData("conditionReceived", e.target.value)
                }
                placeholder="Good condition, Damaged, etc."
                value={String(section.data.conditionReceived || "")}
              />
            </div>
            <RichTextEditor
              label="Notes"
              onChange={(value) => updateData("notes", value)}
              value={String(section.data.notes || "")}
            />
          </div>
        );
      }

      case "packing-slip-footer": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="shippingMethod">
                Shipping Method
              </Label>
              <Input
                className="mt-1"
                id="shippingMethod"
                onChange={(e) => updateData("shippingMethod", e.target.value)}
                placeholder="FedEx Ground, UPS 2-Day, etc."
                value={String(section.data.shippingMethod || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="trackingNumber">
                Tracking Number
              </Label>
              <Input
                className="mt-1"
                id="trackingNumber"
                onChange={(e) => updateData("trackingNumber", e.target.value)}
                placeholder="1Z999AA10123456784"
                value={String(section.data.trackingNumber || "")}
              />
            </div>
            <RichTextEditor
              label="Notes"
              onChange={(value) => updateData("notes", value)}
              value={String(section.data.notes || "")}
            />
          </div>
        );
      }

      case "quote-footer":
      case "estimate-footer":
      case "invoice-footer":
      case "purchase-order-footer":
      case "sales-order-footer":
      case "order-confirmation-footer": {
        const subtotal = Number.parseFloat(
          String(section.data.subtotal || "0"),
        );
        const taxMode = (section.data.taxMode as string) || "percentage";
        const discountMode =
          (section.data.discountMode as string) || "percentage";
        const showTaxRate = section.data.showTaxRate !== false;
        const showDiscountRate = section.data.showDiscountRate !== false;

        const handleTaxModeChange = (mode: string) => {
          updateData("taxMode", mode);
        };

        const handleDiscountModeChange = (mode: string) => {
          updateData("discountMode", mode);
        };

        const handleTaxRateChange = (value: string) => {
          const tax = calculateTax(
            subtotal,
            Number.parseFloat(value || "0"),
            0,
            "percentage",
          );
          const currentDiscount = Number.parseFloat(
            String(section.data.discount || "0"),
          );
          updateSection(section.id, {
            data: {
              ...section.data,
              taxRate: value,
              taxAmount: tax.taxAmount.toFixed(2),
              total: calculateTotal(
                subtotal,
                tax.taxAmount,
                currentDiscount,
              ).toFixed(2),
            },
          });
        };

        const handleTaxAmountChange = (value: string) => {
          const tax = calculateTax(
            subtotal,
            0,
            Number.parseFloat(value || "0"),
            "amount",
          );
          const currentDiscount = Number.parseFloat(
            String(section.data.discount || "0"),
          );
          updateSection(section.id, {
            data: {
              ...section.data,
              taxAmount: value,
              taxRate: tax.taxRate.toFixed(2),
              total: calculateTotal(
                subtotal,
                tax.taxAmount,
                currentDiscount,
              ).toFixed(2),
            },
          });
        };

        const handleDiscountRateChange = (value: string) => {
          const disc = calculateDiscount(
            subtotal,
            Number.parseFloat(value || "0"),
            0,
            "percentage",
          );
          const currentTaxAmount = Number.parseFloat(
            String(section.data.taxAmount || "0"),
          );
          updateSection(section.id, {
            data: {
              ...section.data,
              discountRate: value,
              discount: disc.discount.toFixed(2),
              total: calculateTotal(
                subtotal,
                currentTaxAmount,
                disc.discount,
              ).toFixed(2),
            },
          });
        };

        const handleDiscountAmountChange = (value: string) => {
          const disc = calculateDiscount(
            subtotal,
            0,
            Number.parseFloat(value || "0"),
            "amount",
          );
          const currentTaxAmount = Number.parseFloat(
            String(section.data.taxAmount || "0"),
          );
          updateSection(section.id, {
            data: {
              ...section.data,
              discount: value,
              discountRate: disc.discountRate.toFixed(2),
              total: calculateTotal(
                subtotal,
                currentTaxAmount,
                disc.discount,
              ).toFixed(2),
            },
          });
        };

        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="subtotal">
                Subtotal
              </Label>
              <CurrencyInput
                className="mt-1"
                disabled
                id="subtotal"
                value={String(section.data.subtotal || "")}
              />
            </div>

            {/* Tax Section */}
            <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Tax</Label>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    className={`px-2 py-1 rounded ${taxMode === "percentage" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => handleTaxModeChange("percentage")}
                    type="button"
                  >
                    %
                  </button>
                  <button
                    className={`px-2 py-1 rounded ${taxMode === "amount" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => handleTaxModeChange("amount")}
                    type="button"
                  >
                    $
                  </button>
                </div>
              </div>

              {taxMode === "percentage" ? (
                <>
                  <div>
                    <Label className="text-xs" htmlFor="taxRate">
                      Tax Rate (%)
                    </Label>
                    <NumberInput
                      allowNegative={false}
                      className="mt-1"
                      decimalScale={2}
                      fixedDecimalScale={false}
                      id="taxRate"
                      onChange={handleTaxRateChange}
                      placeholder="10"
                      thousandSeparator={false}
                      value={String(section.data.taxRate || "")}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Tax Amount (calculated)
                    </Label>
                    <CurrencyInput
                      className="mt-1 bg-muted/50"
                      disabled
                      value={String(section.data.taxAmount || "0.00")}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs" htmlFor="taxAmount">
                      Tax Amount
                    </Label>
                    <CurrencyInput
                      className="mt-1"
                      id="taxAmount"
                      onChange={handleTaxAmountChange}
                      value={String(section.data.taxAmount || "")}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      checked={showTaxRate}
                      className="h-4 w-4 rounded border-gray-300"
                      id="showTaxRate"
                      onChange={(e) =>
                        updateData("showTaxRate", e.target.checked)
                      }
                      type="checkbox"
                    />
                    <Label className="text-xs" htmlFor="showTaxRate">
                      Show percentage on document
                    </Label>
                  </div>
                  {showTaxRate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Tax Rate (calculated)
                      </Label>
                      <NumberInput
                        allowNegative={false}
                        className="mt-1 bg-muted/50"
                        decimalScale={2}
                        disabled
                        fixedDecimalScale={false}
                        thousandSeparator={false}
                        value={String(section.data.taxRate || "0.00")}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Discount Section */}
            <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Discount</Label>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    className={`px-2 py-1 rounded ${discountMode === "percentage" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => handleDiscountModeChange("percentage")}
                    type="button"
                  >
                    %
                  </button>
                  <button
                    className={`px-2 py-1 rounded ${discountMode === "amount" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => handleDiscountModeChange("amount")}
                    type="button"
                  >
                    $
                  </button>
                </div>
              </div>

              {discountMode === "percentage" ? (
                <>
                  <div>
                    <Label className="text-xs" htmlFor="discountRate">
                      Discount Rate (%)
                    </Label>
                    <NumberInput
                      allowNegative={false}
                      className="mt-1"
                      decimalScale={2}
                      fixedDecimalScale={false}
                      id="discountRate"
                      onChange={handleDiscountRateChange}
                      placeholder="5"
                      thousandSeparator={false}
                      value={String(section.data.discountRate || "")}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Discount Amount (calculated)
                    </Label>
                    <CurrencyInput
                      className="mt-1 bg-muted/50"
                      disabled
                      value={String(section.data.discount || "0.00")}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs" htmlFor="discount">
                      Discount Amount
                    </Label>
                    <CurrencyInput
                      className="mt-1"
                      id="discount"
                      onChange={handleDiscountAmountChange}
                      value={String(section.data.discount || "")}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      checked={showDiscountRate}
                      className="h-4 w-4 rounded border-gray-300"
                      id="showDiscountRate"
                      onChange={(e) =>
                        updateData("showDiscountRate", e.target.checked)
                      }
                      type="checkbox"
                    />
                    <Label className="text-xs" htmlFor="showDiscountRate">
                      Show percentage on document
                    </Label>
                  </div>
                  {showDiscountRate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Discount Rate (calculated)
                      </Label>
                      <NumberInput
                        allowNegative={false}
                        className="mt-1 bg-muted/50"
                        decimalScale={2}
                        disabled
                        fixedDecimalScale={false}
                        thousandSeparator={false}
                        value={String(section.data.discountRate || "0.00")}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <Label className="text-xs" htmlFor="total">
                Total
              </Label>
              <CurrencyInput
                className="mt-1 font-semibold"
                disabled
                id="total"
                value={String(section.data.total || "")}
              />
            </div>
            {section.type === "invoice-footer" && (
              <>
                <RichTextEditor
                  label="Payment Terms"
                  onChange={(value) => updateData("paymentTerms", value)}
                  value={String(section.data.paymentTerms || "")}
                />
                <div>
                  <Label className="text-xs" htmlFor="notes">
                    Notes
                  </Label>
                  <textarea
                    className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    id="notes"
                    onChange={(e) => updateData("notes", e.target.value)}
                    placeholder="Thank you for your business!"
                    value={String(section.data.notes || "")}
                  />
                </div>
              </>
            )}
            {section.type === "quote-footer" && (
              <>
                <div>
                  <Label className="text-xs" htmlFor="validityPeriod">
                    Validity Period
                  </Label>
                  <Input
                    className="mt-1"
                    id="validityPeriod"
                    onChange={(e) =>
                      updateData("validityPeriod", e.target.value)
                    }
                    placeholder="30 days"
                    value={String(section.data.validityPeriod || "")}
                  />
                </div>
                <RichTextEditor
                  label="Terms"
                  onChange={(value) => updateData("terms", value)}
                  value={String(section.data.terms || "")}
                />
              </>
            )}
            {section.type === "estimate-footer" && (
              <>
                <div>
                  <Label className="text-xs" htmlFor="validityPeriod">
                    Validity Period
                  </Label>
                  <Input
                    className="mt-1"
                    id="validityPeriod"
                    onChange={(e) =>
                      updateData("validityPeriod", e.target.value)
                    }
                    placeholder="14 days"
                    value={String(section.data.validityPeriod || "")}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="notes">
                    Notes
                  </Label>
                  <textarea
                    className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    id="notes"
                    onChange={(e) => updateData("notes", e.target.value)}
                    placeholder="Additional notes or conditions"
                    value={String(section.data.notes || "")}
                  />
                </div>
              </>
            )}
            {section.type === "purchase-order-footer" && (
              <>
                <div>
                  <Label className="text-xs" htmlFor="validityPeriod">
                    Validity Period
                  </Label>
                  <Input
                    className="mt-1"
                    id="validityPeriod"
                    onChange={(e) =>
                      updateData("validityPeriod", e.target.value)
                    }
                    placeholder="14 days"
                    value={String(section.data.validityPeriod || "")}
                  />
                </div>
                <RichTextEditor
                  label="Terms"
                  onChange={(value) => updateData("terms", value)}
                  value={String(section.data.terms || "")}
                />
              </>
            )}
            {section.type === "sales-order-footer" && (
              <>
                <RichTextEditor
                  label="Internal Notes (fulfillment, warehouse, priority)"
                  onChange={(value) => updateData("notes", value)}
                  value={String(section.data.notes || "")}
                />
                <RichTextEditor
                  label="Internal Instructions (cost center, department)"
                  onChange={(value) => updateData("terms", value)}
                  value={String(section.data.terms || "")}
                />
              </>
            )}
            {section.type === "order-confirmation-footer" && (
              <RichTextEditor
                label="Thank you message / delivery notes"
                onChange={(value) => updateData("notes", value)}
                value={String(section.data.notes || "")}
              />
            )}
          </div>
        );
      }

      case "quote-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="companyLogo">
                Company Logo URL
              </Label>
              <Input
                className="mt-1"
                id="companyLogo"
                onChange={(e) => updateData("companyLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={String(section.data.companyLogo || "")}
              />
              {Boolean(section.data.companyLogo) && (
                <div className="mt-2">
                  <img
                    alt="Logo Preview"
                    className="h-12 object-contain border rounded"
                    src={String(section.data.companyLogo)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyName">
                Company Name
              </Label>
              <Input
                className="mt-1"
                id="companyName"
                onChange={(e) => updateData("companyName", e.target.value)}
                placeholder="Your Company Name"
                value={String(section.data.companyName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyAddress">
                Company Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="companyAddress"
                onChange={(e) => updateData("companyAddress", e.target.value)}
                placeholder="123 Business St&#10;City, State 12345"
                value={String(section.data.companyAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyEmail">
                Company Email
              </Label>
              <Input
                className="mt-1"
                id="companyEmail"
                onChange={(e) => updateData("companyEmail", e.target.value)}
                placeholder="contact@company.com"
                type="email"
                value={String(section.data.companyEmail || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyPhone">
                Company Phone
              </Label>
              <Input
                className="mt-1"
                id="companyPhone"
                onChange={(e) => updateData("companyPhone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                type="tel"
                value={String(section.data.companyPhone || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="quoteNumber">
                Quote Number
              </Label>
              <Input
                className="mt-1"
                id="quoteNumber"
                onChange={(e) => updateData("quoteNumber", e.target.value)}
                placeholder="QT-001"
                value={String(section.data.quoteNumber || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="quoteDate">
                Quote Date
              </Label>
              <Input
                className="mt-1"
                id="quoteDate"
                onChange={(e) => updateData("quoteDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.quoteDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="validityDate">
                Valid Until
              </Label>
              <Input
                className="mt-1"
                id="validityDate"
                onChange={(e) => updateData("validityDate", e.target.value)}
                placeholder="02/15/2024"
                value={String(section.data.validityDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToName">
                Bill To Name
              </Label>
              <Input
                className="mt-1"
                id="billToName"
                onChange={(e) => updateData("billToName", e.target.value)}
                placeholder="Client Name"
                value={String(section.data.billToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToAddress">
                Bill To Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="billToAddress"
                onChange={(e) => updateData("billToAddress", e.target.value)}
                placeholder="456 Client Ave&#10;City, State 67890"
                value={String(section.data.billToAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToName">
                Ship To Name (Optional)
              </Label>
              <Input
                className="mt-1"
                id="shipToName"
                onChange={(e) => updateData("shipToName", e.target.value)}
                placeholder="Shipping Name"
                value={String(section.data.shipToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToAddress">
                Ship To Address (Optional)
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="shipToAddress"
                onChange={(e) => updateData("shipToAddress", e.target.value)}
                placeholder="789 Shipping St&#10;City, State 54321"
                value={String(section.data.shipToAddress || "")}
              />
            </div>
          </div>
        );
      }

      case "estimate-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="companyLogo">
                Company Logo URL
              </Label>
              <Input
                className="mt-1"
                id="companyLogo"
                onChange={(e) => updateData("companyLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={String(section.data.companyLogo || "")}
              />
              {Boolean(section.data.companyLogo) && (
                <div className="mt-2">
                  <img
                    alt="Logo Preview"
                    className="h-12 object-contain border rounded"
                    src={String(section.data.companyLogo)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyName">
                Company Name
              </Label>
              <Input
                className="mt-1"
                id="companyName"
                onChange={(e) => updateData("companyName", e.target.value)}
                placeholder="Your Company Name"
                value={String(section.data.companyName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyAddress">
                Company Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="companyAddress"
                onChange={(e) => updateData("companyAddress", e.target.value)}
                placeholder="123 Business St&#10;City, State 12345"
                value={String(section.data.companyAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyEmail">
                Company Email
              </Label>
              <Input
                className="mt-1"
                id="companyEmail"
                onChange={(e) => updateData("companyEmail", e.target.value)}
                placeholder="contact@company.com"
                type="email"
                value={String(section.data.companyEmail || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyPhone">
                Company Phone
              </Label>
              <Input
                className="mt-1"
                id="companyPhone"
                onChange={(e) => updateData("companyPhone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                type="tel"
                value={String(section.data.companyPhone || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="estimateNumber">
                Estimate Number
              </Label>
              <Input
                className="mt-1"
                id="estimateNumber"
                onChange={(e) => updateData("estimateNumber", e.target.value)}
                placeholder="EST-001"
                value={String(section.data.estimateNumber || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="estimateDate">
                Estimate Date
              </Label>
              <Input
                className="mt-1"
                id="estimateDate"
                onChange={(e) => updateData("estimateDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.estimateDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="validityDate">
                Valid Until
              </Label>
              <Input
                className="mt-1"
                id="validityDate"
                onChange={(e) => updateData("validityDate", e.target.value)}
                placeholder="01/29/2024"
                value={String(section.data.validityDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToName">
                Bill To Name
              </Label>
              <Input
                className="mt-1"
                id="billToName"
                onChange={(e) => updateData("billToName", e.target.value)}
                placeholder="Client Name"
                value={String(section.data.billToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToAddress">
                Bill To Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="billToAddress"
                onChange={(e) => updateData("billToAddress", e.target.value)}
                placeholder="456 Client Ave&#10;City, State 67890"
                value={String(section.data.billToAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToName">
                Ship To Name (Optional)
              </Label>
              <Input
                className="mt-1"
                id="shipToName"
                onChange={(e) => updateData("shipToName", e.target.value)}
                placeholder="Shipping Name"
                value={String(section.data.shipToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToAddress">
                Ship To Address (Optional)
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="shipToAddress"
                onChange={(e) => updateData("shipToAddress", e.target.value)}
                placeholder="789 Shipping St&#10;City, State 54321"
                value={String(section.data.shipToAddress || "")}
              />
            </div>
          </div>
        );
      }

      case "purchase-order-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="companyLogo">
                Company Logo URL
              </Label>
              <Input
                className="mt-1"
                id="companyLogo"
                onChange={(e) => updateData("companyLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={String(section.data.companyLogo || "")}
              />
              {Boolean(section.data.companyLogo) && (
                <div className="mt-2">
                  <img
                    alt="Logo Preview"
                    className="h-12 object-contain border rounded"
                    src={String(section.data.companyLogo)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyName">
                Company Name
              </Label>
              <Input
                className="mt-1"
                id="companyName"
                onChange={(e) => updateData("companyName", e.target.value)}
                placeholder="Your Company Name"
                value={String(section.data.companyName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyAddress">
                Company Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="companyAddress"
                onChange={(e) => updateData("companyAddress", e.target.value)}
                placeholder="123 Business St&#10;City, State 12345"
                value={String(section.data.companyAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyEmail">
                Company Email
              </Label>
              <Input
                className="mt-1"
                id="companyEmail"
                onChange={(e) => updateData("companyEmail", e.target.value)}
                placeholder="procurement@company.com"
                type="email"
                value={String(section.data.companyEmail || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyPhone">
                Company Phone
              </Label>
              <Input
                className="mt-1"
                id="companyPhone"
                onChange={(e) => updateData("companyPhone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                value={String(section.data.companyPhone || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="poNumber">
                PO Number
              </Label>
              <Input
                className="mt-1"
                id="poNumber"
                onChange={(e) => updateData("poNumber", e.target.value)}
                placeholder="PO-001"
                value={String(section.data.poNumber || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="orderDate">
                Order Date
              </Label>
              <Input
                className="mt-1"
                id="orderDate"
                onChange={(e) => updateData("orderDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.orderDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="expectedDelivery">
                Expected Delivery
              </Label>
              <Input
                className="mt-1"
                id="expectedDelivery"
                onChange={(e) => updateData("expectedDelivery", e.target.value)}
                placeholder="01/29/2024"
                value={String(section.data.expectedDelivery || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToName">
                Supplier Name (Bill To)
              </Label>
              <Input
                className="mt-1"
                id="billToName"
                onChange={(e) => updateData("billToName", e.target.value)}
                placeholder="Supplier Name"
                value={String(section.data.billToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToAddress">
                Supplier Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="billToAddress"
                onChange={(e) => updateData("billToAddress", e.target.value)}
                placeholder="789 Vendor Lane&#10;City, State 54321"
                value={String(section.data.billToAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToName">
                Ship To Name (Optional)
              </Label>
              <Input
                className="mt-1"
                id="shipToName"
                onChange={(e) => updateData("shipToName", e.target.value)}
                placeholder="Delivery Name"
                value={String(section.data.shipToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToAddress">
                Ship To Address (Optional)
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="shipToAddress"
                onChange={(e) => updateData("shipToAddress", e.target.value)}
                placeholder="456 Receiving Dock&#10;City, State 12345"
                value={String(section.data.shipToAddress || "")}
              />
            </div>
          </div>
        );
      }

      case "sales-order-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="companyLogo">
                Company Logo URL
              </Label>
              <Input
                className="mt-1"
                id="companyLogo"
                onChange={(e) => updateData("companyLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={String(section.data.companyLogo || "")}
              />
              {Boolean(section.data.companyLogo) && (
                <div className="mt-2">
                  <img
                    alt="Logo Preview"
                    className="h-12 object-contain border rounded"
                    src={String(section.data.companyLogo)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyName">
                Company Name
              </Label>
              <Input
                className="mt-1"
                id="companyName"
                onChange={(e) => updateData("companyName", e.target.value)}
                placeholder="Your Company Name"
                value={String(section.data.companyName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyAddress">
                Company Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="companyAddress"
                onChange={(e) => updateData("companyAddress", e.target.value)}
                placeholder="123 Business St&#10;City, State 12345"
                value={String(section.data.companyAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyEmail">
                Company Email
              </Label>
              <Input
                className="mt-1"
                id="companyEmail"
                onChange={(e) => updateData("companyEmail", e.target.value)}
                placeholder="orders@company.com"
                type="email"
                value={String(section.data.companyEmail || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyPhone">
                Company Phone
              </Label>
              <Input
                className="mt-1"
                id="companyPhone"
                onChange={(e) => updateData("companyPhone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                value={String(section.data.companyPhone || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="orderNumber">
                Order Number
              </Label>
              <Input
                className="mt-1"
                id="orderNumber"
                onChange={(e) => updateData("orderNumber", e.target.value)}
                placeholder="SO-001"
                value={String(section.data.orderNumber || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="orderDate">
                Order Date
              </Label>
              <Input
                className="mt-1"
                id="orderDate"
                onChange={(e) => updateData("orderDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.orderDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToName">
                Bill To Name
              </Label>
              <Input
                className="mt-1"
                id="billToName"
                onChange={(e) => updateData("billToName", e.target.value)}
                placeholder="Customer Name"
                value={String(section.data.billToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToAddress">
                Bill To Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="billToAddress"
                onChange={(e) => updateData("billToAddress", e.target.value)}
                placeholder="456 Customer Ave&#10;City, State 67890"
                value={String(section.data.billToAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToName">
                Ship To Name (Optional)
              </Label>
              <Input
                className="mt-1"
                id="shipToName"
                onChange={(e) => updateData("shipToName", e.target.value)}
                placeholder="Shipping Name"
                value={String(section.data.shipToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToAddress">
                Ship To Address (Optional)
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="shipToAddress"
                onChange={(e) => updateData("shipToAddress", e.target.value)}
                placeholder="789 Shipping St&#10;City, State 54321"
                value={String(section.data.shipToAddress || "")}
              />
            </div>
          </div>
        );
      }

      case "delivery-note-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="companyLogo">
                Company Logo URL
              </Label>
              <Input
                className="mt-1"
                id="companyLogo"
                onChange={(e) => updateData("companyLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={String(section.data.companyLogo || "")}
              />
              {Boolean(section.data.companyLogo) && (
                <div className="mt-2">
                  <img
                    alt="Logo Preview"
                    className="h-12 object-contain border rounded"
                    src={String(section.data.companyLogo)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyName">
                Company Name
              </Label>
              <Input
                className="mt-1"
                id="companyName"
                onChange={(e) => updateData("companyName", e.target.value)}
                placeholder="Your Company Name"
                value={String(section.data.companyName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyAddress">
                Company Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="companyAddress"
                onChange={(e) => updateData("companyAddress", e.target.value)}
                placeholder="123 Business St&#10;City, State 12345"
                value={String(section.data.companyAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="deliveryNoteNumber">
                Delivery Note Number
              </Label>
              <Input
                className="mt-1"
                id="deliveryNoteNumber"
                onChange={(e) =>
                  updateData("deliveryNoteNumber", e.target.value)
                }
                placeholder="DN-001"
                value={String(section.data.deliveryNoteNumber || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="orderReference">
                Order Reference
              </Label>
              <Input
                className="mt-1"
                id="orderReference"
                onChange={(e) => updateData("orderReference", e.target.value)}
                placeholder="ORD-001"
                value={String(section.data.orderReference || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="deliveryDate">
                Delivery Date
              </Label>
              <Input
                className="mt-1"
                id="deliveryDate"
                onChange={(e) => updateData("deliveryDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.deliveryDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="deliveredByName">
                Delivered By Name
              </Label>
              <Input
                className="mt-1"
                id="deliveredByName"
                onChange={(e) => updateData("deliveredByName", e.target.value)}
                placeholder="Driver name"
                value={String(section.data.deliveredByName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="deliveredByCompany">
                Delivered By Company
              </Label>
              <Input
                className="mt-1"
                id="deliveredByCompany"
                onChange={(e) =>
                  updateData("deliveredByCompany", e.target.value)
                }
                placeholder="Carrier / logistics company"
                value={String(section.data.deliveredByCompany || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="deliveredToName">
                Delivered To Name
              </Label>
              <Input
                className="mt-1"
                id="deliveredToName"
                onChange={(e) => updateData("deliveredToName", e.target.value)}
                placeholder="Recipient name"
                value={String(section.data.deliveredToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="deliveredToAddress">
                Delivered To Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="deliveredToAddress"
                onChange={(e) =>
                  updateData("deliveredToAddress", e.target.value)
                }
                placeholder="456 Customer Ave&#10;City, State 67890"
                value={String(section.data.deliveredToAddress || "")}
              />
            </div>
          </div>
        );
      }

      case "packing-slip-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="companyLogo">
                Company Logo URL
              </Label>
              <Input
                className="mt-1"
                id="companyLogo"
                onChange={(e) => updateData("companyLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={String(section.data.companyLogo || "")}
              />
              {Boolean(section.data.companyLogo) && (
                <div className="mt-2">
                  <img
                    alt="Logo Preview"
                    className="h-12 object-contain border rounded"
                    src={String(section.data.companyLogo)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyName">
                Company Name
              </Label>
              <Input
                className="mt-1"
                id="companyName"
                onChange={(e) => updateData("companyName", e.target.value)}
                placeholder="Your Company Name"
                value={String(section.data.companyName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyAddress">
                Company Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="companyAddress"
                onChange={(e) => updateData("companyAddress", e.target.value)}
                placeholder="123 Business St&#10;City, State 12345"
                value={String(section.data.companyAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipmentNumber">
                Shipment Number
              </Label>
              <Input
                className="mt-1"
                id="shipmentNumber"
                onChange={(e) => updateData("shipmentNumber", e.target.value)}
                placeholder="PS-001"
                value={String(section.data.shipmentNumber || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="orderReference">
                Order Reference
              </Label>
              <Input
                className="mt-1"
                id="orderReference"
                onChange={(e) => updateData("orderReference", e.target.value)}
                placeholder="ORD-001"
                value={String(section.data.orderReference || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipDate">
                Ship Date
              </Label>
              <Input
                className="mt-1"
                id="shipDate"
                onChange={(e) => updateData("shipDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.shipDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipFromName">
                Ship From Name
              </Label>
              <Input
                className="mt-1"
                id="shipFromName"
                onChange={(e) => updateData("shipFromName", e.target.value)}
                placeholder="Warehouse Name"
                value={String(section.data.shipFromName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipFromAddress">
                Ship From Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="shipFromAddress"
                onChange={(e) => updateData("shipFromAddress", e.target.value)}
                placeholder="100 Warehouse Rd&#10;City, State 12345"
                value={String(section.data.shipFromAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToName">
                Ship To Name
              </Label>
              <Input
                className="mt-1"
                id="shipToName"
                onChange={(e) => updateData("shipToName", e.target.value)}
                placeholder="Customer Name"
                value={String(section.data.shipToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToAddress">
                Ship To Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="shipToAddress"
                onChange={(e) => updateData("shipToAddress", e.target.value)}
                placeholder="456 Customer Ave&#10;City, State 67890"
                value={String(section.data.shipToAddress || "")}
              />
            </div>
          </div>
        );
      }

      case "order-confirmation-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="companyLogo">
                Company Logo URL
              </Label>
              <Input
                className="mt-1"
                id="companyLogo"
                onChange={(e) => updateData("companyLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={String(section.data.companyLogo || "")}
              />
              {Boolean(section.data.companyLogo) && (
                <div className="mt-2">
                  <img
                    alt="Logo Preview"
                    className="h-12 object-contain border rounded"
                    src={String(section.data.companyLogo)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyName">
                Company Name
              </Label>
              <Input
                className="mt-1"
                id="companyName"
                onChange={(e) => updateData("companyName", e.target.value)}
                placeholder="Your Company Name"
                value={String(section.data.companyName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyAddress">
                Company Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="companyAddress"
                onChange={(e) => updateData("companyAddress", e.target.value)}
                placeholder="123 Business St&#10;City, State 12345"
                value={String(section.data.companyAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyEmail">
                Company Email
              </Label>
              <Input
                className="mt-1"
                id="companyEmail"
                onChange={(e) => updateData("companyEmail", e.target.value)}
                placeholder="orders@company.com"
                type="email"
                value={String(section.data.companyEmail || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="companyPhone">
                Company Phone
              </Label>
              <Input
                className="mt-1"
                id="companyPhone"
                onChange={(e) => updateData("companyPhone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                value={String(section.data.companyPhone || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="confirmationNumber">
                Confirmation Number
              </Label>
              <Input
                className="mt-1"
                id="confirmationNumber"
                onChange={(e) =>
                  updateData("confirmationNumber", e.target.value)
                }
                placeholder="OC-001"
                value={String(section.data.confirmationNumber || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="orderReference">
                Order Reference
              </Label>
              <Input
                className="mt-1"
                id="orderReference"
                onChange={(e) => updateData("orderReference", e.target.value)}
                placeholder="ORD-001"
                value={String(section.data.orderReference || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="orderDate">
                Order Date
              </Label>
              <Input
                className="mt-1"
                id="orderDate"
                onChange={(e) => updateData("orderDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.orderDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="expectedShipDate">
                Expected Ship Date
              </Label>
              <Input
                className="mt-1"
                id="expectedShipDate"
                onChange={(e) => updateData("expectedShipDate", e.target.value)}
                placeholder="01/18/2024"
                value={String(section.data.expectedShipDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToName">
                Bill To Name
              </Label>
              <Input
                className="mt-1"
                id="billToName"
                onChange={(e) => updateData("billToName", e.target.value)}
                placeholder="Customer Name"
                value={String(section.data.billToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="billToAddress">
                Bill To Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="billToAddress"
                onChange={(e) => updateData("billToAddress", e.target.value)}
                placeholder="456 Customer Ave&#10;City, State 67890"
                value={String(section.data.billToAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToName">
                Ship To Name (Optional)
              </Label>
              <Input
                className="mt-1"
                id="shipToName"
                onChange={(e) => updateData("shipToName", e.target.value)}
                placeholder="Shipping Name"
                value={String(section.data.shipToName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="shipToAddress">
                Ship To Address (Optional)
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="shipToAddress"
                onChange={(e) => updateData("shipToAddress", e.target.value)}
                placeholder="789 Shipping St&#10;City, State 54321"
                value={String(section.data.shipToAddress || "")}
              />
            </div>
          </div>
        );
      }

      case "contract-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="contractTitle">
                Contract Title
              </Label>
              <Input
                className="mt-1"
                id="contractTitle"
                onChange={(e) => updateData("contractTitle", e.target.value)}
                placeholder="Service Agreement"
                value={String(section.data.contractTitle || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="contractRef">
                Contract Ref
              </Label>
              <Input
                className="mt-1"
                id="contractRef"
                onChange={(e) => updateData("contractRef", e.target.value)}
                placeholder="AGR-2024-001"
                value={String(section.data.contractRef || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="effectiveDate">
                Effective Date
              </Label>
              <Input
                className="mt-1"
                id="effectiveDate"
                onChange={(e) => updateData("effectiveDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.effectiveDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="partyAName">
                Party A Name
              </Label>
              <Input
                className="mt-1"
                id="partyAName"
                onChange={(e) => updateData("partyAName", e.target.value)}
                placeholder="Provider / Company"
                value={String(section.data.partyAName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="partyAAddress">
                Party A Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="partyAAddress"
                onChange={(e) => updateData("partyAAddress", e.target.value)}
                placeholder="123 Business St&#10;City, State 12345"
                value={String(section.data.partyAAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="partyBName">
                Party B Name
              </Label>
              <Input
                className="mt-1"
                id="partyBName"
                onChange={(e) => updateData("partyBName", e.target.value)}
                placeholder="Client / Counterparty"
                value={String(section.data.partyBName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="partyBAddress">
                Party B Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="partyBAddress"
                onChange={(e) => updateData("partyBAddress", e.target.value)}
                placeholder="456 Customer Ave&#10;City, State 67890"
                value={String(section.data.partyBAddress || "")}
              />
            </div>
          </div>
        );
      }

      case "contract-body": {
        return (
          <div className="space-y-4">
            <RichTextEditor
              label="Contract Terms and Clauses"
              onChange={(value) => updateData("content", value)}
              value={String(section.data.content || "")}
            />
          </div>
        );
      }

      case "contract-signature": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="partyASignatureName">
                Party A Signature Name
              </Label>
              <Input
                className="mt-1"
                id="partyASignatureName"
                onChange={(e) =>
                  updateData("partyASignatureName", e.target.value)
                }
                placeholder="John Doe"
                value={String(section.data.partyASignatureName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="partyASignatureTitle">
                Party A Title
              </Label>
              <Input
                className="mt-1"
                id="partyASignatureTitle"
                onChange={(e) =>
                  updateData("partyASignatureTitle", e.target.value)
                }
                placeholder="Authorized Signatory"
                value={String(section.data.partyASignatureTitle || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="partyADate">
                Party A Date
              </Label>
              <Input
                className="mt-1"
                id="partyADate"
                onChange={(e) => updateData("partyADate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.partyADate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="partyBSignatureName">
                Party B Signature Name
              </Label>
              <Input
                className="mt-1"
                id="partyBSignatureName"
                onChange={(e) =>
                  updateData("partyBSignatureName", e.target.value)
                }
                placeholder="Jane Smith"
                value={String(section.data.partyBSignatureName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="partyBSignatureTitle">
                Party B Title
              </Label>
              <Input
                className="mt-1"
                id="partyBSignatureTitle"
                onChange={(e) =>
                  updateData("partyBSignatureTitle", e.target.value)
                }
                placeholder="Authorized Signatory"
                value={String(section.data.partyBSignatureTitle || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="partyBDate">
                Party B Date
              </Label>
              <Input
                className="mt-1"
                id="partyBDate"
                onChange={(e) => updateData("partyBDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.partyBDate || "")}
              />
            </div>
          </div>
        );
      }

      case "receipt-header": {
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="storeLogo">
                Store Logo URL
              </Label>
              <Input
                className="mt-1"
                id="storeLogo"
                onChange={(e) => updateData("storeLogo", e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={String(section.data.storeLogo || "")}
              />
              {Boolean(section.data.storeLogo) && (
                <div className="mt-2">
                  <img
                    alt="Logo Preview"
                    className="h-12 object-contain border rounded"
                    src={String(section.data.storeLogo)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs" htmlFor="storeName">
                Store Name
              </Label>
              <Input
                className="mt-1"
                id="storeName"
                onChange={(e) => updateData("storeName", e.target.value)}
                placeholder="Your Store Name"
                value={String(section.data.storeName || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="storeAddress">
                Store Address
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="storeAddress"
                onChange={(e) => updateData("storeAddress", e.target.value)}
                placeholder="123 Main St&#10;City, State 12345"
                value={String(section.data.storeAddress || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="storeEmail">
                Store Email
              </Label>
              <Input
                className="mt-1"
                id="storeEmail"
                onChange={(e) => updateData("storeEmail", e.target.value)}
                placeholder="info@store.com"
                type="email"
                value={String(section.data.storeEmail || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="storePhone">
                Store Phone
              </Label>
              <Input
                className="mt-1"
                id="storePhone"
                onChange={(e) => updateData("storePhone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                type="tel"
                value={String(section.data.storePhone || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="receiptNumber">
                Receipt Number
              </Label>
              <Input
                className="mt-1"
                id="receiptNumber"
                onChange={(e) => updateData("receiptNumber", e.target.value)}
                placeholder="RCP-001"
                value={String(section.data.receiptNumber || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="receiptDate">
                Receipt Date
              </Label>
              <Input
                className="mt-1"
                id="receiptDate"
                onChange={(e) => updateData("receiptDate", e.target.value)}
                placeholder="01/15/2024"
                value={String(section.data.receiptDate || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="transactionId">
                Transaction ID (Optional)
              </Label>
              <Input
                className="mt-1"
                id="transactionId"
                onChange={(e) => updateData("transactionId", e.target.value)}
                placeholder="TXN-2024-001"
                value={String(section.data.transactionId || "")}
              />
            </div>
          </div>
        );
      }

      case "receipt-items": {
        const items = (
          Array.isArray(section.data.items) ? section.data.items : []
        ) as InvoiceItem[];

        const addItem = () => {
          const newItem: InvoiceItem = {
            description: "",
            quantity: "1",
            unitPrice: "0.00",
            total: "0.00",
          };
          const newItems = [...items, newItem];
          updateData("items", newItems);
          // Auto-calculate subtotal in footer
          calculateAndUpdateSubtotal(newItems);
        };

        const deleteItem = (idx: number) => {
          const newItems = items.filter((_, i) => i !== idx);
          updateData("items", newItems);
          // Auto-calculate subtotal in footer
          calculateAndUpdateSubtotal(newItems);
        };

        const updateItem = (
          idx: number,
          field: keyof InvoiceItem,
          value: string,
        ) => {
          const newItems = [...items];
          if (newItems[idx]) {
            newItems[idx] = { ...newItems[idx], [field]: value };
            // Auto-calculate total if quantity or unitPrice changes
            if (field === "quantity" || field === "unitPrice") {
              const qty = Number.parseFloat(newItems[idx].quantity || "0");
              const price = Number.parseFloat(newItems[idx].unitPrice || "0");
              newItems[idx].total = (qty * price).toFixed(2);
            }
          }
          updateData("items", newItems);
          // Auto-calculate subtotal in footer
          calculateAndUpdateSubtotal(newItems);
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Receipt Items</Label>
              <Button
                onClick={addItem}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  className="p-3 border rounded-lg space-y-3 bg-background"
                  key={`${section.id}-item-${idx}`}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Item {idx + 1}
                    </Label>
                    <Button
                      onClick={() => deleteItem(idx)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs" htmlFor={`item-desc-${idx}`}>
                      Description
                    </Label>
                    <Input
                      className="mt-1"
                      id={`item-desc-${idx}`}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                      placeholder="Product or Service Description"
                      value={item.description || ""}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs" htmlFor={`item-qty-${idx}`}>
                        Quantity
                      </Label>
                      <QuantityInput
                        className="mt-1"
                        id={`item-qty-${idx}`}
                        onChange={(value: string) =>
                          updateItem(idx, "quantity", value)
                        }
                        placeholder="1"
                        value={item.quantity || ""}
                      />
                    </div>
                    <div>
                      <Label className="text-xs" htmlFor={`item-price-${idx}`}>
                        Unit Price
                      </Label>
                      <CurrencyInput
                        className="mt-1"
                        id={`item-price-${idx}`}
                        onChange={(value: string) =>
                          updateItem(idx, "unitPrice", value)
                        }
                        value={item.unitPrice || ""}
                      />
                    </div>
                    <div>
                      <Label className="text-xs" htmlFor={`item-total-${idx}`}>
                        Total
                      </Label>
                      <CurrencyInput
                        className="mt-1"
                        disabled
                        id={`item-total-${idx}`}
                        value={item.total || ""}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No items added. Click "Add Item" to add receipt line items.
                </div>
              )}
            </div>
          </div>
        );
      }

      case "receipt-footer": {
        const subtotal = Number.parseFloat(
          String(section.data.subtotal || "0"),
        );
        const taxMode = (section.data.taxMode as string) || "percentage";
        const discountMode =
          (section.data.discountMode as string) || "percentage";
        const showTaxRate = section.data.showTaxRate !== false;
        const showDiscountRate = section.data.showDiscountRate !== false;

        const handleTaxModeChange = (mode: string) => {
          updateData("taxMode", mode);
        };

        const handleDiscountModeChange = (mode: string) => {
          updateData("discountMode", mode);
        };

        const handleTaxRateChange = (value: string) => {
          const tax = calculateTax(
            subtotal,
            Number.parseFloat(value || "0"),
            0,
            "percentage",
          );
          const currentDiscount = Number.parseFloat(
            String(section.data.discount || "0"),
          );
          updateSection(section.id, {
            data: {
              ...section.data,
              taxRate: value,
              taxAmount: tax.taxAmount.toFixed(2),
              total: calculateTotal(
                subtotal,
                tax.taxAmount,
                currentDiscount,
              ).toFixed(2),
            },
          });
        };

        const handleTaxAmountChange = (value: string) => {
          const tax = calculateTax(
            subtotal,
            0,
            Number.parseFloat(value || "0"),
            "amount",
          );
          const currentDiscount = Number.parseFloat(
            String(section.data.discount || "0"),
          );
          updateSection(section.id, {
            data: {
              ...section.data,
              taxAmount: value,
              taxRate: tax.taxRate.toFixed(2),
              total: calculateTotal(
                subtotal,
                tax.taxAmount,
                currentDiscount,
              ).toFixed(2),
            },
          });
        };

        const handleDiscountRateChange = (value: string) => {
          const disc = calculateDiscount(
            subtotal,
            Number.parseFloat(value || "0"),
            0,
            "percentage",
          );
          const currentTaxAmount = Number.parseFloat(
            String(section.data.taxAmount || "0"),
          );
          updateSection(section.id, {
            data: {
              ...section.data,
              discountRate: value,
              discount: disc.discount.toFixed(2),
              total: calculateTotal(
                subtotal,
                currentTaxAmount,
                disc.discount,
              ).toFixed(2),
            },
          });
        };

        const handleDiscountAmountChange = (value: string) => {
          const disc = calculateDiscount(
            subtotal,
            0,
            Number.parseFloat(value || "0"),
            "amount",
          );
          const currentTaxAmount = Number.parseFloat(
            String(section.data.taxAmount || "0"),
          );
          updateSection(section.id, {
            data: {
              ...section.data,
              discount: value,
              discountRate: disc.discountRate.toFixed(2),
              total: calculateTotal(
                subtotal,
                currentTaxAmount,
                disc.discount,
              ).toFixed(2),
            },
          });
        };

        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="subtotal">
                Subtotal
              </Label>
              <CurrencyInput
                className="mt-1"
                disabled
                id="subtotal"
                value={String(section.data.subtotal || "")}
              />
            </div>

            {/* Tax Section */}
            <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Tax</Label>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    className={`px-2 py-1 rounded ${taxMode === "percentage" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => handleTaxModeChange("percentage")}
                    type="button"
                  >
                    %
                  </button>
                  <button
                    className={`px-2 py-1 rounded ${taxMode === "amount" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => handleTaxModeChange("amount")}
                    type="button"
                  >
                    $
                  </button>
                </div>
              </div>

              {taxMode === "percentage" ? (
                <>
                  <div>
                    <Label className="text-xs" htmlFor="taxRate">
                      Tax Rate (%)
                    </Label>
                    <NumberInput
                      allowNegative={false}
                      className="mt-1"
                      decimalScale={2}
                      fixedDecimalScale={false}
                      id="taxRate"
                      onChange={handleTaxRateChange}
                      placeholder="10"
                      thousandSeparator={false}
                      value={String(section.data.taxRate || "")}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Tax Amount (calculated)
                    </Label>
                    <CurrencyInput
                      className="mt-1 bg-muted/50"
                      disabled
                      value={String(section.data.taxAmount || "0.00")}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs" htmlFor="taxAmount">
                      Tax Amount
                    </Label>
                    <CurrencyInput
                      className="mt-1"
                      id="taxAmount"
                      onChange={handleTaxAmountChange}
                      value={String(section.data.taxAmount || "")}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      checked={showTaxRate}
                      className="h-4 w-4 rounded border-gray-300"
                      id="showTaxRate"
                      onChange={(e) =>
                        updateData("showTaxRate", e.target.checked)
                      }
                      type="checkbox"
                    />
                    <Label className="text-xs" htmlFor="showTaxRate">
                      Show percentage on document
                    </Label>
                  </div>
                  {showTaxRate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Tax Rate (calculated)
                      </Label>
                      <NumberInput
                        allowNegative={false}
                        className="mt-1 bg-muted/50"
                        decimalScale={2}
                        disabled
                        fixedDecimalScale={false}
                        thousandSeparator={false}
                        value={String(section.data.taxRate || "0.00")}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Discount Section */}
            <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Discount</Label>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    className={`px-2 py-1 rounded ${discountMode === "percentage" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => handleDiscountModeChange("percentage")}
                    type="button"
                  >
                    %
                  </button>
                  <button
                    className={`px-2 py-1 rounded ${discountMode === "amount" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() => handleDiscountModeChange("amount")}
                    type="button"
                  >
                    $
                  </button>
                </div>
              </div>

              {discountMode === "percentage" ? (
                <>
                  <div>
                    <Label className="text-xs" htmlFor="discountRate">
                      Discount Rate (%)
                    </Label>
                    <NumberInput
                      allowNegative={false}
                      className="mt-1"
                      decimalScale={2}
                      fixedDecimalScale={false}
                      id="discountRate"
                      onChange={handleDiscountRateChange}
                      placeholder="5"
                      thousandSeparator={false}
                      value={String(section.data.discountRate || "")}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Discount Amount (calculated)
                    </Label>
                    <CurrencyInput
                      className="mt-1 bg-muted/50"
                      disabled
                      value={String(section.data.discount || "0.00")}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs" htmlFor="discount">
                      Discount Amount
                    </Label>
                    <CurrencyInput
                      className="mt-1"
                      id="discount"
                      onChange={handleDiscountAmountChange}
                      value={String(section.data.discount || "")}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      checked={showDiscountRate}
                      className="h-4 w-4 rounded border-gray-300"
                      id="showDiscountRate"
                      onChange={(e) =>
                        updateData("showDiscountRate", e.target.checked)
                      }
                      type="checkbox"
                    />
                    <Label className="text-xs" htmlFor="showDiscountRate">
                      Show percentage on document
                    </Label>
                  </div>
                  {showDiscountRate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Discount Rate (calculated)
                      </Label>
                      <NumberInput
                        allowNegative={false}
                        className="mt-1 bg-muted/50"
                        decimalScale={2}
                        disabled
                        fixedDecimalScale={false}
                        thousandSeparator={false}
                        value={String(section.data.discountRate || "0.00")}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <Label className="text-xs" htmlFor="total">
                Total
              </Label>
              <CurrencyInput
                className="mt-1 font-semibold"
                disabled
                id="total"
                value={String(section.data.total || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="paymentMethod">
                Payment Method
              </Label>
              <Input
                className="mt-1"
                id="paymentMethod"
                onChange={(e) => updateData("paymentMethod", e.target.value)}
                placeholder="Credit Card ending in 1234"
                value={String(section.data.paymentMethod || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="transactionId">
                Transaction ID (Optional)
              </Label>
              <Input
                className="mt-1"
                id="transactionId"
                onChange={(e) => updateData("transactionId", e.target.value)}
                placeholder="TXN-2024-001"
                value={String(section.data.transactionId || "")}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="thankYouMessage">
                Thank You Message
              </Label>
              <textarea
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="thankYouMessage"
                onChange={(e) => updateData("thankYouMessage", e.target.value)}
                placeholder="Thank you for your purchase!"
                value={String(section.data.thankYouMessage || "")}
              />
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="text-sm text-muted-foreground">
            Content editing not available for this section type.
          </div>
        );
    }
  };

  return (
    <div
      className="h-full w-full md:w-80 bg-muted/30 md:border-l border-border overflow-y-auto"
      data-testid="properties-panel"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3
          className="font-semibold text-foreground"
          data-testid="content-editor-heading"
        >
          {sectionInfo?.name ?? "Content Editor"}
        </h3>
        <Button
          className="h-8 w-8 md:block hidden"
          onClick={() => selectSection(null)}
          size="icon"
          title="Close"
          type="button"
          variant="ghost"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {sectionInfo?.filledByDeal ? (
          <div
            className="flex gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
            data-testid="filled-by-deal"
          >
            <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-sm">
                Filled in by each deal
              </span>
              <span>
                When a deal sends this document, these come from the deal and
                its customer. You see sample values here.
              </span>
              <ul className="list-disc space-y-0.5 pl-4">
                {sectionInfo.filledByDeal.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {renderContentEditor()}
        <SectionColorPaletteEditor section={section} />
      </div>
    </div>
  );
}
