# Admin Working (Mrigmaya)

## 1) Admin login
- URL: `/admin/login`
- Email/Password backend se aata hai.
  - `backend/.env` me `ADMIN_EMAIL` aur `ADMIN_PASSWORD` set rahega.
  - Agar env set nahi hai to code me fallback default hai (production me avoid karein).
- Login ke baad admin dashboard `/admin` open hota hai.

## 2) Collections (Homepage Sections)
- Tab: **Collections**
- Form me:
  - Title (required)
  - Slug (unique) — title se auto ban jata hai, aap manual bhi edit kar sakte ho
  - Subtitle, CTA Label
  - Hero image URL
  - Accent color (hex)
  - Priority (lower number = upar show)
  - Display on homepage (checkbox)
  - Description
- `Create collection` dabane se collection add ho jata hai.
- Niche list me:
  - **Edit / Save** (CollectionCard)
  - **Delete**
  - **Hero image upload**
  - **Gallery upload** (multiple images)
  - **Products attach** (CollectionProductManager)

## 3) Products
- Tab: **Products**
- Important fields:
  - Product name, internal code
  - Category (dropdown + display label)
  - Fabric, colors (multi), sizes (suit ke liye)
  - Price (MRP) + Selling price
  - Stock, delivery time
  - Images (multiple URLs, newline/comma se)
  - Video (optional)
- `Create product` / `Update product` se save hoga.
- **Attach to homepage collections** me select karke product collections me add hota hai.

## 4) Homepage Slider
- Tab: **Homepage Slider**
- Hero slides create/edit karo.
- Order (number) se display order control hota hai.

## 5) Offers Rail
- Tab: **Offers Rail**
- Offer cards add/update/delete.
- Order se scroll order control hota hai.

## 6) Coupons
- Tab: **Coupons**
- Coupon code, discount type (flat/percent), value, max discount, expiry, min order value set karo.
- Enable/Disable and delete available hai.

## 7) Orders
- Tab: **Orders**
- Status update: processing/packed/shipped/delivered/cancelled
- Payment status update
- Tracking URL add karo
- Invoice download available

## 8) Returns
- Tab: **Returns**
- Customer return requests dikhenge
- Status update + note add kar sakte ho
- Return images view karo

## 9) Login visuals
- Tab: **Login visuals**
- Login page ke left/right images update kar sakte ho.
- Image blank rakho to hide ho jayega.

## 10) Payments (COD toggle)
- Code me panel hai, lekin tab currently hide/commented ho sakta hai.
- Agar enable karna ho, dev se tab add karwao.
- COD on/off backend settings me save hota hai.

## 11) Upload notes (important)
- Agar `CLOUDINARY_URL` set hai, uploads Cloudinary pe jayenge (recommended).
- Agar Cloudinary nahi hai to files `backend/uploads` me save hoti hain (server restart/cleanup se loss ho sakta hai).
- Max upload size 50MB.

## 12) Logout
- Admin dashboard me logout button use karein (top bar/side menu).
- Agar token cache clear karna ho to browser se site data clear karke login fresh karein.
