import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    discountType: { type: String, enum: ["flat", "percent"], default: "flat" },
    value: { type: Number, required: true }, // flat amount or percentage based on discountType
    maxDiscount: { type: Number }, // only used for percent coupons to cap discount
    maxRedemptions: { type: Number, default: 1 }, // overall cap across all users
    redemptions: { type: Number, default: 0 },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // enforce one use per user
    expiresAt: { type: Date },
    minOrderValue: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

couponSchema.pre("save", function (next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase();
  }
  next();
});

export default mongoose.model("Coupon", couponSchema);
