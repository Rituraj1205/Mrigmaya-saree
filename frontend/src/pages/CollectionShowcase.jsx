import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../api/axios";
import BrandLoader from "../components/BrandLoader";
import { setPageMeta } from "../utils/seo";
import { buildAssetUrl } from "../utils/apiBase";

const formatPrice = (value) =>
  `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value || 0)}`;
const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAD/ACw=";

const resolveAsset = (url, fallback) => buildAssetUrl(url, fallback);

const fallbackImage = BLANK_IMG;

export default function CollectionShowcase() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setPageMeta({
      title: `Mrigmaya | Collection ${slug}`,
      description: "Curated saree edits from Mrigmaya with handcrafted silhouettes and concierge support."
    });
  }, [slug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    axios
      .get(`/collections/slug/${slug}`)
      .then((res) => {
        if (!active) return;
        // Redirect to the main products page with collection filter applied
        navigate(`/products?collectionSlug=${res.data?.slug || slug}`, { replace: true });
        setCollection(res.data);
        setError("");
      })
      .catch(() => active && setError("This edit is not available right now."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#fefbfe] px-4">
        <BrandLoader message="Curating the Mrigmaya edit..." />
      </div>
    );
  }

  if (!collection || error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center text-gray-500 space-y-4">
        <p>{error || "Collection not found"}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-semibold">
            Back to home
          </Link>
          <Link to="/products" className="px-4 py-2 rounded-full bg-pink-600 text-white text-sm font-semibold">
            View all products
          </Link>
        </div>
      </div>
    );
  }

  const heroImage = resolveAsset("", fallbackImage);
  const description = collection.description || collection.subtitle;

  return (
    <div className="bg-[#fefbfe] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 lg:px-0 py-10 space-y-8">
        {/* Hero hidden for collection page; we redirect to products with filter */}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              {collection.products?.length || 0} styles ready to ship
            </h2>
            <Link to="/products" className="text-sm text-pink-600 font-semibold">
              Browse all products
            </Link>
          </div>
          {collection.products?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {collection.products.map((product) => (
                <Link
                  key={product._id}
                  to={`/product/${product._id}`}
                  className="bg-white rounded-[28px] border border-gray-100 shadow-sm hover:-translate-y-1 transition flex flex-col"
                >
                  <div className="relative h-64 rounded-t-[28px] overflow-hidden">
                    <img
                      src={resolveAsset(product.images?.[0], fallbackImage)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {product.discountPrice && product.price && (
                      <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        -
                        {Math.round(
                          ((product.price - product.discountPrice) / product.price) * 100
                        )}
                        %
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col">
                    <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400">
                      {product.category || collection.title}
                    </p>
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm mt-auto">
                      <span className="text-lg font-semibold text-gray-900">
                        {formatPrice(product.discountPrice || product.price)}
                      </span>
                      {product.discountPrice && (
                        <span className="text-gray-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-10 text-center text-gray-400">
              No styles are linked to this edit yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
