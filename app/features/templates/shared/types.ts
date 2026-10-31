export type TemplateType =
  | "resume"
  | "invoice"
  | "certificate"
  | "report-cards"
  | "quote"
  | "proposal"
  | "contract"
  | "purchase-order"
  | "receipt"
  | "sales-order"
  | "order-confirmation"
  | "packing-slip"
  | "delivery-note"
  | "estimate"
  | "statement"
  | "letter"
  | "form"
  | "label";

export type SectionType =
  | "header"
  | "personal-info"
  | "experience"
  | "education"
  | "skills"
  | "summary"
  | "certifications"
  | "projects"
  | "languages"
  | "invoice-header"
  | "invoice-items"
  | "invoice-footer"
  | "certificate-header"
  | "certificate-body"
  | "report-header"
  | "report-grades"
  | "quote-header"
  | "quote-items"
  | "quote-footer"
  | "proposal-header"
  | "proposal-body"
  | "proposal-footer"
  | "contract-header"
  | "contract-body"
  | "contract-signature"
  | "purchase-order-header"
  | "purchase-order-items"
  | "purchase-order-footer"
  | "sales-order-header"
  | "sales-order-items"
  | "sales-order-footer"
  | "order-confirmation-header"
  | "order-confirmation-items"
  | "order-confirmation-footer"
  | "packing-slip-header"
  | "packing-slip-items"
  | "packing-slip-footer"
  | "delivery-note-header"
  | "delivery-note-items"
  | "delivery-note-footer"
  | "receipt-header"
  | "receipt-items"
  | "receipt-footer"
  | "estimate-header"
  | "estimate-items"
  | "estimate-footer"
  | "statement-header"
  | "statement-transactions"
  | "statement-footer"
  | "letter-header"
  | "letter-body"
  | "letter-footer"
  | "form-header"
  | "form-field"
  | "form-footer"
  | "label-content";

export interface SectionStyles {
  // Spacing
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;

  // Layout
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  alignSelf?: string;
  flexWrap?: string;
  gap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;

  // Colors & Backgrounds
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  background?: string;
  color?: string;

  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  textShadow?: string;

  // Borders
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRadius?: string;
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomLeftRadius?: string;
  borderBottomRightRadius?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: string;

  // Effects
  boxShadow?: string;
  opacity?: string;
  transform?: string;
  transition?: string;
  filter?: string;
  backdropFilter?: string;
  visibility?: "visible" | "hidden";

  // Positioning
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: string;

  // Sizing
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;

  // Overflow
  overflow?: string;
  overflowX?: string;
  overflowY?: string;

  // Advanced
  clipPath?: string;
  maskImage?: string;
  objectFit?: string;
  cursor?: string;
}

export interface TemplateSection {
  id: string;
  type: SectionType;
  order: number;
  data: Record<string, unknown>;
  styles: SectionStyles;
  colorPalette?: string[]; // Section-specific palette (only when usingGlobalPalette is false)
  usingGlobalPalette?: boolean; // Defaults to true
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  organizationId: string;
  sections: TemplateSection[];
  globalStyles: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  colorPalette: string[];
  sourceTemplateId?: string; // ID of the default template this was created from
  /** Deals use it for this type when a workflow step doesn't pick a template. */
  isDefault?: boolean;
}

export interface ComponentDefinition {
  type: SectionType;
  label: string;
  icon: string;
  defaultData: Record<string, unknown>;
  defaultStyles: SectionStyles;
  configurableProperties: string[];
}

export interface ExperienceEntry {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  year: string;
}

export interface SocialLink {
  name: string;
  link: string;
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  date: string;
  link: string;
}

export interface ProjectEntry {
  name: string;
  description: string;
  technologies: string[];
  link: string;
  date: string;
}

export interface LanguageEntry {
  language: string;
  proficiency: "Beginner" | "Intermediate" | "Advanced" | "Fluent" | "Native";
}

export interface InvoiceItem {
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

export interface InvoiceHeaderData {
  companyLogo?: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  billToName: string;
  billToAddress: string;
  shipToName?: string;
  shipToAddress?: string;
}
