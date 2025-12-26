import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const populateCart = async (userId) =>
  Cart.findOne({ user: userId }).populate("items.product");

const buildVariantKey = (productId, color, size) =>
  [productId, color || "", size || ""].join("__").toLowerCase();

router.get("/", auth, async (req, res) => {
  const cart = (await populateCart(req.user._id)) || { items: [] };
  res.json(cart);
});

router.post("/add", auth, async (req, res) => {
  const { productId, quantity = 1, selectedColor = "", selectedSize = "" } = req.body;
  const variantKey = buildVariantKey(productId, selectedColor, selectedSize);
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ msg: "Product not found" });
  if (Number(product.stock) <= 0) {
    return res.status(400).json({ msg: "This product is out of stock" });
  }
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  const exists = cart.items.find(
    (i) =>
      i.product.toString() === productId &&
      (i.variantKey || buildVariantKey(i.product.toString(), i.selectedColor, i.selectedSize)) ===
        variantKey
  );

  if (exists) exists.quantity += quantity;
  else
    cart.items.push({
      product: productId,
      quantity,
      selectedColor,
      selectedSize,
      variantKey
    });

  await cart.save();
  const populated = await populateCart(req.user._id);
  res.json(populated);
});

router.post("/update", auth, async (req, res) => {
  const { productId, quantity, itemId, selectedColor = "", selectedSize = "" } = req.body;
  if (quantity < 1) {
    return res.status(400).json({ msg: "Quantity must be at least 1" });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(400).json({ msg: "Cart not found" });

  const variantKey = buildVariantKey(productId, selectedColor, selectedSize);
  const item = cart.items.find(
    (i) =>
      (itemId && i._id.toString() === itemId) ||
      (i.product.toString() === productId &&
        (i.variantKey || buildVariantKey(i.product.toString(), i.selectedColor, i.selectedSize)) ===
          variantKey)
  );
  if (!item) return res.status(404).json({ msg: "Item not in cart" });

  item.quantity = quantity;
  await cart.save();
  const populated = await populateCart(req.user._id);
  res.json(populated);
});

router.post("/remove", auth, async (req, res) => {
  const { productId, itemId, selectedColor = "", selectedSize = "" } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(400).json({ msg: "Cart not found" });

  const variantKey = buildVariantKey(productId, selectedColor, selectedSize);
  cart.items = cart.items.filter(
    (i) =>
      !(
        (itemId && i._id.toString() === itemId) ||
        (i.product.toString() === productId &&
          (i.variantKey || buildVariantKey(i.product.toString(), i.selectedColor, i.selectedSize)) ===
            variantKey)
      )
  );
  await cart.save();
  const populated = await populateCart(req.user._id);
  res.json(populated || { items: [] });
});

export default router;
