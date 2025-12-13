import express from "express";
import HomeSection from "../models/HomeSection.js";
import { auth, adminOnly } from "../middleware/auth.js";

const router = express.Router();

const sanitizePayload = (body) => {
  const payload = {
    group: body.group,
    title: body.title,
    subtitle: body.subtitle,
    description: body.description,
    tag: body.tag,
    badge: body.badge,
    image: body.image,
    mobileImage: body.mobileImage,
    video: body.video,
    ctaLabel: body.ctaLabel,
    ctaLink: body.ctaLink,
    secondaryCtaLabel: body.secondaryCtaLabel,
    secondaryCtaLink: body.secondaryCtaLink,
    order: body.order,
    active: body.active,
    meta: body.meta
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

router.get("/", async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  const query = includeInactive ? {} : { active: true };
  const sections = await HomeSection.find(query).sort({ group: 1, order: 1, createdAt: 1 });
  res.json(sections);
});

router.post("/", auth, adminOnly, async (req, res) => {
  const section = await HomeSection.create(sanitizePayload(req.body));
  res.json(section);
});

router.put("/:id", auth, adminOnly, async (req, res) => {
  const section = await HomeSection.findByIdAndUpdate(req.params.id, sanitizePayload(req.body), {
    new: true
  });
  if (!section) return res.status(404).json({ msg: "Section not found" });
  res.json(section);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  await HomeSection.findByIdAndDelete(req.params.id);
  res.json({ msg: "Deleted" });
});

export default router;
