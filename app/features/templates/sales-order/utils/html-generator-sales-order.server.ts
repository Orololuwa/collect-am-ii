import { formatCurrency } from "../../invoice/utils/currency-formatter";
import type { SectionStyles, TemplateSection } from "../../shared/types";
import {
  getSectionColorPalette,
  resolveStyleColors,
} from "../../shared/utils/color-resolver";
import { sanitizeQuillHtml } from "../../shared/utils/sanitize-quill-html.server";

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

function renderSalesOrderSectionToHTML(
  section: TemplateSection,
  currency: string = "USD",
  globalColorPalette: string[] = [],
): string {
  const sectionColorPalette = getSectionColorPalette(
    section.usingGlobalPalette,
    section.colorPalette,
    globalColorPalette,
  );
  const inlineStyles = objectToCSS(section.styles, sectionColorPalette);

  switch (section.type) {
    case "sales-order-header": {
      const logoUrl = section.data.companyLogo as string | undefined;
      return `
        <section class="section-so-header" style="${inlineStyles}">
          <div class="so-header-content">
            <div class="so-company-info">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Company Logo" class="so-company-logo" loading="eager" />` : ""}
              <h1 class="so-company-name">${escapeHtml(String(section.data.companyName || ""))}</h1>
              ${section.data.companyAddress ? `<div class="so-company-address">${escapeHtml(String(section.data.companyAddress)).replace(/\n/g, "<br>")}</div>` : ""}
              ${section.data.companyEmail ? `<div class="so-company-contact">${escapeHtml(String(section.data.companyEmail))}</div>` : ""}
              ${section.data.companyPhone ? `<div class="so-company-contact">${escapeHtml(String(section.data.companyPhone))}</div>` : ""}
            </div>
            <div class="so-meta">
              <h2 class="so-title">SALES ORDER</h2>
              <div class="so-details">
                ${section.data.orderNumber ? `<div><span class="so-label">Order #:</span> ${escapeHtml(String(section.data.orderNumber))}</div>` : ""}
                ${section.data.customerPoNumber ? `<div><span class="so-label">Your PO #:</span> ${escapeHtml(String(section.data.customerPoNumber))}</div>` : ""}
                ${section.data.orderDate ? `<div><span class="so-label">Order Date:</span> ${escapeHtml(String(section.data.orderDate))}</div>` : ""}
              </div>
            </div>
          </div>
          <div class="so-addresses">
            <div class="so-bill-to">
              <h3>Bill To:</h3>
              ${section.data.billToName ? `<div class="so-client-name">${escapeHtml(String(section.data.billToName))}</div>` : ""}
              ${section.data.billToAddress ? `<div class="so-client-address">${escapeHtml(String(section.data.billToAddress)).replace(/\n/g, "<br>")}</div>` : ""}
            </div>
            ${
              section.data.shipToName
                ? `
            <div class="so-ship-to">
              <h3>Ship To:</h3>
              <div class="so-delivery-name">${escapeHtml(String(section.data.shipToName))}</div>
              ${section.data.shipToAddress ? `<div class="so-delivery-address">${escapeHtml(String(section.data.shipToAddress)).replace(/\n/g, "<br>")}</div>` : ""}
            </div>
            `
                : ""
            }
          </div>
        </section>
      `;
    }

    case "sales-order-items": {
      const items = Array.isArray(section.data.items)
        ? (section.data.items as Array<{
            description: string;
            quantity: string;
            unitPrice: string;
            total: string;
          }>)
        : [];
      return `
        <section class="section-so-items" style="${inlineStyles}">
          <table class="so-items-table">
            <thead>
              <tr>
                <th class="so-item-description">Description</th>
                <th class="so-item-quantity">Quantity</th>
                <th class="so-item-price">Unit Price</th>
                <th class="so-item-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                items.length === 0
                  ? `<tr><td colspan="4" class="so-empty">No items</td></tr>`
                  : items
                      .map(
                        (item) => `
                <tr class="so-item-row">
                  <td>${escapeHtml(item.description || "")}</td>
                  <td class="so-item-number">${escapeHtml(item.quantity || "0")}</td>
                  <td class="so-item-number">${escapeHtml(formatCurrency(item.unitPrice, "en-US", currency))}</td>
                  <td class="so-item-number">${escapeHtml(formatCurrency(item.total, "en-US", currency))}</td>
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

    case "sales-order-footer": {
      const taxMode = (section.data.taxMode as string) || "percentage";
      const discountMode =
        (section.data.discountMode as string) || "percentage";
      const showTaxRate = section.data.showTaxRate !== false;
      const showDiscountRate = section.data.showDiscountRate !== false;
      const taxRate = Number.parseFloat(String(section.data.taxRate || "0"));
      const discountRate = Number.parseFloat(
        String(section.data.discountRate || "0"),
      );

      return `
        <section class="section-so-footer" style="${inlineStyles}">
          <div class="so-totals">
            <div class="so-totals-wrapper">
              <div class="so-total-row">
                <span class="so-total-label">Subtotal:</span>
                <span class="so-total-value">${escapeHtml(formatCurrency(section.data.subtotal as string | number | undefined, "en-US", currency))}</span>
              </div>
              ${
                Number.parseFloat(String(section.data.taxAmount || "0")) > 0
                  ? `
              <div class="so-total-row">
                <span class="so-total-label">${
                  taxMode === "percentage" ||
                  (taxMode === "amount" && showTaxRate && taxRate > 0)
                    ? `Tax (${escapeHtml(String(section.data.taxRate || "0"))}%):`
                    : "Tax:"
                }</span>
                <span class="so-total-value">${escapeHtml(formatCurrency(section.data.taxAmount as string | number | undefined, "en-US", currency))}</span>
              </div>
              `
                  : ""
              }
              ${
                Number.parseFloat(String(section.data.discount || "0")) > 0
                  ? `
              <div class="so-total-row">
                <span class="so-total-label">${
                  discountMode === "percentage" ||
                  (
                    discountMode === "amount" &&
                      showDiscountRate &&
                      discountRate > 0
                  )
                    ? `Discount (${escapeHtml(String(section.data.discountRate || "0"))}%):`
                    : "Discount:"
                }</span>
                <span class="so-total-value">-${escapeHtml(formatCurrency(section.data.discount as string | number | undefined, "en-US", currency))}</span>
              </div>
              `
                  : ""
              }
              <div class="so-total-row so-total-final">
                <span class="so-total-label">Total:</span>
                <span class="so-total-value">${escapeHtml(formatCurrency(section.data.total as string | number | undefined, "en-US", currency))}</span>
              </div>
            </div>
          </div>
          ${
            section.data.notes
              ? `<div class="so-notes"><strong>Internal Notes:</strong> <div class="rich-text-content">${sanitizeQuillHtml(String(section.data.notes))}</div></div>`
              : ""
          }
          ${
            section.data.terms
              ? `<div class="so-terms"><strong>Internal Instructions:</strong> <div class="rich-text-content">${sanitizeQuillHtml(String(section.data.terms))}</div></div>`
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

function generateSalesOrderHTML(
  sections: TemplateSection[],
  globalStyles: Record<string, string>,
  isExport: boolean,
  colorPalette: string[] = [],
): string {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const globalCSS = objectToCSS(globalStyles as SectionStyles, colorPalette);
  const currency = (globalStyles.currency as string) || "USD";
  const sectionsHTML = sortedSections
    .map((section) =>
      renderSalesOrderSectionToHTML(section, currency, colorPalette),
    )
    .join("\n");

  const textColor = globalStyles.color || globalStyles.textColor || "#000000";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isExport ? "Sales Order Export" : "Sales Order Preview"}</title>
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

    .section-so-header { margin-bottom: 2rem; }
    .so-header-content { display: flex; justify-content: space-between; margin-bottom: 2rem; }
    .so-company-info { flex: 1; }
    .so-company-logo { max-height: 60px; max-width: 200px; margin-bottom: 1rem; object-fit: contain; }
    .so-company-name { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; }
    .so-company-address, .so-company-contact { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem; white-space: pre-line; }
    .section-so-header[style*="background"] .so-company-address,
    .section-so-header[style*="background"] .so-company-contact,
    .section-so-header[style*="background"] .so-label,
    .section-so-header[style*="background"] .so-client-address { color: inherit; opacity: 0.9; }
    .so-meta { text-align: right; }
    .so-title { font-size: 2rem; font-weight: bold; margin-bottom: 1rem; }
    .so-details { font-size: 0.875rem; }
    .so-details div { margin-bottom: 0.25rem; }
    .so-label { color: #6b7280; }
    .so-addresses { display: flex; justify-content: space-between; margin-top: 2rem; }
    .so-bill-to, .so-ship-to { flex: 1; }
    .so-bill-to h3, .so-ship-to h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .so-client-name, .so-delivery-name { font-weight: 500; margin-bottom: 0.25rem; }
    .so-client-address, .so-delivery-address { font-size: 0.875rem; color: #6b7280; white-space: pre-line; }
    .section-so-header[style*="background"] h1, .section-so-header[style*="background"] h2,
    .section-so-header[style*="background"] h3, .section-so-header[style*="background"] .so-client-name,
    .section-so-header[style*="background"] .so-delivery-name { color: inherit; }
    .section-so-items { margin: 2rem 0; }
    .so-items-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    .so-items-table thead { background-color: #f3f4f6; }
    .so-items-table th { padding: 0.75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    .so-item-quantity, .so-item-price, .so-item-total { text-align: right; }
    .so-items-table td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; max-width: 0; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }
    .so-item-description { max-width: 50%; }
    .so-item-number { text-align: right; }
    .so-empty { text-align: center; color: #9ca3af; padding: 2rem; }
    .section-so-footer { margin-top: 2rem; }
    .so-totals { display: flex; justify-content: flex-end; }
    .so-totals-wrapper { width: 16rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .so-total-row { display: flex; justify-content: space-between; }
    .so-total-label { color: #4b5563; }
    .so-total-value { font-weight: 500; }
    .so-total-final { border-top: 2px solid #d1d5db; padding-top: 0.5rem; margin-top: 0; font-size: 1.125rem; font-weight: bold; }
    .so-notes { margin-top: 1.5rem; font-size: 0.875rem; color: #4b5563; }
    .so-terms { margin-top: 1rem; font-size: 0.875rem; color: #4b5563; white-space: pre-line; max-width: 100%; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }
    .section-so-items[style*="color"] .so-items-table,
    .section-so-items[style*="color"] .so-items-table td,
    .section-so-items[style*="color"] .so-items-table th { color: inherit; }
    .section-so-footer[style*="color"] .so-total-value,
    .section-so-footer[style*="color"] .so-total-final { color: inherit; }
    ${
      isExport
        ? `
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; orphans: 3; widows: 3; }
      .section-so-header, .section-so-items, .section-so-footer { page-break-inside: auto; break-inside: auto; }
      .so-items-table tbody tr.so-item-row { page-break-inside: avoid; break-inside: avoid; }
      .so-totals-wrapper { page-break-inside: avoid; break-inside: avoid; }
    }
    `
        : `
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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

export function generateSalesOrderPreviewHTML(
  sections: TemplateSection[],
  globalStyles: Record<string, string>,
  colorPalette: string[] = [],
): string {
  return generateSalesOrderHTML(sections, globalStyles, false, colorPalette);
}

export function generateSalesOrderExportHTML(
  sections: TemplateSection[],
  globalStyles: Record<string, string>,
  colorPalette: string[] = [],
): string {
  return generateSalesOrderHTML(sections, globalStyles, true, colorPalette);
}
