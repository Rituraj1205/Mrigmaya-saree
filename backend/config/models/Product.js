import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  fabric: String,
  color: String,
  price: Number,
  discountPrice: Number,
  stock: Number,
  images: [String],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Product", productSchema);
