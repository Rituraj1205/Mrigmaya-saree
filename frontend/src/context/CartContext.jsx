import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "../api/axios";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const CartContext = createContext();

const shapeCart = (payload) => payload?.items || [];

export function CartProvider({ children }) {
  const { token } = useContext(AuthContext);
  const [cart, setCart] = useState([]);

  const authConfig = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` }
    }),
    [token]
  );

  const fetchCart = async () => {
    if (!token) {
      setCart([]);
      return;
    }
    try {
      const res = await axios.get("/cart", authConfig);
      setCart(shapeCart(res.data));
    } catch (err) {
      console.error("fetchCart", err);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [token]);

  const mutateCart = async (url, body, successMsg) => {
    if (!token) return (window.location.href = "/login");
    const res = await axios.post(url, body, authConfig);
    setCart(shapeCart(res.data));
    if (successMsg) toast.success(successMsg);
    return res.data;
  };

  const addToCart = (productId) =>
    mutateCart("/cart/add", { productId, quantity: 1 }, "Added to cart");

  const increaseQty = (productId) => {
    const target = cart.find((item) => item.product?._id === productId);
    if (!target) return;
    return mutateCart("/cart/update", {
      productId,
      quantity: target.quantity + 1
    }, "Updated quantity");
  };

  const decreaseQty = (productId) => {
    const target = cart.find((item) => item.product?._id === productId);
    if (!target) return;
    const nextQty = target.quantity - 1;
    if (nextQty < 1) return removeFromCart(productId);
    return mutateCart("/cart/update", { productId, quantity: nextQty }, "Updated quantity");
  };

  const removeFromCart = (productId) =>
    mutateCart("/cart/remove", { productId }, "Removed from cart");

  return (
    <CartContext.Provider
      value={{ cart, fetchCart, addToCart, increaseQty, decreaseQty, removeFromCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
