import { Link, useNavigate } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import CartDrawer from "./CartDrawer";
import logo from "../assets/logo.png";
import axios from "../api/axios";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const navigate = useNavigate();
  const [openDrawer, setOpenDrawer] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState([]);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const cartCount = cart?.length || 0;
 
   useEffect(() => {
     let active = true;
     axios
       .get("/home-sections")
       .then((res) => {
         if (!active) return;
         const items = (res.data || [])
           .filter((section) => section.group === "category" && section.active !== false)
           .map((section) => section.title)
           .filter(Boolean);
         setCategories(Array.from(new Set(items)));
       })
       .catch(() => {});
     return () => {
       active = false;
     };
   }, []);
 
   useEffect(() => {
     const handleClickOutside = (event) => {
       if (
         !menuRef.current ||
         menuRef.current.contains(event.target) ||
         (triggerRef.current && triggerRef.current.contains(event.target))
       ) {
         return;
       }
       setShowMenu(false);
       setShowCategories(false);
     };
 
     const handleEsc = (event) => {
       if (event.key === "Escape") {
         setShowMenu(false);
         setShowCategories(false);
       }
     };
 
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const suggestionList = (searchTerm
    ? categories.filter((item) => item.toLowerCase().includes(searchTerm.toLowerCase()))
    : categories
  ).slice(0, 6);

  const selectSuggestion = (text) => {
    setSearchTerm(text);
    navigate(`/products?search=${encodeURIComponent(text)}`);
    setShowSuggestions(false);
  };

  return (
    <>
      <nav className="main-nav relative z-40">
        <div className="nav-inner nav-hero-shell px-4 sm:px-5 py-4 lg:py-6">
          <Link to="/" className="brand-wrap brand-wrap--stacked nav-hero__brand">
            <span className="brand-mark">
              <img src={logo} alt="Mrigmaya logo" className="brand-logo" />
            </span>
            <span className="brand-tagline">Handcrafted sarees · couture drapes</span>
          </Link>

          <div className="nav-links nav-links--hero nav-hero__links text-sm font-semibold">
            <Link className="nav-link" to="/products">
              Products
            </Link>

            <button
              onClick={() => setOpenDrawer(true)}
              className="pill-button secondary hover:-translate-y-0.5"
              aria-label="Open cart"
            >
              <span>Cart</span>
              <span className="badge-soft">{cartCount}</span>
            </button>

             <div className="nav-menu-wrapper" ref={menuRef}>
               <button
                 className="nav-menu-trigger"
                 ref={triggerRef}
                 onClick={() => setShowMenu((prev) => !prev)}
                 aria-haspopup="true"
                 aria-expanded={showMenu}
                 aria-label="Open menu"
               >
                 <span className="nav-menu-dot" />
                 <span className="nav-menu-dot" />
                 <span className="nav-menu-dot" />
               </button>

               {showMenu && (
                 <div className="nav-menu-panel">
                   {user && (
                     <p className="nav-menu-greeting">Hi {user.name || user.email || user.mobile}</p>
                   )}

                   {user && (
                     <Link className="nav-menu-item" to="/orders" onClick={() => setShowMenu(false)}>
                       My Orders
                     </Link>
                   )}

                   <button
                     className="nav-menu-item nav-menu-item--nested"
                     onClick={() => setShowCategories((prev) => !prev)}
                     aria-expanded={showCategories}
                     aria-haspopup="true"
                   >
                     <span>Categories</span>
                     <span className="nav-menu-caret">{showCategories ? "−" : "+"}</span>
                   </button>

                   {showCategories && (
                     <div className="nav-menu-sublist">
                       {categories.length === 0 && <span className="nav-menu-empty">No categories yet</span>}
                       {categories.map((item) => (
                         <Link
                           key={item}
                           className="nav-menu-subitem"
                           to={`/products?category=${encodeURIComponent(item)}`}
                           onClick={() => {
                             setShowMenu(false);
                             setShowCategories(false);
                           }}
                         >
                           {item}
                         </Link>
                       ))}
                     </div>
                   )}

                   {user ? (
                     <button
                       className="nav-menu-item nav-menu-item--danger"
                       onClick={() => {
                         logout();
                         setShowMenu(false);
                         setShowCategories(false);
                       }}
                     >
                       Logout
                     </button>
                   ) : (
                     <Link className="nav-menu-item" to="/login" onClick={() => setShowMenu(false)}>
                       Login
                     </Link>
                   )}
                </div>
              )}
             </div>
          </div>

          <form
            className="nav-search nav-search--hero nav-hero__search"
            onSubmit={(e) => {
              e.preventDefault();
              const query = searchTerm.trim();
              navigate(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
            }}
          >
            <div className="nav-search__wrap">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                placeholder="Search styles, colors, occasions"
                className="nav-search__input"
              />
              <button type="submit" className="nav-search__button" aria-label="Search">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <circle cx="11" cy="11" r="6" />
                  <line x1="16" y1="16" x2="21" y2="21" />
                </svg>
              </button>
            </div>
            {showSuggestions && suggestionList.length > 0 && (
              <div className="nav-search__suggestions">
                {suggestionList.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className="nav-search__suggestion"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(item);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </nav>

      <CartDrawer open={openDrawer} close={() => setOpenDrawer(false)} />
    </>
  );
}
