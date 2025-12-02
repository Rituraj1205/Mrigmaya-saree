import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function OrderSuccess() {
  const { state } = useLocation();
  const paymentMethod = state?.paymentMethod || "COD";
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (!state?.upiIntent) return;
    try {
      await navigator.clipboard.writeText(state.upiIntent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="p-6 text-center space-y-4">
      <h1 className="text-3xl font-bold text-gray-900">Order placed!</h1>
      {state?.orderId && (
        <p className="text-sm text-gray-500">
          Order reference: <span className="font-semibold">#{state.orderId.slice(-6)}</span>
        </p>
      )}
      {paymentMethod === "UPI" ? (
        <p className="text-gray-600">
          We tried to open your UPI app. If it didn’t pop up, tap pay now below or paste the UPI link
          into GPay / PhonePe / BHIM.
        </p>
      ) : (
        <p className="text-gray-600">Keep cash or UPI ready. Pay safely to the courier.</p>
      )}

      {state?.upiIntent && paymentMethod === "UPI" && (
        <div className="space-y-2">
          <a
            href={state.upiIntent}
            className="inline-flex items-center justify-center bg-pink-600 text-white px-6 py-2 rounded-full font-semibold"
          >
            Pay now via UPI
          </a>
          <p className="text-xs text-gray-500 break-all">{state.upiIntent}</p>
          <button
            type="button"
            onClick={copyLink}
            className="text-xs text-pink-600 font-semibold underline"
          >
            {copied ? "Copied link" : "Copy UPI link"}
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 pt-4">
        <Link to="/products" className="text-pink-600 font-semibold">
          Continue shopping
        </Link>
        <Link to="/" className="text-sm text-gray-500">
          Back to home
        </Link>
      </div>
    </div>
  );
}
