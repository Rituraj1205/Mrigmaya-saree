import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Always load .env from backend folder, regardless of cwd
dotenv.config({ path: path.resolve(__dirname, "./.env") });

import { connectDB } from "./config/db.js";
import { ensureDefaultCollections } from "./utils/seedCollections.js";
import { ensureDefaultCategories } from "./utils/seedCategories.js";
import { migrateCustomProducts } from "./utils/migrateCustomProducts.js";
import { ensureAdminUser } from "./utils/ensureAdminUser.js";

// Routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import collectionRoutes from "./routes/collections.js";
import uploadRoutes from "./routes/uploads.js";
import homeSectionRoutes from "./routes/homeSections.js";
import categoryRoutes from "./routes/categories.js";
import couponRoutes from "./routes/coupons.js";
import settingsRoutes from "./routes/settings.js";

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultOrigins = ["https://mrigmaya.com", "http://mrigmaya.com"];
for (const origin of defaultOrigins) {
  if (!allowedOrigins.includes(origin)) {
    allowedOrigins.push(origin);
  }
}

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow all origins in local/dev or when "*" is configured
      if (!allowedOrigins.length || allowedOrigins.includes("*")) {
        return callback(null, true);
      }

      // Always allow localhost dev
      if (origin && origin.startsWith("http://localhost")) {
        return callback(null, true);
      }

      // Allow requests without an Origin header (like curl/postman/health checks)
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed = allowedOrigins.some((allowed) => {
        const normalized = allowed.replace(/\/$/, "");
        return origin === normalized || origin.startsWith(`${normalized}/`);
      });

      if (isAllowed) return callback(null, true);

      console.warn(`Blocked CORS origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json({ limit: "5mb" }));
// Serve uploaded assets from a stable absolute path (works even if cwd changes)
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

app.get("/", (req, res) => res.send("Backend Running"));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/home-sections", homeSectionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/settings", settingsRoutes);

const startServer = async () => {
  await connectDB();
  await ensureAdminUser();
  await ensureDefaultCollections();
  await ensureDefaultCategories();
  await migrateCustomProducts();
  const { ensureDefaultHomeSections } = await import("./utils/seedHomeSections.js");
  await ensureDefaultHomeSections();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`dYs? Server running on port ${PORT}`));
};

startServer();
