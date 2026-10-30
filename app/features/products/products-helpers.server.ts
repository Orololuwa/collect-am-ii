import { createId } from "@paralleldrive/cuid2";

import { PRODUCT_IMAGE_FOLDER } from "./products-constants";
import { majorToMinorUnits, percentToBasisPoints } from "./products-format";
import type { SaveProductFormData } from "./products-schemas";
import { removeImageFromStorage, uploadImage } from "~/utils/storage.server";

/**
 * Turns the product form into database fields (money in minor units, tax in
 * basis points). Image handling is separate, see `replaceProductImage`.
 */
export function productFormToFields(form: SaveProductFormData) {
  return {
    currency: form.currency,
    description: form.description,
    name: form.name,
    sku: form.sku === "" ? null : form.sku,
    taxRateBps: percentToBasisPoints(form.taxRate),
    unit: form.unit,
    unitPriceMinor: majorToMinorUnits(form.unitPrice, form.currency),
  };
}

/**
 * Uploads a new product image, or removes the current one, and returns the
 * image URL to store. Each upload gets a fresh public id so caches never show
 * the old picture.
 */
export async function replaceProductImage({
  productId,
  currentImageUrl,
  image,
  removeImage,
}: {
  productId: string;
  currentImageUrl: string;
  image?: File;
  removeImage: boolean;
}) {
  if (image) {
    const imageUrl = await uploadImage({
      file: image,
      folder: PRODUCT_IMAGE_FOLDER,
      publicId: `${productId}-${createId()}`,
    });
    if (currentImageUrl) {
      await removeImageFromStorage(currentImageUrl);
    }
    return imageUrl;
  }

  if (removeImage && currentImageUrl) {
    await removeImageFromStorage(currentImageUrl);
    return "";
  }

  return currentImageUrl;
}
