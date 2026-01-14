import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { auth, adminOnly } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const router = express.Router();
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/heic",
      "image/heif",
      "image/avif",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/ogg"
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  }
});

const cloudinaryEnabled = Boolean(process.env.CLOUDINARY_URL);
if (cloudinaryEnabled) {
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
}

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("Upload middleware error:", err);
      return res.status(500).json({ msg: "Upload failed", error: err?.message || "Unknown error" });
    }
    try {
      if (!req.file) return res.status(400).json({ msg: "File missing" });
      // If Cloudinary is configured, push to Cloudinary for persistent storage.
      if (cloudinaryEnabled) {
        cloudinary.uploader
          .upload(req.file.path, {
            folder: process.env.CLOUDINARY_FOLDER || "mrigmaya",
            resource_type: "auto"
          })
          .then((result) => {
            res.json({ url: result.secure_url || result.url });
          })
          .catch((uploadErr) => {
            console.error("Cloudinary upload failed:", uploadErr);
            res.status(500).json({ msg: "Upload failed", error: uploadErr?.message || "Cloud upload failed" });
          });
        return;
      }

      // Fallback: local uploads (non-persistent on hosted platform)
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (e) {
      console.error("Upload failed:", e);
      res.status(500).json({ msg: "Upload failed", error: e?.message || "Unknown error" });
    }
  });
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err);
    return res.status(400).json({ msg: err.message });
  }
  if (err && err.message === "Invalid file type") {
    console.error("Invalid file type:", err);
    return res
      .status(400)
      .json({ msg: "Only images (jpg, png, webp, gif) or videos (mp4, webm, ogg) up to 25MB are allowed" });
  }
  console.error("Unhandled upload error:", err);
  return res.status(500).json({ msg: "Upload failed", error: err?.message || "Unknown error" });
});

export default router;
