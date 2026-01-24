import express from "express";
import Collection from "../models/Collection.js";
import Product from "../models/Product.js";
import { auth, adminOnly } from "../middleware/auth.js";

const router = express.Router();

const slugify = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const buildUniqueSlug = async (base) => {
  const root = slugify(base) || "collection";
  let slug = root;
  let counter = 1;
  // Ensure unique slug
  while (await Collection.exists({ slug })) {
    counter += 1;
    slug = `${root}-${counter}`;
  }
  return slug;
};

const syncProducts = async (collectionId, productIds = []) => {
  await Product.updateMany({ collections: collectionId }, { $pull: { collections: collectionId } });
  if (productIds.length) {
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $addToSet: { collections: collectionId } }
    );
  }
};

router.get("/", async (req, res) => {
  const includeProducts = req.query.includeProducts === "true";
  const collections = await Collection.find().sort({ priority: 1, createdAt: -1 });

  if (!includeProducts) return res.json(collections);

  const allProductIds = Array.from(
    new Set(
      collections.flatMap((collection) => collection.products?.map((id) => id.toString()) || [])
    )
  );

  const products = await Product.find({ _id: { $in: allProductIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const response = collections.map((collection) => {
    const orderedProducts = (collection.products || [])
      .map((id) => productMap.get(id.toString()))
      .filter(Boolean);

    return {
      ...collection.toObject(),
      products: orderedProducts
    };
  });

  res.json(response);
});

router.get("/slug/:slug", async (req, res) => {
  const includeProducts = req.query.includeProducts !== "false";
  const collection = await Collection.findOne({ slug: req.params.slug });
  if (!collection) return res.status(404).json({ msg: "Collection not found" });
  if (!includeProducts) return res.json(collection);

  const products = await Product.find({ _id: { $in: collection.products } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const orderedProducts = (collection.products || [])
    .map((id) => productMap.get(id.toString()))
    .filter(Boolean);

  res.json({
    ...collection.toObject(),
    products: orderedProducts
  });
});

router.post("/", auth, adminOnly, async (req, res) => {
  const rawSlug = (req.body.slug || "").trim();
  const normalizedSlug = rawSlug ? slugify(rawSlug) : await buildUniqueSlug(req.body.title || "");
  const payload = {
    title: req.body.title,
    slug: normalizedSlug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    ctaLabel: req.body.ctaLabel,
    accentColor: req.body.accentColor,
    heroImage: req.body.heroImage,
    heroImages: req.body.heroImages || [],
    displayOnHome: req.body.displayOnHome !== undefined ? req.body.displayOnHome : true,
    priority: req.body.priority ?? 999,
    products: req.body.products || []
  };

  const collection = await Collection.create(payload);
  if (payload.products?.length) {
    await syncProducts(collection._id, payload.products);
  }
  res.json(collection);
});

router.put("/:id", auth, adminOnly, async (req, res) => {
  const payload = {
    title: req.body.title,
    slug: req.body.slug,
    subtitle: req.body.subtitle,
    description: req.body.description,
    ctaLabel: req.body.ctaLabel,
    accentColor: req.body.accentColor,
    heroImage: req.body.heroImage,
    heroImages: req.body.heroImages,
    displayOnHome: req.body.displayOnHome,
    priority: req.body.priority,
    products: req.body.products
  };

  if (payload.slug !== undefined) {
    const normalized = slugify(payload.slug);
    if (normalized) {
      payload.slug = normalized;
    } else {
      delete payload.slug;
    }
  }

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

  const collection = await Collection.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!collection) return res.status(404).json({ msg: "Collection not found" });

  if (payload.products) {
    await syncProducts(collection._id, payload.products);
  }

  res.json(collection);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  await Product.updateMany({ collections: req.params.id }, { $pull: { collections: req.params.id } });
  await Collection.findByIdAndDelete(req.params.id);
  res.json({ msg: "Deleted" });
});

export default router;
