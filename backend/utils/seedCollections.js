import Collection from "../models/Collection.js";

const defaultCollections = [
  {
    title: "Signature Sarees",
    slug: "sarees",
    subtitle: "Curated sarees straight from our atelier",
    ctaLabel: "Shop Sarees",
    accentColor: "#c1275a",
    priority: 1
  },
  {
    title: "Ready Suits",
    slug: "suits",
    subtitle: "Contemporary suits for every edit",
    ctaLabel: "Shop Suits",
    accentColor: "#8247ff",
    priority: 2
  },
  {
    title: "Best Sellers",
    slug: "best-seller",
    subtitle: "Customer-loved pieces that keep selling out",
    ctaLabel: "Shop Best Sellers",
    accentColor: "#ff7d29",
    priority: 3
  },
  {
    title: "Gold Collection",
    slug: "gold",
    subtitle: "Gold-dusted couture moments",
    ctaLabel: "Explore Gold Edit",
    accentColor: "#d4a017",
    priority: 4
  }
];

export const ensureDefaultCollections = async () => {
  for (const collection of defaultCollections) {
    await Collection.findOneAndUpdate(
      { slug: collection.slug },
      {
        $setOnInsert: {
          ...collection,
          description: collection.subtitle,
          displayOnHome: true
        }
      },
      { upsert: true }
    );
  }
};
