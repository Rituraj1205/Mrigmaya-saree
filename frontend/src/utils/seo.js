const defaultImage = new URL("../assets/flogo-removebg-preview.png", import.meta.url).href;

const upsertMeta = (attr, key, value) => {
  if (!value) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
};

export const setPageMeta = ({ title, description, image, url }) => {
  if (typeof document === "undefined") return;
  const resolvedImage = image || defaultImage;
  const resolvedUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  if (title) {
    document.title = title;
    upsertMeta("property", "og:title", title);
    upsertMeta("name", "twitter:title", title);
  }

  if (description) {
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:description", description);
    upsertMeta("name", "twitter:description", description);
  }

  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:image", resolvedImage);
  upsertMeta("property", "og:url", resolvedUrl);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:image", resolvedImage);
};
