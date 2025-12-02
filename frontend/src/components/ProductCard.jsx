import { Link } from "react-router-dom";

export default function ProductCard({ item }) {
  const img = item.images?.[0] || "/placeholder.png";
  return (
    <Link
      to={`/product/${item._id}`}
      className="block card-shell border border-[var(--border)] p-4 shadow-sm hover:-translate-y-1 transition"
    >
      <div className="h-44 w-full rounded-2xl overflow-hidden bg-[var(--surface-muted)]">
        <img src={img} className="h-full w-full object-cover" alt={item.name} loading="lazy" decoding="async" />
      </div>
      <h2 className="font-semibold mt-3 text-[var(--ink)] line-clamp-2">{item.name}</h2>
      <p className="text-[var(--primary)] font-bold mt-1">Rs. {item.price}</p>
    </Link>
  );
}
