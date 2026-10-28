import type { Template } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const estimateTemplates: Template[] = [
  {
    createdAt: new Date(),
    colorPalette: ["#ffffff", "#000000"],
    globalStyles: {
      backgroundColor: "$colorPalette[0]",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      textColor: "$colorPalette[1]",
    },
    id: "estimate-simple",
    name: "Simple Estimate",
    organizationId: "",
    type: "estimate",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum404,
          companyName: "Your Company Name",
          companyAddress: "123 Business Street\nCity, State 12345",
          companyEmail: "contact@company.com",
          companyPhone: "+1 (555) 123-4567",
          estimateNumber: "EST-001",
          estimateDate: new Date().toLocaleDateString(),
          validityDate: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Client Company",
          billToAddress: "456 Client Avenue\nCity, State 67890",
          shipToName: "",
          shipToAddress: "",
        },
        id: "estimate-header",
        order: 0,
        styles: {
          padding: "2rem",
        },
        type: "estimate-header",
      },
      {
        data: {
          items: [
            {
              description: "Project Setup and Configuration",
              quantity: "1",
              unitPrice: "500.00",
              total: "500.00",
            },
            {
              description: "Development Hours",
              quantity: "40",
              unitPrice: "125.00",
              total: "5000.00",
            },
            {
              description: "Testing and QA",
              quantity: "10",
              unitPrice: "100.00",
              total: "1000.00",
            },
          ],
        },
        id: "estimate-items",
        order: 1,
        styles: {
          padding: "1rem 2rem",
        },
        type: "estimate-items",
      },
      {
        data: {
          subtotal: "6500.00",
          taxMode: "percentage",
          taxRate: "0",
          taxAmount: "0.00",
          showTaxRate: true,
          discountMode: "percentage",
          discountRate: "0",
          discount: "0.00",
          showDiscountRate: true,
          total: "6500.00",
          validityPeriod: "14 days",
          notes:
            "This estimate is valid for 14 days. Final pricing may vary based on scope changes. Additional hours will be billed at the stated rate.",
        },
        id: "estimate-footer",
        order: 2,
        styles: {
          padding: "1rem 2rem 2rem",
        },
        type: "estimate-footer",
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
    id: "estimate-professional",
    name: "Professional Estimate",
    organizationId: "",
    type: "estimate",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum288,
          companyName: "Your Company Name",
          companyAddress:
            "123 Business Street\nSuite 100\nCity, State 12345\nUnited States",
          companyEmail: "contact@company.com",
          companyPhone: "+1 (555) 123-4567",
          estimateNumber: "EST-2024-001",
          estimateDate: new Date().toLocaleDateString(),
          validityDate: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Client Company Inc.",
          billToAddress:
            "456 Client Avenue\nBuilding B, Floor 5\nCity, State 67890\nUnited States",
          shipToName: "",
          shipToAddress: "",
        },
        id: "estimate-header",
        order: 0,
        styles: {
          backgroundColor: "$colorPalette[2]",
          color: "$colorPalette[3]",
          padding: "2rem",
          paddingBottom: "1.5rem",
        },
        type: "estimate-header",
      },
      {
        data: {
          items: [
            {
              description: "Project Setup and Configuration - Infrastructure",
              quantity: "1",
              unitPrice: "750.00",
              total: "750.00",
            },
            {
              description: "Development Hours - Full Stack Implementation",
              quantity: "80",
              unitPrice: "125.00",
              total: "10000.00",
            },
            {
              description: "UI/UX Design - Wireframes and Prototypes",
              quantity: "20",
              unitPrice: "175.00",
              total: "3500.00",
            },
            {
              description: "Testing and QA - Comprehensive Quality Assurance",
              quantity: "15",
              unitPrice: "100.00",
              total: "1500.00",
            },
            {
              description: "Project Management - End-to-End Coordination",
              quantity: "1",
              unitPrice: "2500.00",
              total: "2500.00",
            },
          ],
        },
        id: "estimate-items",
        order: 1,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          borderBottom: "2px solid $colorPalette[2]",
          padding: "1.5rem 2rem",
        },
        type: "estimate-items",
      },
      {
        data: {
          subtotal: "18250.00",
          taxMode: "percentage",
          taxRate: "0",
          taxAmount: "0.00",
          showTaxRate: true,
          discountMode: "amount",
          discountRate: "2.74",
          discount: "500.00",
          showDiscountRate: true,
          total: "17750.00",
          validityPeriod: "14 days from date of issue",
          notes:
            "This estimate is valid for 14 days from the date of issue. Final pricing may vary based on scope changes or additional requirements discovered during the project. Additional hours beyond this estimate will be billed at the stated rates. A deposit of 40% is required to begin work. For questions regarding this estimate, please contact our project team at projects@company.com or call +1 (555) 123-4567.",
        },
        id: "estimate-footer",
        order: 2,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          padding: "1.5rem 2rem 2rem",
        },
        type: "estimate-footer",
      },
    ],
    updatedAt: new Date(),
  },
];
