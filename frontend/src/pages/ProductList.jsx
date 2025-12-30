import { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axios";
import "./ProductList.css";
import { useLocation } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import BrandLoader from "../components/BrandLoader";
import { setPageMeta } from "../utils/seo";
import { buildAssetUrl } from "../utils/apiBase";
import { resolveProductImage } from "../utils/productImages";

const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAD/ACw=";

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "priceLow", label: "Price: Low to High" },
  { value: "priceHigh", label: "Price: High to Low" },
  { value: "new", label: "Newest first" }
];

const formatPrice = (value) =>
  `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value || 0)}`;

const parseNumber = (value) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const resolveImage = (item, index = 0) => resolveProductImage(item, BLANK_IMG, index);

export default function ProductList() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [moodFilters, setMoodFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState(["All Sarees"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("All Sarees");
  const [selectedMoodId, setSelectedMoodId] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [priceCap, setPriceCap] = useState(4000);
  const [maxPrice, setMaxPrice] = useState(6000);
  const [sortBy, setSortBy] = useState("featured");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [collectionSlugParam, setCollectionSlugParam] = useState("");
  const [moodIdParam, setMoodIdParam] = useState("");
  const [moodsLoaded, setMoodsLoaded] = useState(false);
  const [basePriceCap, setBasePriceCap] = useState(4000);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const activeMoodId = selectedMoodId || moodIdParam;

  useEffect(() => {
    const filters = [];
    if (collectionSlugParam) filters.push(collectionSlugParam);
    if (category && category !== "All Sarees") filters.push(category);
    const titleSuffix = filters.length ? ` | ${filters.join(" · ")}` : "";
    setPageMeta({
      title: `Mrigmaya | Shop sarees${titleSuffix}`,
      description:
        "Explore Mrigmaya edits: handcrafted silks, chiffons, Banarasis, and contemporary drapes with concierge support and fast pan-India delivery."
    });
  }, [collectionSlugParam, category]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasDeepLink =
      params.has("moodId") || params.has("ids") || params.has("collectionSlug");
    if (!hasDeepLink) return;
    const anchor = document.querySelector(".product-area");
    if (anchor) {
      setTimeout(() => anchor.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, [location.search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    axios
      .get("/products?includeInactive=true")
      .then((res) => {
        if (!active) return;
        setProducts(Array.isArray(res.data) ? res.data : res.data?.products || []);
        setError("");
      })
      .catch(() => {
        if (active) setError("We could not load the sarees. Please try again.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const highest = products.reduce((max, item) => {
      const value = item.discountPrice || item.price || 0;
      return value > max ? value : max;
    }, 0);
    const safeMax = Math.max(highest, 6000);
    setBasePriceCap(safeMax);
    setMaxPrice(safeMax);
    setPriceCap(safeMax);
  }, [products]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ids = params.get("ids");
    const collectionSlug = params.get("collectionSlug");
    const moodId = params.get("moodId");
    const searchParam = params.get("search") || "";
    setSearch(searchParam);
    if (ids) {
      setSelectedIds(
        ids
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      );
    } else {
      setSelectedIds([]);
    }
    if (collectionSlug) {
      setCollectionSlugParam(collectionSlug);
    } else {
      setCollectionSlugParam("");
    }
    setSelectedMoodId(moodId || "");
    setMoodIdParam(moodId || "");
  }, [location.search]);

  useEffect(() => {
    axios
      .get("/collections")
      .then((res) => setCollections(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axios
      .get("/home-sections")
      .then((res) => {
        const cards = (res.data || [])
          .filter((section) => section.group === "category" && section.active !== false)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setMoodFilters(cards);
        setMoodsLoaded(true);
        if (selectedMoodId && cards.length > 0 && !cards.find((card) => card._id === selectedMoodId)) {
          setSelectedMoodId("");
        }
      })
      .catch(() => {});
  }, [selectedMoodId]);

  useEffect(() => {
    const moodToUse = selectedMoodId || moodIdParam;
    if (!moodToUse || !moodsLoaded || !moodFilters.length) return;
    const matchedMood = moodFilters.find((card) => card._id === moodToUse);
    if (matchedMood?.title) {
      setCategory(matchedMood.title);
    }
  }, [selectedMoodId, moodIdParam, moodFilters, moodsLoaded]);

  useEffect(() => {
    const targetSlug = collectionSlugParam || slug;
    if (!targetSlug || !collections.length) return;
    const match = collections.find((collection) => collection.slug === targetSlug);
    if (match) {
      setCollectionFilter(match._id);
      setCategory("All Sarees");
    } else {
      setCollectionFilter("");
    }
  }, [slug, collections, collectionSlugParam]);

  useEffect(() => {
    const moodTitles = moodFilters.map((card) => card.title).filter(Boolean);
    const productCategories = (products || [])
      .map((item) => (item.category || "").trim() || (item.categoryRef?.name || "").trim())
      .filter(Boolean);
    const collectionTitles = (collections || [])
      .map((col) => col.title)
      .filter(Boolean);

    const derivedCategories = Array.from(
      new Set([...moodTitles, ...productCategories, ...collectionTitles].filter(Boolean))
    );

    const categoriesWithAll = ["All Sarees", ...derivedCategories];
    setCategoryFilters(categoriesWithAll);
    if (categoriesWithAll.length === 1 || (category !== "All Sarees" && !categoriesWithAll.includes(category))) {
      setCategory("All Sarees");
      setSelectedMoodId("");
    }
  }, [products, moodFilters, collections, category]);

  const filteredProducts = useMemo(() => {
    let data = [...products];
    const moodLocked = Boolean(activeMoodId);

    if (selectedIds.length) {
      data = data.filter((item) => selectedIds.includes(item._id) || selectedIds.includes(item.productId));
    }

    if (activeMoodId) {
      const mood = moodFilters.find((card) => card._id === activeMoodId);
      if (mood) {
        const moodProductIds = mood.meta?.products || mood.productIds || [];
        const moodSlug = mood.slug;
        const moodTitle = mood.title || "";
        if (moodProductIds.length) {
          data = data.filter((item) => moodProductIds.includes(item._id) || moodProductIds.includes(item.productId));
        } else if (moodSlug) {
          data = data.filter((item) =>
            (item.collections || []).some(
              (col) =>
                (col.slug || col) === moodSlug ||
                (col._id || col) === moodSlug
            )
          );
        } else if (mood.title) {
          data = data.filter((item) =>
            [(item.category || ""), item.categoryRef?.name || "", ...(item.collections || []).map((c) => c?.title || "")]
              .join(" ")
              .toLowerCase()
              .includes(moodTitle.toLowerCase())
          );
        }
      }
    }

    if (!moodLocked && category && category !== "All Sarees") {
      const target = category.toLowerCase();
      data = data.filter((item) => {
        const fields = [
          item.category || "",
          item.categoryRef?.name || "",
          item.categoryRef?.slug || "",
          ...(item.collections || []).map((col) => col?.title || col?.slug || "")
        ]
          .join(" ")
          .toLowerCase();
        return fields.includes(target);
      });
    }

    if (collectionFilter) {
      data = data.filter((item) =>
        (item.collections || []).some((col) => (col._id || col) === collectionFilter)
      );
    }

    if (!moodLocked) {
      data = data.filter((item) => {
        const value = item.discountPrice || item.price || 0;
        return value <= priceCap;
      });
    }

    if (search.trim()) {
      data = data.filter((item) => (item.name || "").toLowerCase().includes(search.trim().toLowerCase()));
    }

    if (sortBy === "priceLow") {
      data.sort((a, b) => (a.discountPrice || a.price || 0) - (b.discountPrice || b.price || 0));
    } else if (sortBy === "priceHigh") {
      data.sort((a, b) => (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0));
    } else if (sortBy === "new") {
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    if (data.length === 0 && activeMoodId) {
      const matchedMood = moodFilters.find((card) => card._id === activeMoodId);
      const customProducts = matchedMood?.meta?.customProducts || [];
      if (customProducts.length) {
        return customProducts.map((item, idx) => {
          // If a real product was created for this custom item, prefer it
          if (item.productId) {
            const real = products.find((p) => p._id === item.productId);
            if (real) return real;
          }
          const gallery = Array.isArray(item.images) && item.images.length ? item.images : [item.image || ""];
          const selling = parseNumber(item.price || item.sellingPrice || item.discountPrice);
          const mrp = parseNumber(item.mrp || item.originalPrice || item.priceMrp);
          const hasDiscount = mrp > selling && selling > 0;
          const productId = item.productId || `custom-${idx}`;
          return {
            _id: productId,
            productId,
            isCustom: true,
            name: item.name || "Custom item",
            price: hasDiscount ? mrp : selling,
            discountPrice: hasDiscount ? selling : undefined,
            images: gallery,
            category: matchedMood?.title || "Edit item"
          };
        });
      }
    }

    return data;
  }, [products, category, priceCap, search, sortBy, collectionFilter, selectedIds, selectedMoodId, moodFilters]);

  const clearFilters = () => {
    setCategory("All Sarees");
    setSelectedMoodId("");
    setCollectionFilter("");
    setPriceCap(basePriceCap);
    setSortBy("featured");
    setSearch("");
  };

  return (
    <div className="collection-page">
      <section className="collection-body">
        <div className="product-area">
          <div className="product-toolbar">
            <div className="toolbar-copy">
              <BrandLoader compact message="" />
              <div className="meta">
                <span>{`${filteredProducts.length} styles ready to ship`}</span>
                <span className="meta-dot" />
                <span>{`Cap ${formatPrice(priceCap)}`}</span>
                {collectionFilter ? (
                  <>
                    <span className="meta-dot" />
                    <span>{collections.find((c) => c._id === collectionFilter)?.title || "Collection"}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="toolbar-actions">
              <div className="quick-filters">
                <button className="pill pill--ghost" onClick={() => setShowCategorySheet(true)}>
                  Category
                </button>
                <button className="pill pill--ghost" onClick={() => setShowFilterSheet(true)}>
                  Filters
                </button>
              </div>
              <div className="search-shell">
                <span className="search-icon">Search</span>
                <input
                  type="text"
                  placeholder="Prints, fabrics, hues..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="tag-strip">
            {(collectionFilter ||
              (category && category !== "All Sarees") ||
              (!activeMoodId && priceCap !== basePriceCap) ||
              search.trim()) && (
              <>
                {category && category !== "All Sarees" && (
                  <span className="tag-chip" onClick={() => setCategory("All Sarees")}>
                    {category} ×
                  </span>
                )}
                {collectionFilter && (
                  <span className="tag-chip" onClick={() => setCollectionFilter("")}>
                    {collections.find((c) => c._id === collectionFilter)?.title || "Collection"} ×
                  </span>
                )}
                {!activeMoodId && priceCap !== basePriceCap && (
                  <span className="tag-chip" onClick={() => setPriceCap(basePriceCap)}>
                    Cap {formatPrice(priceCap)} ×
                  </span>
                )}
                {search.trim() && (
                  <span className="tag-chip" onClick={() => setSearch("")}>
                    “{search.trim()}” ×
                  </span>
                )}
                <button className="tag-chip tag-chip--clear" onClick={clearFilters}>
                  Clear all
                </button>
              </>
            )}
          </div>

          <div className="product-grid">
            {loading &&
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="product-card skeleton" />
              ))}

            {!loading && filteredProducts.length === 0 && (
              <div className="empty-state">
                <p>No sarees match these filters yet.</p>
                <p className="text-sm text-gray-500">Try clearing filters or searching a simpler term.</p>
                <button onClick={clearFilters} className="px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold">
                  Clear filters
                </button>
              </div>
            )}

            {!loading &&
              filteredProducts.map((item) => {
                const isCustom = Boolean(item.isCustom);
                const targetId = item.productId || item._id;
                const isClickable = !isCustom || Boolean(item.productId);
                const primaryPrice = item.discountPrice || item.price;
                const hasDiscount = Boolean(item.discountPrice && item.discountPrice !== item.price);
                const percent = hasDiscount
                  ? Math.round(((item.price - item.discountPrice) / item.price) * 100)
                  : null;
                const badgeText = percent ? `-${percent}%` : "New";
                const handleBuyNow = async (e) => {
                  e.stopPropagation();
                  if (!targetId || (!item.productId && isCustom)) return;
                  await addToCart(targetId);
                  navigate("/checkout");
                };
                const handleAddToCart = async (e) => {
                  e.stopPropagation();
                  if (!targetId || (!item.productId && isCustom)) return;
                  await addToCart(targetId);
                };
                return (
                  <article
                    key={item._id}
                    className="product-card"
                    onClick={() => {
                      if (!isClickable) return;
                      navigate(`/product/${targetId}`);
                    }}
                  >
                    <div className="card-image">
                      <img
                        src={resolveImage(item)}
                        alt={item.name}
                        className="card-image__img"
                        loading="lazy"
                        decoding="async"
                      />
                      <img
                        src={resolveImage(item, 1)}
                        alt={item.name}
                        className="card-image__img card-image__img--hover"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="card-badge">{badgeText}</span>
                      {isClickable && (
                        <button
                          type="button"
                          className="card-icon-btn"
                          onClick={handleAddToCart}
                          aria-label="Add to cart"
                        >
                          🛒
                        </button>
                      )}
                    </div>
                    <div className="card-body">
                      <p className="card-category">{item.category || "Saree"}</p>
                      <h3>{item.name}</h3>
                      <div className="card-meta">
                        <span>Ready to ship</span>
                        {item.fabric && <span>{item.fabric}</span>}
                      </div>
                      <div className="card-price">
                        <strong>{formatPrice(primaryPrice)}</strong>
                        {hasDiscount && <span>{formatPrice(item.price)}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </div>

        {showCategorySheet && (
          <div className="sheet-backdrop" onClick={() => setShowCategorySheet(false)}>
            <div
              className="filter-panel sheet"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="sheet-header">
                <h3>Category</h3>
                <button className="close-sheet" onClick={() => setShowCategorySheet(false)}>
                  Close
                </button>
              </div>
              <div className="filter-card">
                <p className="filter-label">Category</p>
                <div className="filter-pills">
                  {categoryFilters.map((item) => (
                    <button
                      key={item}
                      className={item === category ? "pill active" : "pill"}
                      onClick={() => {
                        setCategory(item);
                        const matchedMood = moodFilters.find(
                          (card) => card.title?.toLowerCase() === item.toLowerCase()
                        );
                        setSelectedMoodId(matchedMood?._id || "");
                        setShowCategorySheet(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-card">
                <p className="filter-label">Sort</p>
                <div className="select-shell select-shell--sheet">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {showFilterSheet && (
          <div className="sheet-backdrop" onClick={() => setShowFilterSheet(false)}>
            <div
              className="filter-panel sheet"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="sheet-header">
                <h3>Filters</h3>
                <button className="close-sheet" onClick={() => setShowFilterSheet(false)}>
                  Close
                </button>
              </div>

              <div className="filter-card">
                <p className="filter-label">Category</p>
                <div className="filter-pills">
                  {categoryFilters.map((item) => (
                    <button
                      key={item}
                      className={item === category ? "pill active" : "pill"}
                      onClick={() => {
                        setCategory(item);
                        const matchedMood = moodFilters.find(
                          (card) => card.title?.toLowerCase() === item.toLowerCase()
                        );
                        setSelectedMoodId(matchedMood?._id || "");
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-card">
                <p className="filter-label">Collections</p>
                <div className="filter-pills">
                  <button
                    className={!collectionFilter ? "pill active" : "pill"}
                    onClick={() => setCollectionFilter("")}
                  >
                    All
                  </button>
                  {collections.map((collection) => (
                    <button
                      key={collection._id}
                      className={collectionFilter === collection._id ? "pill active" : "pill"}
                      onClick={() =>
                        setCollectionFilter(collectionFilter === collection._id ? "" : collection._id)
                      }
                    >
                      {collection.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-card">
                <p className="filter-label">Budget cap</p>
                <input
                  type="range"
                  min="0"
                  max={Math.max(1000, maxPrice)}
                  step="100"
                  value={activeMoodId ? Math.max(1000, maxPrice) : priceCap}
                  onChange={(e) => {
                    if (activeMoodId) return;
                    setPriceCap(Number(e.target.value));
                  }}
                />
                <div className="price-display">
                  {activeMoodId
                    ? "Budget cap disabled for this edit"
                    : `Up to ${formatPrice(priceCap)}`}
                </div>
              </div>

              <div className="filter-footer">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilterSheet(false);
                  }}
                >
                  Reset filters
                </button>
                <p>Need help styling? WhatsApp our saree expert.</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
