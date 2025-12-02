import express from "express";
import Category from "../models/Category.js";
import { auth, adminOnly } from "../middleware/auth.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const categories = await Category.find({ active: true }).sort({ priority: 1, name: 1 });
  res.json(categories);
});

router.get("/all", auth, adminOnly, async (req, res) => {
  const categories = await Category.find().sort({ priority: 1, name: 1 });
  res.json(categories);
});

router.post("/", auth, adminOnly, async (req, res) => {
  const payload = {
    name: req.body.name,
    slug: req.body.slug,
    description: req.body.description,
    image: req.body.image,
    active: req.body.active ?? true,
    priority: req.body.priority ?? 999
  };
  const category = await Category.create(payload);
  res.json(category);
});

router.put("/:id", auth, adminOnly, async (req, res) => {
  const payload = {
    name: req.body.name,
    slug: req.body.slug,
    description: req.body.description,
    image: req.body.image,
    active: req.body.active,
    priority: req.body.priority
  };
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  const category = await Category.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!category) return res.status(404).json({ msg: "Category not found" });
  res.json(category);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ msg: "Deleted" });
});

export default router;
