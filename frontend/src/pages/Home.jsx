import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useContext, useRef } from "react";
import axios from "../api/axios";
import { CartContext } from "../context/CartContext";
import { setPageMeta } from "../utils/seo";
import { buildAssetUrl } from "../utils/apiBase";
import SupportFooter from "../components/SupportFooter";

const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAD/ACw=";

const heroFallbacks = [
  {
    title: "Couture calm sarees crafted for every moment you want to own.",
    description: "Discover contemporary silks, breezy chiffons and hand dyed pieces styled just like the signature saree wall.",
    badge: "Signature inspired",
    tag: "Pan India delivery",
    ctaLabel: "Shop saree collection",
    ctaLink: "/products",
    secondaryCtaLabel: "View limited drops",
    secondaryCtaLink: "/products",
    image: BLANK_IMG
  },
  {
    title: "Banarasi heirloom edit",
    subtitle: "Pure zari woven",
    description: "Signature meenakari borders revived from archived motifs.",
    badge: "New drop",
    ctaLabel: "Explore Banarasi",
    ctaLink: "/products",
    image: BLANK_IMG
  },
  {
    title: "Sequin cocktail drapes",
    subtitle: "Studio spotlight",
    description: "Statement metallic sheen designed for after hours.",
    ctaLabel: "Shop sequins",
    ctaLink: "/products",
    image: BLANK_IMG
  }
];

const uspFallback = [
  { title: "Handcrafted sarees", sub: "Curated villages to runway", icon: "🧵" },
  { title: "Ships in 24 hrs", sub: "Across 18,000+ pincodes", icon: "✈️" },
  { title: "Complimentary fall & pico", sub: "Ready to drape", icon: "🎀" },
  { title: "Dedicated stylists", sub: "WhatsApp concierge", icon: "💬" }
];

const storyFallback = {
  title: "Designed in Surat, loved across India",
  description: "We travel across handloom clusters, collaborate with weavers, and finish each saree with couture level detailing. Every edit mirrors the premium boutique experience but is crafted only for saree loyalists.",
  ctaLabel: "Shop handcrafted edits",
  ctaLink: "/products",
  meta: {
    stats: [
      { value: "120+", label: "Exclusive drops" },
      { value: "48 hrs", label: "Average dispatch" },
      { value: "4.8/5", label: "Shopper rating" }
    ]
  }
};

const formatPrice = (value) =>
  `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value || 0)}`;

const resolveAsset = (url, fallback) => buildAssetUrl(url, fallback);

const resolveImage = (item) => {
  const raw = item?.images?.[0];
  if (!raw) {
    return BLANK_IMG;
  }
  return resolveAsset(raw, BLANK_IMG);
};

const HeroBanner = ({ slides = [] }) => {
  const normalizedSlides =
    slides
      ?.map((slide) => {
        const source =
          slide?.heroImage ||
          slide?.image ||
          slide?.mobileImage ||
          slide?.desktopImage ||
          slide?.cover ||
          slide?.banner ||
          slide?.meta?.image ||
          slide?.meta?.cover ||
          (Array.isArray(slide?.images) ? slide.images[0] : null);
        const coverSource = typeof source === "string" ? source.trim() : source;
        const rawVideo = slide?.heroVideo || slide?.video || slide?.meta?.video;
        const videoSource = typeof rawVideo === "string" ? rawVideo.trim() : rawVideo;
        if (!coverSource && !videoSource) return null;
        const heroImage = coverSource ? resolveAsset(coverSource, coverSource) : "";
        const heroVideo = videoSource ? resolveAsset(videoSource, videoSource) : "";
        return {
          ...slide,
          heroImage,
          heroVideo
        };
      })
      .filter(Boolean) || [];

  if (!normalizedSlides.length) return null;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedSlides.length]);

  const videoRefs = useRef([]);

  useEffect(() => {
    if (!normalizedSlides.length) return undefined;
    const activeSlide = normalizedSlides[activeIndex] || {};
    const isVideo = Boolean(activeSlide.heroVideo);

    const goNext = () => setActiveIndex((prev) => (prev + 1) % normalizedSlides.length);
    let timer;

    if (isVideo) {
      const videoEl = videoRefs.current[activeIndex];
      if (videoEl) {
        videoEl.currentTime = 0;
        const onEnded = () => goNext();
        videoEl.addEventListener("ended", onEnded);
        // Attempt play; ignore autoplay rejections on some browsers.
        const playPromise = videoEl.play?.();
        if (playPromise?.catch) {
          playPromise.catch(() => {});
        }
        const durationMs =
          Number.isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration * 1000 : 0;
        if (durationMs > 0) {
          timer = setTimeout(goNext, durationMs + 200); // slight buffer after video ends
        }
        return () => {
          videoEl.pause?.();
          videoEl.removeEventListener("ended", onEnded);
          if (timer) clearTimeout(timer);
        };
      }
    }

    timer = setTimeout(goNext, 3000);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [normalizedSlides, activeIndex]);

  const active = normalizedSlides[activeIndex];
  const heroImage = active?.heroImage;
  const heroVideo = active?.heroVideo;
  const headingCopy = active?.title || active?.description || active?.subtitle;
  const supportingCopy = active?.title
    ? active?.description || active?.subtitle
    : active?.description && active?.subtitle
    ? active.subtitle
    : "";
  const hasCopy =
    Boolean(headingCopy || active?.ctaLabel || active?.secondaryCtaLabel) ||
    Boolean(active?.badge || active?.tag);

  return (
    <section className="bg-[var(--surface-muted)] py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-0">
        <div className="relative rounded-[28px] sm:rounded-[40px] overflow-hidden aspect-[4/5] sm:aspect-[16/9] min-h-[280px] sm:min-h-[420px] shadow-2xl">
          {normalizedSlides.map((slide, index) => {
            const cover = slide.heroImage;
            const video = slide.heroVideo;
            const isActive = index === activeIndex;
            const isVideo = Boolean(video);
            return (
              <div
                key={slide._id || slide.title || index}
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-105"
                }`}
              >
                {isVideo ? (
                  <video
                    src={video}
                    poster={cover || undefined}
                    className="w-full h-full object-cover object-top bg-[var(--surface)]"
                    muted
                    playsInline
                    preload="metadata"
                    autoPlay={isActive}
                    ref={(el) => {
                      videoRefs.current[index] = el || null;
                    }}
                  />
                ) : (
                  <img
                    src={cover}
                    alt={slide.title || "Hero slide"}
                    className="w-full h-full object-contain sm:object-cover object-center bg-[var(--surface)]"
                    loading={isActive ? "eager" : "lazy"}
                    decoding="async"
                    fetchpriority={isActive ? "high" : "auto"}
                  />
                )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
              </div>
            );
          })}

          {hasCopy && (
            <div className="relative z-10 p-8 lg:p-14 max-w-2xl text-white space-y-5">
              {(active?.badge || active?.tag) && (
                <span className="text-xs uppercase tracking-[0.5em] text-[var(--accent)] opacity-80">
                  {active.badge || active.tag}
                </span>
              )}
              {headingCopy && (
                <>
                  <h1 className="text-4xl lg:text-5xl font-semibold leading-tight drop-shadow">
                    {headingCopy}
                  </h1>
                  {supportingCopy && (
                    <p className="text-base text-gray-100/90">{supportingCopy}</p>
                  )}
                </>
              )}
              <div className="flex flex-wrap gap-4">
                {active?.ctaLabel && (
                  <Link
                    to={active.ctaLink || "/products"}
                    className="bg-white/95 text-gray-900 px-6 py-3 rounded-full text-sm font-semibold shadow-lg"
                  >
                    {active.ctaLabel}
                  </Link>
                )}
                {active?.secondaryCtaLabel && (
                  <Link
                    to={active.secondaryCtaLink || "/products"}
                    className="text-white text-sm font-semibold flex items-center gap-1"
                  >
                    {active.secondaryCtaLabel} &gt;
                  </Link>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};

const resolveIcon = (icon) => {
  if (!icon) return null;
  if (icon.startsWith("http") || icon.startsWith("/")) {
    return <img src={icon} alt="" className="w-7 h-7 object-contain drop-shadow-sm" />;
  }
  return (
    <span className="text-2xl leading-none" role="img" aria-hidden="true">
      {icon}
    </span>
  );
};

const USPStrip = ({ items = uspFallback }) => {
  if (!items.length) return null;
  const marqueeItems = [...items, ...items];
  return (
    <section className="usp-rail relative overflow-hidden py-6">
      <div className="usp-rail__mask" aria-hidden="true" />
      <div className="usp-rail__glow usp-rail__glow--one" aria-hidden="true" />
      <div className="usp-rail__glow usp-rail__glow--two" aria-hidden="true" />
      <div className="usp-rail__track marquee-track flex gap-10 items-center py-4 pl-8">
        {marqueeItems.map((usp, index) => {
          const icon = usp.icon || usp.meta?.icon;
          return (
            <div
              key={`${usp._id || usp.title}-${index}`}
              className="usp-rail__item"
              style={{ animationDelay: `${(index % items.length) * 80}ms` }}
            >
              <div className="usp-rail__icon">{resolveIcon(icon)}</div>
              <div>
                <p className="usp-rail__title">{usp.title}</p>
                <p className="usp-rail__sub">{usp.sub || usp.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const CategoryShowcase = ({ cards = [] }) => {
  const navigate = useNavigate();
  const [shuffleKey, setShuffleKey] = useState(() => Date.now());

  useEffect(() => {
    setShuffleKey(Date.now());
  }, [cards?.length]);

  const buildLink = (card) => {
    const params = new URLSearchParams();
    if (card?._id) params.set("moodId", card._id);
    const productIds = card?.meta?.products || card?.productIds || [];
    if (productIds.length) params.set("ids", productIds.join(","));
    const collectionSlug = card?.meta?.collectionSlug || card?.slug;
    if (collectionSlug) params.set("collectionSlug", collectionSlug);
    const search = params.toString();
    return search ? `/products?${search}` : card?.ctaLink || "/products";
  };

  const displayCards = useMemo(() => {
    const list = Array.isArray(cards) ? [...cards] : [];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list.slice(0, 4);
  }, [cards, shuffleKey]);

  if (!displayCards.length) return null;

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Shop by mood</p>
          <h2 className="text-3xl font-semibold text-gray-900">Featured edits</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayCards.map((card) => {
            const cover = resolveAsset(
              card.image,
              "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
            );
            const linkTarget = buildLink(card);

            return (
              <div
                key={card._id || card.title}
                className={`bg-white rounded-3xl overflow-hidden border border-[var(--border)] shadow transition-transform ${
                  linkTarget ? "hover:-translate-y-1 cursor-pointer" : ""
                }`}
                onClick={() => {
                  if (linkTarget) navigate(linkTarget);
                }}
              >
                <div className="relative h-56 bg-[#fdf9f5] flex items-center justify-center">
                  <img
                    src={cover}
                    alt={card.title}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  {card.tag && (
                    <span className="absolute top-4 left-4 bg-white/90 text-xs uppercase tracking-wide px-3 py-1 rounded-full text-gray-900">
                      {card.tag}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                  <p className="text-sm text-gray-500">{card.subtitle || card.description}</p>
                  {!linkTarget && <p className="text-xs text-gray-400">Add products to enable this link.</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const ProductRail = ({ collection, products, loading, error, addToCart }) => {
  const navigate = useNavigate();
  const sectionTitle = (collection?.title || "Featured Sarees").toUpperCase();
  const description = collection?.description || collection?.subtitle;
  const railLink = collection?.slug
    ? `/products?collectionSlug=${collection.slug}`
    : collection?.ctaLink || "/products";
  const gallerySources = useMemo(() => {
    const list = [];
    if (Array.isArray(collection?.heroImages)) {
      list.push(...collection.heroImages.filter(Boolean));
    }
    if (collection?.heroImage) {
      list.push(collection.heroImage);
    }
    return list;
  }, [collection?.heroImages, collection?.heroImage]);
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    setHeroIndex(0);
  }, [gallerySources.length]);
  useEffect(() => {
    if (gallerySources.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % gallerySources.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [gallerySources.length]);
  const heroImage = resolveAsset(
    gallerySources[heroIndex],
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1400&q=80"
  );
  const displayedProducts = useMemo(() => (products || []).slice(0, 4), [products]);

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)]">
            {collection?.tag || "Trending now"}
          </p>
          <h2 className="text-3xl font-semibold text-gray-900">{sectionTitle}</h2>
        </div>

        {heroImage && (
          <div
            className={`relative rounded-[28px] sm:rounded-[40px] overflow-hidden aspect-[4/5] sm:aspect-[21/9] min-h-[260px] sm:min-h-[320px] shadow-xl ${
              railLink ? "cursor-pointer" : ""
            }`}
            onClick={() => railLink && navigate(railLink)}
            role={railLink ? "button" : undefined}
            tabIndex={railLink ? 0 : undefined}
            onKeyDown={(e) => {
              if (!railLink) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(railLink);
              }
            }}
          >
            <img
              src={heroImage}
              alt={collection?.title}
              className="w-full h-full object-contain sm:object-cover bg-[var(--surface-muted)]"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent text-white p-8 flex flex-col justify-center max-w-lg space-y-4">
              <p className="text-xs uppercase tracking-[0.5em] text-[var(--accent)] opacity-90">
                        {collection?.tag || "Editor pick"}
              </p>
              <h3 className="text-3xl font-semibold">{collection?.title}</h3>
              {description && <p className="text-sm text-white/80">{description}</p>}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-72 bg-white rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-red-500 text-sm text-center">{error}</p>
        ) : products.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-10 text-center text-sm text-gray-400">
            No products linked to this collection yet. Add items from the admin panel to display them
            here.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {displayedProducts.map((product) => {
                const primaryPrice = product.discountPrice || product.price;
                const discountPercent =
                  product.discountPrice && product.price
                    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
                    : null;
                const handleBuyNow = async (e) => {
                  e.stopPropagation();
                  await addToCart(product._id);
                  navigate("/checkout");
                };
                return (
                  <div
                    key={product._id}
                    className="bg-white rounded-[28px] border border-gray-100 shadow-sm hover:-translate-y-1 transition"
                    onClick={() => navigate(`/product/${product._id}`)}
                  >
                    <div
                      className="relative rounded-t-[28px] overflow-hidden bg-[#fdf9f5] flex items-center justify-center"
                      style={{ aspectRatio: "3 / 4", minHeight: 220 }}
                    >
                      <img
                        src={resolveImage(product)}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                      {discountPercent ? (
                        <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                          -{discountPercent}%
                        </span>
                      ) : null}
                      {product.collections?.[0]?.title && (
                        <span className="absolute top-3 right-3 bg-white/80 text-xs px-3 py-1 rounded-full text-gray-800">
                          {product.collections[0].title}
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400">
                        {product.category || collection?.title}
                      </p>
                      <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-lg font-semibold text-gray-900">{formatPrice(primaryPrice)}</span>
                          {product.discountPrice && (
                            <span className="text-gray-400 line-through">{formatPrice(product.price)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product._id);
                          }}
                          className="inline-flex items-center justify-center w-full mt-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-4 py-2"
                        >
                          Add to cart
                        </button>
                        <button
                          type="button"
                          onClick={handleBuyNow}
                          className="inline-flex items-center justify-center w-full mt-2 bg-gradient-to-r from-[var(--primary,#111)] to-[var(--accent,#333)] text-white text-sm font-semibold rounded-full px-4 py-2"
                        >
                          Buy now
                        </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const StorySection = ({ story = storyFallback }) => {
  if (!story) return null;
  const stats = story.meta?.stats || story.stats || storyFallback.meta?.stats || [];
  return (
    <section className="story-hero relative overflow-hidden py-16 px-4">
      <div className="story-hero__glow story-hero__glow--one" aria-hidden="true" />
      <div className="story-hero__glow story-hero__glow--two" aria-hidden="true" />
      <div className="max-w-6xl mx-auto relative z-10 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur border border-white/60 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Brand story</span>
        </div>
        <h3 className="text-3xl md:text-4xl font-semibold text-[var(--ink)] drop-shadow-sm">{story.title}</h3>
        <p className="text-lg md:text-xl text-[var(--muted)] max-w-4xl mx-auto leading-relaxed">{story.description}</p>
        {story.ctaLabel && (
          <Link
            to={story.ctaLink || "/products"}
            className="inline-flex items-center justify-center px-7 py-3 rounded-full text-white text-sm font-semibold shadow-lg story-hero__cta"
          >
            {story.ctaLabel}
            <span className="ml-2 text-lg">→</span>
          </Link>
        )}
        {stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {stats.map((stat, idx) => (
              <div key={stat.label} className="story-hero__stat" style={{ animationDelay: `${idx * 120}ms` }}>
                <p className="text-3xl font-semibold text-[var(--ink)]">{stat.value}</p>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const TestimonialStrip = ({ testimonials = [], title = "Customer reviews" }) => {
  if (!testimonials || testimonials.length === 0) return null;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [testimonials.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const current = testimonials[index];
  return (
    <section className="bg-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)]">{title}</p>
          <div className="flex items-center justify-center gap-3 text-sm text-gray-600 mt-2">
            <span className="flex items-center gap-1 text-yellow-500">
              {"★★★★★".slice(0, Math.round(current.rating || 5))}
            </span>
            {current.rating && <span>{current.rating} ★</span>}
            {current.verified && (
              <span className="flex items-center gap-1 text-emerald-600 text-xs border border-emerald-200 px-2 py-1 rounded-full">
                ✔ Verified
              </span>
            )}
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-xl">
          <div className="text-emerald-600 text-4xl mb-4">”</div>
          <blockquote className="text-xl text-gray-900 leading-relaxed">{current.quote || current.text}</blockquote>
          <div className="mt-6 space-y-1">
            <p className="font-semibold text-gray-900 flex items-center justify-center gap-2">
              {current.author || current.customer}
              {current.verified && <span className="text-xs text-gray-500 border border-gray-200 px-2 py-1 rounded-full">Verified</span>}
            </p>
            {current.role && <p className="text-sm text-gray-500">{current.role}</p>}
            {current.product && (
              <Link to={current.productLink || "/products"} className="text-sm text-[var(--primary)] underline">
                {current.product}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default function Home() {
  const { addToCart } = useContext(CartContext);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [homeSections, setHomeSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [homeLoading, setHomeLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPageMeta({
      title: "Mrigmaya | Handcrafted drapes and edits",
      description:
        "Discover couture calm sarees, heirloom Banarasis, and hand-finished silhouettes crafted in Surat and delivered pan-India."
    });
  }, []);
  const [collectionsError, setCollectionsError] = useState("");
  const [homeError, setHomeError] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    axios
      .get("/products")
      .then((res) => {
        if (isMounted) {
          setProducts(Array.isArray(res.data) ? res.data : res.data?.products || []);
          setError("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Could not load the latest drops. Please refresh in a moment.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setCollectionsLoading(true);
    axios
      .get("/collections?includeProducts=true")
      .then((res) => {
        if (active) {
          setCollections(res.data || []);
          setCollectionsError("");
        }
      })
      .catch(() => {
        if (active) setCollectionsError("Collections not available right now.");
      })
      .finally(() => active && setCollectionsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setHomeLoading(true);
    axios
      .get("/home-sections")
      .then((res) => {
        if (active) {
          setHomeSections(res.data || []);
          setHomeError("");
        }
      })
      .catch(() => {
        if (active) setHomeError("Homepage banners failed to load. Showing defaults.");
      })
      .finally(() => active && setHomeLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const topProducts = useMemo(() => products.slice(0, 4), [products]);
  const luxeEdit = useMemo(
    () => [...products].sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 4),
    [products]
  );
  const slugOrder = ["sarees", "suits", "best-seller", "gold"];
  const featuredCollections = useMemo(() => {
    const prioritized = slugOrder
      .map((slug) => collections.find((collection) => collection.slug === slug))
      .filter((collection) => collection && collection.displayOnHome !== false);
    const rest = collections
      .filter(
        (collection) => collection.displayOnHome !== false && !slugOrder.includes(collection.slug)
      )
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));
    return [...prioritized, ...rest];
  }, [collections]);

  const sectionsByGroup = useMemo(() => {
    const grouped = {};
    homeSections.forEach((section) => {
      const key = section.group || "custom";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(section);
    });
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    return grouped;
  }, [homeSections]);

  const heroSlides = sectionsByGroup.hero || [];
  const uspItems = sectionsByGroup.usp || [];
  const categoryCards = sectionsByGroup.category || [];
  const storyBlocks = sectionsByGroup.story || [];
  const testimonialBlocks = sectionsByGroup.testimonial || [];
  const heroSlidesToShow = homeLoading
    ? []
    : heroSlides.filter((slide) => {
        const imageRaw =
          slide?.heroImage ||
          slide?.image ||
          slide?.mobileImage ||
          slide?.desktopImage ||
          slide?.cover ||
          slide?.banner ||
          slide?.meta?.image ||
          slide?.meta?.cover ||
          (Array.isArray(slide?.images) ? slide.images[0] : null);
        const videoRaw = slide?.heroVideo || slide?.video || slide?.meta?.video;
        const hasImage = typeof imageRaw === "string" ? imageRaw.trim() : Boolean(imageRaw);
        const hasVideo = typeof videoRaw === "string" ? videoRaw.trim() : Boolean(videoRaw);
        return slide?.active !== false && (hasImage || hasVideo);
      });

  return (
    <div className="bg-[var(--bg)] text-[var(--ink)] home-shell">
      {heroSlidesToShow.length > 0 && <HeroBanner slides={heroSlidesToShow} />}
      <USPStrip items={uspItems.length ? uspItems : uspFallback} />
      {homeError && (
        <div className="max-w-6xl mx-auto px-4 text-sm text-amber-600">{homeError}</div>
      )}
      <CategoryShowcase cards={categoryCards} products={products} />
      <div className="max-w-6xl mx-auto px-4 flex justify-end mt-2">
        <Link to="/products" className="text-sm text-[var(--primary)] font-semibold">
          View all products
        </Link>
      </div>
      {featuredCollections.length > 0 &&
        featuredCollections.map((collection) => (
          <ProductRail
            key={collection._id}
            collection={collection}
            products={collection.products || []}
            loading={loading || collectionsLoading}
            error={error || collectionsError}
            addToCart={addToCart}
          />
        ))}
      <StorySection story={storyBlocks[0] || storyFallback} />
      <TestimonialStrip testimonials={testimonialBlocks} title="Customer reviews" />
    </div>
  );
}
