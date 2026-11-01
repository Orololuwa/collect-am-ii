import type { SectionStyles, TemplateSection } from "../../shared/types";
import {
  getSectionColorPalette,
  resolveStyleColors,
} from "../../shared/utils/color-resolver";
import { sanitizeQuillHtml } from "../../shared/utils/sanitize-quill-html.server";
import { formatCurrency } from "./currency-formatter";

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "'": "&#039;",
    '"': "&quot;",
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

function objectToCSS(
  styles: SectionStyles,
  colorPalette: string[] = [],
): string {
  // Resolve color references before converting to CSS
  const resolvedStyles = resolveStyleColors(
    styles as Record<string, string>,
    colorPalette,
  );
  return Object.entries(resolvedStyles)
    .filter(
      ([_, value]) => value !== undefined && value !== null && value !== "",
    )
    .map(([key, value]) => {
      const cssProperty = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${cssProperty}: ${value};`;
    })
    .join(" ");
}

function renderInvoiceSectionToHTML(
  section: TemplateSection,
  currency: string = "USD",
  globalColorPalette: string[] = [],
): string {
  // Determine which palette to use for this section
  const sectionColorPalette = getSectionColorPalette(
    section.usingGlobalPalette,
    section.colorPalette,
    globalColorPalette,
  );
  const inlineStyles = objectToCSS(section.styles, sectionColorPalette);

  switch (section.type) {
    case "invoice-header": {
      const logoUrl = section.data.companyLogo as string | undefined;
      return `
        <section class="section-invoice-header" style="${inlineStyles}">
          <div class="invoice-header-content">
            <div class="invoice-company-info">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Company Logo" class="invoice-company-logo" loading="eager" />` : ""}
              <h1 class="invoice-company-name">${escapeHtml(String(section.data.companyName || ""))}</h1>
              ${section.data.companyAddress ? `<div class="invoice-company-address">${escapeHtml(String(section.data.companyAddress)).replace(/\n/g, "<br>")}</div>` : ""}
              ${section.data.companyEmail ? `<div class="invoice-company-contact">${escapeHtml(String(section.data.companyEmail))}</div>` : ""}
              ${section.data.companyPhone ? `<div class="invoice-company-contact">${escapeHtml(String(section.data.companyPhone))}</div>` : ""}
            </div>
            <div class="invoice-meta">
              <h2 class="invoice-title">INVOICE</h2>
              <div class="invoice-details">
                ${section.data.invoiceNumber ? `<div><span class="invoice-label">Invoice #:</span> ${escapeHtml(String(section.data.invoiceNumber))}</div>` : ""}
                ${section.data.customerPoNumber ? `<div><span class="invoice-label">Your PO #:</span> ${escapeHtml(String(section.data.customerPoNumber))}</div>` : ""}
                ${section.data.invoiceDate ? `<div><span class="invoice-label">Date:</span> ${escapeHtml(String(section.data.invoiceDate))}</div>` : ""}
                ${section.data.dueDate ? `<div><span class="invoice-label">Due Date:</span> ${escapeHtml(String(section.data.dueDate))}</div>` : ""}
              </div>
            </div>
          </div>
          <div class="invoice-addresses">
            <div class="invoice-bill-to">
              <h3>Bill To:</h3>
              ${section.data.billToName ? `<div class="invoice-client-name">${escapeHtml(String(section.data.billToName))}</div>` : ""}
              ${section.data.billToAddress ? `<div class="invoice-client-address">${escapeHtml(String(section.data.billToAddress)).replace(/\n/g, "<br>")}</div>` : ""}
            </div>
            ${
              section.data.shipToName
                ? `
            <div class="invoice-ship-to">
              <h3>Ship To:</h3>
              <div class="invoice-client-name">${escapeHtml(String(section.data.shipToName))}</div>
              ${section.data.shipToAddress ? `<div class="invoice-client-address">${escapeHtml(String(section.data.shipToAddress)).replace(/\n/g, "<br>")}</div>` : ""}
            </div>
            `
                : ""
            }
          </div>
        </section>
      `;
    }

    case "invoice-items": {
      const items = Array.isArray(section.data.items)
        ? (section.data.items as Array<{
            description: string;
            quantity: string;
            unitPrice: string;
            total: string;
          }>)
        : [];
      return `
        <section class="section-invoice-items" style="${inlineStyles}">
          <table class="invoice-items-table">
            <thead>
              <tr>
                <th class="invoice-item-description">Description</th>
                <th class="invoice-item-quantity">Quantity</th>
                <th class="invoice-item-price">Unit Price</th>
                <th class="invoice-item-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                items.length === 0
                  ? `<tr><td colspan="4" class="invoice-empty">No items</td></tr>`
                  : items
                      .map(
                        (item) => `
                <tr class="invoice-item-row">
                  <td>${escapeHtml(item.description || "")}</td>
                  <td class="invoice-item-number">${escapeHtml(item.quantity || "0")}</td>
                  <td class="invoice-item-number">${escapeHtml(formatCurrency(item.unitPrice, "en-US", currency))}</td>
                  <td class="invoice-item-number">${escapeHtml(formatCurrency(item.total, "en-US", currency))}</td>
                </tr>
              `,
                      )
                      .join("")
              }
            </tbody>
          </table>
        </section>
      `;
    }

    case "invoice-footer": {
      const taxMode = (section.data.taxMode as string) || "percentage";
      const discountMode =
        (section.data.discountMode as string) || "percentage";
      const showTaxRate = section.data.showTaxRate !== false;
      const showDiscountRate = section.data.showDiscountRate !== false;
      const taxAmount = Number.parseFloat(
        String(section.data.taxAmount || "0"),
      );
      const discount = Number.parseFloat(String(section.data.discount || "0"));
      const taxRate = Number.parseFloat(String(section.data.taxRate || "0"));
      const discountRate = Number.parseFloat(
        String(section.data.discountRate || "0"),
      );

      return `
        <section class="section-invoice-footer" style="${inlineStyles}">
          <div class="invoice-totals">
            <div class="invoice-totals-wrapper">
              <div class="invoice-total-row">
                <span class="invoice-total-label">Subtotal:</span>
                <span class="invoice-total-value">${escapeHtml(formatCurrency(section.data.subtotal as string | number | undefined, "en-US", currency))}</span>
              </div>
              ${
                taxAmount > 0
                  ? `
              <div class="invoice-total-row">
                <span class="invoice-total-label">${
                  taxMode === "percentage" ||
                  (taxMode === "amount" && showTaxRate && taxRate > 0)
                    ? `Tax (${escapeHtml(String(section.data.taxRate || "0"))}%):`
                    : "Tax:"
                }</span>
                <span class="invoice-total-value">${escapeHtml(formatCurrency(section.data.taxAmount as string | number | undefined, "en-US", currency))}</span>
              </div>
              `
                  : ""
              }
              ${
                discount > 0
                  ? `
              <div class="invoice-total-row">
                <span class="invoice-total-label">${
                  discountMode === "percentage" ||
                  (
                    discountMode === "amount" &&
                      showDiscountRate &&
                      discountRate > 0
                  )
                    ? `Discount (${escapeHtml(String(section.data.discountRate || "0"))}%):`
                    : "Discount:"
                }</span>
                <span class="invoice-total-value">-${escapeHtml(formatCurrency(section.data.discount as string | number | undefined, "en-US", currency))}</span>
              </div>
              `
                  : ""
              }
              <div class="invoice-total-row invoice-total-final">
                <span class="invoice-total-label">Total:</span>
                <span class="invoice-total-value">${escapeHtml(formatCurrency(section.data.total as string | number | undefined, "en-US", currency))}</span>
              </div>
            </div>
          </div>
          ${
            section.data.paymentTerms
              ? `<div class="invoice-payment-terms"><strong>Payment Terms:</strong> <div class="rich-text-content">${sanitizeQuillHtml(String(section.data.paymentTerms))}</div></div>`
              : ""
          }
          ${
            section.data.notes
              ? `<div class="invoice-notes">${escapeHtml(String(section.data.notes)).replace(/\n/g, "<br>")}</div>`
              : ""
          }
        </section>
      `;
    }

    default:
      return `
        <section class="section-${section.type}" style="${inlineStyles}">
          ${JSON.stringify(section.data)}
        </section>
      `;
  }
}

function generateInvoiceHTML(
  sections: TemplateSection[],
  globalStyles: Record<string, string>,
  isExport: boolean,
  colorPalette: string[] = [],
): string {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const globalCSS = objectToCSS(globalStyles as SectionStyles, colorPalette);
  // Get currency from global styles, default to USD
  const currency = (globalStyles.currency as string) || "USD";
  const sectionsHTML = sortedSections
    .map((section) =>
      renderInvoiceSectionToHTML(section, currency, colorPalette),
    )
    .join("\n");

  // Get text color from global styles (supports both 'color' and 'textColor')
  const textColor = globalStyles.color || globalStyles.textColor || "#000000";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isExport ? "Invoice Export" : "Invoice Preview"}</title>
  <style>
    @page {
      margin: 0;
      size: A4;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    
    body {
      ${globalCSS}
      line-height: 1.6;
      color: ${textColor};
    }
    
    .template-container {
      ${isExport ? `width: 210mm; margin: 0;` : `max-width: 210mm; margin: 0 auto;`}
      background: white;
      padding: 0;
    }
    
    .section-invoice-header {
      margin-bottom: 2rem;
    }
    
    .invoice-header-content {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2rem;
    }
    
    .invoice-company-info {
      flex: 1;
    }
    
    .invoice-company-logo {
      max-height: 60px;
      max-width: 200px;
      margin-bottom: 1rem;
      object-fit: contain;
    }
    
    .invoice-company-name {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    
    .invoice-company-address,
    .invoice-company-contact {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
      white-space: pre-line;
    }
    
    /* When header has dark background, inherit text color */
    .section-invoice-header[style*="background"] .invoice-company-address,
    .section-invoice-header[style*="background"] .invoice-company-contact,
    .section-invoice-header[style*="background"] .invoice-label,
    .section-invoice-header[style*="background"] .invoice-client-address {
      color: inherit;
      opacity: 0.9;
    }
    
    /* When section has color set, use it for text elements */
    .section-invoice-items[style*="color"] .invoice-items-table,
    .section-invoice-items[style*="color"] .invoice-items-table td,
    .section-invoice-items[style*="color"] .invoice-items-table th {
      color: inherit;
    }
    
    
    .section-invoice-footer[style*="color"] .invoice-total-value,
    .section-invoice-footer[style*="color"] .invoice-total-final {
      color: inherit;
    }
    
    .invoice-meta {
      text-align: right;
    }
    
    .invoice-title {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 1rem;
    }
    
    .invoice-details {
      font-size: 0.875rem;
    }
    
    .invoice-details div {
      margin-bottom: 0.25rem;
    }
    
    .invoice-label {
      color: #6b7280;
    }
    
    .invoice-addresses {
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
    }
    
    .invoice-bill-to,
    .invoice-ship-to {
      flex: 1;
    }
    
    .invoice-bill-to h3,
    .invoice-ship-to h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .invoice-client-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .invoice-client-address {
      font-size: 0.875rem;
      color: #6b7280;
      white-space: pre-line;
    }
    
    /* Ensure text is visible on dark header backgrounds */
    .section-invoice-header[style*="background"] h1,
    .section-invoice-header[style*="background"] h2,
    .section-invoice-header[style*="background"] h3,
    .section-invoice-header[style*="background"] .invoice-client-name {
      color: inherit;
    }
    
    .section-invoice-items {
      margin: 2rem 0;
    }
    
    .invoice-items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }
    
    .invoice-items-table thead {
      background-color: #f3f4f6;
    }
    
    /* Darker header for professional template */
    .section-invoice-items[style*="background-color: #ffffff"] .invoice-items-table thead {
      background-color: #f1f5f9;
    }
    
    .invoice-items-table th {
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .invoice-item-quantity,
    .invoice-item-price,
    .invoice-item-total {
      text-align: right;
    }
    
    .invoice-items-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
      max-width: 0;
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
    }
    
    .invoice-item-description {
      max-width: 50%;
    }
    
    .invoice-item-number {
      text-align: right;
    }
    
    .invoice-empty {
      text-align: center;
      color: #9ca3af;
      padding: 2rem;
    }
    
    .section-invoice-footer {
      margin-top: 2rem;
    }
    
    .invoice-totals {
      display: flex;
      justify-content: flex-end;
    }
    
    .invoice-totals-wrapper {
      width: 16rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .invoice-total-row {
      display: flex;
      justify-content: space-between;
    }
    
    .invoice-total-label {
      color: #4b5563;
    }
    
    .invoice-total-value {
      font-weight: 500;
    }
    
    .invoice-total-final {
      border-top: 2px solid #d1d5db;
      padding-top: 0.5rem;
      margin-top: 0;
      font-size: 1.125rem;
      font-weight: bold;
    }
    
    .invoice-payment-terms {
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: #4b5563;
    }
    
    .invoice-notes {
      margin-top: 1rem;
      font-size: 0.875rem;
      color: #4b5563;
      white-space: pre-line;
      max-width: 100%;
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
    }
    
    ${
      isExport
        ? `
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        orphans: 3;
        widows: 3;
      }
      
      /* Invoice sections can break across pages */
      .section-invoice-header,
      .section-invoice-items,
      .section-invoice-footer {
        page-break-inside: auto;
        break-inside: auto;
        page-break-before: auto;
      }
      
      /* Prevent individual invoice item rows from breaking */
      .invoice-items-table tbody tr.invoice-item-row {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Keep invoice footer totals together if possible, but allow breaking if needed */
      .invoice-totals-wrapper {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
    `
        : `
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    `
    }
  </style>
</head>
<body>
  <div class="template-container">
    ${sectionsHTML}
  </div>
</body>
</html>
  `.trim();
}

export function generateInvoicePreviewHTML(
  sections: TemplateSection[],
  globalStyles: Record<string, string>,
  colorPalette: string[] = [],
): string {
  return generateInvoiceHTML(sections, globalStyles, false, colorPalette);
}

export function generateInvoiceExportHTML(
  sections: TemplateSection[],
  globalStyles: Record<string, string>,
  colorPalette: string[] = [],
): string {
  return generateInvoiceHTML(sections, globalStyles, true, colorPalette);
}
