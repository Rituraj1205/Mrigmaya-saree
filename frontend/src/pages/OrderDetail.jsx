import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { buildAssetUrl } from "../utils/apiBase";

const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAD/ACw=";
const resolveImage = (product) => buildAssetUrl(product?.images?.[0], BLANK_IMG);

const formatPrice = (value) =>
  `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0)}`;

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
  if (order?.status !== "delivered") return false;
  const created = order?.createdAt ? new Date(order.createdAt).getTime() : 0;
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

const trackingUrl = (order) => {
  if (!order) return null;
  if (order.trackingLink && order.trackingLink.startsWith("http")) return order.trackingLink;
  if (order.trackingNumber && order.trackingNumber.startsWith("http")) return order.trackingNumber;
  return null;
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [returnFile, setReturnFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    let active = true;
    setLoading(true);
    axios
      .get(`/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!active) return;
        setOrder(res.data);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.msg || "Could not load order");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, token, navigate]);

  const timelineSteps = ["processing", "packed", "shipped", "delivered"];
  const progressIndex = useMemo(() => {
    const idx = timelineSteps.indexOf(order?.status);
    return idx === -1 ? -1 : idx;
  }, [order?.status]);

  if (!token) return null;

  const trackLink = trackingUrl(order);
  const trackingLabel = order?.trackingLink || order?.trackingNumber;

  const requestReturn = async () => {
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
        const res = await axios.post("/uploads", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });
        photoUrl = res.data.url;
      }
      await axios.post(
        `/orders/${id}/return-request`,
        { reason: returnReason.trim(), note: returnNote.trim(), images: photoUrl ? [photoUrl] : [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Return request submitted");
      // refresh
      const res = await axios.get(`/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setOrder(res.data);
      setReturnReason("");
      setReturnNote("");
      setReturnFile(null);
      setShowReturnForm(false);
      setReturnSuccess("Return request submitted");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Could not submit return request");
    } finally {
      setRequestingReturn(false);
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="bg-[#fefbfe] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Order detail</p>
            <h1 className="text-3xl font-semibold text-gray-900">
              {order ? `#${order._id?.slice(-6)?.toUpperCase()}` : "Loading..."}
            </h1>
            {order?.createdAt && (
              <p className="text-sm text-gray-500">
                Placed on {new Date(order.createdAt).toLocaleString()}
              </p>
            )}
            {order?.returnStatus && order.returnStatus !== "none" && (
              <p className="text-sm text-amber-700 mt-1">
                {returnStatusLabels[order.returnStatus] || order.returnStatus}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="text-sm text-pink-600 font-semibold border border-pink-100 rounded-full px-4 py-2"
          >
            Back to orders
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 bg-white rounded-3xl animate-pulse" />
            <div className="h-32 bg-white rounded-3xl animate-pulse" />
            <div className="h-40 bg-white rounded-3xl animate-pulse" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        ) : !order ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center">
            <p className="text-sm text-gray-500">Order not found</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
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
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">
                  {statusLabels[order.status] || order.status}
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                  {paymentLabels[order.paymentStatus] || order.paymentStatus}
                </span>
                {order.returnStatus && order.returnStatus !== "none" && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">
                    {returnStatusLabels[order.returnStatus] || order.returnStatus}
                  </span>
                )}
              </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Payment</p>
                  <p className="text-sm text-gray-700">
                    Method: {order.paymentMethod || "COD"} • Status:{" "}
                    {paymentLabels[order.paymentStatus] || order.paymentStatus}
                  </p>
                  {(trackingLabel || order.carrier) && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Tracking</p>
                      <div className="flex items-center flex-wrap gap-3">
                        {trackingLabel && (
                          <span className="text-sm text-gray-700 break-all">{trackingLabel}</span>
                        )}
                        {trackLink && (
                          <a
                            className="text-sm text-pink-600 underline"
                            href={trackLink}
                            target="_blank"
                            rel="noreferrer"
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
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Amount</p>
                  <p className="text-lg font-semibold text-gray-900">{formatPrice(order.amount)}</p>
                </div>
                {order.returnStatus && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Return</p>
                    <p className="text-sm text-gray-700">
                      {returnStatusLabels[order.returnStatus] || order.returnStatus}
                    </p>
                    {order.returnReason && (
                      <p className="text-xs text-gray-500">Reason: {order.returnReason}</p>
                    )}
                    {order.returnNote && <p className="text-xs text-gray-500">Note: {order.returnNote}</p>}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm space-y-2 text-sm text-gray-700">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Delivery</p>
                <p className="text-gray-900 font-semibold">
                  {order.shippingAddress?.name || order.customerContact || "Customer"}
                </p>
                <p className="text-gray-600">{order.shippingAddress?.phone || order.customerContact}</p>
                <p className="text-gray-600">
                  {[order.shippingAddress?.line1, order.shippingAddress?.line2].filter(Boolean).join(", ")}
                </p>
                <p className="text-gray-600">
                  {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(", ")}
                  {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ""}
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Items</p>
                <div className="divide-y divide-gray-100 mt-2">
                  {(order.items || []).map((item) => (
                    <div key={item._id} className="flex items-center justify-between py-3 text-sm gap-3">
                      <div className="flex items-center gap-3">
                      <img
                        src={resolveImage(item.product)}
                        alt={item.product?.name}
                        className="w-16 h-16 object-cover rounded-xl border border-gray-100"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{item.product?.name || "Product"}</p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice((item.price || 0) * (item.quantity || 1))}
                      </p>
                      {item.product?._id && (
                        <Link to={`/product/${item.product._id}`} className="text-xs text-pink-600 underline">
                          View product
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {order.status === "delivered" &&
              (order.returnStatus === "none" || order.returnStatus === "rejected") && (
              <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Return request</p>
                {returnSuccess && <p className="text-xs text-emerald-600">{returnSuccess}</p>}
                {isReturnEligible(order) ? (
                  showReturnForm ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-gray-400">Reason</label>
                          <textarea
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            className="border rounded-xl px-3 py-2 w-full text-sm"
                            rows={2}
                            placeholder="Why are you returning?"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-[0.3em] text-gray-400">Note (optional)</label>
                          <textarea
                            value={returnNote}
                            onChange={(e) => setReturnNote(e.target.value)}
                            className="border rounded-xl px-3 py-2 w-full text-sm"
                            rows={2}
                            placeholder="Any extra details"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs uppercase tracking-[0.3em] text-gray-400">Photo (optional)</label>
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
                            onClick={requestReturn}
                            disabled={requestingReturn || uploadingPhoto}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-600 text-white text-sm font-semibold hover:bg-pink-700 disabled:opacity-60"
                          >
                            {requestingReturn || uploadingPhoto ? "Submitting..." : "Submit return"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowReturnForm(false);
                              setReturnReason("");
                              setReturnNote("");
                              setReturnFile(null);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowReturnForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-pink-200 text-pink-600 text-sm font-semibold hover:bg-pink-50"
                      >
                        Request return
                      </button>
                    )
                  ) : (
                    <p className="text-xs text-gray-400">Return window (7 days) has expired.</p>
                  )}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}
