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

function renderOrderConfirmationSectionToHTML(
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
    case "order-confirmation-header": {
      const logoUrl = section.data.companyLogo as string | undefined;
      return `
        <section class="section-oc-header" style="${inlineStyles}">
          <div class="oc-header-content">
            <div class="oc-company-info">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Company Logo" class="oc-company-logo" loading="eager" />` : ""}
              <h1 class="oc-company-name">${escapeHtml(String(section.data.companyName || ""))}</h1>
              ${section.data.companyAddress ? `<div class="oc-company-address">${escapeHtml(String(section.data.companyAddress)).replace(/\n/g, "<br>")}</div>` : ""}
              ${section.data.companyEmail ? `<div class="oc-company-contact">${escapeHtml(String(section.data.companyEmail))}</div>` : ""}
              ${section.data.companyPhone ? `<div class="oc-company-contact">${escapeHtml(String(section.data.companyPhone))}</div>` : ""}
            </div>
            <div class="oc-meta">
              <h2 class="oc-title">ORDER CONFIRMATION</h2>
              <div class="oc-details">
                ${section.data.confirmationNumber ? `<div><span class="oc-label">Confirmation #:</span> ${escapeHtml(String(section.data.confirmationNumber))}</div>` : ""}
                ${section.data.customerPoNumber ? `<div><span class="oc-label">Your PO #:</span> ${escapeHtml(String(section.data.customerPoNumber))}</div>` : ""}
                ${section.data.orderReference ? `<div><span class="oc-label">Order Ref:</span> ${escapeHtml(String(section.data.orderReference))}</div>` : ""}
                ${section.data.orderDate ? `<div><span class="oc-label">Order Date:</span> ${escapeHtml(String(section.data.orderDate))}</div>` : ""}
                ${section.data.expectedShipDate ? `<div><span class="oc-label">Expected Ship Date:</span> ${escapeHtml(String(section.data.expectedShipDate))}</div>` : ""}
              </div>
            </div>
          </div>
          <div class="oc-addresses">
            <div class="oc-bill-to">
              <h3>Bill To:</h3>
              ${section.data.billToName ? `<div class="oc-customer-name">${escapeHtml(String(section.data.billToName))}</div>` : ""}
              ${section.data.billToAddress ? `<div class="oc-customer-address">${escapeHtml(String(section.data.billToAddress)).replace(/\n/g, "<br>")}</div>` : ""}
            </div>
            ${
              section.data.shipToName
                ? `
            <div class="oc-ship-to">
              <h3>Ship To:</h3>
              <div class="oc-delivery-name">${escapeHtml(String(section.data.shipToName))}</div>
              ${section.data.shipToAddress ? `<div class="oc-delivery-address">${escapeHtml(String(section.data.shipToAddress)).replace(/\n/g, "<br>")}</div>` : ""}
            </div>
            `
                : ""
            }
          </div>
        </section>
      `;
    }

    case "order-confirmation-items": {
      const items = Array.isArray(section.data.items)
        ? (section.data.items as Array<{
            description: string;
            quantity: string;
            unitPrice: string;
            total: string;
          }>)
        : [];
      return `
        <section class="section-oc-items" style="${inlineStyles}">
          <table class="oc-items-table">
            <thead>
              <tr>
                <th class="oc-item-description">Description</th>
                <th class="oc-item-quantity">Quantity</th>
                <th class="oc-item-price">Unit Price</th>
                <th class="oc-item-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                items.length === 0
                  ? `<tr><td colspan="4" class="oc-empty">No items</td></tr>`
                  : items
                      .map(
                        (item) => `
                <tr class="oc-item-row">
                  <td>${escapeHtml(item.description || "")}</td>
                  <td class="oc-item-number">${escapeHtml(item.quantity || "0")}</td>
                  <td class="oc-item-number">${escapeHtml(formatCurrency(item.unitPrice, "en-US", currency))}</td>
                  <td class="oc-item-number">${escapeHtml(formatCurrency(item.total, "en-US", currency))}</td>
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

    case "order-confirmation-footer": {
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
        <section class="section-oc-footer" style="${inlineStyles}">
          <div class="oc-totals">
            <div class="oc-totals-wrapper">
              <div class="oc-total-row">
                <span class="oc-total-label">Subtotal:</span>
                <span class="oc-total-value">${escapeHtml(formatCurrency(section.data.subtotal as string | number | undefined, "en-US", currency))}</span>
              </div>
              ${
                Number.parseFloat(String(section.data.taxAmount || "0")) > 0
                  ? `
              <div class="oc-total-row">
                <span class="oc-total-label">${
                  taxMode === "percentage" ||
                  (taxMode === "amount" && showTaxRate && taxRate > 0)
                    ? `Tax (${escapeHtml(String(section.data.taxRate || "0"))}%):`
                    : "Tax:"
                }</span>
                <span class="oc-total-value">${escapeHtml(formatCurrency(section.data.taxAmount as string | number | undefined, "en-US", currency))}</span>
              </div>
              `
                  : ""
              }
              ${
                Number.parseFloat(String(section.data.discount || "0")) > 0
                  ? `
              <div class="oc-total-row">
                <span class="oc-total-label">${
                  discountMode === "percentage" ||
                  (
                    discountMode === "amount" &&
                      showDiscountRate &&
                      discountRate > 0
                  )
                    ? `Discount (${escapeHtml(String(section.data.discountRate || "0"))}%):`
                    : "Discount:"
                }</span>
                <span class="oc-total-value">-${escapeHtml(formatCurrency(section.data.discount as string | number | undefined, "en-US", currency))}</span>
              </div>
              `
                  : ""
              }
              <div class="oc-total-row oc-total-final">
                <span class="oc-total-label">Total:</span>
                <span class="oc-total-value">${escapeHtml(formatCurrency(section.data.total as string | number | undefined, "en-US", currency))}</span>
              </div>
            </div>
          </div>
          ${
            section.data.notes
              ? `<div class="oc-notes"><strong>Notes:</strong> <div class="rich-text-content">${sanitizeQuillHtml(String(section.data.notes))}</div></div>`
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

function generateOrderConfirmationHTML(
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
      renderOrderConfirmationSectionToHTML(section, currency, colorPalette),
    )
    .join("\n");

  const textColor = globalStyles.color || globalStyles.textColor || "#000000";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isExport ? "Order Confirmation Export" : "Order Confirmation Preview"}</title>
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

    .section-oc-header { margin-bottom: 2rem; }
    .oc-header-content { display: flex; justify-content: space-between; margin-bottom: 2rem; }
    .oc-company-info { flex: 1; }
    .oc-company-logo { max-height: 60px; max-width: 200px; margin-bottom: 1rem; object-fit: contain; }
    .oc-company-name { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; }
    .oc-company-address, .oc-company-contact { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem; white-space: pre-line; }
    .section-oc-header[style*="background"] .oc-company-address,
    .section-oc-header[style*="background"] .oc-company-contact,
    .section-oc-header[style*="background"] .oc-label,
    .section-oc-header[style*="background"] .oc-customer-address { color: inherit; opacity: 0.9; }
    .oc-meta { text-align: right; }
    .oc-title { font-size: 2rem; font-weight: bold; margin-bottom: 1rem; }
    .oc-details { font-size: 0.875rem; }
    .oc-details div { margin-bottom: 0.25rem; }
    .oc-label { color: #6b7280; }
    .oc-addresses { display: flex; justify-content: space-between; margin-top: 2rem; }
    .oc-bill-to, .oc-ship-to { flex: 1; }
    .oc-bill-to h3, .oc-ship-to h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .oc-customer-name, .oc-delivery-name { font-weight: 500; margin-bottom: 0.25rem; }
    .oc-customer-address, .oc-delivery-address { font-size: 0.875rem; color: #6b7280; white-space: pre-line; }
    .section-oc-header[style*="background"] h1, .section-oc-header[style*="background"] h2,
    .section-oc-header[style*="background"] h3, .section-oc-header[style*="background"] .oc-customer-name,
    .section-oc-header[style*="background"] .oc-delivery-name { color: inherit; }
    .section-oc-items { margin: 2rem 0; }
    .oc-items-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    .oc-items-table thead { background-color: #f3f4f6; }
    .oc-items-table th { padding: 0.75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    .oc-item-quantity, .oc-item-price, .oc-item-total { text-align: right; }
    .oc-items-table td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; max-width: 0; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }
    .oc-item-description { max-width: 50%; }
    .oc-item-number { text-align: right; }
    .oc-empty { text-align: center; color: #9ca3af; padding: 2rem; }
    .section-oc-footer { margin-top: 2rem; }
    .oc-totals { display: flex; justify-content: flex-end; }
    .oc-totals-wrapper { width: 16rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .oc-total-row { display: flex; justify-content: space-between; }
    .oc-total-label { color: #4b5563; }
    .oc-total-value { font-weight: 500; }
    .oc-total-final { border-top: 2px solid #d1d5db; padding-top: 0.5rem; margin-top: 0; font-size: 1.125rem; font-weight: bold; }
    .oc-notes { margin-top: 1.5rem; font-size: 0.875rem; color: #4b5563; white-space: pre-line; max-width: 100%; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }
    .section-oc-items[style*="color"] .oc-items-table,
    .section-oc-items[style*="color"] .oc-items-table td,
    .section-oc-items[style*="color"] .oc-items-table th { color: inherit; }
    .section-oc-footer[style*="color"] .oc-total-value,
    .section-oc-footer[style*="color"] .oc-total-final { color: inherit; }
    ${
      isExport
        ? `
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; orphans: 3; widows: 3; }
      .section-oc-header, .section-oc-items, .section-oc-footer { page-break-inside: auto; break-inside: auto; }
      .oc-items-table tbody tr.oc-item-row { page-break-inside: avoid; break-inside: avoid; }
      .oc-totals-wrapper { page-break-inside: avoid; break-inside: avoid; }
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

export function generateOrderConfirmationPreviewHTML(
  sections: TemplateSection[],
  globalStyles: Record<string, string>,
  colorPalette: string[] = [],
): string {
  return generateOrderConfirmationHTML(
    sections,
    globalStyles,
    false,
    colorPalette,
  );
}

export function generateOrderConfirmationExportHTML(
  sections: TemplateSection[],
  globalStyles: Record<string, string>,
  colorPalette: string[] = [],
): string {
  return generateOrderConfirmationHTML(
    sections,
    globalStyles,
    true,
    colorPalette,
  );
}
