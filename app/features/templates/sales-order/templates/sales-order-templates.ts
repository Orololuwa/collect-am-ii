import type { Template } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const salesOrderTemplates: Template[] = [
  {
    createdAt: new Date(),
    colorPalette: ["#ffffff", "#000000"],
    globalStyles: {
      backgroundColor: "$colorPalette[0]",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      textColor: "$colorPalette[1]",
    },
    id: "sales-order-simple",
    name: "Simple Sales Order",
    organizationId: "",
    type: "sales-order",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum404,
          companyName: "Your Company Name",
          companyAddress: "123 Business Street\nCity, State 12345",
          companyEmail: "orders@company.com",
          companyPhone: "+1 (555) 123-4567",
          orderNumber: "SO-001",
          orderDate: new Date().toLocaleDateString(),
          billToName: "Customer Company",
          billToAddress: "456 Customer Avenue\nCity, State 67890",
          shipToName: "",
          shipToAddress: "",
        },
        id: "sales-order-header",
        order: 0,
        styles: {
          padding: "2rem",
        },
        type: "sales-order-header",
      },
      {
        data: {
          items: [
            {
              description: "Product A",
              quantity: "10",
              unitPrice: "50.00",
              total: "500.00",
            },
            {
              description: "Product B",
              quantity: "5",
              unitPrice: "120.00",
              total: "600.00",
            },
            {
              description: "Service Package",
              quantity: "1",
              unitPrice: "350.00",
              total: "350.00",
            },
          ],
        },
        id: "sales-order-items",
        order: 1,
        styles: {
          padding: "1rem 2rem",
        },
        type: "sales-order-items",
      },
      {
        data: {
          subtotal: "1450.00",
          taxMode: "percentage",
          taxRate: "10",
          taxAmount: "145.00",
          showTaxRate: true,
          discountMode: "percentage",
          discountRate: "0.00",
          discount: "0.00",
          showDiscountRate: true,
          total: "1595.00",
          notes:
            "Priority: Standard. Route to Warehouse A. Fulfill by end of week.",
          terms: "Cost center: CC-1001. Internal reference: REF-2024-001.",
        },
        id: "sales-order-footer",
        order: 2,
        styles: {
          padding: "1rem 2rem 2rem",
        },
        type: "sales-order-footer",
      },
    ],
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    colorPalette: ["#fef3c7", "#92400e", "#f59e0b", "#ffffff"],
    globalStyles: {
      backgroundColor: "$colorPalette[3]",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      color: "$colorPalette[1]",
    },
    id: "sales-order-professional",
    name: "Professional Sales Order",
    organizationId: "",
    type: "sales-order",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum288,
          companyName: "Your Company Name",
          companyAddress:
            "123 Business Street\nSuite 100\nCity, State 12345\nUnited States",
          companyEmail: "orders@company.com",
          companyPhone: "+1 (555) 123-4567",
          orderNumber: "SO-2024-001",
          orderDate: new Date().toLocaleDateString(),
          billToName: "Customer Company Inc.",
          billToAddress:
            "456 Customer Avenue\nBuilding B, Floor 5\nCity, State 67890\nUnited States",
          shipToName: "Customer Company Inc. - Shipping",
          shipToAddress:
            "789 Delivery Lane\nWarehouse District\nCity, State 67890",
        },
        id: "sales-order-header",
        order: 0,
        styles: {
          backgroundColor: "$colorPalette[2]",
          color: "$colorPalette[3]",
          padding: "2rem",
          paddingBottom: "1.5rem",
        },
        type: "sales-order-header",
      },
      {
        data: {
          items: [
            {
              description: "Enterprise Software License - Annual",
              quantity: "25",
              unitPrice: "499.00",
              total: "12475.00",
            },
            {
              description: "Implementation Services",
              quantity: "40",
              unitPrice: "175.00",
              total: "7000.00",
            },
            {
              description: "Training Package",
              quantity: "1",
              unitPrice: "2500.00",
              total: "2500.00",
            },
          ],
        },
        id: "sales-order-items",
        order: 1,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          borderBottom: "2px solid $colorPalette[2]",
          padding: "1.5rem 2rem",
        },
        type: "sales-order-items",
      },
      {
        data: {
          subtotal: "21975.00",
          taxMode: "percentage",
          taxRate: "8.5",
          taxAmount: "1867.88",
          showTaxRate: true,
          discountMode: "amount",
          discountRate: "8.5",
          discount: "1000.00",
          showDiscountRate: true,
          total: "22842.88",
          notes:
            "Priority: High. Expedited fulfillment. Assign to senior rep. Implementation scheduling to follow separate confirmation.",
          terms:
            "Cost center: CC-5000. Department: Enterprise Sales. Internal approval: AP-2024-042. Do not ship until PO received.",
        },
        id: "sales-order-footer",
        order: 2,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          padding: "1.5rem 2rem 2rem",
        },
        type: "sales-order-footer",
      },
    ],
    updatedAt: new Date(),
  },
];
