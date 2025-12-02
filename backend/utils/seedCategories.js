import Category from "../models/Category.js";

const defaultCategories = [
  {
    name: "Bridal Sarees",
    slug: "bridal",
    description: "Heavy zari, poshaak inspired couture sarees for the baraat entry.",
    priority: 1
  },
  {
    name: "Party & Cocktail",
    slug: "party",
    description: "Sequins, shimmer satins and metallic silks built for your reception.",
    priority: 2
  },
  {
    name: "Daily Classics",
    slug: "daily",
    description: "Comfort sarees for work, puja and everyday errands.",
    priority: 3
  }
];

export const ensureDefaultCategories = async () => {
  for (const category of defaultCategories) {
    await Category.findOneAndUpdate(
      { slug: category.slug },
      { $setOnInsert: category },
      { upsert: true }
    );
  }
};
