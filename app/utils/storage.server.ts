import { v2 as cloudinary } from "cloudinary";

import { getPublicIdFromCloudinaryUrl } from "./storage-helpers.server";

// The SDK reads its credentials from the `CLOUDINARY_URL` environment variable.
cloudinary.config({ secure: true });

/**
 * Uploads an image to Cloudinary, replacing any existing image with the same
 * public id.
 *
 * @param file - The image to upload.
 * @param folder - The Cloudinary folder, e.g. `CollectAm/user-avatars`.
 * @param publicId - The id of the image inside the folder (no extension).
 * @returns The HTTPS URL of the uploaded image.
 */
export async function uploadImage({
  file,
  folder,
  publicId,
}: {
  file: File;
  folder: string;
  publicId: string;
}) {
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          invalidate: true,
          overwrite: true,
          public_id: publicId,
          resource_type: "image",
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve(uploadResult);
        },
      );
      stream.end(buffer);
    },
  );

  return result.secure_url;
}

/**
 * Deletes an image from Cloudinary by its delivery URL. URLs that don't point
 * to Cloudinary (e.g. legacy URLs) are ignored.
 *
 * @param imageUrl - The URL of the image to remove.
 */
export async function removeImageFromStorage(imageUrl?: string | null) {
  const publicId = getPublicIdFromCloudinaryUrl(imageUrl);

  if (!publicId) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: "image",
  });
}
