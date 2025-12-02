import HomeSection from "../models/HomeSection.js";

const defaultSections = [
  {
    group: "hero",
    title: "Rajputana Heirloom Edit",
    subtitle: "Hand embroidered poshaaks finished in-house",
    description: "From mirror heavy lehengas to artisanal gota pati sarees, every silhouette is made-to-admire.",
    badge: "New Drop",
    ctaLabel: "Shop Royal Looks",
    ctaLink: "/products",
    secondaryCtaLabel: "View Lookbook",
    secondaryCtaLink: "/products",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=80",
    order: 1
  },
  {
    group: "hero",
    title: "Bespoke Saree Studio",
    subtitle: "Curated satin, chiffon and banarasi picks",
    description: "A limited collection of couture approved sarees, styled with Sudathi's gold standard finishing.",
    badge: "Studio Favourite",
    ctaLabel: "Explore Sarees",
    ctaLink: "/products",
    secondaryCtaLabel: "Book Styling Call",
    secondaryCtaLink: "/products",
    image: "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1400&q=80",
    order: 2
  },
  {
    group: "usp",
    title: "Ships Pan India",
    subtitle: "18k+ pincodes",
    order: 1
  },
  {
    group: "usp",
    title: "Complimentary fall & pico",
    subtitle: "Ready to drape",
    order: 2
  },
  {
    group: "usp",
    title: "Dedicated stylists",
    subtitle: "WhatsApp concierge",
    order: 3
  },
  {
    group: "usp",
    title: "Studio grade QC",
    subtitle: "Every saree inspected",
    order: 4
  },
  {
    group: "promo",
    title: "Up to 50% off",
    subtitle: "Studio Seconds | Limited sizes",
    description: "A curation of archive pieces, artisanal dupattas and one-off couture sarees.",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
    ctaLabel: "Shop sale",
    ctaLink: "/products",
    order: 1
  },
  {
    group: "promo",
    title: "Saree Saturdays",
    subtitle: "New drops every weekend",
    description: "Join our live styling session straight from Surat and grab exclusive edits.",
    image: "https://images.unsplash.com/photo-1504198458649-3128b932f49b?auto=format&fit=crop&w=1200&q=80",
    ctaLabel: "Set reminder",
    ctaLink: "/products",
    order: 2
  },
  {
    group: "media",
    title: "As seen on National Media",
    subtitle: "Hum Karke Dikhate Hain",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    meta: {
      logos: [
        "The Indian Express",
        "YourStory",
        "Retail.com",
        "StartupPedia",
        "Z Business"
      ]
    },
    order: 1
  },
  {
    group: "story",
    title: "Pure Gold Edit",
    subtitle: "Limited couture moment",
    description: "Handwoven silk sarees drenched in metallic hues and finished with our gold signature borders.",
    image: "https://images.unsplash.com/photo-1509319117193-57bab727e09d?auto=format&fit=crop&w=1400&q=80",
    ctaLabel: "Shop Gold",
    ctaLink: "/products",
    order: 1
  },
  {
    group: "testimonial",
    description: "The fabric, the stitch, the way it drapes – every inch felt couture. The styling notes shipped with my order made it luxe.",
    title: "Avni Patel",
    subtitle: "Ahmedabad, Bride to be",
    order: 1
  }
];

export const ensureDefaultHomeSections = async () => {
  // No-op: preserve whatever the admin has created. No seeding or deletion here.
  return;
};
