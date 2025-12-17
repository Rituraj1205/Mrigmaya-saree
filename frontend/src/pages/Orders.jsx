import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { buildAssetUrl } from "../utils/apiBase";

const formatPrice = (value) =>
  `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value || 0)}`;

const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAD/ACw=";
const resolveImage = (product) => buildAssetUrl(product?.images?.[0], BLANK_IMG);

const statusLabels = {
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

const returnStatusLabels = {
  none: "No return",
  requested: "Return requested",
  approved: "Return approved",
  rejected: "Return rejected",
  received: "Item received",
  refunded: "Refunded"
};

const isReturnEligible = (order) => {
  if (order.status !== "delivered") return false;
  const created = order.createdAt ? new Date(order.createdAt).getTime() : 0;
  const days = (Date.now() - created) / (1000 * 60 * 60 * 24);
  return days <= 7;
};

const paymentLabels = {
  cod_pending: "Awaiting COD",
  awaiting_upi: "Awaiting UPI",
  awaiting_gateway: "Awaiting gateway",
  paid: "Paid",
  cancelled: "Cancelled"
};

const getTrackingLink = (order) => {
  if (order?.trackingLink && order.trackingLink.startsWith("http")) return order.trackingLink;
  if (order?.trackingNumber && order.trackingNumber.startsWith("http")) return order.trackingNumber;
  return null;
};

export default function Orders() {
  const { token, user } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [returnFormOrder, setReturnFormOrder] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [returnFile, setReturnFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(null);

  const authToken = token || localStorage.getItem("token");

  useEffect(() => {
    if (!authToken) {
      navigate("/login");
      return;
    }
    let active = true;
    setLoading(true);
    axios
      .get(`/orders?page=${page}&limit=10`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((res) => {
        if (!active) return;
        const payload = res.data;
        const list = Array.isArray(payload) ? payload : payload?.orders;
        setOrders(list || []);
        if (payload?.totalPages) setTotalPages(payload.totalPages);
        else setTotalPages(1);
        setError("");
      })
      .catch(() => {
        if (!active) return;
        setError("Could not load your orders right now.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authToken, navigate, page]);

  const timelineSteps = ["processing", "packed", "shipped", "delivered"];

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders]
  );

  const uniqueAddresses = useMemo(() => {
    const acc = [];
    orders.forEach((order) => {
      const addr = order.shippingAddress || {};
      const key = `${addr.name || ""}-${addr.phone || ""}-${addr.line1 || ""}-${addr.city || ""}-${addr.pincode || ""}`;
      if (addr.name && !acc.find((a) => a.key === key)) {
        acc.push({ key, ...addr });
      }
    });
    return acc;
  }, [orders]);

  const reorderItems = async (order) => {
    try {
      const items = order.items || [];
      for (const item of items) {
        const productId = item.product?._id || item.product;
        if (productId) {
          await addToCart(productId, item.quantity || 1);
        }
      }
      toast.success("Items added to cart");
      navigate("/cart");
    } catch (err) {
      console.error(err);
      toast.error("Could not add items to cart");
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const res = await axios.get(`/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${authToken}` },
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

  const requestReturn = async (orderId) => {
    if (!returnReason.trim()) {
      toast.error("Please add a reason");
      return;
    }
    setRequestingReturn(true);
    try {
      let photoUrl = "";
      if (returnFile) {
        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append("file", returnFile);
        const uploadRes = await axios.post("/uploads", formData, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "multipart/form-data"
          }
        });
        photoUrl = uploadRes.data.url;
      }
      await axios.post(
        `/orders/${orderId}/return-request`,
        { reason: returnReason.trim(), note: returnNote.trim(), images: photoUrl ? [photoUrl] : [] },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success("Return request submitted");
      // refresh list
      setPage(1);
      const res = await axios.get(`/orders?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload?.orders;
      setOrders(list || []);
      setTotalPages(payload?.totalPages || 1);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Could not submit return request");
    } finally {
      setRequestingReturn(false);
      setUploadingPhoto(false);
      setReturnSuccess({ orderId, message: "Return request submitted" });
      setReturnFormOrder(null);
      setReturnReason("");
      setReturnNote("");
      setReturnFile(null);
    }
  };

  if (!authToken) return null;

  return (
    <div className="bg-[#fefbfe] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Your orders</p>
            <h1 className="text-3xl font-semibold text-gray-900">Track and manage</h1>
            <p className="text-sm text-gray-500">
              Status updates appear here as soon as admin changes them.
            </p>
          </div>
          <Link
            to="/products"
            className="text-sm text-pink-600 font-semibold border border-pink-100 rounded-full px-4 py-2"
          >
            Continue shopping
          </Link>
        </div>

        {uniqueAddresses.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uniqueAddresses.map((addr) => (
              <div key={addr.key} className="bg-white border border-gray-100 rounded-2xl p-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">{addr.name}</p>
                <p>{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>
                  {addr.city}, {addr.state} {addr.pincode}
                </p>
                <p className="text-xs text-gray-500 mt-1">Phone: {addr.phone}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-32 bg-white rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center space-y-3">
            <p className="text-lg font-semibold text-gray-900">No orders found</p>
            <p className="text-sm text-gray-500">
              If you just placed an order, refresh once. Orders show only for the account you’re signed in with.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center px-5 py-3 bg-pink-600 text-white rounded-full text-sm font-semibold"
            >
              Browse sarees
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => {
              const status = order.status || "processing";
              const paymentStatus = order.paymentStatus || "cod_pending";
              const placedAt = order.createdAt
                ? new Date(order.createdAt).toLocaleString()
                : "";
              const progressIndex = timelineSteps.indexOf(status);
              const items = order.items || [];
              const trackLink = getTrackingLink(order);
              const trackingLabel = order.trackingLink || order.trackingNumber;
              return (
                <div
                  key={order._id}
                  className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                        ORDER #{order._id?.slice(-6)?.toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500">{placedAt}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">
                        {statusLabels[status] || status}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                        {paymentLabels[paymentStatus] || paymentStatus}
                      </span>
                      <button
                        onClick={() => downloadInvoice(order._id)}
                        className="text-[var(--primary)] text-xs font-semibold underline"
                        type="button"
                      >
                        Download bill
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {timelineSteps.map((step, idx) => {
                      const reached = progressIndex >= idx;
                      return (
                        <div
                          key={step}
                          className={`px-3 py-2 rounded-full text-xs font-semibold border ${
                            reached
                              ? "bg-pink-600 text-white border-pink-600"
                              : "bg-gray-50 text-gray-500 border-gray-200"
                          }`}
                        >
                          {statusLabels[step]}
                        </div>
                      );
                    })}
                    {order.returnStatus && order.returnStatus !== "none" && (
                      <span className="px-3 py-2 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-100">
                        {returnStatusLabels[order.returnStatus] || order.returnStatus}
                      </span>
                    )}
                  </div>

                  <div className="grid md:grid-cols-[2fr,1fr] gap-4">
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item._id || item.product?._id || Math.random()}
                          className="flex items-center justify-between text-sm border-b border-gray-100 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                item.product?.images?.length
                                  ? resolveImage(item.product)
                                  : BLANK_IMG
                              }
                              alt={item.product?.name || "Product"}
                              className="w-14 h-14 object-cover rounded-xl border border-gray-100"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">
                                {item.product?.name || "Product"}
                              </p>
                              <p className="text-gray-500">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatPrice((item.price || 0) * (item.quantity || 1))}
                            </p>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => reorderItems(order)}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold bg-white border border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        Reorder these items
                      </button>
                      {order.status === "delivered" &&
                        (order.returnStatus === "none" || order.returnStatus === "rejected") && (
                          <div className="mt-3 space-y-2">
                            {isReturnEligible(order) ? (
                              <>
                                {returnSuccess?.orderId === order._id && (
                                  <p className="text-xs text-emerald-600">{returnSuccess.message}</p>
                                )}
                                {returnFormOrder === order._id ? (
                                  <div className="space-y-2 bg-white border border-pink-100 rounded-2xl p-3">
                                    <div>
                                      <label className="text-xs uppercase tracking-[0.3em] text-gray-400">
                                        Reason
                                      </label>
                                      <textarea
                                        value={returnReason}
                                        onChange={(e) => setReturnReason(e.target.value)}
                                        className="border rounded-xl px-3 py-2 w-full text-sm"
                                        rows={2}
                                        placeholder="Why are you returning?"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs uppercase tracking-[0.3em] text-gray-400">
                                        Note (optional)
                                      </label>
                                      <textarea
                                        value={returnNote}
                                        onChange={(e) => setReturnNote(e.target.value)}
                                        className="border rounded-xl px-3 py-2 w-full text-sm"
                                        rows={2}
                                        placeholder="Any extra details"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs uppercase tracking-[0.3em] text-gray-400">
                                        Photo (optional)
                                      </label>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setReturnFile(e.target.files?.[0] || null)}
                                        className="text-xs"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => requestReturn(order._id)}
                                        disabled={requestingReturn || uploadingPhoto}
                                        className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60"
                                      >
                                        {requestingReturn || uploadingPhoto ? "Submitting..." : "Submit return"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReturnFormOrder(null);
                                          setReturnReason("");
                                          setReturnNote("");
                                          setReturnFile(null);
                                        }}
                                        className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReturnFormOrder(order._id);
                                      setReturnReason("");
                                      setReturnNote("");
                                      setReturnFile(null);
                                    }}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 disabled:opacity-60"
                                  >
                                    Request return
                                  </button>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-gray-400">Return window (7 days) has expired.</p>
                            )}
                          </div>
                        )}
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 space-y-2 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">Delivery</p>
                      <p className="text-gray-600">
                        {order.shippingAddress?.name || user?.name || "Customer"}
                      </p>
                      <p className="text-gray-500">{order.shippingAddress?.phone || user?.mobile}</p>
                      <p className="text-gray-500">
                        {[order.shippingAddress?.line1, order.shippingAddress?.line2]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p className="text-gray-500">
                        {[order.shippingAddress?.city, order.shippingAddress?.state]
                          .filter(Boolean)
                          .join(", ")}
                        {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ""}
                      </p>
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Total</p>
                        <p className="text-lg font-semibold text-gray-900">{formatPrice(order.amount)}</p>
                        <p className="text-xs text-gray-500">
                          Payment: {order.paymentMethod || "COD"}
                        </p>
                        {(trackingLabel || order.carrier) && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Tracking</p>
                            <div className="flex items-center flex-wrap gap-3">
                              {trackingLabel && (
                                <span className="text-xs text-gray-600 break-all">{trackingLabel}</span>
                              )}
                              {trackLink && (
                                <a
                                  href={trackLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-pink-600 underline"
                                >
                                  Track shipment
                                </a>
                              )}
                              {order.carrier && (
                                <span className="text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1">
                                  {order.carrier}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {order.returnStatus && order.returnStatus !== "none" && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Return</p>
                            <p className="text-xs text-gray-600">
                              {returnStatusLabels[order.returnStatus] || order.returnStatus}
                            </p>
                            {order.returnReason && (
                              <p className="text-xs text-gray-500">Reason: {order.returnReason}</p>
                            )}
                            {order.returnNote && (
                              <p className="text-xs text-gray-500">Note: {order.returnNote}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  className="px-3 py-2 border rounded-full text-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="px-3 py-2 border rounded-full text-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
