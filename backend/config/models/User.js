import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  mobile: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  otp: String,
  otpExpires: Date,
  passwordHash: String,
  verified: { type: Boolean, default: false }
});

export default mongoose.model("User", userSchema);
