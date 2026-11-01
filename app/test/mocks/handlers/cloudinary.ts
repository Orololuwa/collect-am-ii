import type { RequestHandler } from "msw";
import { delay, HttpResponse, http } from "msw";

/*
Cloudinary handlers. Cover the upload (image and private raw files) and
destroy calls made by
`app/utils/storage.server.ts`.
*/

const API_BASE_URL = "https://api.cloudinary.com/v1_1/:cloudName/image";

const extensionsByMimeType: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

/**
 * Builds the delivery URL the mocked upload returns, so tests can assert on it.
 */
export function getMockCloudinaryUrl({
  cloudName = new URL(process.env.CLOUDINARY_URL).hostname,
  publicId,
  format = "png",
}: {
  cloudName?: string;
  publicId: string;
  format?: string;
}) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/v1/${publicId}.${format}`;
}

const uploadMock = http.post(
  `${API_BASE_URL}/upload`,
  async ({ request, params }) => {
    // Simulate network latency so pending UI states are observable in E2E tests.
    await delay(300);
    const cloudName = String(params.cloudName);
    const formData = await request.formData();
    const folder = formData.get("folder");
    const publicIdField = formData.get("public_id");
    const file = formData.get("file");

    if (typeof publicIdField !== "string" || !file) {
      return HttpResponse.json(
        { error: { message: "Missing required parameter - file" } },
        { status: 400 },
      );
    }

    const publicId =
      typeof folder === "string" && folder.length > 0
        ? `${folder}/${publicIdField}`
        : publicIdField;
    const format =
      (file instanceof Blob && extensionsByMimeType[file.type]) || "png";

    return HttpResponse.json({
      format,
      public_id: publicId,
      resource_type: "image",
      secure_url: getMockCloudinaryUrl({ cloudName, format, publicId }),
      version: 1,
    });
  },
);

const rawUploadMock = http.post(
  "https://api.cloudinary.com/v1_1/:cloudName/raw/upload",
  async ({ request }) => {
    await delay(300);
    const formData = await request.formData();
    const folder = formData.get("folder");
    const publicIdField = String(formData.get("public_id") ?? "file");
    const publicId =
      typeof folder === "string" && folder.length > 0
        ? `${folder}/${publicIdField}`
        : publicIdField;
    return HttpResponse.json({
      public_id: publicId,
      resource_type: "raw",
      type: "private",
      version: 1,
    });
  },
);

const videoUploadMock = http.post(
  "https://api.cloudinary.com/v1_1/:cloudName/video/upload",
  async ({ request }) => {
    await delay(300);
    const formData = await request.formData();
    const folder = formData.get("folder");
    const publicIdField = String(formData.get("public_id") ?? "video");
    return HttpResponse.json({
      format: "mp4",
      public_id:
        typeof folder === "string" && folder.length > 0
          ? `${folder}/${publicIdField}`
          : publicIdField,
      resource_type: "video",
      version: 1,
    });
  },
);

const destroyMock = http.post(`${API_BASE_URL}/destroy`, async () => {
  await delay(300);
  return HttpResponse.json({ result: "ok" });
});

export const cloudinaryHandlers: RequestHandler[] = [
  uploadMock,
  rawUploadMock,
  videoUploadMock,
  destroyMock,
];
