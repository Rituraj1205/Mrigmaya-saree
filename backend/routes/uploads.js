import express from "express";
import multer from "multer";
import path from "path";
import { auth, adminOnly } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/heic",
      "image/heif",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/ogg"
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  }
});

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("Upload middleware error:", err);
      return res.status(500).json({ msg: "Upload failed", error: err?.message || "Unknown error" });
    }
    try {
      if (!req.file) return res.status(400).json({ msg: "File missing" });
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
