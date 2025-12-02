import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { Link } from "react-router-dom";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    value || 0
  );

export default function Cart() {
  const { cart } = useContext(CartContext);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Your Cart</h1>
      {!cart || cart.length === 0 ? (
        <p className="mt-4">
          Your cart is empty.{" "}
          <Link to="/products" className="text-pink-600">
            Shop now
          </Link>
        </p>
      ) : (
        <>
          {cart.map((item) => (
            <div
              key={item._id || item.product._id}
              className="flex gap-4 border p-3 mt-2 bg-white rounded-xl"
            >
              <img
                src={
                  item.product.images?.[0] ||
                  "https://placehold.co/120x150?text=Item"
                }
                className="w-20 h-20 object-cover rounded"
                alt={item.product.name}
              />
              <div>
                <h2 className="font-semibold">{item.product.name}</h2>
                <p>Qty: {item.quantity}</p>
                <p>
                  Price: Rs.{" "}
                  {formatPrice(
                    item.product.discountPrice || item.product.price
                  )}
                </p>
              </div>
            </div>
          ))}
          <Link
            to="/checkout"
            className="inline-block bg-pink-600 text-white px-4 py-2 mt-4 rounded"
          >
            Proceed to Checkout
          </Link>
        </>
      )}
    </div>
  );
}
