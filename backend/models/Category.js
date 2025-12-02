import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    image: String,
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 999 }
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
