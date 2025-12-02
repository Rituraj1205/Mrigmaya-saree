import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import toast from "react-hot-toast";
import axios from "../api/axios";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { setPageMeta } from "../utils/seo";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
const ASSET_BASE = API_BASE.replace(/\/api\/?$/, "");
const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAD/ACw=";

const formatPrice = (value) =>
  `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value || 0)}`;

const normalizeImage = (src) => {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return `${ASSET_BASE}${src}`;
};

const resolveImage = (item) => {
  const raw = item?.images?.[0];
  if (!raw) return BLANK_IMG;
  return normalizeImage(raw);
};

const resolveVideo = (src) => {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return `${ASSET_BASE}${src}`;
};

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

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    axios
      .get(`/products/${id}`)
      .then((res) => {
        if (!mounted) return;
        setProduct(res.data);
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
      .get("/products")
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
      "Discover handcrafted sarees and curated edits from Mrigmaya Saree.";
    setPageMeta({
      title: `${lead} | Mrigmaya Saree`,
      description: desc,
      image: resolveImage(product)
    });
  }, [product]);

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

  const gallery =
    Array.isArray(product.images) && product.images.length
      ? product.images.map((image) => normalizeImage(image))
      : [];
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
  const relatedProducts = related
    .filter((item) => item._id !== product._id)
    .filter((item) => {
      if (product.category && item.category === product.category) return true;
      const currentCollections = (product.collections || []).map((c) => c._id || c);
      const itemCollections = (item.collections || []).map((c) => c._id || c);
      return currentCollections.some((cid) => itemCollections.includes(cid));
    })
    .slice(0, 6);

  const handleAddToCart = async (redirect) => {
    setAdding(true);
    try {
      await addToCart(product._id, 1);
      if (redirect) {
        navigate("/checkout");
      }
    } finally {
      setAdding(false);
    }
  };

  const shareProduct = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = product?.name || "Mrigmaya Saree";
    const text = `${title} | Mrigmaya Saree`;

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
    <div className="bg-[#fefbfe] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 lg:px-0 py-10 space-y-12">
        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-10 items-start">
          <div>
            <div className="relative rounded-3xl overflow-hidden bg-white shadow">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-[520px] object-cover"
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-[520px] flex items-center justify-center text-gray-400">No image</div>
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
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
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
            </div>
            <div className="space-y-2 text-sm text-gray-700 bg-white rounded-3xl p-4 shadow">
              {product.description && <p className="text-gray-600">{product.description}</p>}
              {product.fabric && (
                <p>
                  <span className="font-semibold">Fabric:</span> {product.fabric}
                </p>
              )}
              {product.color && (
                <p>
                  <span className="font-semibold">Color:</span> {product.color}
                </p>
              )}
              {product.stock && (
                <p>
                  <span className="font-semibold">Stock:</span> {product.stock}
                </p>
              )}
            </div>
          <div className="space-y-3">
            <button
              onClick={() => handleAddToCart(false)}
              className="w-full bg-gray-900 text-white py-3 rounded-full font-semibold disabled:opacity-60"
              disabled={adding}
            >
              {adding ? "Adding..." : "Add to cart"}
            </button>
            <button
              onClick={() => handleAddToCart(true)}
              className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white py-3 rounded-full font-semibold disabled:opacity-60"
              disabled={adding}
            >
              {adding ? "Please wait..." : "Buy now"}
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedProducts.map((item) => {
                const itemPrice = item.discountPrice || item.price;
                const itemDiscount =
                  item.discountPrice && item.price
                    ? Math.round(((item.price - item.discountPrice) / item.price) * 100)
                    : null;
                return (
                  <article
                    key={item._id}
                    className="bg-white border border-gray-100 rounded-2xl shadow hover:-translate-y-1 transition cursor-pointer"
                    onClick={() => navigate(`/product/${item._id}`)}
                  >
                    <div className="relative h-56 rounded-t-2xl overflow-hidden">
                <img
                  src={resolveImage(item)}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                      {itemDiscount ? (
                        <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          -{itemDiscount}%
                        </span>
                      ) : null}
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                        {item.category || product.category}
                      </p>
                      <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
                      <div className="flex items-center gap-2 text-sm">
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
  );
}
