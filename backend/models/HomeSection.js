import mongoose from "mongoose";

const homeSectionSchema = new mongoose.Schema(
  {
    group: {
      type: String,
      enum: [
        "hero",
        "category",
        "promo",
        "media",
        "testimonial",
        "usp",
        "story",
        "logoStrip",
        "custom"
      ],
      required: true
    },
    title: String,
    subtitle: String,
    description: String,
    tag: String,
    badge: String,
    image: String,
    mobileImage: String,
    ctaLabel: String,
    ctaLink: String,
    secondaryCtaLabel: String,
    secondaryCtaLink: String,
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    meta: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

homeSectionSchema.index({ group: 1, order: 1 });

export default mongoose.model("HomeSection", homeSectionSchema);
