import type { Template } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const purchaseOrderTemplates: Template[] = [
  {
    createdAt: new Date(),
    colorPalette: ["#ffffff", "#000000"],
    globalStyles: {
      backgroundColor: "$colorPalette[0]",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      textColor: "$colorPalette[1]",
    },
    id: "purchase-order-simple",
    name: "Simple Purchase Order",
    organizationId: "",
    type: "purchase-order",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum404,
          companyName: "Your Company Name",
          companyAddress: "123 Business Street\nCity, State 12345",
          companyEmail: "contact@company.com",
          companyPhone: "+1 (555) 123-4567",
          poNumber: "PO-001",
          orderDate: new Date().toLocaleDateString(),
          expectedDelivery: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Supplier Company",
          billToAddress: "789 Vendor Lane\nCity, State 54321",
          shipToName: "",
          shipToAddress: "",
        },
        id: "purchase-order-header",
        order: 0,
        styles: {
          padding: "2rem",
        },
        type: "purchase-order-header",
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
        id: "purchase-order-items",
        order: 1,
        styles: {
          padding: "1rem 2rem",
        },
        type: "purchase-order-items",
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
          validityPeriod: "14 days",
          terms:
            "Please confirm receipt of this purchase order. All items must be delivered by the expected delivery date. Payment terms: Net 30.",
        },
        id: "purchase-order-footer",
        order: 2,
        styles: {
          padding: "1rem 2rem 2rem",
        },
        type: "purchase-order-footer",
      },
    ],
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    colorPalette: ["#f0fdf4", "#14532d", "#22c55e", "#ffffff"],
    globalStyles: {
      backgroundColor: "$colorPalette[3]",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      color: "$colorPalette[1]",
    },
    id: "purchase-order-professional",
    name: "Professional Purchase Order",
    organizationId: "",
    type: "purchase-order",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum288,
          companyName: "Your Company Name",
          companyAddress:
            "123 Business Street\nSuite 100\nCity, State 12345\nUnited States",
          companyEmail: "procurement@company.com",
          companyPhone: "+1 (555) 123-4567",
          poNumber: "PO-2024-001",
          orderDate: new Date().toLocaleDateString(),
          expectedDelivery: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString(),
          billToName: "Supplier Company Inc.",
          billToAddress:
            "789 Vendor Lane\nBuilding A, Floor 2\nCity, State 54321\nUnited States",
          shipToName: "Your Company Name - Warehouse",
          shipToAddress:
            "456 Receiving Dock\nIndustrial Park\nCity, State 12345",
        },
        id: "purchase-order-header",
        order: 0,
        styles: {
          backgroundColor: "$colorPalette[2]",
          color: "$colorPalette[3]",
          padding: "2rem",
          paddingBottom: "1.5rem",
        },
        type: "purchase-order-header",
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
        id: "purchase-order-items",
        order: 1,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          borderBottom: "2px solid $colorPalette[2]",
          padding: "1.5rem 2rem",
        },
        type: "purchase-order-items",
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
          validityPeriod: "14 business days from order date",
          terms:
            "This purchase order is subject to our standard terms and conditions. Please confirm acceptance within 48 hours. All deliveries must be accompanied by a packing slip. Payment terms: Net 30 from receipt of invoice.",
        },
        id: "purchase-order-footer",
        order: 2,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          padding: "1.5rem 2rem 2rem",
        },
        type: "purchase-order-footer",
      },
    ],
    updatedAt: new Date(),
  },
];
