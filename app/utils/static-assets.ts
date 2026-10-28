/**
 * Base URL for the app's static images (brand logos, template placeholder
 * logos, seed data). Point this at wherever the `app-images` folder lives,
 * e.g. `https://res.cloudinary.com/<cloud_name>/image/upload/app-images` once
 * the files have been uploaded to Cloudinary with the same folder structure.
 *
 * TODO: still points at the old Supabase bucket until the images are moved.
 */
export const STATIC_ASSETS_BASE_URL =
  "https://iwvduhvsxhjpxapdochp.supabase.co/storage/v1/object/public/app-images";

export const RENSTUDIO_LOGO_URL = `${STATIC_ASSETS_BASE_URL}/ren-studio/ren-studio.svg`;
export const RENSTUDIO_LOGO_DARK_MODE_URL = `${STATIC_ASSETS_BASE_URL}/ren-studio/ren-studio-dark-mode.svg`;

export const PLACEHOLDER_LOGO_URLS = {
  logoipsum288: `${STATIC_ASSETS_BASE_URL}/organization-logos/logoipsum-288.svg`,
  logoipsum350: `${STATIC_ASSETS_BASE_URL}/organization-logos/logoipsum-350.svg`,
  logoipsum397: `${STATIC_ASSETS_BASE_URL}/organization-logos/logoipsum-397.svg`,
  logoipsum404: `${STATIC_ASSETS_BASE_URL}/organization-logos/logoipsum-404.svg`,
} as const;
