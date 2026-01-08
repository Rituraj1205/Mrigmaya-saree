import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Coupon from "../models/Coupon.js";
import StoreSettings from "../models/StoreSettings.js";
import { computeDiscount, normalizeCode } from "./coupons.js";
import { auth, adminOnly } from "../middleware/auth.js";
import Twilio from "twilio";
import PDFDocument from "pdfkit";

const PAY_NOW_DISCOUNT_RATE = 0.1;
const applyPayNowDiscount = (amount = 0) =>
  Math.max(1, Math.round(Number(amount || 0) * (1 - PAY_NOW_DISCOUNT_RATE)));

const statusLabels = {
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

const returnStatusOptions = ["none", "requested", "approved", "rejected", "received", "refunded"];

const router = express.Router();

const getStoreSettings = async () => {
  let settings = await StoreSettings.findOne({ key: "store" });
  if (!settings) {
    settings = await StoreSettings.create({ key: "store" });
  }
  return settings;
};

const razorpayConfigured =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

const razor = razorpayConfigured
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

const UPI_VPA = process.env.UPI_VPA || "sudathi@upi";
const UPI_NAME = process.env.UPI_NAME || "Sudathi Sarees";
const UPI_NOTE = process.env.UPI_NOTE || "Sudathi saree order";
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
const TWILIO_WA_FROM = process.env.TWILIO_WHATSAPP_FROM || "";
const ENABLE_WA_NOTIFICATIONS = process.env.ENABLE_WA_NOTIFICATIONS === "true";

const normalizeMobile = (mobile) => {
  if (!mobile) return null;
  const raw = mobile.toString();
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;

  // Handle common formats:
  // +91XXXXXXXXXX
  if (hasPlus && digits.length >= 10) {
    return `+${digits}`;
  }
  // 0XXXXXXXXXX (leading zero dialed)
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }
  // 91XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  // 10-digit local
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  // Fallback: prefix plus with cleaned digits
  return `+${digits}`;
};

const sendWhatsAppUpdate = async (order, message) => {
  if (!ENABLE_WA_NOTIFICATIONS || !twilioClient || !TWILIO_WA_FROM) return;
  const to = normalizeMobile(order.customerContact || order.shippingAddress?.phone);
  if (!to) return;
  try {
    await twilioClient.messages.create({
      from: `whatsapp:${TWILIO_WA_FROM}`,
      to: `whatsapp:${to}`,
      body: message
    });
  } catch (err) {
    console.error("WA send error:", err.message);
  }
};

const prepareCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || cart.items.length === 0) return null;
  const amount = cart.items.reduce(
    (sum, item) =>
      sum +
      (item.product.discountPrice || item.product.price || 0) * item.quantity,
    0
  );
  return { cart, amount };
};

const sanitizeAddress = (raw = {}, fallbackPhone = "") => {
  const address = {
    name: (raw.name || "").trim(),
    phone: (raw.phone || fallbackPhone || "").trim(),
    line1: (raw.line1 || "").trim(),
    line2: (raw.line2 || "").trim(),
    city: (raw.city || "").trim(),
    state: (raw.state || "").trim(),
    pincode: (raw.pincode || "").trim()
  };
  const requiredFields = ["name", "phone", "line1", "city", "state", "pincode"];
  const missing = requiredFields.filter((field) => !address[field]);
  return { address, missing };
};

const validateCouponForUser = async (code, userId, amount) => {
  if (!code) return { discount: 0, coupon: null };
  const normalizedCode = normalizeCode(code);
  const coupon = await Coupon.findOne({ code: normalizedCode, active: true });
  if (!coupon) throw new Error("Invalid coupon");
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw new Error("Coupon expired");
  }
  if (coupon.redemptions >= coupon.maxRedemptions) {
    throw new Error("Coupon limit reached");
  }
  if (coupon.usedBy?.some((id) => id.toString() === userId.toString())) {
    throw new Error("You have already used this coupon");
  }
  const discount = computeDiscount(coupon, amount);
  return { discount, coupon };
};

const markCouponRedeemed = async (couponId, userId) => {
  if (!couponId) return;
  await Coupon.findByIdAndUpdate(couponId, {
    $addToSet: { usedBy: userId },
    $inc: { redemptions: 1 }
  });
};

router.get("/", auth, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const query = isAdmin ? {} : { user: req.user._id };
  if (isAdmin && req.query.returnRequested === "true") {
    query.returnRequested = true;
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("items.product", "name images colorImages price productCode")
      .populate("user", "mobile name"),
    Order.countDocuments(query)
  ]);

  res.json({ orders, page, totalPages: Math.ceil(total / limit) || 1 });
});

router.get("/:id", auth, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const order = await Order.findById(req.params.id)
    .populate("items.product", "name images colorImages price productCode")
    .populate("user", "mobile name");
  if (!order) return res.status(404).json({ msg: "Order not found" });
  if (!isAdmin && order.user?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ msg: "Not allowed" });
  }
  res.json(order);
});

// Customer return request
router.post("/:id/return-request", auth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ msg: "Order not found" });
  if (order.user?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ msg: "Not allowed" });
  }
  if (order.returnStatus && order.returnStatus !== "none" && order.returnStatus !== "rejected") {
    return res.status(400).json({ msg: "Return already requested" });
  }
  if (order.status !== "delivered") {
    return res.status(400).json({ msg: "Return available only after delivery" });
  }
  const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
  const daysSinceOrder = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  if (daysSinceOrder > 7) {
    return res.status(400).json({ msg: "Return window (7 days) has expired" });
  }
  order.returnRequested = true;
  order.returnStatus = "requested";
  order.returnReason = req.body.reason || "";
  order.returnNote = req.body.note || "";
  order.returnRequestedAt = new Date();
  order.returnImages = Array.isArray(req.body.images)
    ? req.body.images.filter(Boolean).slice(0, 3)
    : [];
  await order.save();
  res.json({ msg: "Return request submitted", order });
});

router.post("/", auth, async (req, res) => {
  const prepared = await prepareCart(req.user._id);
  if (!prepared) return res.status(400).json({ msg: "Cart empty" });

  const { cart, amount: originalAmount } = prepared;
  const paymentMethod = req.body.paymentMethod === "UPI" ? "UPI" : "COD";
  const settings = await getStoreSettings();
  if (paymentMethod === "COD" && settings.codEnabled === false) {
    return res.status(400).json({ msg: "Cash on Delivery is currently disabled." });
  }
  const couponCodeRaw = req.body.couponCode;
  const { address: shippingAddress, missing } = sanitizeAddress(
    req.body.shippingAddress,
    req.user.mobile
  );
  if (missing.length) {
    return res.status(400).json({ msg: `Shipping details missing: ${missing.join(", ")}` });
  }

  let couponDiscount = 0;
  let couponDoc = null;
  try {
    if (couponCodeRaw) {
      const { discount, coupon } = await validateCouponForUser(
        couponCodeRaw,
        req.user._id,
        originalAmount
      );
      couponDiscount = discount;
      couponDoc = coupon;
    }
  } catch (err) {
    return res.status(400).json({ msg: err.message || "Invalid coupon" });
  }

  const amountAfterCoupon = Math.max(0, originalAmount - couponDiscount);
  const amount =
    paymentMethod === "UPI" ? applyPayNowDiscount(amountAfterCoupon) : amountAfterCoupon;
  const discountRate = paymentMethod === "UPI" ? PAY_NOW_DISCOUNT_RATE : 0;
  const discountAmount =
    paymentMethod === "UPI" ? amountAfterCoupon - amount : 0;

  const orderPayload = {
    user: req.user._id,
    items: cart.items.map((i) => ({
      product: i.product._id,
      quantity: i.quantity,
      price: i.product.discountPrice || i.product.price,
      productCode: i.product.productCode || "",
      selectedColor: i.selectedColor || "",
      selectedSize: i.selectedSize || ""
    })),
    amount,
    originalAmount,
    couponDiscount,
    couponCode: couponDoc?.code,
    coupon: couponDoc?._id,
    discountRate,
    discountAmount,
    paymentMethod,
    paymentStatus: paymentMethod === "COD" ? "cod_pending" : "awaiting_upi",
    status: "processing",
    shippingAddress,
    customerNote: req.body.customerNote || "",
    customerContact: req.user.mobile || req.body.customerContact || ""
  };

  let upiIntent;
  if (paymentMethod === "UPI") {
    const amountValue = Math.max(amount, 1).toFixed(2);
    const tn = encodeURIComponent(UPI_NOTE);
    upiIntent = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent(
      UPI_NAME
    )}&am=${amountValue}&cu=INR&tn=${tn}`;
    orderPayload.upiIntent = upiIntent;
  }

  const order = await Order.create(orderPayload);
  if (couponDoc?._id) {
    await markCouponRedeemed(couponDoc._id, req.user._id);
  }
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  res.json({
    order,
    upiIntent,
    message:
      paymentMethod === "COD"
        ? "Order placed with Cash on Delivery."
        : "Order placed. Complete the UPI payment to confirm."
  });
});

router.post("/create", auth, async (req, res) => {
  if (!razor) {
    return res.status(500).json({ msg: "Razorpay keys not configured" });
  }

  const prepared = await prepareCart(req.user._id);
  if (!prepared) return res.status(400).json({ msg: "Cart empty" });

  const { cart, amount: originalAmount } = prepared;
  const couponCodeRaw = req.body.couponCode;
  const { address: shippingAddress, missing } = sanitizeAddress(
    req.body.shippingAddress,
    req.user.mobile
  );
  if (missing.length) {
    return res.status(400).json({ msg: `Shipping details missing: ${missing.join(", ")}` });
  }

  let couponDiscount = 0;
  let couponDoc = null;
  try {
    if (couponCodeRaw) {
      const { discount, coupon } = await validateCouponForUser(
        couponCodeRaw,
        req.user._id,
        originalAmount
      );
      couponDiscount = discount;
      couponDoc = coupon;
    }
  } catch (err) {
    return res.status(400).json({ msg: err.message || "Invalid coupon" });
  }

  const amountAfterCoupon = Math.max(0, originalAmount - couponDiscount);
  const amount = applyPayNowDiscount(amountAfterCoupon);
  const discountRate = PAY_NOW_DISCOUNT_RATE;
  const discountAmount = amountAfterCoupon - amount;

  const razorpayOrder = await razor.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `rcpt_${Date.now()}`
  });

  const order = await Order.create({
    user: req.user._id,
    items: cart.items.map((i) => ({
      product: i.product._id,
      quantity: i.quantity,
      price: i.product.discountPrice || i.product.price,
      productCode: i.product.productCode || "",
      selectedColor: i.selectedColor || "",
      selectedSize: i.selectedSize || ""
    })),
    amount,
    originalAmount,
    couponDiscount,
    couponCode: couponDoc?.code,
    coupon: couponDoc?._id,
    discountRate,
    discountAmount,
    paymentMethod: "RAZORPAY",
    paymentStatus: "awaiting_gateway",
    status: "processing",
    razorpayOrderId: razorpayOrder.id,
    shippingAddress
  });

  if (couponDoc?._id) {
    await markCouponRedeemed(couponDoc._id, req.user._id);
  }

  res.json({ order, razorpayOrder });
});

router.post("/verify", auth, async (req, res) => {
  if (!razor) {
    return res.status(500).json({ msg: "Razorpay keys not configured" });
  }

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    req.body;

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ msg: "Invalid signature" });
  }

  const order = await Order.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id, user: req.user._id },
    {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paymentStatus: "paid"
    },
    { new: true }
  );

  if (!order) return res.status(404).json({ msg: "Order not found" });

  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  res.json({ msg: "Payment verified", order });
});

router.patch("/:id", auth, adminOnly, async (req, res) => {
  const updates = {};
  ["status", "paymentStatus", "customerNote", "trackingNumber", "trackingLink", "carrier"].forEach(
    (key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
  );
  if (req.body.returnStatus && returnStatusOptions.includes(req.body.returnStatus)) {
    updates.returnStatus = req.body.returnStatus;
    updates.returnRequested = req.body.returnStatus !== "none";
  }
  if (req.body.returnNote !== undefined) {
    updates.returnNote = req.body.returnNote;
  }
  const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true })
    .populate("items.product", "name images price")
    .populate("user", "mobile name");
  if (!order) return res.status(404).json({ msg: "Order not found" });
  const statusText = statusLabels[order.status] || order.status;
  const paymentText = order.paymentStatus;
  const trackingValue = order.trackingLink || order.trackingNumber || "";
  const trackingText = trackingValue ? `Tracking: ${trackingValue}` : "";
  const shortId = String(order._id || "").slice(-6);
  await sendWhatsAppUpdate(
    order,
    `Your order #${shortId} status: ${statusText}. Payment: ${paymentText}. ${trackingText}`
  );
  res.json(order);
});

router.get("/:id/invoice", auth, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const order = await Order.findById(req.params.id).populate("items.product", "name price discountPrice");
  if (!order) return res.status(404).json({ msg: "Order not found" });
  if (!isAdmin && order.user?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${order._id.toString().slice(-6)}.pdf`
  );

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  const addr = order.shippingAddress || {};
  const amount = order.amount || 0;
  const items = order.items || [];

  doc
    .fontSize(18)
    .text("Mrigmaya Saree", { align: "left" })
    .fontSize(10)
    .moveDown(0.3)
    .text("Surat, Gujarat")
    .text("GST: NA")
    .moveDown(1);

  doc
    .fontSize(16)
    .text(`Invoice #${order._id.toString().slice(-6)}`, { align: "right" })
    .fontSize(10)
    .text(`Date: ${new Date(order.createdAt).toLocaleString()}`, { align: "right" })
    .moveDown(1);

  doc.fontSize(12).text("Bill To:");
  doc
    .fontSize(10)
    .text(addr.name || "", { continued: false })
    .text(addr.phone || order.customerContact || "")
    .text(
      [addr.line1, addr.line2, [addr.city, addr.state].filter(Boolean).join(", "), addr.pincode]
        .filter(Boolean)
        .join(" | ")
    )
    .moveDown(1);

  doc.fontSize(12).text("Items", { underline: true });
  doc.moveDown(0.5);
  items.forEach((item, idx) => {
    const price = item.price || item.product?.price || 0;
    doc
      .fontSize(10)
      .text(`${idx + 1}. ${item.product?.name || "Item"}`, { continued: true })
      .text(`  x${item.quantity}`, { align: "right" });
    doc.text(`Price: ₹${price}`, { align: "right" });
    doc.moveDown(0.3);
  });

  doc.moveDown(0.5);
  doc.fontSize(12).text(`Amount: ₹${amount}`, { align: "right" });
  doc
    .fontSize(10)
    .text(`Payment Method: ${order.paymentMethod || "-"}`, { align: "right" })
    .text(`Payment Status: ${order.paymentStatus || "-"}`, { align: "right" })
    .text(`Order Status: ${order.status || "-"}`, { align: "right" });

  doc.moveDown(1);
  doc.fontSize(9).fillColor("#666").text("This is a computer generated invoice.", { align: "center" });

  doc.end();
});

export default router;
