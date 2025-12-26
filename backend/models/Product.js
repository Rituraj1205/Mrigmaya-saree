import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  categoryRef: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  fabric: String,
  color: String,
  amazonLink: String,
  flipkartLink: String,
  price: Number,
  discountPrice: Number,
  stock: Number,
  colors: { type: [String], default: [] },
  sizes: { type: [String], default: [] },
  images: [String],
  video: String,
  collections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Collection" }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Product", productSchema);
