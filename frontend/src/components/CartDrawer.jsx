import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";
import { useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
const ASSET_BASE = API_BASE.replace(/\/api\/?$/, "");
const FALLBACK_IMAGE = "https://placehold.co/120x150?text=Saree";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0);

const getTotal = (items = []) =>
  items.reduce(
    (sum, item) => sum + ((item.product?.discountPrice || item.product?.price || 0) * item.quantity),
    0
  );

const resolveImage = (product) => {
  const raw = product?.images?.[0];
  if (!raw) return FALLBACK_IMAGE;
  if (raw.startsWith("http")) return raw;
  return `${ASSET_BASE}${raw}`;
};

export default function CartDrawer({ open, close }) {
  const { cart, increaseQty, decreaseQty, removeFromCart } = useCart();
  const cartItems = cart || [];
  const total = getTotal(cartItems);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-50 transition duration-200 ${open ? "bg-black/50 backdrop-blur-sm" : "pointer-events-none bg-transparent"}`}
      role="presentation"
      onClick={close}
    >
      <div
        className={`absolute top-0 right-0 h-full w-11/12 sm:w-[420px] bg-white shadow-2xl border-l border-[var(--border)] rounded-l-[28px] px-5 py-6 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="muted-label">Your bag</p>
            <h2 className="text-xl font-semibold text-[var(--ink)]">Mrigmaya Saree</h2>
          </div>
          <button
            onClick={close}
            className="w-9 h-9 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--muted)] transition"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        <div className="mt-4 p-4 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface-muted)] to-white shadow-sm">
          <div className="flex items-center gap-2">
            <span className="badge-soft">Offer</span>
            <p className="text-sm text-[var(--ink)] font-semibold">Free gold box on orders above Rs.12,000</p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[#f0e4e7] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6c2f63] to-[#d9a6b0]"
              style={{ width: `${Math.min((total / 12000) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--muted)] mt-2">
            <span>Gift bag</span>
            <span>Gold box</span>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center text-[var(--muted)] mt-8">Your cart is empty</div>
        ) : (
          <>
            <div className="mt-5 space-y-4 max-h-[52vh] overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div
                  key={item._id}
                  className="flex gap-3 p-3 border border-[var(--border)] rounded-2xl bg-[var(--surface)] shadow-sm hover:shadow-md transition"
                >
                  <img
                    src={resolveImage(item.product)}
                    alt={item.product?.name}
                  className="w-20 h-24 object-cover rounded-xl bg-[var(--surface-muted)]"
                  loading="lazy"
                  decoding="async"
                />

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--ink)] line-clamp-2">
                        {item.product?.name}
                      </p>
                      <p className="text-xs text-[var(--muted)] whitespace-nowrap">
                        Rs. {formatPrice(item.product?.discountPrice || item.product?.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decreaseQty(item.product?._id)}
                        className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--muted)] transition"
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold text-[var(--ink)]">{item.quantity}</span>
                      <button
                        onClick={() => increaseQty(item.product?._id)}
                        className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--muted)] transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    className="text-[var(--muted)] hover:text-[var(--ink)]"
                    onClick={() => removeFromCart(item.product?._id)}
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 mt-6 border-t border-[var(--border)] pt-4 space-y-3 bg-white">
              <div className="flex justify-between text-base font-semibold text-[var(--ink)]">
                <span>Total</span>
                <span>Rs. {formatPrice(total)}</span>
              </div>
              <Link
                to="/checkout"
                className="w-full text-center pill-button justify-center"
                onClick={close}
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
