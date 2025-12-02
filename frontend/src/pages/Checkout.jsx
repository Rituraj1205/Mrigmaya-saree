import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0);

const paymentOptions = [
  { value: "COD", label: "Cash on delivery (Pay to courier)" },
  { value: "UPI", label: "Pay now (GPay / PhonePe / UPI)" }
];

const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function Checkout() {
  const { token, user } = useContext(AuthContext);
  const { cart, fetchCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placing, setPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [address, setAddress] = useState({
    name: user?.name || "",
    phone: user?.mobile || "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: ""
  });
  const [customerNote, setCustomerNote] = useState("");

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          ((item.product?.discountPrice || item.product?.price || 0) * item.quantity || 0),
        0
      ),
    [cart]
  );

  const couponDiscount = couponResult?.discount || 0;
  const totalAfterCoupon = Math.max(0, total - couponDiscount);
  const discountRate = paymentMethod === "UPI" ? 0.1 : 0;
  const discountAmount = Math.round(totalAfterCoupon * discountRate);
  const payableTotal = Math.max(0, totalAfterCoupon - discountAmount);

  const validateAddress = () => {
    if (!token) {
      navigate("/login");
      return null;
    }
    if (!cart.length) {
      toast.error("Cart is empty");
      return null;
    }
    if (!address.name.trim()) {
      toast.error("Please enter recipient name");
      return null;
    }
    if (!address.phone || address.phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid phone number");
      return null;
    }
    if (!address.line1.trim()) {
      toast.error("Please enter house/flat and street");
      return null;
    }
    if (!address.city.trim()) {
      toast.error("Please enter city");
      return null;
    }
    if (!address.state.trim()) {
      toast.error("Please enter state");
      return null;
    }
    if (!address.pincode || address.pincode.replace(/\D/g, "").length < 6) {
      toast.error("Please enter a valid pincode");
      return null;
    }

    return {
      name: address.name.trim(),
      phone: address.phone.trim(),
      line1: address.line1.trim(),
      line2: address.line2.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: address.pincode.trim()
    };
  };

  const placeCODOrder = async (shippingAddress) => {
    const { data } = await axios.post(
      "/orders",
      {
        paymentMethod: "COD",
        shippingAddress,
        customerNote: customerNote.trim(),
        couponCode: couponResult?.code || ""
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await fetchCart();
    toast.success(data.message || "Order placed");
    navigate("/order-success", {
      state: { orderId: data.order?._id, paymentMethod: "COD" }
    });
  };

  const placeRazorpayOrder = async (shippingAddress) => {
    if (!razorpayKey) {
      toast.error("Razorpay key not configured");
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Could not load Razorpay. Check your connection.");
      return;
    }

    const { data } = await axios.post(
      "/orders/create",
      {
        shippingAddress,
        customerNote: customerNote.trim(),
        couponCode: couponResult?.code || ""
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const razorpayOrder = data.razorpayOrder;
    const order = data.order;

    const rzp = new window.Razorpay({
      key: razorpayKey,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: "Mrigmaya Saree",
      description: order?.items?.[0]?.product?.name || "Saree order",
      order_id: razorpayOrder.id,
      prefill: {
        name: shippingAddress.name,
        contact: shippingAddress.phone
      },
      handler: async (response) => {
        try {
          await axios.post(
            "/orders/verify",
            {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          await fetchCart();
          toast.success("Payment success");
          navigate("/order-success", {
            state: { orderId: order?._id, paymentMethod: "RAZORPAY" }
          });
        } catch (err) {
          console.error(err);
          toast.error("Payment verification failed. Contact support if charged.");
        }
      },
      modal: {
        ondismiss: () => {
          toast.error("Payment cancelled. You can try again.");
        }
      }
    });

    rzp.open();
  };

  const placeOrder = async () => {
    const shippingAddress = validateAddress();
    if (!shippingAddress) return;
    if (couponResult && !couponResult.code) {
      setCouponResult(null);
    }
    try {
      setPlacing(true);
      if (paymentMethod === "UPI") {
        await placeRazorpayOrder(shippingAddress);
      } else {
        await placeCODOrder(shippingAddress);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Enter a coupon code");
      return;
    }
    setApplyingCoupon(true);
    try {
      const { data } = await axios.post(
        "/coupons/apply",
        { code: couponCode.trim(), amount: total },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCouponResult(data);
      toast.success(`Coupon applied: -Rs. ${formatPrice(data.discount)}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Coupon not valid");
      setCouponResult(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const clearCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
  };

  if (!cart.length) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="mt-4 text-gray-500">Your cart is empty. Add sarees to continue.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Checkout</p>
        <h1 className="text-3xl font-semibold text-gray-900">Ready to place order?</h1>
        <p className="text-gray-500 mt-2">
          Select a payment option and confirm. You will receive order updates on WhatsApp/SMS.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          {["Shipping", "Payment", "Review"].map((step, idx) => (
            <div
              key={step}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border ${
                idx === 0
                  ? "bg-[var(--primary-soft)]/40 border-[var(--primary-soft)] text-[var(--ink)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--muted)]"
                }`}
              >
                {idx + 1}
              </span>
              {step}
            </div>
          ))}
        </div>
      </header>

      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Your cart</h2>
        {cart.map((item) => (
          <div key={item.product?._id} className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-gray-900">{item.product?.name}</p>
              <p className="text-gray-500">Qty: {item.quantity}</p>
            </div>
            <span className="font-semibold text-gray-900">
              Rs.{" "}
              {formatPrice((item.product?.discountPrice || item.product?.price || 0) * item.quantity)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t pt-3 font-semibold text-gray-900">
          <span>Subtotal</span>
          <span>Rs. {formatPrice(total)}</span>
        </div>

        <div className="border rounded-xl p-3 bg-[#f8f5ff]">
          <label className="text-sm font-semibold text-gray-900">Have a coupon?</label>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter code (e.g. FIRST200)"
              className="border rounded-xl px-3 py-2 flex-1"
            />
            <div className="flex gap-2">
              <button
                onClick={applyCoupon}
                disabled={applyingCoupon}
                className="bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-70"
              >
                {applyingCoupon ? "Applying..." : "Apply"}
              </button>
              {couponResult && (
                <button onClick={clearCoupon} className="border border-gray-200 px-4 py-2 rounded-xl text-sm">
                  Remove
                </button>
              )}
            </div>
          </div>
          {couponResult && (
            <p className="text-xs text-emerald-600 mt-2">
              Applied {couponResult.code}: -Rs. {formatPrice(couponResult.discount)}
            </p>
          )}
        </div>

        {couponDiscount > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-700">
            <span>Coupon discount</span>
            <span>-Rs. {formatPrice(couponDiscount)}</span>
          </div>
        )}
        {paymentMethod === "UPI" && (
          <div className="flex items-center justify-between text-xs text-emerald-600">
            <span>Pay now discount (10%)</span>
            <span>-Rs. {formatPrice(discountAmount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t pt-3 font-semibold text-gray-900">
          <span>Total payable</span>
          <span>Rs. {formatPrice(payableTotal)}</span>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Delivery details</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Full name</label>
            <input
              value={address.name}
              onChange={(e) => setAddress((prev) => ({ ...prev, name: e.target.value }))}
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="Recipient name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Phone</label>
            <input
              value={address.phone}
              onChange={(e) =>
                setAddress((prev) => ({
                  ...prev,
                  phone: e.target.value.replace(/[^0-9+ ]/g, "")
                }))
              }
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="10-digit mobile"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-gray-600">Address</label>
            <input
              value={address.line1}
              onChange={(e) => setAddress((prev) => ({ ...prev, line1: e.target.value }))}
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="House / Flat, Street"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-gray-600">Landmark (optional)</label>
            <input
              value={address.line2}
              onChange={(e) => setAddress((prev) => ({ ...prev, line2: e.target.value }))}
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="Near temple, mall, etc."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-600">City</label>
            <input
              value={address.city}
              onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="City"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-600">State</label>
            <input
              value={address.state}
              onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="State"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Pincode</label>
            <input
              value={address.pincode}
              onChange={(e) =>
                setAddress((prev) => ({
                  ...prev,
                  pincode: e.target.value.replace(/[^0-9]/g, "")
                }))
              }
              className="border rounded-xl px-3 py-2 w-full"
              placeholder="6-digit pincode"
              maxLength={6}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-gray-600">Delivery note (optional)</label>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full"
              rows={2}
              placeholder="Gate code or delivery instructions"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Payment method</h2>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">UPI accepted</span>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">COD available</span>
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">Secure Razorpay checkout</span>
        </div>
        <div className="space-y-3">
          {paymentOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 border rounded-2xl px-4 py-3 cursor-pointer hover:border-pink-200"
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === option.value}
                onChange={() => setPaymentMethod(option.value)}
              />
              <div>
                <p className="font-semibold text-gray-900">{option.label}</p>
                {option.value === "UPI" && (
                  <p className="text-xs text-gray-500">
                    Pay now and get 10% instant discount. We will open your phone&apos;s UPI app with the payable
                    amount.
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
        <button
          onClick={placeOrder}
          disabled={placing}
          className="w-full bg-pink-600 text-white px-4 py-3 rounded-full font-semibold disabled:opacity-70"
        >
          {placing ? "Placing order..." : `Place order (Rs. ${formatPrice(payableTotal)})`}
        </button>
        {paymentMethod === "COD" ? (
          <p className="text-xs text-gray-500 text-center">
            Pay cash or UPI to the courier when your saree arrives.
          </p>
        ) : (
          <p className="text-xs text-gray-500 text-center">
            10% instant discount applied. After tapping place order we open the UPI app. Complete the payment to
            confirm.
          </p>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-gray-600 justify-center pt-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            Delivery estimate: 4-7 business days
          </span>
          <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
            Free 7-day returns
          </span>
        </div>
      </section>
    </div>
  );
}
