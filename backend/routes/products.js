import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Collection from "../models/Collection.js";
import Category from "../models/Category.js";
import { auth, adminOnly } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/quicktime",
      "video/webm"
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  }
});

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const coerceNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildProductPayload = async (req) => {
  const payload = {
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    video: req.body.video,
    fabric: req.body.fabric,
    color: req.body.color,
    price: coerceNumber(req.body.price),
    discountPrice: coerceNumber(req.body.discountPrice),
    stock: coerceNumber(req.body.stock)
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  const imagesFromBody = toArray(req.body.images);
  const combinedImages = [];
  if (imagesFromBody.length) combinedImages.push(...imagesFromBody);
  if (req.files?.length) {
    combinedImages.push(...req.files.map((file) => `/uploads/${file.filename}`));
  }
  if (combinedImages.length) {
    payload.images = combinedImages;
  }

  if (req.body.categoryRef) {
    const exists = await Category.exists({ _id: req.body.categoryRef });
    if (exists) {
      payload.categoryRef = req.body.categoryRef;
    }
  }

  if (req.body.collections !== undefined) {
    const collectionIds = toArray(req.body.collections);
    payload.collections = collectionIds;
  }

  return payload;
};

const validateProductPayload = (payload) => {
  if (!payload.name || !payload.name.trim()) return "Product name is required";
  if (payload.price === undefined || payload.price === null || payload.price < 0)
    return "Price is required";
  return null;
};

const syncProductCollections = async (productId, collectionIds = []) => {
  await Collection.updateMany({ products: productId }, { $pull: { products: productId } });
  if (collectionIds.length) {
    const ids = collectionIds.map((id) => new mongoose.Types.ObjectId(id));
    await Collection.updateMany({ _id: { $in: ids } }, { $addToSet: { products: productId } });
  }
};

router.post("/", auth, adminOnly, upload.array("images"), async (req, res) => {
  const payload = await buildProductPayload(req);
  const validationError = validateProductPayload(payload);
  if (validationError) return res.status(400).json({ msg: validationError });
  const product = await Product.create(payload);
  if (payload.collections !== undefined) {
    await syncProductCollections(product._id, payload.collections);
  }
  res.json(product);
});

router.put("/:id", auth, adminOnly, upload.array("images"), async (req, res) => {
  const payload = await buildProductPayload(req);
  const validationError = validateProductPayload(payload);
  if (validationError) return res.status(400).json({ msg: validationError });
  const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!product) return res.status(404).json({ msg: "Product not found" });
  if (payload.collections !== undefined) {
    await syncProductCollections(product._id, payload.collections);
  }
  res.json(product);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ msg: "Product not found" });
  await Collection.updateMany({ products: product._id }, { $pull: { products: product._id } });
  res.json({ msg: "Deleted" });
});

router.get("/", async (req, res) => {
  const list = await Product.find()
    .populate("collections", "title slug")
    .populate("categoryRef", "name slug");
  res.json(list);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ msg: "Product not found" });
  }
  try {
    const p = await Product.findById(id)
      .populate("collections", "title slug")
      .populate("categoryRef", "name slug");
    if (!p) return res.status(404).json({ msg: "Product not found" });
    res.json(p);
  } catch (err) {
    console.error("Product fetch error:", err?.message || err);
    res.status(500).json({ msg: "Could not load product" });
  }
});

export default router;
