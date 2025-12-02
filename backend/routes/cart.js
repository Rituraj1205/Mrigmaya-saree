import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const populateCart = async (userId) =>
  Cart.findOne({ user: userId }).populate("items.product");

router.get("/", auth, async (req, res) => {
  const cart = (await populateCart(req.user._id)) || { items: [] };
  res.json(cart);
});

router.post("/add", auth, async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  const exists = cart.items.find((i) => i.product.toString() === productId);

  if (exists) exists.quantity += quantity;
  else cart.items.push({ product: productId, quantity });

  await cart.save();
  const populated = await populateCart(req.user._id);
  res.json(populated);
});

router.post("/update", auth, async (req, res) => {
  const { productId, quantity } = req.body;
  if (quantity < 1) {
    return res.status(400).json({ msg: "Quantity must be at least 1" });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(400).json({ msg: "Cart not found" });

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) return res.status(404).json({ msg: "Item not in cart" });

  item.quantity = quantity;
  await cart.save();
  const populated = await populateCart(req.user._id);
  res.json(populated);
});

router.post("/remove", auth, async (req, res) => {
  const { productId } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(400).json({ msg: "Cart not found" });

  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  await cart.save();
  const populated = await populateCart(req.user._id);
  res.json(populated || { items: [] });
});

export default router;
