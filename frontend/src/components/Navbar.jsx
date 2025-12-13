import { Link } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import CartDrawer from "./CartDrawer";
import logo from "../assets/logo.png";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const [openDrawer, setOpenDrawer] = useState(false);

  const cartCount = cart?.length || 0;

  return (
    <>
      <nav className="main-nav vertical-nav relative z-40">
        <Link to="/" className="brand-wrap flex items-center justify-center">
          <span className="brand-mark">
            <img src={logo} alt="Mrigmaya logo" className="brand-logo" />
          </span>
        </Link>

        <div className="nav-items flex flex-col items-center gap-3 text-sm font-semibold">
          <Link className="nav-link" to="/products">
            Products
          </Link>
          {user && (
            <Link className="nav-link" to="/orders">
              My Orders
            </Link>
          )}

          <button
            onClick={() => setOpenDrawer(true)}
            className="pill-button secondary w-full text-center hover:-translate-y-0.5"
            aria-label="Open cart"
          >
            <span>Cart</span>
            <span className="badge-soft">{cartCount}</span>
          </button>

          {user ? (
            <>
              <span className="text-[var(--muted)] text-xs">
                Hi {user.name || user.email || user.mobile}
              </span>
              <button onClick={logout} className="pill-button w-full">
                Logout
              </button>
            </>
          ) : (
            <Link className="pill-button w-full text-center" to="/login">
              Login
            </Link>
          )}
        </div>
      </nav>

      <CartDrawer open={openDrawer} close={() => setOpenDrawer(false)} />
    </>
  );
}
