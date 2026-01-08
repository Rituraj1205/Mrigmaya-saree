import mongoose from "mongoose";

const storeSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "store", unique: true },
    codEnabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("StoreSettings", storeSettingsSchema);
