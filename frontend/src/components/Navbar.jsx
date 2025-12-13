import { Link } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import CartDrawer from "./CartDrawer";
import logo from "../assets/logo.png";
import axios from "../api/axios";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const [openDrawer, setOpenDrawer] = useState(false);
   const [showMenu, setShowMenu] = useState(false);
   const [showCategories, setShowCategories] = useState(false);
   const [categories, setCategories] = useState([]);
   const menuRef = useRef(null);
   const triggerRef = useRef(null);

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

  return (
    <>
      <nav className="main-nav relative z-40">
        <div className="nav-inner w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-6 relative">
          <Link to="/" className="brand-wrap brand-floating flex items-center">
            <span className="brand-mark">
              <img src={logo} alt="Mrigmaya logo" className="brand-logo" />
            </span>
          </Link>

          <div className="nav-search flex-1 flex justify-center">
            <input
              type="text"
              placeholder="Search styles, colors, occasions…"
              className="nav-search__input"
            />
          </div>

          <div className="flex items-center gap-4 text-sm font-semibold ml-auto nav-links">
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
        </div>
      </nav>

      <CartDrawer open={openDrawer} close={() => setOpenDrawer(false)} />
    </>
  );
}
