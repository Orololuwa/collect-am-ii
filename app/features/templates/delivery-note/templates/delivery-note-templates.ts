import type { Template } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const deliveryNoteTemplates: Template[] = [
  {
    createdAt: new Date(),
    colorPalette: ["#ffffff", "#000000"],
    globalStyles: {
      backgroundColor: "$colorPalette[0]",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      textColor: "$colorPalette[1]",
    },
    id: "delivery-note-simple",
    name: "Simple Delivery Note",
    organizationId: "",
    type: "delivery-note",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum404,
          companyName: "Your Company Name",
          companyAddress: "123 Business Street\nCity, State 12345",
          companyEmail: "shipping@company.com",
          companyPhone: "+1 (555) 123-4567",
          deliveryNoteNumber: "DN-001",
          orderReference: "ORD-001",
          deliveryDate: new Date().toLocaleDateString(),
          deliveredByName: "John Driver",
          deliveredByCompany: "Your Company Logistics",
          deliveredToName: "Jane Smith",
          deliveredToAddress: "456 Customer Lane\nCity, State 67890",
        },
        id: "delivery-note-header",
        order: 0,
        styles: {
          padding: "2rem",
        },
        type: "delivery-note-header",
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
        id: "delivery-note-items",
        order: 1,
        styles: {
          padding: "1rem 2rem",
        },
        type: "delivery-note-items",
      },
      {
        data: {
          receivedByName: "Darryl Springers",
          receivedByTitle: "Receiving Manager",
          receivedDate: "",
          conditionReceived: "Good condition",
          notes: "Goods received as described. Please sign above to confirm.",
        },
        id: "delivery-note-footer",
        order: 2,
        styles: {
          padding: "1rem 2rem 2rem",
        },
        type: "delivery-note-footer",
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
    id: "delivery-note-professional",
    name: "Professional Delivery Note",
    organizationId: "",
    type: "delivery-note",
    sections: [
      {
        data: {
          companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum288,
          companyName: "Your Company Name",
          companyAddress:
            "123 Business Street\nSuite 100\nCity, State 12345\nUnited States",
          companyEmail: "shipping@company.com",
          companyPhone: "+1 (555) 123-4567",
          deliveryNoteNumber: "DN-2024-001",
          orderReference: "ORD-2024-001",
          deliveryDate: new Date().toLocaleDateString(),
          deliveredByName: "Michael Chen",
          deliveredByCompany: "Your Company - Delivery Services",
          deliveredToName: "Acme Corporation - Receiving",
          deliveredToAddress:
            "789 Client Avenue\nReceiving Dock\nCity, State 54321\nUnited States",
        },
        id: "delivery-note-header",
        order: 0,
        styles: {
          backgroundColor: "$colorPalette[0]",
          color: "$colorPalette[1]",
          padding: "2rem",
          paddingBottom: "1.5rem",
        },
        type: "delivery-note-header",
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
        id: "delivery-note-items",
        order: 1,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[0]",
          borderBottom: "2px solid $colorPalette[2]",
          padding: "1.5rem 2rem",
        },
        type: "delivery-note-items",
      },
      {
        data: {
          receivedByName: "Darryl Springgers",
          receivedByTitle: "Receiving Manager",
          receivedDate: "",
          conditionReceived: "Good condition",
          notes:
            "Please sign above to acknowledge receipt. Contact shipping@company.com for any discrepancies.",
        },
        id: "delivery-note-footer",
        order: 2,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[0]",
          padding: "1.5rem 2rem 2rem",
        },
        type: "delivery-note-footer",
      },
    ],
    updatedAt: new Date(),
  },
];
