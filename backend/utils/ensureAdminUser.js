import bcrypt from "bcryptjs";
import User from "../models/User.js";

const DEFAULT_ADMIN_EMAIL = "mrigmaya101@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Mrigmaya@*123";

export const ensureAdminUser = async () => {
  const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  let admin = await User.findOne({ email });
  if (!admin) {
    const passwordHash = await bcrypt.hash(password, 10);
    admin = await User.create({
      email,
      name,
      role: "admin",
      passwordHash,
      verified: true
    });
    console.log("Created admin account", email);
    return;
  }

  let updated = false;
  if (admin.role !== "admin") {
    admin.role = "admin";
    updated = true;
  }
  if (!admin.verified) {
    admin.verified = true;
    updated = true;
  }
  const passwordMatches = await bcrypt.compare(password, admin.passwordHash || "");
  if (!passwordMatches) {
    admin.passwordHash = await bcrypt.hash(password, 10);
    updated = true;
  }
  if (!admin.name) {
    admin.name = name;
    updated = true;
  }

  if (updated) {
    await admin.save();
    console.log("Synced admin credentials for", email);
  }
};
