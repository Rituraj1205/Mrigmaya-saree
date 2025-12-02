import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    mongoose.set("debug", false);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Mongo DB Error:", err?.message || "connection failed");
    process.exit(1);
  }
};
