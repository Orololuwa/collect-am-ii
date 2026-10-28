import type { Template } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const orderConfirmationTemplates: Template[] = [
  {
    createdAt: new Date(),
    colorPalette: ["#ffffff", "#000000"],
    globalStyles: {
      backgroundColor: "$colorPalette[0]",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      textColor: "$colorPalette[1]",
    },
    id: "order-confirmation-simple",
    name: "Simple Order Confirmation",
    organizationId: "",
    type: "order-confirmation",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum404,
          companyName: "Your Company Name",
          companyAddress: "123 Business Street\nCity, State 12345",
          companyEmail: "contact@company.com",
          companyPhone: "+1 (555) 123-4567",
          confirmationNumber: "OC-001",
          orderReference: "ORD-001",
          orderDate: new Date().toLocaleDateString(),
          expectedShipDate: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Jane Smith",
          billToAddress: "456 Customer Lane\nCity, State 67890",
          shipToName: "Jane Smith",
          shipToAddress: "456 Customer Lane\nCity, State 67890",
        },
        id: "order-confirmation-header",
        order: 0,
        styles: {
          padding: "2rem",
        },
        type: "order-confirmation-header",
      },
      {
        data: {
          items: [
            {
              description: "Office Supplies",
              quantity: "5",
              unitPrice: "25.00",
              total: "125.00",
            },
            {
              description: "Equipment",
              quantity: "2",
              unitPrice: "500.00",
              total: "1000.00",
            },
            {
              description: "Software License",
              quantity: "1",
              unitPrice: "199.00",
              total: "199.00",
            },
          ],
        },
        id: "order-confirmation-items",
        order: 1,
        styles: {
          padding: "1rem 2rem",
        },
        type: "order-confirmation-items",
      },
      {
        data: {
          subtotal: "1324.00",
          taxMode: "percentage",
          taxRate: "10",
          taxAmount: "132.40",
          showTaxRate: true,
          discountMode: "percentage",
          discountRate: "0.00",
          discount: "0.00",
          showDiscountRate: true,
          total: "1456.40",
          notes:
            "Thank you for your order! We will ship your items within 3-5 business days. You will receive a tracking number once your order has been shipped.",
        },
        id: "order-confirmation-footer",
        order: 2,
        styles: {
          padding: "1rem 2rem 2rem",
        },
        type: "order-confirmation-footer",
      },
    ],
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    colorPalette: ["#1e3a5f", "#ffffff", "#3b82f6", "#f8fafc"],
    globalStyles: {
      backgroundColor: "$colorPalette[3]",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      color: "$colorPalette[0]",
    },
    id: "order-confirmation-professional",
    name: "Professional Order Confirmation",
    organizationId: "",
    type: "order-confirmation",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum288,
          companyName: "Your Company Name",
          companyAddress:
            "123 Business Street\nSuite 100\nCity, State 12345\nUnited States",
          companyEmail: "orders@company.com",
          companyPhone: "+1 (555) 123-4567",
          confirmationNumber: "OC-2024-001",
          orderReference: "ORD-2024-001",
          orderDate: new Date().toLocaleDateString(),
          expectedShipDate: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Acme Corporation",
          billToAddress:
            "789 Client Avenue\nBuilding B\nCity, State 54321\nUnited States",
          shipToName: "Acme Corporation - Receiving",
          shipToAddress:
            "789 Client Avenue\nReceiving Dock\nCity, State 54321\nUnited States",
        },
        id: "order-confirmation-header",
        order: 0,
        styles: {
          backgroundColor: "$colorPalette[0]",
          color: "$colorPalette[1]",
          padding: "2rem",
          paddingBottom: "1.5rem",
        },
        type: "order-confirmation-header",
      },
      {
        data: {
          items: [
            {
              description: "Office Supplies - Bulk Order",
              quantity: "50",
              unitPrice: "25.00",
              total: "1250.00",
            },
            {
              description: "Desktop Computers",
              quantity: "10",
              unitPrice: "899.00",
              total: "8990.00",
            },
            {
              description: "Software Licenses - Annual",
              quantity: "5",
              unitPrice: "299.00",
              total: "1495.00",
            },
          ],
        },
        id: "order-confirmation-items",
        order: 1,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[0]",
          borderBottom: "2px solid $colorPalette[2]",
          padding: "1.5rem 2rem",
        },
        type: "order-confirmation-items",
      },
      {
        data: {
          subtotal: "11735.00",
          taxMode: "percentage",
          taxRate: "8.5",
          taxAmount: "997.48",
          showTaxRate: true,
          discountMode: "amount",
          discountRate: "8.5",
          discount: "500.00",
          showDiscountRate: true,
          total: "12232.48",
          notes:
            "Thank you for your order. Your items will be shipped within 5 business days. A shipping confirmation with tracking details will be sent to the email on file. For any questions about your order, please contact orders@company.com.",
        },
        id: "order-confirmation-footer",
        order: 2,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[0]",
          padding: "1.5rem 2rem 2rem",
        },
        type: "order-confirmation-footer",
      },
    ],
    updatedAt: new Date(),
  },
];
