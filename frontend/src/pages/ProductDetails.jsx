import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import toast from "react-hot-toast";
import axios from "../api/axios";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { setPageMeta } from "../utils/seo";
import { buildAssetUrl } from "../utils/apiBase";

const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAD/ACw=";

const formatPrice = (value) =>
  `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value || 0)}`;

const normalizeImage = (src) => buildAssetUrl(src, "");

const resolveImage = (item) => {
  const raw = item?.images?.[0];
  if (!raw) return BLANK_IMG;
  return normalizeImage(raw);
};

const resolveVideo = (src) => buildAssetUrl(src, "");

export default function ProductDetails() {
  const { id } = useParams();
  const { addToCart } = useContext(CartContext);
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.2);
  const [zoomSrc, setZoomSrc] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const inStock = (product?.stock || 0) > 0;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    axios
      .get(`/products/${id}`)
      .then((res) => {
        if (!mounted) return;
        setProduct(res.data);
        const colors = normalizedColors(res.data);
        const sizes = normalizedSizes(res.data);
        setSelectedColor(colors[0] || "");
        setSelectedSize(sizes[0] || "");
        setActiveIndex(0);
        const incomingReviews = Array.isArray(res.data?.reviews) ? res.data.reviews : [];
        setReviews(incomingReviews);
      })
      .catch((err) => {
        console.error("Product fetch failed", err?.response?.data || err?.message);
        if (mounted) {
          setError("Product not found or unavailable right now.");
          setProduct(null);
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    axios
      .get("/products?includeInactive=true")
      .then((res) => {
        const all = Array.isArray(res.data) ? res.data : res.data?.products || [];
        setRelated(all);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!product) return;
    const lead = product.name || "Product";
    const desc =
      product.description ||
      product.subtitle ||
      "Discover handcrafted sarees and curated edits from Mrigmaya.";
    setPageMeta({
      title: `${lead} | Mrigmaya`,
      description: desc,
      image: resolveImage(product)
    });
  }, [product]);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedColor]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-red-600 font-semibold">{error}</p>
        <button
          className="px-4 py-2 bg-gray-900 text-white rounded-full"
          onClick={() => navigate("/products")}
        >
          Back to products
        </button>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-gray-600">Product not found.</p>
        <button
          className="px-4 py-2 bg-gray-900 text-white rounded-full"
          onClick={() => navigate("/products")}
        >
          Back to products
        </button>
      </div>
    );
  }

  const gallery = computeGallery(product, selectedColor);
  const activeImage = gallery[activeIndex] || normalizeImage(product.images?.[0]) || "";
  const handlePrev = () =>
    setActiveIndex((prev) => (gallery.length ? (prev - 1 + gallery.length) % gallery.length : 0));
  const handleNext = () =>
    setActiveIndex((prev) => (gallery.length ? (prev + 1) % gallery.length : 0));
  const primaryPrice = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : null;
  const displayReviews =
    reviews.length > 0
      ? reviews
      : [
          {
            author: "Happy customer",
            rating: 5,
            comment: "Loved the drape and finish. Would buy again.",
            date: new Date().toISOString()
          }
        ];
  const avgRating =
    displayReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
    (displayReviews.length || 1);
  const flipkartLogoData =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" aria-label="Flipkart logo"><rect x="24" y="28" width="152" height="144" rx="16" fill="#ffd426"/><path d="M46 52h108c5 0 9 4 9 9v13H37V61c0-5 4-9 9-9z" fill="#fbc02d"/><path d="M62 64c12 16 32 16 44 0" fill="none" stroke="#e53935" stroke-width="6" stroke-linecap="round"/><path d="M106 64c12 16 32 16 44 0" fill="none" stroke="#00897b" stroke-width="6" stroke-linecap="round"/><circle cx="64" cy="54" r="4" fill="#6d4c41"/><circle cx="136" cy="54" r="4" fill="#6d4c41"/><path d="M82 96h25c10 0 14 6 12 16l-2 10c-1 6-5 10-10 12l9 30h-20l-7-26h-6l-6 26H58z" fill="#1976d2"/><path d="M105 110h9c2 0 3 2 3 4l-1 6c0 2-2 4-4 4h-9z" fill="#bbdefb"/></svg>'
    );

  const marketplaceLinks = [
    {
      label: "Amazon",
      href: product.amazonLink,
      bg: "#232f3e",
      text: "#ffffff",
      logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg"
    },
    {
      label: "Flipkart",
      href: product.flipkartLink,
      bg: "#2874f0",
      text: "#ffffff",
      logo: flipkartLogoData
    }
  ].filter((link) => link.href);
  const relatedProducts = related
    .filter((item) => item._id !== product._id)
    .filter((item) => {
      if (product.category && item.category === product.category) return true;
      const currentCollections = normalizeCollections(product.collections).map((c) => c._id || c);
      const itemCollections = normalizeCollections(item.collections).map((c) => c._id || c);
      return currentCollections.some((cid) => itemCollections.includes(cid));
    })
    .slice(0, 6);

  const handleAddToCart = async (redirect) => {
    const colors = normalizedColors(product);
    const sizes = normalizedSizes(product);
    const needsSize = sizes.length > 0;
    const chosenColor = selectedColor || colors[0] || "";
    const chosenSize = selectedSize || (needsSize ? sizes[0] : "");
    if (needsSize && !chosenSize) {
      toast.error("Select a size");
      return;
    }
    if (!inStock) {
      toast.error("This item is out of stock");
      return;
    }
    setSelectedColor(chosenColor);
    setSelectedSize(chosenSize);
    setAdding(true);
    try {
      await addToCart(product._id, chosenColor, chosenSize);
      if (redirect) {
        navigate("/checkout");
      }
    } finally {
      setAdding(false);
    }
  };

  const shareProduct = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = product?.name || "Mrigmaya";
    const text = `${title} | Mrigmaya`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // continue to copy fallback
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } else {
      window.prompt("Copy this product link", url);
    }
  };

  return (
    <>
      <div className="bg-[#fefbfe] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 lg:px-0 py-10 space-y-12">
        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-10 items-start">
          <div>
            <div className="relative rounded-3xl overflow-hidden bg-white shadow aspect-[3/4] min-h-[320px]">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover bg-white cursor-zoom-in"
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                  onClick={() => {
                    setZoomSrc(activeImage);
                    setZoomScale(1.4);
                    setZoomOpen(true);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-white">
                  No image
                </div>
              )}
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow"
                  >
                    ‹
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setActiveIndex(index)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border ${
                      activeIndex === index ? "border-pink-500" : "border-gray-200"
                    }`}
                  >
                    <img
                      src={image}
                      alt={product.name}
                      className="w-full h-full object-contain bg-white cursor-zoom-in"
                      loading="lazy"
                      decoding="async"
                      onClick={() => {
                        setZoomSrc(image);
                        setZoomScale(1.4);
                        setZoomOpen(true);
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
            {product.video && (
              <div className="mt-4 bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                <video
                  src={resolveVideo(product.video)}
                  controls
                  className="w-full h-[320px] object-cover bg-black"
                  playsInline
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{product.category}</p>
              <h1 className="text-3xl font-semibold text-gray-900">{product.name}</h1>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-semibold text-gray-900">{formatPrice(primaryPrice)}</span>
                {hasDiscount && (
                  <span className="text-gray-400 line-through">{formatPrice(product.price)}</span>
                )}
                {discountPercent && (
                  <span className="text-sm px-3 py-1 bg-red-100 text-red-600 rounded-full">
                    -{discountPercent}%
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Delivery in 4-7 days
                </span>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Free returns within 7 days
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  COD & UPI available
                </span>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={shareProduct}
                  className="px-4 py-2 rounded-full border border-[var(--border)] bg-white text-[var(--ink)] text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition"
                >
                  Share link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `${product.name || "Check this saree"} - ${typeof window !== "undefined" ? window.location.href : ""}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition"
                >
                  Share on WhatsApp
                </a>
              </div>
              {marketplaceLinks.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {marketplaceLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition"
                      style={{ background: link.bg, color: link.text }}
                    >
                      <img
                        src={link.logo}
                        alt={`${link.label} logo`}
                        className="h-6 w-auto object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <span className="text-white tracking-tight">{link.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm text-gray-700 bg-white rounded-3xl p-4 shadow">
              {product.description && <p className="text-gray-600">{product.description}</p>}
              {product.fabric && (
                <p>
                  <span className="font-semibold">Fabric:</span> {product.fabric}
                </p>
              )}
              <p className="font-semibold">Colors:</p>
              {normalizedColors(product).length > 0 && (
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-3">
                    {normalizedColors(product).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`px-3 py-2 rounded-full border text-sm flex items-center gap-2 shadow-sm transition ${
                          selectedColor === color
                            ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 bg-white"
                            : "border-gray-200 bg-[#fdfbf8]"
                        }`}
                        style={{
                          minWidth: 88
                        }}
                      >
                        <span
                          className="inline-block w-5 h-5 rounded-full border"
                          style={{
                            background: colorSwatch(color),
                            borderColor: "rgba(0,0,0,0.2)",
                            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)"
                          }}
                          title={color}
                        />
                        <span className="font-semibold capitalize truncate">{color}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {normalizedSizes(product).length > 0 && (
                <div className="space-y-1">
                  <p className="font-semibold">Sizes:</p>
                  <div className="flex flex-wrap gap-2">
                    {normalizedSizes(product).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${
                          selectedSize === size
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-indigo-50 text-indigo-800 border-indigo-100"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="font-semibold">
                Stock:{" "}
                <span className={inStock ? "text-gray-700 font-normal" : "text-red-600 font-semibold"}>
                  {inStock ? product.stock : "Out of stock"}
                </span>
              </p>
            </div>
          <div className="space-y-3">
            <button
              onClick={() => handleAddToCart(false)}
              className="w-full bg-gray-900 text-white py-3 rounded-full font-semibold disabled:opacity-60"
              disabled={adding || !inStock}
            >
              {adding ? "Adding..." : inStock ? "Add to cart" : "Out of stock"}
            </button>
            <button
              onClick={() => handleAddToCart(true)}
              className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white py-3 rounded-full font-semibold disabled:opacity-60"
              disabled={adding || !inStock}
            >
              {adding ? "Please wait..." : inStock ? "Buy now" : "Out of stock"}
            </button>
            {!token && (
              <p className="text-xs text-gray-500 text-center">
                You will be asked to log in before checkout.
              </p>
            )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Customer reviews</p>
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <span>★ {avgRating.toFixed(1)}</span>
                <span className="text-sm text-gray-500">({displayReviews.length})</span>
              </div>
            </div>
            <button className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700">
              Write a review
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {displayReviews.slice(0, 4).map((review, idx) => (
              <div key={idx} className="border border-gray-100 rounded-2xl p-4 shadow-sm bg-[#fefbfe]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500 text-sm">
                    {"★★★★★".slice(0, Math.max(1, Math.min(5, review.rating || 5)))}{" "}
                  </div>
                  <span className="text-xs text-gray-400">
                    {review.date ? new Date(review.date).toLocaleDateString() : ""}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 mt-2">{review.author || "Customer"}</p>
                <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">You may also like</p>
              <h2 className="text-2xl font-semibold text-gray-900">Similar sarees</h2>
            </div>
            {relatedProducts.length > 4 && (
              <button
                className="text-sm text-pink-600 font-semibold"
                onClick={() => navigate("/products")}
              >
                View all
              </button>
            )}
          </div>
          {relatedProducts.length === 0 ? (
            <p className="text-sm text-gray-500">More sarees will appear here soon.</p>
          ) : (
            <div className="related-rail">
              {relatedProducts.map((item) => {
                const itemPrice = item.discountPrice || item.price;
                const itemDiscount =
                  item.discountPrice && item.price
                    ? Math.round(((item.price - item.discountPrice) / item.price) * 100)
                    : null;
                return (
                  <article
                    key={item._id}
                    className="related-card"
                    onClick={() => navigate(`/product/${item._id}`)}
                  >
                    <div className="related-card__image">
                      <img
                        src={resolveImage(item)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      {itemDiscount ? (
                        <span className="related-card__badge">
                          -{itemDiscount}%
                        </span>
                      ) : null}
                    </div>
                    <div className="related-card__body">
                      <p className="related-card__eyebrow">
                        {item.category || product.category}
                      </p>
                      <h3 className="related-card__title line-clamp-2">{item.name}</h3>
                      <div className="related-card__price">
                        <span className="text-lg font-semibold text-gray-900">
                          {formatPrice(itemPrice)}
                        </span>
                        {item.discountPrice && (
                          <span className="text-gray-400 line-through">{formatPrice(item.price)}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item._id);
                        }}
                        className="inline-flex items-center justify-center w-full mt-1 bg-gray-900 text-white text-sm font-semibold rounded-full px-4 py-2"
                      >
                        Add to cart
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

    {zoomOpen && (
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-6"
        onClick={() => setZoomOpen(false)}
      >
        <div
          className="bg-white/5 border border-white/15 shadow-2xl rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3 text-white/80 text-sm">
              <span className="font-semibold">Zoom preview</span>
              <span className="text-xs opacity-80">Click - / + or scroll to zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => setZoomScale((z) => Math.max(1, Number((z - 0.2).toFixed(1))))}
              >
                −
              </button>
              <button
                className="px-3 py-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => setZoomScale((z) => Math.min(4, Number((z + 0.2).toFixed(1))))}
              >
                +
              </button>
              <button
                className="ml-2 px-3 py-2 rounded-full bg-white/15 text-white hover:bg-white/25"
                onClick={() => {
                  setZoomScale(1.4);
                  setZoomOpen(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-auto px-4 py-4 bg-[#0b0a0a]/30"
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.2 : -0.2;
              setZoomScale((z) => {
                const next = z + delta;
                return Math.min(4, Math.max(1, Number(next.toFixed(1))));
              });
            }}
          >
            {zoomSrc ? (
              <img
                src={zoomSrc}
                alt="Zoomed"
                className="block mx-auto rounded-xl shadow-2xl"
                style={{
                  width: `${zoomScale * 100}%`,
                  maxWidth: `${zoomScale * 100}%`,
                  minWidth: "60%",
                  transformOrigin: "center center"
                }}
                onDoubleClick={() => setZoomScale(1.4)}
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
const colorOptions = [
  { label: "Red", swatch: "#e53935" },
  { label: "Pink", swatch: "#f06292" },
  { label: "Magenta", swatch: "#d81b60" },
  { label: "Maroon", swatch: "#7b1fa2" },
  { label: "Yellow", swatch: "#fbc02d" },
  { label: "Mustard", swatch: "#d3a518" },
  { label: "Orange", swatch: "#ff7043" },
  { label: "Peach", swatch: "#f8b195" },
  { label: "Green", swatch: "#43a047" },
  { label: "Olive", swatch: "#708238" },
  { label: "Mint", swatch: "#7bdcb5" },
  { label: "Sea Green", swatch: "#2e8b57" },
  { label: "Teal", swatch: "#009688" },
  { label: "Blue", swatch: "#1e88e5" },
  { label: "Navy", swatch: "#1b3b6f" },
  { label: "Purple", swatch: "#9c27b0" },
  { label: "Lavender", swatch: "#c6a5d8" },
  { label: "Brown", swatch: "#8d6e63" },
  { label: "Beige", swatch: "#d9c4a1" },
  { label: "Cream", swatch: "#f6e7c1" },
  { label: "Grey", swatch: "#9e9e9e" },
  { label: "Black", swatch: "#212121" },
  { label: "White", swatch: "#f5f5f5" },
  { label: "Gold", swatch: "#d4af37" },
  { label: "Silver", swatch: "#c0c0c0" },
  { label: "Multi", swatch: "linear-gradient(120deg, #e53935, #fbc02d, #43a047, #1e88e5, #9c27b0)" }
];

const colorSwatch = (label) => {
  const match = colorOptions.find((opt) => opt.label.toLowerCase() === (label || "").toLowerCase());
  return match?.swatch || "linear-gradient(135deg, #fdfcfb, #e2d1c3)";
};

const isSuitProduct = (product) => {
  const parts = [
    product?.name || "",
    product?.category || "",
    product?.categoryRef?.name || "",
    product?.categoryRef?.slug || "",
    ...normalizeCollections(product?.collections).map((c) => c?.title || c?.slug || "")
  ]
    .join(" ")
    .toLowerCase();
  return parts.includes("suit");
};

const normalizedColors = (product) => {
  if (!product) return [];
  if (Array.isArray(product.colors) && product.colors.length) return product.colors.filter(Boolean);
  if (product.color) {
    return product.color
      .split(/[,\\n]/)
      .map((c) => c.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizedSizes = (product) => {
  if (!product) return [];
  if (Array.isArray(product.sizes) && product.sizes.length) return product.sizes.filter(Boolean);
  return isSuitProduct(product) ? ["XS", "S", "M", "L", "XL"] : [];
};

function normalizeCollections(value) {
  return Array.isArray(value) ? value : [];
}

const computeGallery = (product, selectedColor) => {
  if (!product) return [];
  const colorImages = matchColorImages(product, selectedColor);
  if (colorImages.length) {
    return colorImages.map((src) => normalizeImage(src));
  }
  if (Array.isArray(product.images) && product.images.length) {
    return product.images.map((image) => normalizeImage(image));
  }
  return [];
};

const matchColorImages = (product, selectedColor) => {
  const color = (selectedColor || "").toLowerCase();
  if (!color) return [];
  const normalized = normalizeColorImages(product?.colorImages);
  const match = normalized.find((entry) => (entry.color || "").toLowerCase() === color);
  return match?.images || [];
};

const normalizeColorImages = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry) return null;
        const color = (entry.color || "").trim();
        const images = normalizeImageList(entry.images);
        if (!color || !images.length) return null;
        return { color, images };
      })
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([color, images]) => {
        const safeColor = (color || "").trim();
        const safeImages = normalizeImageList(images);
        if (!safeColor || !safeImages.length) return null;
        return { color: safeColor, images: safeImages };
      })
      .filter(Boolean);
  }

  return [];
};

const normalizeImageList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,\\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};
