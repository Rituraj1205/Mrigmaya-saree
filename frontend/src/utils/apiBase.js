const envApiBase = (import.meta.env.VITE_API_BASE || "").trim();
const envAssetBase = (import.meta.env.VITE_ASSET_BASE || "").trim();

// Prefer explicit env values; default to production host so static builds work without a reverse proxy.
export const API_BASE = envApiBase || "https://mrigmaya.com/api";

// Assets: prefer explicit asset base, else derive from full API base, else fall back to production host.
const derivedAssetBase = API_BASE.startsWith("http")
  ? API_BASE.replace(/\/api\/?$/, "")
  : "https://mrigmaya.com";

export const ASSET_BASE = envAssetBase || derivedAssetBase;

export const buildAssetUrl = (url, fallback = "") => {
  if (!url) return fallback;
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE}${url}`;
};
