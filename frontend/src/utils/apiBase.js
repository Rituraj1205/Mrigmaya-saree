const envBase = (import.meta.env.VITE_API_BASE || "").trim();
const isLocal =
  (typeof window !== "undefined" && window.location.hostname === "localhost") ||
  import.meta.env.DEV;

// Default to the hosted API when no env var is provided so production builds don't hit localhost.
const fallbackBase = isLocal ? "http://localhost:5000/api" : "https://mrigmaya-saree.onrender.com/api";

export const API_BASE = envBase || fallbackBase;
export const ASSET_BASE = API_BASE.replace(/\/api\/?$/, "");

export const buildAssetUrl = (url, fallback = "") => {
  if (!url) return fallback;
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE}${url}`;
};
