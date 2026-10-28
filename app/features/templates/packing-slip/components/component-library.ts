import type { ComponentDefinition } from "../../shared/types";
import { PLACEHOLDER_LOGO_URLS } from "~/utils/static-assets";

export const packingSlipComponentLibrary: Record<string, ComponentDefinition> =
  {
    "packing-slip-header": {
      configurableProperties: [
        "companyLogo",
        "companyName",
        "companyAddress",
        "companyEmail",
        "companyPhone",
        "shipmentNumber",
        "orderReference",
        "shipDate",
        "shipFromName",
        "shipFromAddress",
        "shipToName",
        "shipToAddress",
      ],
      defaultData: {
        companyLogo: PLACEHOLDER_LOGO_URLS.logoipsum404,
        companyName: "",
        companyAddress: "",
        companyEmail: "",
        companyPhone: "",
        shipmentNumber: "",
        orderReference: "",
        shipDate: "",
        shipFromName: "",
        shipFromAddress: "",
        shipToName: "",
        shipToAddress: "",
      },
      defaultStyles: {
        padding: "2rem",
      },
      icon: "FileText",
      label: "Packing Slip Header",
      type: "packing-slip-header",
    },
    "packing-slip-items": {
      configurableProperties: ["items"],
      defaultData: { items: [] },
      defaultStyles: {
        padding: "1rem",
      },
      icon: "List",
      label: "Packing Slip Items",
      type: "packing-slip-items",
    },
    "packing-slip-footer": {
      configurableProperties: ["shippingMethod", "trackingNumber", "notes"],
      defaultData: {
        shippingMethod: "",
        trackingNumber: "",
        notes: "",
      },
      defaultStyles: {
        padding: "1rem",
      },
      icon: "FileText",
      label: "Packing Slip Footer",
      type: "packing-slip-footer",
    },
  };
