import type { Template } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const receiptTemplates: Template[] = [
  {
    createdAt: new Date(),
    colorPalette: ["#ffffff", "#000000"],
    globalStyles: {
      backgroundColor: "$colorPalette[0]",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      textColor: "$colorPalette[1]",
    },
    id: "receipt-simple",
    name: "Simple Receipt",
    organizationId: "",
    type: "receipt",
    sections: [
      {
        data: {
          storeLogo: PLACEHOLDER_LOGO_URLS.logoipsum397,
          storeName: "Your Store Name",
          storeAddress: "123 Main Street\nCity, State 12345",
          storeEmail: "info@store.com",
          storePhone: "+1 (555) 123-4567",
          receiptNumber: "RCP-001",
          receiptDate: new Date().toLocaleDateString(),
          transactionId: "TXN-2024-001",
        },
        id: "receipt-header",
        order: 0,
        styles: {
          padding: "2rem",
        },
        type: "receipt-header",
      },
      {
        data: {
          items: [
            {
              description: "Product A",
              quantity: "2",
              unitPrice: "25.00",
              total: "50.00",
            },
            {
              description: "Product B",
              quantity: "1",
              unitPrice: "75.00",
              total: "75.00",
            },
            {
              description: "Service Fee",
              quantity: "1",
              unitPrice: "10.00",
              total: "10.00",
            },
          ],
        },
        id: "receipt-items",
        order: 1,
        styles: {
          padding: "1rem 2rem",
        },
        type: "receipt-items",
      },
      {
        data: {
          subtotal: "135.00",
          taxMode: "percentage",
          taxRate: "8.00",
          taxAmount: "10.80",
          showTaxRate: true,
          discountMode: "percentage",
          discountRate: "0.00",
          discount: "0.00",
          showDiscountRate: true,
          total: "145.80",
          paymentMethod: "Credit Card ending in 1234",
          transactionId: "TXN-2024-001",
          thankYouMessage:
            "Thank you for your purchase! We appreciate your business.",
        },
        id: "receipt-footer",
        order: 2,
        styles: {
          padding: "1rem 2rem 2rem",
        },
        type: "receipt-footer",
      },
    ],
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    colorPalette: ["#f0fdf4", "#166534", "#16a34a", "#ffffff"],
    globalStyles: {
      backgroundColor: "$colorPalette[3]",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      color: "$colorPalette[1]",
    },
    id: "receipt-professional",
    name: "Professional Receipt",
    organizationId: "",
    type: "receipt",
    sections: [
      {
        data: {
          storeLogo: PLACEHOLDER_LOGO_URLS.logoipsum350,
          storeName: "Your Store Name",
          storeAddress:
            "123 Main Street\nSuite 200\nCity, State 12345\nUnited States",
          storeEmail: "info@store.com",
          storePhone: "+1 (555) 123-4567",
          receiptNumber: "RCP-2024-001",
          receiptDate: new Date().toLocaleDateString(),
          transactionId: "TXN-2024-001-ABC123",
        },
        id: "receipt-header",
        order: 0,
        styles: {
          backgroundColor: "$colorPalette[2]",
          color: "$colorPalette[3]",
          padding: "2rem",
          paddingBottom: "1.5rem",
        },
        type: "receipt-header",
      },
      {
        data: {
          items: [
            {
              description: "Premium Product Package",
              quantity: "3",
              unitPrice: "99.99",
              total: "299.97",
            },
            {
              description: "Extended Warranty",
              quantity: "1",
              unitPrice: "49.99",
              total: "49.99",
            },
            {
              description: "Shipping & Handling",
              quantity: "1",
              unitPrice: "15.00",
              total: "15.00",
            },
          ],
        },
        id: "receipt-items",
        order: 1,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          borderBottom: "2px solid $colorPalette[2]",
          padding: "1.5rem 2rem",
        },
        type: "receipt-items",
      },
      {
        data: {
          subtotal: "364.96",
          taxMode: "percentage",
          taxRate: "8.00",
          taxAmount: "29.20",
          showTaxRate: true,
          discountMode: "amount",
          discountRate: "6.85",
          discount: "25.00",
          showDiscountRate: true,
          total: "369.16",
          paymentMethod: "Visa ending in 5678",
          transactionId: "TXN-2024-001-ABC123",
          thankYouMessage:
            "Thank you for your purchase! Your order has been processed successfully.\n\nFor any questions or concerns, please contact our customer service at support@store.com or call +1 (555) 123-4567.",
        },
        id: "receipt-footer",
        order: 2,
        styles: {
          backgroundColor: "$colorPalette[3]",
          color: "$colorPalette[1]",
          padding: "1.5rem 2rem 2rem",
          borderBottomLeftRadius: "8px",
          borderBottomRightRadius: "8px",
        },
        type: "receipt-footer",
      },
    ],
    updatedAt: new Date(),
  },
];
