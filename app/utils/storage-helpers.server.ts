/**
 * Extracts the Cloudinary public id from an image delivery URL, e.g.
 * `https://res.cloudinary.com/<cloud>/image/upload/v1712/user-avatars/abc.png`
 * → `user-avatars/abc`.
 *
 * @param url - The image URL.
 * @returns The public id, or `undefined` if the URL isn't a Cloudinary upload.
 */
export function getPublicIdFromCloudinaryUrl(url?: string | null) {
  if (!url) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  if (parsed.hostname !== "res.cloudinary.com") {
    return;
  }

  // /<cloud>/image/upload/[<transformations>/][v<version>/]<public_id>.<ext>
  const match =
    /^\/[^/]+\/image\/upload\/(?:.*?\/)?(?:v\d+\/)(.+?)(?:\.[^./]+)?$/.exec(
      parsed.pathname,
    ) ?? /^\/[^/]+\/image\/upload\/(.+?)(?:\.[^./]+)?$/.exec(parsed.pathname);

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}
