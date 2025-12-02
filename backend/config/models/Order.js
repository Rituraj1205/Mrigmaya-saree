import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  quantity: Number,
  price: Number
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [orderItemSchema],
  amount: Number,
  originalAmount: Number,
  discountRate: Number,
  discountAmount: Number,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  status: { type: String, default: "created" },
  shippingAddress: Object,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Order", orderSchema);
