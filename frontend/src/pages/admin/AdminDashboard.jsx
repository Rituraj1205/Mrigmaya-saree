import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";
import { buildAssetUrl } from "../../utils/apiBase";

const resolveAsset = (url) => buildAssetUrl(url, "");

const isVideoLink = (url = "") => {
  const normalized = url.split("?")[0].toLowerCase();
  return /\.(mp4|webm|ogg)$/.test(normalized);
};

const getProductColorsLabel = (product) => {
  if (!product) return "";
  if (Array.isArray(product.colors) && product.colors.length) {
    return product.colors.join(", ");
  }
  return product.color || "";
};

const colorSwatch = (label) => {
  const match = colorOptions.find((opt) => opt.label.toLowerCase() === (label || "").toLowerCase());
  return match?.swatch || "linear-gradient(135deg, #fdfcfb, #e2d1c3)";
};

const isLightColor = (value) => {
  if (!value?.startsWith("#") || (value.length !== 7 && value.length !== 4)) return false;
  const hex = value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value;
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180;
};

const emptyProduct = {
  name: "",
  description: "",
  category: "",
  categoryRef: "",
  fabric: "",
  color: "",
  colors: [],
  sizes: [],
  amazonLink: "",
  flipkartLink: "",
  price: "",
  discountPrice: "",
  stock: "",
  images: "",
  video: "",
  collectionIds: []
};

const emptyCollection = {
  title: "",
  slug: "",
  subtitle: "",
  description: "",
  ctaLabel: "",
  heroImage: "",
  accentColor: "#c1275a",
  displayOnHome: true,
  priority: 999
};

const orderStatusOptions = [
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" }
];

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

const suitSizes = ["XS", "S", "M", "L", "XL"];

const paymentStatusOptions = [
  { value: "cod_pending", label: "Awaiting COD" },
  { value: "awaiting_upi", label: "Awaiting UPI" },
  { value: "awaiting_gateway", label: "Awaiting gateway" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" }
];

export default function AdminDashboard() {
  const { token, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [productMoodIds, setProductMoodIds] = useState([]);
  const [productFiles, setProductFiles] = useState([]);
  const [customColor, setCustomColor] = useState("");
  const [forceSizes, setForceSizes] = useState(false);
  const [productVideoUploading, setProductVideoUploading] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [collectionForm, setCollectionForm] = useState(emptyCollection);
  const [homeSections, setHomeSections] = useState([]);
  const [loginVisuals, setLoginVisuals] = useState([
    { _id: null, title: "", subtitle: "", image: "" },
    { _id: null, title: "", subtitle: "", image: "" }
  ]);
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountType: "flat",
    value: "",
    maxDiscount: "",
    maxRedemptions: 1,
    expiresAt: "",
    minOrderValue: "",
    active: true
  });
  const [heroLinkInput, setHeroLinkInput] = useState("");
  const [heroUploadBusy, setHeroUploadBusy] = useState(false);
  const [loginUploadBusy, setLoginUploadBusy] = useState(false);
  const [moodForm, setMoodForm] = useState({
    title: "",
    subtitle: "",
    tag: "",
    ctaLabel: "",
    ctaLink: "/products",
    image: "",
    order: 1,
    active: true,
    productIds: []
  });
  const [editingMoodId, setEditingMoodId] = useState(null);
  const [moodUploadBusy, setMoodUploadBusy] = useState(false);
  const [changeLog, setChangeLog] = useState([]);
  const [orders, setOrders] = useState([]);
  const returnOrders = useMemo(
    () => orders.filter((o) => o.returnRequested || (o.returnStatus && o.returnStatus !== "none")),
    [orders]
  );
  const productImageList = useMemo(
    () =>
      (productForm.images || "")
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [productForm.images]
  );
  const selectedCategory = useMemo(
    () => categories.find((cat) => cat._id === productForm.categoryRef),
    [categories, productForm.categoryRef]
  );
  const categoryLabel = useMemo(() => {
    const label = `${selectedCategory?.name || ""} ${selectedCategory?.slug || ""} ${productForm.category || ""}`;
    return label.toLowerCase().trim();
  }, [productForm.category, selectedCategory]);
  const isSuitCategory = categoryLabel.includes("suit");
  const [activePanel, setActivePanel] = useState("collections");
  const panelTabs = [
    { id: "collections", label: "Collections" },
    { id: "products", label: "Products" },
    { id: "coupons", label: "Coupons" },
    { id: "homepage", label: "Homepage Slider" },
    { id: "orders", label: "Orders" },
    { id: "returns", label: "Returns" },
    { id: "login-visuals", label: "Login visuals" }
  ];

  const authConfig = useMemo(() => {
    const bearer = token || localStorage.getItem("token") || "";
    return {
      headers: { Authorization: `Bearer ${bearer}` }
    };
  }, [token]);

  const logChange = (message) => {
    setChangeLog((prev) => [{ message, ts: new Date().toISOString() }, ...prev].slice(0, 15));
  };

  const validateImageFile = (file, maxMb = 2) => {
    if (!file) return false;
    if (!file.type?.startsWith("image/")) {
      toast.error("Please upload an image file");
      return false;
    }
    const limit = maxMb * 1024 * 1024;
    if (file.size > limit) {
      toast.error(`Image too large. Max ${maxMb}MB allowed.`);
      return false;
    }
    return true;
  };

  const validateMediaFile = (file, maxMb = 20) => {
    if (!file) return false;
    const isImage = file.type?.startsWith("image/");
    const isVideo = file.type?.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Upload an image or video");
      return false;
    }
    const limit = maxMb * 1024 * 1024;
    if (file.size > limit) {
      toast.error(`File too large. Max ${maxMb}MB allowed.`);
      return false;
    }
    return true;
  };

  const toggleColor = (value) => {
    setProductForm((prev) => {
      const current = prev.colors || [];
      const exists = current.includes(value);
      const colors = exists ? current.filter((c) => c !== value) : [...current, value];
      return { ...prev, colors, color: colors[0] || "" };
    });
  };

  const addCustomColor = () => {
    const value = customColor.trim();
    if (!value) return;
    toggleColor(value);
    setCustomColor("");
  };

  const toggleSize = (value) => {
    setProductForm((prev) => {
      const current = prev.sizes || [];
      const exists = current.includes(value);
      const sizes = exists ? current.filter((s) => s !== value) : [...current, value];
      return { ...prev, sizes };
    });
  };

  const shouldShowSizes = isSuitCategory || forceSizes || (productForm.sizes || []).length > 0;

  const shippingSummary = (order) => {
    const addr = order?.shippingAddress || {};
    const lines = [
      addr.name,
      addr.phone || order.customerContact,
      addr.line1,
      addr.line2,
      [addr.city, addr.state].filter(Boolean).join(", "),
      addr.pincode
    ].filter(Boolean);
    if (lines.length === 0) return "No address";
    return lines.join(" | ");
  };

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    if (user?.role !== "admin") {
      toast.error("Admin access only");
      navigate("/");
    }
  }, [token, user, navigate]);

  useEffect(() => {
    if (!token) return;
    fetchProducts();
    fetchCollections();
    fetchHomeSections();
    fetchCategories();
    fetchCoupons();
    fetchOrders();
  }, [token]);

  useEffect(() => {
    // Home sections are public, fetch once even before auth to prefill admin forms.
    fetchHomeSections();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get("/products?includeInactive=true");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await axios.get("/collections?includeProducts=true");
      setCollections(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    if (!token) return;
    try {
      const res = await axios.get("/categories/all", authConfig);
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCoupons = async () => {
    if (!token) return;
    try {
      const res = await axios.get("/coupons", authConfig);
      setCoupons(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await axios.get("/orders", authConfig);
      const payload = res.data || {};
      setOrders(Array.isArray(payload.orders) ? payload.orders : Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const res = await axios.get(`/orders/${orderId}/invoice`, {
        ...authConfig,
        responseType: "blob"
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${orderId.slice(-6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Could not download invoice");
    }
  };

  const fetchHomeSections = async () => {
    try {
      const res = await axios.get("/home-sections?includeInactive=true");
      setHomeSections(res.data);
    } catch (err) {
      console.error("Home sections fetch failed", err?.response?.data || err.message);
      toast.error("Could not load homepage cards");
    }
  };


  const heroSlides = useMemo(
    () =>
      [...homeSections.filter((section) => section.group === "hero")].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      ),
    [homeSections]
  );

  const highestHeroOrder = useMemo(
    () => (heroSlides.length ? Math.max(...heroSlides.map((slide) => slide.order ?? 0)) : 0),
    [heroSlides]
  );

  useEffect(() => {
    const loginItems = [...homeSections.filter((section) => section.group === "custom" && section.meta?.loginSlot !== undefined)].sort(
      (a, b) => (a.meta?.loginSlot ?? 0) - (b.meta?.loginSlot ?? 0)
    );
    const next = [0, 1].map((idx) => {
      const item = loginItems.find((x) => Number(x.meta?.loginSlot) === idx);
      return {
        _id: item?._id || null,
        title: item?.title || "",
        subtitle: item?.subtitle || "",
        image: item?.image || ""
      };
    });
    setLoginVisuals(next);
  }, [homeSections]);

  const updateLoginVisual = (index, field, value) => {
    setLoginVisuals((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const saveLoginVisuals = async () => {
    try {
      const operations = await Promise.all(
        loginVisuals.map(async (item, idx) => {
          const payload = {
            group: "custom",
            title: item.title,
            subtitle: item.subtitle,
            image: item.image,
            order: idx,
            active: true,
            meta: { ...(item.meta || {}), loginSlot: idx }
          };
          if (item._id) {
            if (!item.image) {
        await axios.delete(`/home-sections/${item._id}`, authConfig);
        return;
      }
      await axios.put(`/home-sections/${item._id}`, payload, authConfig);
          } else if (item.image) {
            await axios.post("/home-sections", payload, authConfig);
          }
        })
      );
      if (operations) {
        toast.success("Login visuals saved");
        fetchHomeSections();
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not save visuals");
    }
  };

  const uploadLoginImage = async (file, index) => {
    if (!validateImageFile(file)) return;
    if (!file) return;
    setLoginUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/uploads", formData, {
        headers: {
          ...authConfig.headers,
          "Content-Type": "multipart/form-data"
        }
      });
      const url = res.data.url;
      updateLoginVisual(index, "image", url);
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setLoginUploadBusy(false);
    }
  };

  const moodCards = useMemo(
    () =>
      [...homeSections.filter((section) => section.group === "category")].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      ),
    [homeSections]
  );

  // Keep product mood selection in sync when editing.
  useEffect(() => {
    if (!editingProductId) {
      setProductMoodIds([]);
      return;
    }
    const product = products.find((p) => p._id === editingProductId);
    if (!product) return;
    const linked = moodCards
      .filter((card) => {
        const ids = card.meta?.products || card.productIds || [];
        return ids.includes(product._id);
      })
      .map((card) => card._id);
    setProductMoodIds(linked);
  }, [editingProductId, products, moodCards]);

  const uploadHeroAsset = async (file) => {
    if (!validateImageFile(file)) return null;
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("/uploads", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data"
      }
    });
    return res.data.url;
  };

  const uploadHeroMedia = async (file) => {
    if (!validateMediaFile(file, 25)) return null;
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("/uploads", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data"
      }
    });
    return res.data.url;
  };

  const resetMoodForm = () => {
    setMoodForm({
      title: "",
      subtitle: "",
      tag: "",
      ctaLabel: "",
      ctaLink: "/products",
      image: "",
      order: 1,
      active: true,
      productIds: []
    });
    setEditingMoodId(null);
  };

  const createHeroSlide = async (mediaPayload, order) => {
    await axios.post(
      "/home-sections",
      {
        group: "hero",
        ...mediaPayload,
        order,
        active: true
      },
      authConfig
    );
  };

  const handleMoodSubmit = async () => {
    if (!moodForm.title.trim()) {
      toast.error("Enter a title");
      return;
    }
    if (!moodForm.image.trim()) {
      toast.error("Add an image");
      return;
    }
    const payload = {
      ...moodForm,
      order: Number(moodForm.order) || moodCards.length + 1,
      group: "category"
    };
    payload.meta = { ...(payload.meta || {}), products: moodForm.productIds || [] };
    try {
      if (editingMoodId) {
        await axios.put(`/home-sections/${editingMoodId}`, payload, authConfig);
        toast.success("Card updated");
      } else {
        await axios.post("/home-sections", payload, authConfig);
        toast.success("Card added");
      }
      resetMoodForm();
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not save card");
    }
  };

  const handleMoodEdit = (card) => {
    setEditingMoodId(card._id);
    setMoodForm({
      title: card.title || "",
      subtitle: card.subtitle || "",
      tag: card.tag || "",
      ctaLabel: card.ctaLabel || "",
      ctaLink: card.ctaLink || "/products",
      image: card.image || "",
      order: card.order ?? 1,
      active: card.active !== false,
      productIds: card.meta?.products || card.productIds || []
    });
  };

  const handleMoodDelete = async (id) => {
    if (!window.confirm("Delete this card?")) return;
    try {
      await axios.delete(`/home-sections/${id}`, authConfig);
      toast.success("Card deleted");
      if (editingMoodId === id) resetMoodForm();
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not delete card");
    }
  };

  const handleMoodMove = async (cardId, direction) => {
    const currentIndex = moodCards.findIndex((card) => card._id === cardId);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= moodCards.length) return;
    const currentCard = moodCards[currentIndex];
    const targetCard = moodCards[targetIndex];
    try {
      await Promise.all([
        axios.put(
          `/home-sections/${currentCard._id}`,
          { order: targetCard.order ?? targetIndex },
          authConfig
        ),
        axios.put(
          `/home-sections/${targetCard._id}`,
          { order: currentCard.order ?? currentIndex },
          authConfig
        )
      ]);
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not reorder cards");
    }
  };

  const handleMoodImageUpload = async (file) => {
    if (!file) return;
    try {
      setMoodUploadBusy(true);
      const url = await uploadHeroAsset(file);
      setMoodForm((prev) => ({ ...prev, image: url }));
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setMoodUploadBusy(false);
    }
  };

  const handleMoodProductAdd = async (cardId, productId) => {
    if (!productId) return;
    const card = moodCards.find((item) => item._id === cardId);
    const existing = card?.meta?.products || card?.productIds || [];
    if (existing.includes(productId)) return;
    try {
      await axios.put(
        `/home-sections/${cardId}`,
        { meta: { ...(card.meta || {}), products: [...existing, productId] } },
        authConfig
      );
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not attach product");
    }
  };

  const resetCouponForm = () => {
    setCouponForm({
      code: "",
      discountType: "flat",
      value: "",
      maxDiscount: "",
      maxRedemptions: 1,
      expiresAt: "",
      active: true
    });
  };

  const handleCouponSubmit = async () => {
    if (!couponForm.code.trim() || !couponForm.value) {
      toast.error("Code and value are required");
      return;
    }
    try {
      await axios.post(
        "/coupons",
        {
          ...couponForm,
          code: couponForm.code.trim().toUpperCase(),
          value: Number(couponForm.value),
          maxDiscount: couponForm.maxDiscount ? Number(couponForm.maxDiscount) : undefined,
          maxRedemptions: couponForm.maxRedemptions ? Number(couponForm.maxRedemptions) : 1
        },
        authConfig
      );
      toast.success("Coupon saved");
      resetCouponForm();
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Could not save coupon");
    }
  };

  const handleMoodCustomAdd = async (cardId, item) => {
    const card = moodCards.find((c) => c._id === cardId);
    // Quick-create a real product, then attach it to this mood card.
    const gallery = Array.isArray(item.images) && item.images.length ? item.images : [item.image || ""];
    const formData = new FormData();
    formData.append("name", item.name || "Custom item");
    formData.append("description", `Custom product for ${card?.title || "edit"}`);
    formData.append("category", card?.title || "Custom");
    formData.append("price", Number(item.mrp || item.price || 0));
    const selling = Number(item.price || 0);
    const mrp = Number(item.mrp || 0);
    const hasDiscount = mrp > selling && selling > 0;
    if (hasDiscount) {
      formData.append("discountPrice", selling);
      formData.append("price", mrp);
    }
    formData.append("stock", 50);
    formData.append("images", gallery.filter(Boolean).join("\n"));

    let productId = item.productId;
    try {
      const res = await axios.post("/products", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      productId = res.data?._id || productId;
      toast.success("Product created & attached");
      fetchProducts();
    } catch (err) {
      console.error("Custom product creation failed", err);
      toast.error("Could not create product for this item");
      return;
    }

    const existingProducts = card?.meta?.products || card?.productIds || [];
    const existingDetails = card?.meta?.productsDetails || [];
    const nextDetails = [
      ...existingDetails.filter((p) => p?._id !== productId),
      { _id: productId, name: item.name || "Custom item" }
    ];
    try {
      await axios.put(
        `/home-sections/${cardId}`,
        {
          meta: {
            ...(card.meta || {}),
            products: [...new Set([...existingProducts, productId])],
            productsDetails: nextDetails,
            customProducts: card?.meta?.customProducts || []
          }
        },
        authConfig
      );
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not attach product to this card");
    }
  };

  const handleMoodCustomRemove = async (cardId, index) => {
    const card = moodCards.find((c) => c._id === cardId);
    const existing = card?.meta?.customProducts || [];
    const filtered = existing.filter((_, i) => i !== index);
    try {
      await axios.put(
        `/home-sections/${cardId}`,
        { meta: { ...(card.meta || {}), customProducts: filtered } },
        authConfig
      );
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not remove product");
    }
  };

  const handleMoodCustomUpload = async (file) => {
    if (!file) return "";
    try {
      setMoodUploadBusy(true);
      return await uploadHeroAsset(file);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
      return "";
    } finally {
      setMoodUploadBusy(false);
    }
  };

  const handleMoodProductRemove = async (cardId, productId) => {
    const card = moodCards.find((item) => item._id === cardId);
    const existing = card?.meta?.products || card?.productIds || [];
    const filtered = existing.filter((id) => id !== productId);
    try {
      await axios.put(
        `/home-sections/${cardId}`,
        { meta: { ...(card.meta || {}), products: filtered } },
        authConfig
      );
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not remove product");
    }
  };

  const handleHeroFileUpload = async (files) => {
    if (!files?.length) return;
    setHeroUploadBusy(true);
    try {
      let order = highestHeroOrder + 1;
      for (const file of Array.from(files)) {
        const mediaUrl = await uploadHeroMedia(file);
        if (!mediaUrl) continue;
        const payload =
          file.type?.startsWith("video/") || isVideoLink(mediaUrl)
            ? { video: mediaUrl }
            : { image: mediaUrl };
        await createHeroSlide(payload, order);
        order += 1;
      }
      toast.success("Slides added");
      logChange("Added hero slides via upload");
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not upload slides");
    } finally {
      setHeroUploadBusy(false);
    }
  };

  const handleHeroLinkAdd = async () => {
    if (!heroLinkInput.trim()) return;
    setHeroUploadBusy(true);
    try {
      const link = heroLinkInput.trim();
      const payload = isVideoLink(link) ? { video: link } : { image: link };
      await createHeroSlide(payload, highestHeroOrder + 1);
      setHeroLinkInput("");
      toast.success("Slide added");
      logChange("Added hero slide via link");
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not save slide");
    } finally {
      setHeroUploadBusy(false);
    }
  };

  const handleHeroToggle = async (slideId, active) => {
    try {
      await axios.put(`/home-sections/${slideId}`, { active }, authConfig);
      logChange(`Slide ${active ? "enabled" : "disabled"}`);
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not update slide");
    }
  };

  const handleHeroDelete = async (slideId) => {
    if (!window.confirm("Delete this slide?")) return;
    try {
      await axios.delete(`/home-sections/${slideId}`, authConfig);
      toast.success("Slide removed");
      logChange("Removed a hero slide");
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not delete slide");
    }
  };

  const handleHeroMove = async (slideId, direction) => {
    const currentIndex = heroSlides.findIndex((slide) => slide._id === slideId);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= heroSlides.length) return;
    const currentSlide = heroSlides[currentIndex];
    const targetSlide = heroSlides[targetIndex];
    try {
      await Promise.all([
        axios.put(
          `/home-sections/${currentSlide._id}`,
          { order: targetSlide.order ?? targetIndex },
          authConfig
        ),
        axios.put(
          `/home-sections/${targetSlide._id}`,
          { order: currentSlide.order ?? currentIndex },
          authConfig
        )
      ]);
      logChange("Reordered hero slides");
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not reorder slides");
    }
  };

  const handleHeroReorder = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceIndex = heroSlides.findIndex((s) => s._id === sourceId);
    const targetIndex = heroSlides.findIndex((s) => s._id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const sourceSlide = heroSlides[sourceIndex];
    const targetSlide = heroSlides[targetIndex];
    try {
      await Promise.all([
        axios.put(
          `/home-sections/${sourceSlide._id}`,
          { order: targetSlide.order ?? targetIndex },
          authConfig
        ),
        axios.put(
          `/home-sections/${targetSlide._id}`,
          { order: sourceSlide.order ?? sourceIndex },
          authConfig
        )
      ]);
      logChange("Reordered hero slides (drag)");
      fetchHomeSections();
    } catch (err) {
      console.error(err);
      toast.error("Could not reorder slides");
    }
  };

  const syncProductMoodLinks = async (productId, selectedMoodIds = []) => {
    const ops = [];
    moodCards.forEach((card) => {
      const existing = card.meta?.products || card.productIds || [];
      const has = existing.includes(productId);
      const should = selectedMoodIds.includes(card._id);
      if (should && !has) {
        ops.push(
          axios.put(
            `/home-sections/${card._id}`,
            { meta: { ...(card.meta || {}), products: [...existing, productId] } },
            authConfig
          )
        );
      }
      if (!should && has) {
        const filtered = existing.filter((id) => id !== productId);
        ops.push(
          axios.put(
            `/home-sections/${card._id}`,
            { meta: { ...(card.meta || {}), products: filtered } },
            authConfig
          )
        );
      }
    });
    if (ops.length) {
      await Promise.all(ops);
      fetchHomeSections();
    }
  };

  const handleProductSubmit = async () => {
    try {
      if (shouldShowSizes && (productForm.sizes || []).length === 0) {
        toast.error("Select at least one size for suits");
        return;
      }
      const formData = new FormData();
      formData.append("name", productForm.name);
      formData.append("description", productForm.description);
      formData.append("category", productForm.category);
      if (productForm.categoryRef) formData.append("categoryRef", productForm.categoryRef);
      formData.append("fabric", productForm.fabric);
      const joinedColors = (productForm.colors || []).join(",").trim();
      formData.append("color", joinedColors || productForm.color || "");
      formData.append("colors", (productForm.colors || []).join(","));
      formData.append("sizes", (productForm.sizes || []).join(","));
      formData.append("price", productForm.price || 0);
      if (productForm.discountPrice)
        formData.append("discountPrice", productForm.discountPrice);
      formData.append("stock", productForm.stock || 0);
      if (productForm.amazonLink) formData.append("amazonLink", productForm.amazonLink.trim());
      if (productForm.flipkartLink) formData.append("flipkartLink", productForm.flipkartLink.trim());
      formData.append("images", productForm.images);
      if (productForm.video) formData.append("video", productForm.video);
      formData.append("collections", productForm.collectionIds.join(","));
      productFiles.forEach((file) => formData.append("images", file));

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      };

      let savedId = editingProductId;
      if (editingProductId) {
        await axios.put(`/products/${editingProductId}`, formData, config);
        toast.success("Product updated");
      } else {
        const res = await axios.post("/products", formData, config);
        savedId = res.data?._id || savedId;
        toast.success("Product created");
      }

      if (savedId) {
        await syncProductMoodLinks(savedId, productMoodIds);
      }

      setProductForm(emptyProduct);
      setProductMoodIds([]);
      setProductFiles([]);
      setEditingProductId(null);
      fetchProducts();
      fetchCollections();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Failed to save product");
    }
  };

  const handleEditProduct = (product) => {
    setEditingProductId(product._id);
    setProductFiles([]);
    setForceSizes(product.sizes?.length > 0);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      categoryRef: product.categoryRef?._id || product.categoryRef || "",
      fabric: product.fabric || "",
      color: product.color || product.colors?.[0] || "",
      colors:
        (Array.isArray(product.colors) && product.colors.length
          ? product.colors
          : product.color
            ? product.color
                .split(/[,\\n]/)
                .map((c) => c.trim())
                .filter(Boolean)
            : []),
      sizes: product.sizes || [],
      amazonLink: product.amazonLink || "",
      flipkartLink: product.flipkartLink || "",
      price: product.price || "",
      discountPrice: product.discountPrice || "",
      stock: product.stock || "",
      images: (product.images || []).join("\n"),
      video: product.video || "",
      collectionIds: product.collections?.map((c) => c._id || c) || []
    });
    const linkedMoodIds = moodCards
      .filter((card) => {
        const ids = card.meta?.products || card.productIds || [];
        return ids.includes(product._id);
      })
      .map((card) => card._id);
    setProductMoodIds(linkedMoodIds);
  };

  const resetProductForm = () => {
    setProductForm(emptyProduct);
    setProductMoodIds([]);
    setProductFiles([]);
    setCustomColor("");
    setForceSizes(false);
    setEditingProductId(null);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await axios.delete(`/products/${id}`, authConfig);
      toast.success("Deleted");
      fetchProducts();
      fetchCollections();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleCollectionSubmit = async () => {
    try {
      await axios.post("/collections", collectionForm, authConfig);
      toast.success("Collection created");
      setCollectionForm(emptyCollection);
      fetchCollections();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to create collection");
    }
  };

  const handleUpdateCollection = async (id, payload) => {
    try {
      await axios.put(`/collections/${id}`, payload, authConfig);
      toast.success("Collection updated");
      fetchCollections();
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const handleDeleteCollection = async (id) => {
    if (!window.confirm("Delete this collection?")) return;
    try {
      await axios.delete(`/collections/${id}`, authConfig);
      toast.success("Collection removed");
      fetchCollections();
      fetchProducts();
    } catch (err) {
      toast.error("Could not delete");
    }
  };

  const handleHeroUpload = async (collectionId, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/uploads", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      await handleUpdateCollection(collectionId, { heroImage: res.data.url });
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    }
  };

  const handleProductVideoUpload = async (file) => {
    if (!file) return;
    try {
      setProductVideoUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/uploads", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setProductForm((prev) => ({ ...prev, video: res.data.url }));
      toast.success("Video uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Video upload failed");
    } finally {
      setProductVideoUploading(false);
    }
  };

  const handleGalleryUpload = async (file) => {
    if (!file) return "";
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/uploads", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      toast.success("Image uploaded");
      return res.data.url;
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
      return "";
    }
  };

  const handleOrderUpdate = async (orderId, payload) => {
    try {
      await axios.patch(`/orders/${orderId}`, payload, authConfig);
      toast.success("Order updated");
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Could not update order");
    }
  };

  const selectedCollections = (ids = []) =>
    ids
      .map((id) => collections.find((collection) => collection._id === id)?.title)
      .filter(Boolean)
      .join(", ");

  if (!token || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="admin-page min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-30 bg-gradient-to-b from-[var(--surface)]/95 to-[var(--surface-muted)]/88 backdrop-blur border-b border-[var(--border)] shadow-[0_12px_40px_rgba(24,16,10,0.08)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">
              Admin
            </p>
            <h1 className="text-xl font-semibold text-[var(--ink)]">
              Mrigmaya Control Room
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted)]">
              Logged in as {user?.mobile}
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/admin/login");
              }}
              className="pill-button secondary hover:-translate-y-0.5"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10 admin-main">
        <section className="card-shell p-6 admin-card admin-grid">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Quick sections</p>
          <h2 className="text-2xl font-semibold text-gray-900">What would you like to manage?</h2>
          <p className="text-sm text-gray-500 mt-2">
            Pick a section below. Each panel only shows the tools needed for that part of the store.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {panelTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`admin-tab px-4 py-2 rounded-full text-sm font-semibold border transition ${
                  activePanel === tab.id
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--ink)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activePanel === "coupons" && (
          <section className="card-shell p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Promotions</p>
                <h2 className="text-2xl font-semibold text-gray-900">Coupon generator</h2>
                <p className="text-sm text-gray-500">Create one-time or limited-use coupon codes with flat or percent discounts.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Code</label>
                <input
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  placeholder="FIRST123"
                  className="border rounded-xl px-4 py-3 w-full"
                />

                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Discount type</label>
                <select
                  value={couponForm.discountType}
                  onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                  className="border rounded-xl px-4 py-3 w-full"
                >
                  <option value="flat">Flat amount (₹)</option>
                  <option value="percent">Percent (%)</option>
                </select>

                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Value</label>
                <input
                  type="number"
                  min="1"
                  value={couponForm.value}
                  onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })}
                  placeholder="e.g. 500 or 10"
                  className="border rounded-xl px-4 py-3 w-full"
                />

                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Max discount (optional, for %)</label>
                <input
                  type="number"
                  min="0"
                  value={couponForm.maxDiscount}
                  onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
                  placeholder="Cap for percent coupons"
                  className="border rounded-xl px-4 py-3 w-full"
                />

                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Min order value (optional)</label>
                <input
                  type="number"
                  min="0"
                  value={couponForm.minOrderValue}
                  onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: e.target.value })}
                  placeholder="Apply only above this amount"
                  className="border rounded-xl px-4 py-3 w-full"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Max redemptions (overall)</label>
                <input
                  type="number"
                  min="1"
                  value={couponForm.maxRedemptions}
                  onChange={(e) => setCouponForm({ ...couponForm, maxRedemptions: e.target.value })}
                  className="border rounded-xl px-4 py-3 w-full"
                />

                <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Expires at (optional)</label>
                <input
                  type="datetime-local"
                  value={couponForm.expiresAt}
                  onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                  className="border rounded-xl px-4 py-3 w-full"
                />

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={couponForm.active}
                    onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })}
                  />
                  Active
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={handleCouponSubmit}
                    className="bg-pink-600 text-white px-6 py-3 rounded-full"
                  >
                    Save coupon
                  </button>
                  <button
                    onClick={resetCouponForm}
                    className="border border-gray-200 text-gray-600 px-4 py-3 rounded-full"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Code</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Min</th>
                    <th>Used</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c._id} className="border-t">
                      <td className="py-2 font-semibold text-gray-900">{c.code}</td>
                      <td>{c.discountType}</td>
                      <td>
                        {c.discountType === "percent" ? `${c.value}%` : `₹${c.value}`}
                        {c.maxDiscount ? ` (cap ₹${c.maxDiscount})` : ""}
                      </td>
                      <td>₹{c.minOrderValue || 0}</td>
                      <td>
                        {c.redemptions || 0} / {c.maxRedemptions || 1}
                      </td>
                      <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleString() : "No expiry"}</td>
                      <td>{c.active ? "Active" : "Inactive"}</td>
                      <td className="space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            axios
                              .patch(
                                `/coupons/${c._id}`,
                                { active: !c.active },
                                authConfig
                              )
                              .then(fetchCoupons)
                              .catch(() => toast.error("Update failed"))
                          }
                          className="text-xs text-pink-600"
                        >
                          {c.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            window.confirm("Delete coupon?") &&
                            axios
                              .delete(`/coupons/${c._id}`, authConfig)
                              .then(fetchCoupons)
                              .catch(() => toast.error("Delete failed"))
                          }
                          className="text-xs text-red-500"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-gray-400">
                        No coupons yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activePanel === "orders" && (
          <section className="bg-white rounded-3xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Orders</p>
                <h2 className="text-2xl font-semibold text-gray-900">Recent orders</h2>
                <p className="text-sm text-gray-500">Update payment or delivery status from one place.</p>
              </div>
              <button onClick={fetchOrders} className="text-sm text-gray-500 underline">
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Order</th>
                    <th>Customer</th>
                    <th>Shipping</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Tracking</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-t">
                      <td className="py-2">
                        <p className="font-semibold text-gray-900">
                          #{order._id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.items.length} item(s)
                        </p>
                        <div className="text-[11px] text-gray-500 space-y-1 mt-1">
                          {order.items.map((item, idx) => (
                            <div key={`${item.product}-${idx}`} className="flex flex-wrap gap-1 items-center">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                                {item.product?.name || "Item"}
                              </span>
                              {item.selectedColor && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                                  {item.selectedColor}
                                </span>
                              )}
                              {item.selectedSize && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-100">
                                  {item.selectedSize}
                                </span>
                              )}
                              <span className="text-gray-400">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="text-xs text-gray-600">
                        {order.user?.mobile || order.customerContact || "NA"}
                      </td>
                      <td className="text-xs text-gray-600 max-w-xs">
                        <p className="font-semibold text-gray-900">
                          {order.shippingAddress?.name || "—"}
                        </p>
                        <p className="text-gray-500">{shippingSummary(order)}</p>
                        {order.customerNote && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            Note: {order.customerNote}
                          </p>
                        )}
                      </td>
                      <td className="font-semibold text-gray-900">
                        ₹{new Intl.NumberFormat("en-IN").format(order.amount || 0)}
                      </td>
                      <td>
                        <div className="space-y-2">
                          <span className="text-xs uppercase tracking-wide text-gray-500">
                            {order.paymentMethod}
                          </span>
                          <select
                            className="border rounded-lg px-2 py-1 text-xs"
                            value={order.paymentStatus}
                            onChange={(e) =>
                              handleOrderUpdate(order._id, {
                                paymentStatus: e.target.value
                              })
                            }
                          >
                            {paymentStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>
                        <select
                          className="border rounded-lg px-2 py-1 text-xs"
                          value={order.status}
                          onChange={(e) =>
                            handleOrderUpdate(order._id, { status: e.target.value })
                          }
                        >
                          {orderStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-xs text-gray-600">
                        <div className="space-y-1">
                          {(order.trackingLink || order.trackingNumber) && (
                            <a
                              href={
                                (order.trackingLink || order.trackingNumber || "").startsWith("http")
                                  ? order.trackingLink || order.trackingNumber
                                  : undefined
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-pink-600 underline"
                            >
                              Open tracking
                            </a>
                          )}
                          <input
                            type="text"
                            className="border rounded-lg px-2 py-1 w-full"
                            placeholder="Paste tracking URL"
                            defaultValue={order.trackingLink || ""}
                            onBlur={(e) =>
                              handleOrderUpdate(order._id, { trackingLink: e.target.value.trim() })
                            }
                          />
                          {!order.trackingLink && order.trackingNumber && (
                            <p className="text-[11px] text-gray-500">Current: {order.trackingNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="text-right space-y-2">
                        {order.paymentMethod === "UPI" && order.upiIntent && (
                          <a
                            href={order.upiIntent}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-pink-600"
                          >
                            UPI link
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => downloadInvoice(order._id)}
                          className="block text-xs text-pink-600 underline"
                        >
                          Download bill
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-400">
                        No orders yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activePanel === "returns" && (
          <section className="bg-white rounded-3xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Returns</p>
                <h2 className="text-2xl font-semibold text-gray-900">Return requests</h2>
                <p className="text-sm text-gray-500">Approve/reject and view photos sent by customers.</p>
              </div>
              <button onClick={fetchOrders} className="text-sm text-gray-500 underline">
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Order</th>
                    <th>Customer</th>
                    <th>Reason</th>
                    <th>Photos</th>
                    <th>Status</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {returnOrders.map((order) => (
                    <tr key={order._id} className="border-t">
                      <td className="py-2">
                        <p className="font-semibold text-gray-900">#{order._id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{order.items.length} item(s)</p>
                      </td>
                      <td className="text-xs text-gray-600">
                        {order.user?.mobile || order.customerContact || "NA"}
                        <div className="text-gray-500">
                          {order.shippingAddress?.name} {order.shippingAddress?.phone}
                        </div>
                      </td>
                      <td className="text-xs text-gray-600 max-w-xs">
                        <p className="font-semibold text-gray-900">
                          {order.returnReason || "No reason"}
                        </p>
                        {order.returnNote && <p className="text-gray-500">Note: {order.returnNote}</p>}
                      </td>
                      <td className="text-xs text-gray-600">
                        <div className="flex flex-wrap gap-2">
                          {(order.returnImages || []).map((url, idx) => {
                            const href = resolveAsset(url);
                            return (
                              <a
                                key={idx}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200"
                              >
                                <img src={href} alt="return" className="w-full h-full object-cover" />
                              </a>
                            );
                          })}
                          {(order.returnImages || []).length === 0 && <span>None</span>}
                        </div>
                      </td>
                      <td>
                        <select
                          className="border rounded-lg px-2 py-1 text-xs"
                          value={order.returnStatus || "none"}
                          onChange={(e) =>
                            handleOrderUpdate(order._id, { returnStatus: e.target.value })
                          }
                        >
                          {["requested", "approved", "rejected", "received", "refunded"].map((val) => (
                            <option key={val} value={val}>
                              {val}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-xs">
                        <textarea
                          className="border rounded-lg px-2 py-1 text-xs w-full"
                          placeholder="Return note"
                          defaultValue={order.returnNote || ""}
                          onBlur={(e) => handleOrderUpdate(order._id, { returnNote: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                  {returnOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">
                        No return requests yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activePanel === "products" && (
          <>
        <section className="bg-white rounded-3xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
                Catalog
              </p>
              <h2 className="text-2xl font-semibold text-gray-900">
                {editingProductId ? "Edit product" : "Create product"}
              </h2>
            </div>
            {editingProductId && (
              <button
                onClick={resetProductForm}
                className="text-sm text-gray-500 underline"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <input
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              placeholder="Product name"
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
            <div>
              <label className="text-sm text-gray-500">Assign category</label>
              <select
                value={productForm.categoryRef}
                onChange={(e) => setProductForm({ ...productForm, categoryRef: e.target.value })}
                className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-100 w-full"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              placeholder="Display label (ex. Banarasi, Poshaak)"
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
            <input
              value={productForm.fabric}
              onChange={(e) => setProductForm({ ...productForm, fabric: e.target.value })}
              placeholder="Fabric"
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-500">Available colors (Saree / Suit)</label>
                {productForm.colors.length > 0 && (
                  <span className="text-xs text-gray-400">{productForm.colors.length} selected</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={forceSizes}
                    onChange={(e) => setForceSizes(e.target.checked)}
                  />
                  Suit product? Show size picker
                </label>
                <span className="text-[11px]">
                  Detected category: {isSuitCategory ? "Suit" : "Other"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map((opt) => {
                  const active = productForm.colors.includes(opt.label);
                  const swatch = colorSwatch(opt.label);
                  const textColor =
                    typeof swatch === "string" && swatch.startsWith("#") && isLightColor(swatch)
                      ? "#1f2937"
                      : "#ffffff";
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => toggleColor(opt.label)}
                      title={opt.label}
                      className={`px-3 py-2 rounded-full text-xs border transition shadow-sm ${
                        active ? "ring-2 ring-pink-200 border-pink-200" : "border-gray-200"
                      }`}
                      style={{
                        background: swatch,
                        color: active ? textColor : "#ffffff",
                        minWidth: 64,
                        boxShadow: active ? "0 4px 12px rgba(0,0,0,0.12)" : "0 2px 6px rgba(0,0,0,0.06)"
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomColor();
                    }
                  }}
                  placeholder="Add custom color (press Enter)"
                  className="border rounded-xl px-4 py-3 flex-1 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
                <button
                  type="button"
                  onClick={addCustomColor}
                  className="px-4 py-3 rounded-xl bg-gray-900 text-white text-sm"
                >
                  Add
                </button>
              </div>
              {productForm.colors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {productForm.colors.map((color) => (
                    <span
                      key={color}
                      className="px-3 py-1 rounded-full border text-xs text-gray-700 flex items-center gap-2 shadow-sm"
                      style={{ background: colorSwatch(color), borderColor: "rgba(0,0,0,0.08)", color: "#1f2937" }}
                    >
                      {color}
                      <button type="button" className="text-gray-400" onClick={() => toggleColor(color)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {shouldShowSizes && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-500">Available sizes (Suit)</label>
                  {productForm.sizes.length === 0 && (
                    <span className="text-xs text-red-500">Select sizes for suits</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={forceSizes}
                      onChange={(e) => setForceSizes(e.target.checked)}
                    />
                    Force show sizes (for suit products without “suit” in category name)
                  </label>
                  <span>Detected: {isSuitCategory ? "Suit category" : "Other"}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {suitSizes.map((size) => {
                    const active = productForm.sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`px-3 py-2 rounded-full text-xs border transition ${
                          active
                            ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                            : "bg-white border-gray-200 text-gray-600 hover:border-indigo-200"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <input
              value={productForm.amazonLink}
              onChange={(e) => setProductForm({ ...productForm, amazonLink: e.target.value })}
              placeholder="Amazon product link (optional)"
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-100"
              type="url"
            />
            <input
              value={productForm.flipkartLink}
              onChange={(e) => setProductForm({ ...productForm, flipkartLink: e.target.value })}
              placeholder="Flipkart product link (optional)"
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-100"
              type="url"
            />
            <input
              value={productForm.price}
              onChange={(e) =>
                setProductForm({ ...productForm, price: e.target.value })
              }
              placeholder="Price (MRP)"
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-100"
              type="number"
            />
            <input
              value={productForm.discountPrice}
              onChange={(e) =>
                setProductForm({ ...productForm, discountPrice: e.target.value })
              }
              placeholder="Selling price"
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-100"
              type="number"
            />
            <input
              value={productForm.stock}
              onChange={(e) =>
                setProductForm({ ...productForm, stock: e.target.value })
              }
              placeholder="Stock"
              className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-100"
              type="number"
            />
          </div>

          <textarea
            value={productForm.description}
            onChange={(e) =>
              setProductForm({ ...productForm, description: e.target.value })
            }
            placeholder="Description / story"
            className="border rounded-2xl px-4 py-3 w-full mt-4 focus:outline-none focus:ring-2 focus:ring-pink-100"
            rows={3}
          />

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm text-gray-500">
                Existing image URLs (one per line)
              </label>
              <textarea
                value={productForm.images}
                onChange={(e) =>
                  setProductForm({ ...productForm, images: e.target.value })
                }
                className="border rounded-2xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-pink-100"
                rows={3}
              />
              </div>
              <div>
                <label className="text-sm text-gray-500">
                  Upload new images (select multiple)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setProductFiles(Array.from(e.target.files))}
                  className="border rounded-xl px-4 py-3 w-full"
                />
                {productFiles.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <p>{productFiles.length} new file(s) selected</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {productFiles.slice(0, 4).map((file) => (
                        <li key={file.name}>{file.name}</li>
                      ))}
                      {productFiles.length > 4 && (
                        <li>+{productFiles.length - 4} more</li>
                      )}
                    </ul>
                  </div>
                )}
                {productImageList.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500">Currently attached ({productImageList.length})</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {productImageList.slice(0, 8).map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                        >
                          <img src={resolveAsset(url)} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {productImageList.length > 8 && (
                        <span className="text-xs text-gray-400">+{productImageList.length - 8} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          <div className="mt-4">
            <label className="text-sm text-gray-500">
              Attach to homepage collections (Sarees / Suits / Gold / Best Seller)
            </label>
            <select
              multiple
              value={productForm.collectionIds}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  collectionIds: Array.from(e.target.selectedOptions, (option) => option.value)
                })
              }
              className="border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-pink-100 h-40"
            >
              {collections.map((collection) => (
                <option key={collection._id} value={collection._id}>
                  {collection.title}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {collections.map((collection) => (
                <button
                  key={`quick-${collection._id}`}
                  type="button"
                  className="px-3 py-1 border border-gray-200 rounded-full"
                  onClick={() =>
                    setProductForm((prev) => {
                      if (prev.collectionIds.includes(collection._id)) return prev;
                      return {
                        ...prev,
                        collectionIds: [...prev.collectionIds, collection._id]
                      };
                    })
                  }
                >
                  Add to {collection.title}
                </button>
              ))}
              {productForm.collectionIds.length > 0 && (
                <button
                  type="button"
                  className="px-3 py-1 border border-gray-200 rounded-full text-gray-500"
                  onClick={() => setProductForm((prev) => ({ ...prev, collectionIds: [] }))}
                >
                  Clear selections
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm text-gray-500">Attach to mood cards (home tiles)</label>
            <select
              multiple
              value={productMoodIds}
              onChange={(e) =>
                setProductMoodIds(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              className="border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-pink-100 h-32"
            >
              {moodCards.map((card) => (
                <option key={card._id} value={card._id}>
                  {card.title || "Untitled"} {card.tag ? `(${card.tag})` : ""}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {moodCards.map((card) => (
                <button
                  key={`quick-mood-${card._id}`}
                  type="button"
                  className="px-3 py-1 border border-gray-200 rounded-full"
                  onClick={() =>
                    setProductMoodIds((prev) => (prev.includes(card._id) ? prev : [...prev, card._id]))
                  }
                >
                  Add to {card.title || "Mood"}
                </button>
              ))}
              {productMoodIds.length > 0 && (
                <button
                  type="button"
                  className="px-3 py-1 border border-gray-200 rounded-full text-gray-500"
                  onClick={() => setProductMoodIds([])}
                >
                  Clear mood selection
                </button>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm text-gray-500">Product video URL (optional)</label>
              <input
                value={productForm.video}
                onChange={(e) => setProductForm({ ...productForm, video: e.target.value })}
                placeholder="https://... (mp4 / hosted link)"
                className="border rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-pink-100"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="file"
                  accept="video/*"
                  className="text-sm"
                  onChange={(e) => handleProductVideoUpload(e.target.files?.[0])}
                />
                {productVideoUploading && (
                  <span className="text-xs text-gray-400">Uploading...</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Paste a hosted link or upload to store on server.
              </p>
            </div>
          </div>

          <button
            onClick={handleProductSubmit}
            className="mt-6 bg-pink-600 text-white px-6 py-3 rounded-full"
          >
            {editingProductId ? "Update product" : "Create product"}
          </button>
        </section>

        <section className="bg-white rounded-3xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
                Live catalog
              </p>
              <h2 className="text-2xl font-semibold text-gray-900">Products</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Name</th>
                  <th>Price</th>
                  <th>Collections</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className="border-t">
                    <td className="py-2">{product.name}</td>
                    <td>{product.discountPrice || product.price}</td>
                    <td className="text-xs text-gray-500">
                      {selectedCollections(product.collections?.map((c) => c._id || c))}
                    </td>
                    <td className="text-right space-x-3">
                      <button
                        className="text-pink-600"
                        onClick={() => handleEditProduct(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-gray-400"
                        onClick={() => handleDeleteProduct(product._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
          </>
        )}
        {activePanel === "collections" && (
        <section className="bg-white rounded-3xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
                Homepage sections
              </p>
              <h2 className="text-2xl font-semibold text-gray-900">
                Collection studio
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <input
              value={collectionForm.title}
              onChange={(e) =>
                setCollectionForm({ ...collectionForm, title: e.target.value })
              }
              placeholder="Title"
              className="border rounded-xl px-4 py-3"
            />
            <input
              value={collectionForm.slug}
              onChange={(e) =>
                setCollectionForm({ ...collectionForm, slug: e.target.value })
              }
              placeholder="Slug (unique)"
              className="border rounded-xl px-4 py-3"
            />
            <input
              value={collectionForm.subtitle}
              onChange={(e) =>
                setCollectionForm({
                  ...collectionForm,
                  subtitle: e.target.value
                })
              }
              placeholder="Subtitle"
              className="border rounded-xl px-4 py-3"
            />
            <input
              value={collectionForm.ctaLabel}
              onChange={(e) =>
                setCollectionForm({
                  ...collectionForm,
                  ctaLabel: e.target.value
                })
              }
              placeholder="CTA Label"
              className="border rounded-xl px-4 py-3"
            />
            <input
              value={collectionForm.heroImage}
              onChange={(e) =>
                setCollectionForm({
                  ...collectionForm,
                  heroImage: e.target.value
                })
              }
              placeholder="Hero image URL"
              className="border rounded-xl px-4 py-3"
            />
            <input
              value={collectionForm.accentColor}
              onChange={(e) =>
                setCollectionForm({
                  ...collectionForm,
                  accentColor: e.target.value
                })
              }
              placeholder="Accent color"
              className="border rounded-xl px-4 py-3"
            />
            <input
              value={collectionForm.priority}
              type="number"
              onChange={(e) =>
                setCollectionForm({
                  ...collectionForm,
                  priority: Number(e.target.value)
                })
              }
              placeholder="Priority (lower first)"
              className="border rounded-xl px-4 py-3"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={collectionForm.displayOnHome}
                onChange={(e) =>
                  setCollectionForm({
                    ...collectionForm,
                    displayOnHome: e.target.checked
                  })
                }
              />
              Display on homepage
            </label>
          </div>
          <textarea
            value={collectionForm.description}
            onChange={(e) =>
              setCollectionForm({
                ...collectionForm,
                description: e.target.value
              })
            }
            placeholder="Description"
            className="border rounded-2xl px-4 py-3 w-full mt-4"
            rows={3}
          />
          <button
            onClick={handleCollectionSubmit}
            className="mt-4 bg-gray-900 text-white px-6 py-3 rounded-full"
          >
            Create collection
          </button>

          <div className="mt-10 space-y-10 admin-collections">
            {collections.length === 0 && (
              <p className="text-sm text-gray-500">
                Create a collection to start building your home tiles.
              </p>
            )}
            {collections.map((collection) => (
              <div key={collection._id} className="admin-collection-row">
                <CollectionCard
                  collection={collection}
                  onSave={(payload) => handleUpdateCollection(collection._id, payload)}
                  onDelete={() => handleDeleteCollection(collection._id)}
                  onHeroUpload={(file) => handleHeroUpload(collection._id, file)}
                  onGalleryUpload={(file) => handleGalleryUpload(file)}
                />
                <CollectionProductManager
                  collection={collection}
                  products={products}
                  onUpdate={(productIds) => handleUpdateCollection(collection._id, { products: productIds })}
                />
              </div>
            ))}
          </div>
        </section>
        )}

        {activePanel === "homepage" && (
        <section className="bg-white rounded-3xl shadow p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Homepage slider</p>
            <h2 className="text-2xl font-semibold text-gray-900">Hero image manager</h2>
            <p className="text-sm text-gray-500 mt-2">
              Upload multiple hero images at once and they will rotate on the storefront automatically.
            </p>
          </div>

          <div className="mt-6 border border-gray-100 rounded-2xl p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Upload photos / videos</p>
              <p className="text-xs text-gray-500">Select one or more images or MP4/WebM clips.</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="mt-3 text-sm"
                onChange={(e) => {
                  handleHeroFileUpload(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Or paste an image / video link</p>
              <div className="flex flex-col gap-2 md:flex-row mt-2">
                <input
                  value={heroLinkInput}
                  onChange={(e) => setHeroLinkInput(e.target.value)}
                  placeholder="https://example.com/hero.jpg or https://example.com/hero.mp4"
                  className="border rounded-xl px-4 py-2 text-sm flex-1"
                />
                <button
                  onClick={handleHeroLinkAdd}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm"
                >
                  Add slide
                </button>
              </div>
            </div>
            {heroUploadBusy && <p className="text-xs text-gray-400">Uploading...</p>}
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Slides</p>
                <h3 className="text-xl font-semibold text-gray-900">
                  {heroSlides.length} slide{heroSlides.length === 1 ? "" : "s"}
                </h3>
              </div>
            </div>
            {heroSlides.length === 0 ? (
              <p className="text-sm text-gray-500 mt-4">No slides yet. Upload images to get started.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {heroSlides.map((slide, index) => (
                  <HeroSlideCard
                    key={slide._id}
                    slide={slide}
                    index={index}
                    isLast={index === heroSlides.length - 1}
                    onToggle={(next) => handleHeroToggle(slide._id, next)}
                    onDelete={() => handleHeroDelete(slide._id)}
                    onMoveUp={() => handleHeroMove(slide._id, "up")}
                    onMoveDown={() => handleHeroMove(slide._id, "down")}
                    onReorder={(sourceId) => handleHeroReorder(sourceId, slide._id)}
                  />
                ))}
              </div>
            )}
          </div>

          {changeLog.length > 0 && (
            <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Recent changes</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {changeLog.map((log, idx) => (
                  <li key={`${log.ts}-${idx}`}>
                    <span className="text-gray-500 text-xs">
                      {new Date(log.ts).toLocaleTimeString()}
                    </span>{" "}
                    {log.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10 border-t pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Featured edits</p>
                <h3 className="text-xl font-semibold text-gray-900">Mood cards (home tiles)</h3>
                <p className="text-sm text-gray-500">
                  Add tiles like Saree / Suit / Jewellery. Set title, badge, link, and image.
                </p>
              </div>
              {editingMoodId && (
                <button onClick={resetMoodForm} className="text-sm text-gray-500 underline">
                  Cancel edit
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-3">
                <label className="text-sm text-gray-600">Title</label>
                <input
                  value={moodForm.title}
                  onChange={(e) => setMoodForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Saree"
                />
                <label className="text-sm text-gray-600">Subtitle</label>
                <input
                  value={moodForm.subtitle}
                  onChange={(e) => setMoodForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Pure zari woven"
                />
                <label className="text-sm text-gray-600">Badge / tag</label>
                <input
                  value={moodForm.tag}
                  onChange={(e) => setMoodForm((prev) => ({ ...prev, tag: e.target.value }))}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Bestseller / New"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm text-gray-600">CTA label</label>
                <input
                  value={moodForm.ctaLabel}
                  onChange={(e) => setMoodForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Shop sarees >"
                />
                <label className="text-sm text-gray-600">CTA link</label>
                <input
                  value={moodForm.ctaLink}
                  onChange={(e) => setMoodForm((prev) => ({ ...prev, ctaLink: e.target.value }))}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="/products or /collection/sarees"
                />
                <label className="text-sm text-gray-600">Display order</label>
                <input
                  type="number"
                  value={moodForm.order}
                  onChange={(e) => setMoodForm((prev) => ({ ...prev, order: Number(e.target.value) }))}
                  className="border rounded-xl px-3 py-2 w-full"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-sm text-gray-600">Image URL</label>
                <input
                  value={moodForm.image}
                  onChange={(e) => setMoodForm((prev) => ({ ...prev, image: e.target.value }))}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="https://..."
                />
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 text-sm"
                  onChange={(e) => handleMoodImageUpload(e.target.files?.[0])}
                />
                {moodUploadBusy && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
              </div>
              <div>
                <label className="text-sm text-gray-600">Attach products</label>
                <div className="flex gap-2 mt-1">
                  <select
                    className="border rounded-xl px-3 py-2 text-sm flex-1"
                    value=""
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      setMoodForm((prev) =>
                        prev.productIds.includes(id)
                          ? prev
                          : { ...prev, productIds: [...prev.productIds, id] }
                      );
                    }}
                  >
                    <option value="">Choose product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-500 self-center">
                    Pick items to show when opening this edit.
                  </span>
                </div>
                {moodForm.productIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {moodForm.productIds.map((id) => {
                      const product = products.find((p) => p._id === id);
                      return (
                        <span
                          key={id}
                          className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700 flex items-center gap-2"
                        >
                          {product?.name || "Product"}
                          <button
                            type="button"
                            className="text-gray-500"
                            onClick={() =>
                              setMoodForm((prev) => ({
                                ...prev,
                                productIds: prev.productIds.filter((pid) => pid !== id)
                              }))
                            }
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={moodForm.active}
                  onChange={(e) => setMoodForm((prev) => ({ ...prev, active: e.target.checked }))}
                />
                Active
              </label>
              <button
                onClick={handleMoodSubmit}
                className="px-5 py-3 bg-pink-600 text-white rounded-full text-sm font-semibold"
              >
                {editingMoodId ? "Update card" : "Save card"}
              </button>
            </div>

            <div className="mt-6 grid md:grid-cols-3 gap-3">
              {moodCards.map((card, index) => (
                  <MoodCard
                    key={card._id}
                    card={{ ...card, allProducts: products }}
                    index={index}
                    isLast={index === moodCards.length - 1}
                    onEdit={() => handleMoodEdit(card)}
                    onDelete={() => handleMoodDelete(card._id)}
                    onToggle={(next) =>
                      axios
                        .put(`/home-sections/${card._id}`, { active: next }, authConfig)
                        .then(fetchHomeSections)
                        .catch(() => toast.error("Could not update card"))
                    }
                    onMoveUp={() => handleMoodMove(card._id, "up")}
                    onMoveDown={() => handleMoodMove(card._id, "down")}
                    onAddProduct={(productId) => handleMoodProductAdd(card._id, productId)}
                    onDeleteProduct={(productId) => handleMoodProductRemove(card._id, productId)}
                    allProducts={products}
                    onAddCustom={(item) => handleMoodCustomAdd(card._id, item)}
                    onDeleteCustom={(idx) => handleMoodCustomRemove(card._id, idx)}
                    onUploadCustom={handleMoodCustomUpload}
                  />
              ))}
        {moodCards.length === 0 && (
            <p className="text-sm text-gray-500">No mood cards yet. Add up to 3 tiles.</p>
          )}
        </div>
      </div>
    </section>
        )}

        {activePanel === "login-visuals" && (
          <section className="bg-white rounded-3xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Login page</p>
                <h2 className="text-2xl font-semibold text-gray-900">Side visuals</h2>
                <p className="text-sm text-gray-500">
                  Update the left and right images shown on the login screen. Leave blank to hide.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {loginVisuals.map((item, index) => (
                <div key={index} className="border border-gray-100 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Visual {index === 0 ? "Left" : "Right"}</p>
                  <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Title</label>
                  <input
                    value={item.title}
                    onChange={(e) => updateLoginVisual(index, "title", e.target.value)}
                    className="border rounded-xl px-3 py-2 w-full"
                    placeholder="Sequin night"
                  />
                  <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Subtitle</label>
                  <input
                    value={item.subtitle}
                    onChange={(e) => updateLoginVisual(index, "subtitle", e.target.value)}
                    className="border rounded-xl px-3 py-2 w-full"
                    placeholder="Cocktail sarees"
                  />
                  <label className="text-xs uppercase tracking-[0.3em] text-gray-500">Image URL</label>
                  <input
                    value={item.image}
                    onChange={(e) => updateLoginVisual(index, "image", e.target.value)}
                    className="border rounded-xl px-3 py-2 w-full"
                    placeholder="https://..."
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      uploadLoginImage(file, index);
                      e.target.value = "";
                    }}
                  />
                  {loginUploadBusy && <p className="text-xs text-gray-400">Uploading...</p>}
                  {item.image && (
                    <div className="mt-2 rounded-xl overflow-hidden h-32 bg-gray-100">
                      <img src={resolveAsset(item.image)} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={saveLoginVisuals}
                className="px-5 py-3 bg-pink-600 text-white rounded-full text-sm font-semibold"
              >
                Save visuals
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function HeroSlideCard({ slide, index, isLast, onToggle, onDelete, onMoveUp, onMoveDown, onReorder }) {
  const videoSrc = resolveAsset(slide.video || slide.heroVideo || slide.meta?.video || "");
  const imageSrc = resolveAsset(slide.image || slide.heroImage || (Array.isArray(slide.images) ? slide.images[0] : ""));
  const preview = videoSrc || imageSrc;
  const active = slide.active !== false;
  const isVideo = Boolean(videoSrc);
  return (
    <div
      className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", slide._id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData("text/plain");
        if (sourceId) onReorder?.(sourceId, slide._id);
      }}
    >
      <div className="rounded-xl overflow-hidden bg-gray-100 aspect-[16/9]">
        {preview ? (
          isVideo ? (
            <video
              src={preview}
              poster={imageSrc || undefined}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={preview}
              alt={slide.title || `Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            No media
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Slide {index + 1}</p>
          <p className="text-xs text-gray-500">Order {slide.order ?? index + 1}</p>
        </div>
        {preview && (
          <a
            href={preview}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-pink-600"
          >
            View
          </a>
        )}
      </div>
      {isVideo && <span className="inline-block text-[11px] text-indigo-600 font-semibold">Video slide</span>}
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} />
        Show on homepage
      </label>
      {(slide.title || slide.description) && (
        <div className="text-xs text-gray-500">
          {slide.title && <p className="font-semibold">{slide.title}</p>}
          {slide.description && <p>{slide.description}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className={`px-3 py-2 rounded-xl border ${
            index === 0
              ? "text-gray-300 border-gray-200 cursor-not-allowed"
              : "text-gray-700 border-gray-300"
          }`}
        >
          Move up
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className={`px-3 py-2 rounded-xl border ${
            isLast
              ? "text-gray-300 border-gray-200 cursor-not-allowed"
              : "text-gray-700 border-gray-300"
          }`}
        >
          Move down
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="px-3 py-2 rounded-xl border border-red-200 text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function MoodCard({
  card,
  index,
  isLast,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
  onAddProduct,
  onDeleteProduct,
  onAddCustom,
  onDeleteCustom,
  onUploadCustom,
  allProducts
}) {
  const [customItem, setCustomItem] = useState({
    name: "",
    price: "",
    mrp: "",
    image: "",
    images: []
  });
  const active = card.active !== false;
  const productIds = card.meta?.products || card.productIds || [];
  const customProducts = card.meta?.customProducts || [];
  return (
    <div className="border border-gray-200 rounded-2xl p-3 space-y-2 bg-white shadow-sm">
      <div className="rounded-xl overflow-hidden bg-gray-100 aspect-[4/5]">
        {card.image ? (
          <img src={resolveAsset(card.image)} alt={card.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            No image
          </div>
        )}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
          {card.tag || "Mood"} <span className="text-gray-300">·</span> Order {card.order ?? index + 1}
        </p>
        <p className="text-base font-semibold text-gray-900">{card.title || "Untitled"}</p>
        {card.subtitle && <p className="text-sm text-gray-500">{card.subtitle}</p>}
        {productIds.length > 0 && (
          <p className="text-[11px] text-gray-500">
            {productIds.length} product{productIds.length === 1 ? "" : "s"}
          </p>
        )}
        {card.ctaLabel && (
          <p className="text-[11px] text-pink-600 mt-1">
            {card.ctaLabel} → {card.ctaLink || "/products"}
          </p>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} />
        Active
      </label>
      <div className="flex flex-wrap gap-2 text-sm">
        <button onClick={onEdit} className="px-3 py-2 rounded-xl border border-gray-300 text-gray-700">
          Edit
        </button>
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className={`px-3 py-2 rounded-xl border ${
            index === 0
              ? "text-gray-300 border-gray-200 cursor-not-allowed"
              : "text-gray-700 border-gray-300"
          }`}
        >
          Up
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className={`px-3 py-2 rounded-xl border ${
            isLast
              ? "text-gray-300 border-gray-200 cursor-not-allowed"
              : "text-gray-700 border-gray-300"
          }`}
        >
          Down
        </button>
        <button onClick={onDelete} className="px-3 py-2 rounded-xl border border-red-200 text-red-600">
          Delete
        </button>
      </div>
      <div className="space-y-2 text-xs text-gray-600">
        <p className="font-semibold">Attached products</p>
        <div className="flex flex-wrap gap-2">
          {productIds.length === 0 && <span className="text-gray-400">None</span>}
          {productIds.map((id) => (
            <span
              key={id}
              className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 flex items-center gap-2"
            >
              {card.products?.find((p) => p._id === id)?.name ||
                card.meta?.productsDetails?.find((p) => p._id === id)?.name ||
                id}
              <button
                type="button"
                className="text-gray-500"
                onClick={() => onDeleteProduct(id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded-xl px-2 py-1 flex-1"
            value=""
            onChange={(e) => onAddProduct(e.target.value)}
          >
            <option value="">Add product</option>
            {(allProducts || []).map((product) => (
              <option key={product._id} value={product._id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function CollectionCard({ collection, onSave, onDelete, onHeroUpload, onGalleryUpload }) {
  const [form, setForm] = useState({
    title: collection.title,
    subtitle: collection.subtitle || "",
    description: collection.description || "",
    ctaLabel: collection.ctaLabel || "",
    heroImage: collection.heroImage || "",
    accentColor: collection.accentColor || "#c1275a",
    displayOnHome: collection.displayOnHome,
    priority: collection.priority
  });
  const [gallery, setGallery] = useState(collection.heroImages || []);
  const [galleryInput, setGalleryInput] = useState("");
  const [uploadingGallery, setUploadingGallery] = useState(false);

  useEffect(() => {
    setForm({
      title: collection.title,
      subtitle: collection.subtitle || "",
      description: collection.description || "",
      ctaLabel: collection.ctaLabel || "",
      heroImage: collection.heroImage || "",
      accentColor: collection.accentColor || "#c1275a",
      displayOnHome: collection.displayOnHome,
      priority: collection.priority
    });
    setGallery(collection.heroImages || []);
  }, [collection]);

  const handleAddGalleryUrl = () => {
    if (!galleryInput.trim()) return;
    setGallery((prev) => [...prev, galleryInput.trim()]);
    setGalleryInput("");
  };

  const handleRemoveGallery = (index) => {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadGallery = async (file) => {
    if (!file) return;
    setUploadingGallery(true);
    try {
      const url = await onGalleryUpload(file);
      if (url) {
        setGallery((prev) => [...prev, url]);
      }
    } finally {
      setUploadingGallery(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-2xl p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{collection.title}</h3>
          <span className="text-xs text-gray-500">
            {collection.products?.length || 0} items linked
          </span>
        </div>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Collection title"
          className="border rounded-xl px-3 py-2 text-sm"
        />
        <input
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          placeholder="Subtitle"
          className="border rounded-xl px-3 py-2 text-sm"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
          className="border rounded-xl px-3 py-2 text-sm"
          rows={2}
        />
        <div className="grid md:grid-cols-2 gap-3">
          <input
            value={form.ctaLabel}
            onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
            placeholder="CTA label"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <div>
            <input
              value={form.heroImage}
              onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
              placeholder="Hero image URL"
              className="border rounded-xl px-3 py-2 text-sm w-full"
            />
            <input
              type="file"
              className="mt-2 text-sm"
              onChange={(e) => onHeroUpload(e.target.files?.[0])}
            />
            <div className="flex gap-2 items-center mt-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, heroImage: "" }))}
                className="text-xs text-gray-500 underline"
              >
                Remove hero image
              </button>
              {form.heroImage && (
                <a
                  href={form.heroImage}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-pink-600"
                >
                  View
                </a>
              )}
            </div>
            {form.heroImage && (
              <div className="mt-2 rounded-xl overflow-hidden border bg-gray-50">
                <img
                  src={resolveAsset(form.heroImage)}
                  alt="Hero preview"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
          </div>
        </div>
        <div className="border border-gray-100 rounded-2xl p-3">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Hero gallery</p>
          <div className="flex flex-wrap gap-3 mt-3">
            {gallery.map((image, index) => (
              <div key={`${image}-${index}`} className="w-16 h-16 rounded-xl overflow-hidden relative">
              <img src={resolveAsset(image)} alt="gallery" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveGallery(index)}
                  className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded"
                >
                  ✕
                </button>
              </div>
            ))}
            {gallery.length === 0 && (
              <p className="text-xs text-gray-400">No gallery images yet</p>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div className="flex gap-2">
              <input
                value={galleryInput}
                onChange={(e) => setGalleryInput(e.target.value)}
                placeholder="Image URL"
                className="border rounded-xl px-3 py-2 text-sm flex-1"
              />
              <button
                type="button"
                onClick={handleAddGalleryUrl}
                className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm"
              >
                Add
              </button>
            </div>
            <div>
              <input
                type="file"
                className="text-sm"
                onChange={(e) => handleUploadGallery(e.target.files?.[0])}
              />
              {uploadingGallery && (
                <p className="text-xs text-gray-400 mt-1">Uploading image...</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={form.accentColor}
            onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
            placeholder="#c1275a"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            placeholder="Priority"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.displayOnHome}
              onChange={(e) => setForm({ ...form, displayOnHome: e.target.checked })}
            />
            Show on home
          </label>
        </div>
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => onSave({ ...form, heroImages: gallery })}
            className="px-4 py-2 bg-gray-900 text-white rounded-full"
          >
            Save collection
          </button>
          <button onClick={onDelete} className="text-gray-400">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function CollectionProductManager({ collection, products, onUpdate }) {
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const linkedProducts = (collection.products || []).map((product) => {
    if (typeof product === "string") {
      return products.find((p) => p._id === product);
    }
    return product;
  }).filter(Boolean);
  const linkedIds = linkedProducts.map((product) => product._id);
  const availableProducts = products
    .filter((product) => !linkedIds.includes(product._id))
    .filter((product) => product.name?.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    setSearch("");
    setSelectedProductId("");
  }, [collection?._id]);

  const handleRemove = (productId) => {
    const nextIds = linkedIds.filter((id) => id !== productId);
    onUpdate(nextIds);
  };

  const handleAdd = () => {
    if (!selectedProductId) return;
    const nextIds = [...linkedIds, selectedProductId];
    onUpdate(nextIds);
    setSelectedProductId("");
    setSearch("");
  };

  return (
    <div className="border border-gray-100 rounded-3xl p-4">
      <h3 className="text-lg font-semibold text-gray-900">Linked products</h3>
      <p className="text-sm text-gray-500">
        Attach items to this collection. They will appear on the homepage rail exactly in this order.
      </p>
      <div className="mt-4">
        <label className="text-xs uppercase tracking-[0.4em] text-gray-400">Add product</label>
        <div className="flex flex-col gap-2 mt-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm flex-1"
            >
              <option value="">Choose product</option>
              {availableProducts.slice(0, 30).map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
            <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm">
              Add
            </button>
          </div>
          {availableProducts.length === 0 && (
            <p className="text-xs text-gray-400">No more products match this search.</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3 max-h-[420px] overflow-y-auto pr-2">
        {linkedProducts.length === 0 && (
          <p className="text-sm text-gray-400">No products linked yet.</p>
        )}
        {linkedProducts.map((product) => (
          <div
            key={product._id}
            className="border border-gray-100 rounded-2xl p-3 flex items-center gap-3 bg-white"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={resolveAsset(product.images?.[0])} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{product.name}</p>
              <p className="text-xs text-gray-500">
                {(getProductColorsLabel(product) || product.category) && (
                  <span>{getProductColorsLabel(product) || product.category} • </span>
                )}
                Rs.{" "}
                {new Intl.NumberFormat("en-IN").format(product.discountPrice || product.price || 0)}
              </p>
            </div>
            <button onClick={() => handleRemove(product._id)} className="text-xs text-gray-500">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
