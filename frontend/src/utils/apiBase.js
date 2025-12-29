const envApiBase = (import.meta.env.VITE_API_BASE || "").trim();
const envAssetBase = (import.meta.env.VITE_ASSET_BASE || "").trim();

// Default to relative /api so dev can proxy and production still works.
export const API_BASE = envApiBase || "/api";

// Assets: prefer explicit asset base, else derive from full API base, else fall back to production host.
const derivedAssetBase = API_BASE.startsWith("http")
  ? API_BASE.replace(/\/api\/?$/, "")
  : "https://mrigmaya-saree.onrender.com";

export const ASSET_BASE = envAssetBase || derivedAssetBase;

export const buildAssetUrl = (url, fallback = "") => {
  if (!url) return fallback;
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE}${url}`;
};
