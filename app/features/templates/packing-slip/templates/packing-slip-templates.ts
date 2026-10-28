import type { Template } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const packingSlipTemplates: Template[] = [
  {
    createdAt: new Date(),
    colorPalette: ["#ffffff", "#000000"],
    globalStyles: {
      backgroundColor: "$colorPalette[0]",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      textColor: "$colorPalette[1]",
    },
    id: "packing-slip-simple",
    name: "Simple Packing Slip",
    organizationId: "",
    type: "packing-slip",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum404,
          companyName: "Your Company Name",
          companyAddress: "123 Business Street\nCity, State 12345",
          companyEmail: "shipping@company.com",
          companyPhone: "+1 (555) 123-4567",
          shipmentNumber: "PS-001",
          orderReference: "ORD-001",
          shipDate: new Date().toLocaleDateString(),
          shipFromName: "Your Company Name",
          shipFromAddress: "123 Business Street\nCity, State 12345",
          shipToName: "Jane Smith",
          shipToAddress: "456 Customer Lane\nCity, State 67890",
        },
        id: "packing-slip-header",
        order: 0,
        styles: {
          padding: "2rem",
        },
        type: "packing-slip-header",
      },
      {
        data: {
          items: [
            {
              description: "Office Supplies",
              quantity: "5",
              unitPrice: "",
              total: "",
            },
            {
              description: "Equipment",
              quantity: "2",
              unitPrice: "",
              total: "",
            },
            {
              description: "Software License",
              quantity: "1",
              unitPrice: "",
              total: "",
            },
          ],
        },
        id: "packing-slip-items",
        order: 1,
        styles: {
          padding: "1rem 2rem",
        },
        type: "packing-slip-items",
      },
      {
        data: {
          shippingMethod: "Ground Shipping",
          trackingNumber: "1Z999AA10123456784",
          notes:
            "Handle with care. Fragile items marked. Expected delivery: 3-5 business days.",
        },
        id: "packing-slip-footer",
        order: 2,
        styles: {
          padding: "1rem 2rem 2rem",
        },
        type: "packing-slip-footer",
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
    id: "packing-slip-professional",
    name: "Professional Packing Slip",
    organizationId: "",
    type: "packing-slip",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum288,
          companyName: "Your Company Name",
          companyAddress:
            "123 Business Street\nSuite 100\nCity, State 12345\nUnited States",
          companyEmail: "shipping@company.com",
          companyPhone: "+1 (555) 123-4567",
          shipmentNumber: "PS-2024-001",
          orderReference: "ORD-2024-001",
          shipDate: new Date().toLocaleDateString(),
          shipFromName: "Your Company Name - Warehouse",
          shipFromAddress:
            "456 Logistics Way\nDistribution Center\nCity, State 12345",
          shipToName: "Acme Corporation - Receiving",
          shipToAddress:
            "789 Client Avenue\nReceiving Dock\nCity, State 54321\nUnited States",
        },
        id: "packing-slip-header",
        order: 0,
        styles: {
          backgroundColor: "$colorPalette[0]",
          color: "$colorPalette[1]",
          padding: "2rem",
          paddingBottom: "1.5rem",
        },
        type: "packing-slip-header",
      },
      {
        data: {
          items: [
            {
              description: "Office Supplies - Bulk Order",
              quantity: "50",
              unitPrice: "",
              total: "",
            },
            {
              description: "Desktop Computers",
              quantity: "10",
              unitPrice: "",
              total: "",
            },
            {
              description: "Software Licenses - Annual",
              quantity: "5",
              unitPrice: "",
              total: "",
            },
          ],
        },
        id: "packing-slip-items",
        order: 1,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[0]",
          borderBottom: "2px solid $colorPalette[2]",
          padding: "1.5rem 2rem",
        },
        type: "packing-slip-items",
      },
      {
        data: {
          shippingMethod: "FedEx Ground",
          trackingNumber: "1Z999AA10123456784",
          notes:
            "Signature required. Fragile items - handle with care. Contact shipping@company.com for delivery questions.",
        },
        id: "packing-slip-footer",
        order: 2,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[0]",
          padding: "1.5rem 2rem 2rem",
        },
        type: "packing-slip-footer",
      },
    ],
    updatedAt: new Date(),
  },
];
