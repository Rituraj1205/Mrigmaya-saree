import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    subtitle: String,
    description: String,
    ctaLabel: String,
    accentColor: { type: String, default: "#c1275a" },
    heroImage: String,
    heroImages: [String],
    displayOnHome: { type: Boolean, default: true },
    priority: { type: Number, default: 999 },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }]
  },
  { timestamps: true }
);

export default mongoose.model("Collection", collectionSchema);
