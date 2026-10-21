import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import ProductCard from "./ProductCard";
import "./Shop.css";

function Shop() {
  // =========================================================
  // PRODUCTS
  // =========================================================

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // CATEGORY
  // =========================================================

  const [activeCategory, setActiveCategory] =
    useState("All");

  const categories = [
    "All",
    "Agbada",
    "Caftan",
    "Senator",
    "Native Wear",
    "Materials",
  ];

  // =========================================================
  // LOAD PRODUCTS FROM MONGODB
  // =========================================================

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest(
          "/products"
        );

        setProducts(data.products || []);
      } catch (error) {
        console.error(
          "ABS CUT products error:",
          error
        );

        setError(
          error.message ||
          "Unable to load products."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // =========================================================
  // FILTER PRODUCTS
  // =========================================================

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter(
          (product) =>
            product.category === activeCategory
        );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="shop-page">

      {/* =========================
          SHOP HEADER
          ========================= */}

      <section className="shop-header">

        <p>ABS CUT COLLECTION</p>

        <h1>Shop Our Collection</h1>

        <span>
          Discover ready-to-wear fashion and premium
          native styles.
        </span>

      </section>


      {/* =========================
          CATEGORIES
          ========================= */}

      <section className="categories">

        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={
              activeCategory === category
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveCategory(category)
            }
          >
            {category}
          </button>
        ))}

      </section>


      {/* =========================
          PRODUCTS
          ========================= */}

      <section className="products">

        {/* =========================
            LOADING
            ========================= */}

        {loading && (
          <div className="shop-empty">

            <h2>Loading Products</h2>

            <p>
              Please wait while we load the
              ABS CUT collection.
            </p>

          </div>
        )}


        {/* =========================
            ERROR
            ========================= */}

        {!loading && error && (
          <div className="shop-empty">

            <h2>Unable to Load Products</h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
            >
              TRY AGAIN
            </button>

          </div>
        )}


        {/* =========================
            PRODUCTS
            ========================= */}

        {!loading &&
          !error &&
          filteredProducts.length > 0 && (

            filteredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
              />
            ))

          )}


        {/* =========================
            EMPTY CATEGORY
            ========================= */}

        {!loading &&
          !error &&
          filteredProducts.length === 0 && (

            <div className="shop-empty">

              <h2>No Products Found</h2>

              <p>
                There are currently no products
                in the {activeCategory} category.
              </p>

              <button
                type="button"
                onClick={() =>
                  setActiveCategory("All")
                }
              >
                VIEW ALL PRODUCTS
              </button>

            </div>

          )}

      </section>

    </main>
  );
}

export default Shop;