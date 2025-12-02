import express from "express";
import multer from "multer";
import path from "path";
import { auth, adminOnly } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  }
});

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ msg: "File missing" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ msg: err.message });
  }
  if (err && err.message === "Invalid file type") {
    return res.status(400).json({ msg: "Only images (jpg, png, webp, gif) up to 8MB are allowed" });
  }
  return next(err);
});

export default router;
