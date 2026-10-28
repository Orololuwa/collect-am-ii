import { describe, expect, test } from "vitest";

import { getPublicIdFromCloudinaryUrl } from "./storage-helpers.server";

describe("getPublicIdFromCloudinaryUrl()", () => {
  test("given: a null url, should: return undefined", () => {
    expect(getPublicIdFromCloudinaryUrl(null)).toBeUndefined();
  });

  test("given: an invalid url, should: return undefined", () => {
    expect(getPublicIdFromCloudinaryUrl("not a url")).toBeUndefined();
  });

  test("given: a non-Cloudinary url, should: return undefined", () => {
    expect(
      getPublicIdFromCloudinaryUrl(
        "https://example.com/storage/v1/object/public/app-images/user-avatars/abc.png",
      ),
    ).toBeUndefined();
  });

  test.each([
    {
      expected: "user-avatars/gfcqufunx7kdf20k54bdhpez",
      url: "https://res.cloudinary.com/demo/image/upload/v1712345678/user-avatars/gfcqufunx7kdf20k54bdhpez.png",
    },
    {
      expected: "organization-logos/oxws924a0m8zq86ui9yogg6n",
      url: "https://res.cloudinary.com/demo/image/upload/v1/organization-logos/oxws924a0m8zq86ui9yogg6n.JPG",
    },
    {
      expected: "user-avatars/abc",
      url: "https://res.cloudinary.com/demo/image/upload/w_128,h_128,c_fill/v1712345678/user-avatars/abc.webp",
    },
    {
      expected: "user-avatars/abc",
      url: "https://res.cloudinary.com/demo/image/upload/user-avatars/abc.png",
    },
  ])("given: a url $url, should: return public id $expected", ({
    url,
    expected,
  }) => {
    expect(getPublicIdFromCloudinaryUrl(url)).toEqual(expected);
  });
});
