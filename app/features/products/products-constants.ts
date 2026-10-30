export const SAVE_PRODUCT_INTENT = "saveProduct";
export const ARCHIVE_PRODUCT_INTENT = "archiveProduct";
export const RESTORE_PRODUCT_INTENT = "restoreProduct";
export const DELETE_PRODUCT_INTENT = "deleteProduct";

/** Units offered in the product form; any other value is kept as typed. */
export const PRODUCT_UNITS = [
  "item",
  "hour",
  "day",
  "month",
  "kg",
  "litre",
  "box",
  "service",
] as const;

export const PRODUCT_IMAGE_FOLDER = "CollectAm/product-images";
export const PRODUCT_IMAGE_MAX_SIZE = 2_000_000;
export const PRODUCT_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

export const PRODUCTS_PAGE_SIZE = 24;
