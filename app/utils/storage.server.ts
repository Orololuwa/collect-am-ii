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

/**
 * Uploads a file people shouldn't be able to open by guessing its URL, such
 * as a customer's purchase order. Read it back with `getPrivateFileUrl`.
 *
 * @returns The file's id in storage.
 */
export async function uploadPrivateFile({
  file,
  folder,
  publicId,
}: {
  file: File;
  folder: string;
  publicId: string;
}) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const result = await new Promise<{ public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        // Raw files keep their extension in the id, so PDFs download as PDFs.
        public_id: extension ? `${publicId}.${extension}` : publicId,
        resource_type: "raw",
        type: "private",
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
  });
  return result.public_id;
}

/** A download link for a private file that works for five minutes. */
export function getPrivateFileUrl(fileId: string) {
  return cloudinary.utils.private_download_url(fileId, "", {
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    resource_type: "raw",
    type: "private",
  });
}
