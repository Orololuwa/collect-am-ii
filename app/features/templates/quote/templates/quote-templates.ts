import type { Template } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const quoteTemplates: Template[] = [
  {
    createdAt: new Date(),
    colorPalette: ["#ffffff", "#000000"],
    globalStyles: {
      backgroundColor: "$colorPalette[0]",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      textColor: "$colorPalette[1]",
    },
    id: "quote-simple",
    name: "Simple Quote",
    organizationId: "",
    type: "quote",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum404,
          companyName: "Your Company Name",
          companyAddress: "123 Business Street\nCity, State 12345",
          companyEmail: "contact@company.com",
          companyPhone: "+1 (555) 123-4567",
          quoteNumber: "QT-001",
          quoteDate: new Date().toLocaleDateString(),
          validityDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Client Company",
          billToAddress: "456 Client Avenue\nCity, State 67890",
          shipToName: "",
          shipToAddress: "",
        },
        id: "quote-header",
        order: 0,
        styles: {
          padding: "2rem",
        },
        type: "quote-header",
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
        id: "quote-items",
        order: 1,
        styles: {
          padding: "1rem 2rem",
        },
        type: "quote-items",
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
          validityPeriod: "30 days",
          terms:
            "This quote is valid for 30 days from the date of issue. Acceptance of this quote constitutes agreement to the terms outlined herein.",
        },
        id: "quote-footer",
        order: 2,
        styles: {
          padding: "1rem 2rem 2rem",
        },
        type: "quote-footer",
      },
    ],
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    colorPalette: ["#eff6ff", "#0F2854", "#4988C4", "#ffffff"],
    globalStyles: {
      backgroundColor: "$colorPalette[3]",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      color: "$colorPalette[1]",
    },
    id: "quote-professional",
    name: "Professional Quote",
    organizationId: "",
    type: "quote",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum288,
          companyName: "Your Company Name",
          companyAddress:
            "123 Business Street\nSuite 100\nCity, State 12345\nUnited States",
          companyEmail: "contact@company.com",
          companyPhone: "+1 (555) 123-4567",
          quoteNumber: "QT-2024-001",
          quoteDate: new Date().toLocaleDateString(),
          validityDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Client Company Inc.",
          billToAddress:
            "456 Client Avenue\nBuilding B, Floor 5\nCity, State 67890\nUnited States",
          shipToName: "",
          shipToAddress: "",
        },
        id: "quote-header",
        order: 0,
        styles: {
          backgroundColor: "$colorPalette[2]",
          color: "$colorPalette[3]",
          padding: "2rem",
          paddingBottom: "1.5rem",
        },
        type: "quote-header",
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
        id: "quote-items",
        order: 1,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          borderBottom: "2px solid $colorPalette[2]",
          padding: "1.5rem 2rem",
        },
        type: "quote-items",
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
          validityPeriod: "30 days from date of issue",
          terms:
            "This quote is valid for 30 days from the date of issue. Acceptance of this quote constitutes agreement to the terms outlined herein. A deposit of 50% is required upon acceptance to secure your project timeline. For questions regarding this quote, please contact our sales team at sales@company.com or call +1 (555) 123-4567.",
        },
        id: "quote-footer",
        order: 2,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          padding: "1.5rem 2rem 2rem",
        },
        type: "quote-footer",
      },
    ],
    updatedAt: new Date(),
  },
];
