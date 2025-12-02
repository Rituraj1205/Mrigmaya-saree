import { Link } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import CartDrawer from "./CartDrawer";
import logo from "../assets/flogo-removebg-preview.png";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("theme") : null;
    if (saved === "dark" || saved === "light") return saved;
    const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  const cartCount = cart?.length || 0;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-gradient-to-b from-[var(--surface)]/95 via-[var(--surface)]/90 to-[var(--surface-muted)]/88 backdrop-blur-xl border-b border-[var(--border)] shadow-[0_16px_50px_rgba(24,16,10,0.12)] relative overflow-hidden">
        <div className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" aria-hidden />
        <div className="absolute -left-14 top-2 h-28 w-28 rounded-full bg-[var(--primary-soft)] blur-3xl opacity-70" aria-hidden />
        <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-[var(--accent)] blur-2xl opacity-60" aria-hidden />

        <div className="w-full max-w-[1400px] mx-auto px-5 sm:px-8 py-3 flex items-center justify-between gap-4 relative z-10">
          <Link to="/" className="flex items-center gap-3 text-lg font-semibold text-[var(--ink)] lift-on-hover">
            <span className="brand-mark">
              <img src={logo} alt="Mrigmaya Sarees logo" className="brand-logo" />
            </span>
            <span className="leading-tight">
              <span className="brand-name">Mrigmaya Saree</span>
              <span className="brand-subtitle">Surat couture drapes</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 text-sm font-semibold ml-auto">
            <Link className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors" to="/products">
              Products
            </Link>
            {user && (
              <Link className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors" to="/orders">
                My Orders
              </Link>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="pill-button secondary hover:-translate-y-0.5"
              aria-label="Toggle theme"
              title="Toggle light/dark"
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>

            <button
              onClick={() => setOpenDrawer(true)}
              className="pill-button secondary hover:-translate-y-0.5"
              aria-label="Open cart"
            >
              <span>Cart</span>
              <span className="badge-soft">{cartCount}</span>
            </button>

            {user ? (
              <>
                <span className="hidden sm:block text-[var(--muted)]">
                  Hi {user.name || user.email || user.mobile}
                </span>
                <button onClick={logout} className="pill-button">
                  Logout
                </button>
              </>
            ) : (
              <Link className="pill-button" to="/login">
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      <CartDrawer open={openDrawer} close={() => setOpenDrawer(false)} />
    </>
  );
}
