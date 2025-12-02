import express from "express";
import Coupon from "../models/Coupon.js";
import { auth, adminOnly } from "../middleware/auth.js";

const router = express.Router();

const normalizeCode = (code = "") => code.trim().toUpperCase();

const computeDiscount = (coupon, amount = 0) => {
  const safeAmount = Math.max(0, Number(amount) || 0);
  if (coupon.discountType === "percent") {
    const raw = Math.round((safeAmount * coupon.value) / 100);
    const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    return Math.max(0, capped);
  }
  return Math.max(0, Math.round(coupon.value || 0));
};

// Admin: create or update a coupon
router.post("/", auth, adminOnly, async (req, res) => {
  const {
    code,
    discountType = "flat",
    value,
    maxDiscount,
    maxRedemptions = 1,
    expiresAt,
    minOrderValue = 0,
    active = true
  } = req.body;

  if (!code || !value) {
    return res.status(400).json({ msg: "Code and value are required" });
  }

  const normalizedCode = normalizeCode(code);
  const parsedExpiry = expiresAt ? new Date(expiresAt) : null;
  const safeExpiry = parsedExpiry && !Number.isNaN(parsedExpiry.getTime()) ? parsedExpiry : undefined;

  const payload = {
    code: normalizedCode,
    discountType,
    value: Number(value),
    maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
    maxRedemptions: Number(maxRedemptions) || 1,
    expiresAt: safeExpiry,
    minOrderValue: Number(minOrderValue) || 0,
    active
  };

  const coupon = await Coupon.findOneAndUpdate({ code: normalizedCode }, payload, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  });

  res.json({ coupon, msg: "Coupon saved" });
});

// Admin: list coupons
router.get("/", auth, adminOnly, async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(coupons);
});

// Admin: delete coupon
router.delete("/:id", auth, adminOnly, async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ msg: "Coupon deleted" });
});

// Admin: update active or other fields
router.patch("/:id", auth, adminOnly, async (req, res) => {
  const updates = {};
  ["active", "minOrderValue", "discountType", "value", "maxDiscount", "maxRedemptions", "expiresAt"].forEach(
    (key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
  );
  if (updates.expiresAt) {
    const parsed = new Date(updates.expiresAt);
    updates.expiresAt = Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (updates.minOrderValue !== undefined) updates.minOrderValue = Number(updates.minOrderValue) || 0;
  if (updates.value !== undefined) updates.value = Number(updates.value);
  if (updates.maxDiscount !== undefined) updates.maxDiscount = Number(updates.maxDiscount);
  if (updates.maxRedemptions !== undefined)
    updates.maxRedemptions = Number(updates.maxRedemptions) || 1;
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json({ coupon, msg: "Coupon updated" });
});

// Auth: preview/apply a coupon against an amount (does not mark redeemed)
router.post("/apply", auth, async (req, res) => {
  const { code, amount } = req.body;
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return res.status(400).json({ msg: "Coupon code required" });

  const coupon = await Coupon.findOne({ code: normalizedCode, active: true });
  if (!coupon) return res.status(404).json({ msg: "Invalid coupon" });
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return res.status(400).json({ msg: "Coupon expired" });
  }
  if (coupon.redemptions >= coupon.maxRedemptions) {
    return res.status(400).json({ msg: "Coupon limit reached" });
  }
  if (coupon.usedBy?.some((id) => id.toString() === req.user._id.toString())) {
    return res.status(400).json({ msg: "You have already used this coupon" });
  }
  if (coupon.minOrderValue && Number(amount || 0) < coupon.minOrderValue) {
    return res.status(400).json({ msg: `Minimum order value is Rs. ${coupon.minOrderValue}` });
  }

  const discount = computeDiscount(coupon, amount);
  const finalAmount = Math.max(1, Math.round((Number(amount) || 0) - discount));

  res.json({
    couponId: coupon._id,
    code: coupon.code,
    discount,
    finalAmount
  });
});

export { computeDiscount, normalizeCode };
export default router;
