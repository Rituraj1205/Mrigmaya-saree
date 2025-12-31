import { buildAssetUrl } from "./apiBase";

const normalizeImages = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const firstColorImage = (colorImages) => {
  if (!Array.isArray(colorImages)) return "";
  for (const group of colorImages) {
    const candidates = normalizeImages(group?.images);
    const absolute = candidates.find((c) => /^https?:\/\//i.test(c));
    if (absolute) return absolute;
    if (candidates[0]) return candidates[0];
  }
  return "";
};

/**
 * Pick and resolve the best-fit product image.
 * Order: explicit index from images -> first image -> first colorImages image -> heroImage/image/cover.
 */
export const resolveProductImage = (item, fallback = "", index = 0) => {
  if (!item) return fallback;
  const normalized = normalizeImages(item.images);
  // Prefer absolute URLs in primary images, then colorImages, then any primary.
  const absolutePrimary = normalized.find((img) => /^https?:\/\//i.test(img));
  if (absolutePrimary) return buildAssetUrl(absolutePrimary, fallback);

  const colorImg = firstColorImage(item.colorImages);
  if (colorImg) return buildAssetUrl(colorImg, fallback);

  const indexed = normalized[index] || normalized[0];
  if (indexed) return buildAssetUrl(indexed, fallback);

  const single = item.heroImage || item.image || item.cover || "";
  return buildAssetUrl(single, fallback);
};
