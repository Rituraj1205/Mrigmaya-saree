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
    const pick = normalizeImages(group?.images)[0];
    if (pick) return pick;
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
  const chosen = normalized[index] || normalized[0];
  if (chosen) return buildAssetUrl(chosen, fallback);

  const colorImg = firstColorImage(item.colorImages);
  if (colorImg) return buildAssetUrl(colorImg, fallback);

  const single = item.heroImage || item.image || item.cover || "";
  return buildAssetUrl(single, fallback);
};
