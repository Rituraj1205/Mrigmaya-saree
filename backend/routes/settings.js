import express from "express";
import StoreSettings from "../models/StoreSettings.js";
import { auth, adminOnly } from "../middleware/auth.js";

const router = express.Router();

const getStoreSettings = async () => {
  let settings = await StoreSettings.findOne({ key: "store" });
  if (!settings) {
    settings = await StoreSettings.create({ key: "store" });
  }
  return settings;
};

router.get("/public", async (req, res) => {
  const settings = await getStoreSettings();
  res.json({ codEnabled: settings.codEnabled });
});

router.get("/", auth, adminOnly, async (req, res) => {
  const settings = await getStoreSettings();
  res.json({ codEnabled: settings.codEnabled });
});

router.put("/", auth, adminOnly, async (req, res) => {
  const settings = await getStoreSettings();
  if (typeof req.body.codEnabled === "boolean") {
    settings.codEnabled = req.body.codEnabled;
  }
  await settings.save();
  res.json({ codEnabled: settings.codEnabled });
});

export default router;
