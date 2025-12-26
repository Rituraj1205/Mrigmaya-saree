import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  quantity: Number,
  price: Number,
  selectedColor: String,
  selectedSize: String
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [orderItemSchema],
  amount: Number,
  originalAmount: Number,
  discountRate: Number,
  discountAmount: Number,
  paymentMethod: { type: String, default: "COD" },
  paymentStatus: { type: String, default: "pending" },
  status: { type: String, default: "processing" },
  couponCode: String,
  couponDiscount: { type: Number, default: 0 },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
  returnRequested: { type: Boolean, default: false },
  returnReason: String,
  returnStatus: {
    type: String,
    enum: ["none", "requested", "approved", "rejected", "received", "refunded"],
    default: "none"
  },
  returnNote: String,
  returnImages: [String],
  returnRequestedAt: Date,
  customerContact: String,
  customerNote: String,
  upiIntent: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  shippingAddress: Object,
  trackingLink: String,
  trackingNumber: String,
  carrier: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Order", orderSchema);
