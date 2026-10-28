import type { Template } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const invoiceTemplates: Template[] = [
  {
    createdAt: new Date(),
    colorPalette: ["#ffffff", "#000000"],
    globalStyles: {
      backgroundColor: "$colorPalette[0]",
      currency: "USD",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      textColor: "$colorPalette[1]",
    },
    id: "invoice-simple",
    name: "Simple Invoice",
    organizationId: "",
    type: "invoice",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum404,
          companyName: "Your Company Name",
          companyAddress: "123 Business Street\nCity, State 12345",
          companyEmail: "contact@company.com",
          companyPhone: "+1 (555) 123-4567",
          invoiceNumber: "INV-001",
          invoiceDate: new Date().toLocaleDateString(),
          dueDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Client Company",
          billToAddress: "456 Client Avenue\nCity, State 67890",
          shipToName: "",
          shipToAddress: "",
        },
        id: "invoice-header",
        order: 0,
        styles: {
          padding: "2rem",
        },
        type: "invoice-header",
      },
      {
        data: {
          items: [
            {
              description: "Web Development Services",
              quantity: "10",
              unitPrice: "150.00",
              total: "1500.00",
            },
            {
              description: "Design Services",
              quantity: "5",
              unitPrice: "200.00",
              total: "1000.00",
            },
            {
              description: "Consulting Hours",
              quantity: "8",
              unitPrice: "125.00",
              total: "1000.00",
            },
          ],
        },
        id: "invoice-items",
        order: 1,
        styles: {
          padding: "1rem 2rem",
        },
        type: "invoice-items",
      },
      {
        data: {
          subtotal: "3500.00",
          taxMode: "percentage",
          taxRate: "10",
          taxAmount: "350.00",
          showTaxRate: true,
          discountMode: "percentage",
          discountRate: "0.00",
          discount: "0.00",
          showDiscountRate: true,
          total: "3850.00",
          paymentTerms: "Net 30",
          notes:
            "Thank you for your business! Payment is due within 30 days of invoice date.",
        },
        id: "invoice-footer",
        order: 2,
        styles: {
          padding: "1rem 2rem 2rem",
        },
        type: "invoice-footer",
      },
    ],
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    colorPalette: ["#eff6ff", "#0F2854", "#4988C4", "#ffffff"],
    globalStyles: {
      backgroundColor: "$colorPalette[3]",
      color: "$colorPalette[1]",
      currency: "USD",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      fontSize: "14px",
    },
    id: "invoice-professional",
    name: "Professional Invoice",
    organizationId: "",
    type: "invoice",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum288,
          companyName: "Your Company Name",
          companyAddress:
            "123 Business Street\nSuite 100\nCity, State 12345\nUnited States",
          companyEmail: "contact@company.com",
          companyPhone: "+1 (555) 123-4567",
          invoiceNumber: "INV-2024-001",
          invoiceDate: new Date().toLocaleDateString(),
          dueDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Client Company Inc.",
          billToAddress:
            "456 Client Avenue\nBuilding B, Floor 5\nCity, State 67890\nUnited States",
          shipToName: "",
          shipToAddress: "",
        },
        id: "invoice-header",
        order: 0,
        styles: {
          backgroundColor: "$colorPalette[2]",
          color: "$colorPalette[3]",
          padding: "2rem",
          paddingBottom: "1.5rem",
        },
        type: "invoice-header",
      },
      {
        data: {
          items: [
            {
              description: "Web Development Services - Full Stack Application",
              quantity: "40",
              unitPrice: "150.00",
              total: "6000.00",
            },
            {
              description: "UI/UX Design Services - Complete Redesign",
              quantity: "20",
              unitPrice: "200.00",
              total: "4000.00",
            },
            {
              description: "Technical Consulting - Architecture Review",
              quantity: "16",
              unitPrice: "125.00",
              total: "2000.00",
            },
            {
              description: "Project Management - Monthly Retainer",
              quantity: "1",
              unitPrice: "2500.00",
              total: "2500.00",
            },
          ],
        },
        id: "invoice-items",
        order: 1,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          borderBottom: "2px solid $colorPalette[2]",
          padding: "1.5rem 2rem",
        },
        type: "invoice-items",
      },
      {
        data: {
          subtotal: "14500.00",
          taxMode: "percentage",
          taxRate: "8.5",
          taxAmount: "1232.50",
          showTaxRate: true,
          discountMode: "amount",
          discountRate: "3.45",
          discount: "500.00",
          showDiscountRate: true,
          total: "15232.50",
          paymentTerms:
            "Net 30 - Payment due within 30 days. Late payments subject to 1.5% monthly interest.",
          notes:
            "Thank you for choosing our services. We appreciate your business and look forward to continuing our partnership.\n\nFor questions regarding this invoice, please contact our billing department at billing@company.com or call +1 (555) 123-4567.",
        },
        id: "invoice-footer",
        order: 2,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          padding: "1.5rem 2rem 2rem",
        },
        type: "invoice-footer",
      },
    ],
    updatedAt: new Date(),
  },
];
