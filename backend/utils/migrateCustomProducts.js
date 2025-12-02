import HomeSection from "../models/HomeSection.js";
import Product from "../models/Product.js";

// One-time helper to create real Product docs for legacy custom mood items
// that don't yet have productId. This enables detail page + cart flow.
export const migrateCustomProducts = async () => {
  const cards = await HomeSection.find({ group: "category" });
  if (!cards.length) return;

  for (const card of cards) {
    const customs = card.meta?.customProducts || [];
    let touched = false;

    const updated = [];
    for (const item of customs) {
      if (item?.productId) {
        updated.push(item);
        continue;
      }

      // Create a lightweight product using the custom data
      const selling = Number(item.price || item.sellingPrice || item.discountPrice || 0);
      const mrp = Number(item.mrp || item.originalPrice || item.priceMrp || selling || 0);
      const payload = {
        name: item.name || "Custom item",
        description: `Auto-created for ${card.title || "mood"}`,
        category: card.title || "Custom",
        price: mrp || selling || 0,
        discountPrice: mrp > selling ? selling : undefined,
        stock: 50,
        images: Array.isArray(item.images) && item.images.length ? item.images : [item.image || ""]
      };

      try {
        const product = await Product.create(payload);
        updated.push({ ...item, productId: product._id.toString() });
        touched = true;
      } catch (err) {
        console.error("Custom product migrate failed", err?.message || err);
        updated.push(item);
      }
    }

    if (touched) {
      card.meta = { ...(card.meta || {}), customProducts: updated };
      await card.save();
    }
  }
};

