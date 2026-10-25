import { useEffect, useMemo, useState } from "react";
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
  // SHOP CONTROLS
  // =========================================================

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const categories = [
    "All",
    "Agbada",
    "Caftan",
    "Senator",
    "Native Wear",
    "Materials",
  ];

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/products");

      if (!data.success && !Array.isArray(data.products)) {
        throw new Error(data.message || "Unable to load products.");
      }

      const loadedProducts = data.products || [];

      setProducts(loadedProducts);

      // Keep the selected product synchronized with fresh data.
      setSelectedProduct((current) => {
        if (!current) return null;

        return (
          loadedProducts.find((product) => product._id === current._id) || null
        );
      });
    } catch (err) {
      console.error("ABS CUT products error:", err);
      setError(err.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // =========================================================
  // PRICE FORMAT
  // =========================================================

  const formatPrice = (price) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);

  // =========================================================
  // SEARCH + CATEGORY FILTER
  // =========================================================

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    let result = products.filter((product) => {
      const matchesCategory =
        activeCategory === "All" ||
        product.category?.toLowerCase() === activeCategory.toLowerCase();

      const matchesSearch =
        !search ||
        [
          product.name,
          product.category,
          product.description,
          product.type,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(search),
        );

      return matchesCategory && matchesSearch;
    });

    result = [...result];

    if (sortBy === "price-low") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return result;
  }, [products, activeCategory, searchTerm, sortBy]);

  // =========================================================
  // SELECT PRODUCT
  // =========================================================

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);

    // Bring the selected product section into view.
    requestAnimationFrame(() => {
      document.getElementById("selected-shop-product")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // =========================================================
  // RELATED PRODUCTS
  // Same category OR matching product name
  // =========================================================

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];

    const selectedName = (selectedProduct.name || "").trim().toLowerCase();

    return products.filter((product) => {
      if (product._id === selectedProduct._id) return false;

      const sameCategory =
        Boolean(selectedProduct.category) &&
        product.category?.toLowerCase() ===
          selectedProduct.category.toLowerCase();

      const productName = (product.name || "").trim().toLowerCase();

      const sameName =
        Boolean(selectedName) &&
        (productName === selectedName ||
          productName.includes(selectedName) ||
          selectedName.includes(productName));

      return sameCategory || sameName;
    });
  }, [products, selectedProduct]);

  // =========================================================
  // DOWNLOAD PRODUCT IMAGE
  // =========================================================

  const handleDownloadImage = async () => {
    if (!selectedProduct?.image) return;

    try {
      const response = await fetch(selectedProduct.image);

      if (!response.ok) {
        throw new Error("Image download unavailable.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `${(selectedProduct.name || "abs-cut-product")
        .trim()
        .replace(/[^a-z0-9-_]+/gi, "-")}.jpg`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Product image download error:", err);

      // Cross-origin hosts may block downloads.
      // Open the original image so the customer can save it.
      window.open(selectedProduct.image, "_blank", "noopener,noreferrer");
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="shop-page">
      <section className="shop-header">
        <p>ABS CUT COLLECTION</p>
        <h1>Shop Our Collection</h1>
        <span>Discover ready-to-wear fashion and premium native styles.</span>
      </section>

      {/* CATEGORY FILTERS */}
      <section className="categories" aria-label="Product categories">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? "active" : ""}
            aria-pressed={activeCategory === category}
            onClick={() => {
              setActiveCategory(category);
              setSelectedProduct(null);
            }}
          >
            {category}
          </button>
        ))}
      </section>

      {/* SEARCH AND SORT */}
      <section className="shop-toolbar">
        <label className="shop-search">
          <span>Search collection</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by product name, category..."
          />
        </label>

        <label className="shop-sort">
          <span>Sort by</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Product Name</option>
          </select>
        </label>
      </section>

      {/* LOADING */}
      {loading && (
        <div className="shop-empty">
          <h2>Loading Products</h2>
          <p>Please wait while we load the ABS CUT collection.</p>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="shop-empty">
          <h2>Unable to Load Products</h2>
          <p>{error}</p>
          <button type="button" onClick={loadProducts}>
            TRY AGAIN
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* SELECTED PRODUCT */}
          {selectedProduct && (
            <section
              className="selected-shop-product"
              id="selected-shop-product"
            >
              <div className="selected-product-heading">
                <div>
                  <p>YOUR SELECTED STYLE</p>
                  <h2>{selectedProduct.name}</h2>
                </div>

                <button type="button" onClick={() => setSelectedProduct(null)}>
                  BACK TO COLLECTION
                </button>
              </div>

              <div className="selected-product-layout">
                <div className="selected-product-media">
                  {selectedProduct.image ? (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                    />
                  ) : selectedProduct.video ? (
                    <video
                      src={selectedProduct.video}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="no-product-media">ABS CUT</div>
                  )}
                </div>

                <div className="selected-product-info">
                  <p className="selected-product-category">
                    {selectedProduct.category}
                  </p>

                  <h2>{selectedProduct.name}</h2>

                  <p className="selected-product-price">
                    {formatPrice(selectedProduct.price)}
                  </p>

                  {selectedProduct.description && (
                    <p>{selectedProduct.description}</p>
                  )}

                  <p>
                    <strong>Product Type:</strong>{" "}
                    {selectedProduct.category?.toLowerCase() === "materials"
                      ? "Material"
                      : "Ready to Wear"}
                  </p>

                  <p>
                    <strong>Availability:</strong>{" "}
                    {selectedProduct.stock > 0
                      ? `${selectedProduct.stock} available`
                      : "Out of Stock"}
                  </p>

                  {selectedProduct.image && (
                    <button
                      type="button"
                      className="download-product-image"
                      onClick={handleDownloadImage}
                    >
                      DOWNLOAD PRODUCT IMAGE
                    </button>
                  )}
                </div>
              </div>

              {/* RELATED PRODUCTS */}
              <div className="related-products-section">
                <p className="related-products-eyebrow">DISCOVER MORE</p>
                <h2>More {selectedProduct.category || "Similar"} Styles</h2>
                <p>
                  Explore other products in the same category or products with a
                  matching name.
                </p>

                {relatedProducts.length > 0 ? (
                  <div className="products related-products-grid">
                    {relatedProducts.map((product) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        onImageClick={() => handleSelectProduct(product)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="shop-empty">
                    <h3>No Related Products Yet</h3>
                    <p>
                      More matching styles will appear here when they are
                      available.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* MAIN COLLECTION */}
          <section className="shop-results">
            <div className="shop-results-heading">
              <h2>
                {selectedProduct ? "Explore the Collection" : "Our Products"}
              </h2>
              <span>
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "product" : "products"}
              </span>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="products">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onImageClick={() => handleSelectProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <div className="shop-empty">
                <h2>No Products Found</h2>
                <p>Try another search or choose a different category.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveCategory("All");
                  }}
                >
                  VIEW ALL PRODUCTS
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default Shop;

// import { useEffect, useState } from "react";
// import { apiRequest } from "../services/api";
// import ProductCard from "./ProductCard";
// import "./Shop.css";

// function Shop() {
//   // =========================================================
//   // PRODUCTS
//   // =========================================================

//   const [products, setProducts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // =========================================================
//   // CATEGORY
//   // =========================================================

//   const [activeCategory, setActiveCategory] =
//     useState("All");

//   const categories = [
//     "All",
//     "Agbada",
//     "Caftan",
//     "Senator",
//     "Native Wear",
//     "Materials",
//   ];

//   // =========================================================
//   // LOAD PRODUCTS FROM MONGODB
//   // =========================================================

//   useEffect(() => {
//     const loadProducts = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         const data = await apiRequest(
//           "/products"
//         );

//         setProducts(data.products || []);
//       } catch (error) {
//         console.error(
//           "ABS CUT products error:",
//           error
//         );

//         setError(
//           error.message ||
//           "Unable to load products."
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadProducts();
//   }, []);

//   // =========================================================
//   // FILTER PRODUCTS
//   // =========================================================

//   const filteredProducts =
//     activeCategory === "All"
//       ? products
//       : products.filter(
//           (product) =>
//             product.category === activeCategory
//         );

//   // =========================================================
//   // RENDER
//   // =========================================================

//   return (
//     <main className="shop-page">

//       {/* =========================
//           SHOP HEADER
//           ========================= */}

//       <section className="shop-header">

//         <p>ABS CUT COLLECTION</p>

//         <h1>Shop Our Collection</h1>

//         <span>
//           Discover ready-to-wear fashion and premium
//           native styles.
//         </span>

//       </section>

//       {/* =========================
//           CATEGORIES
//           ========================= */}

//       <section className="categories">

//         {categories.map((category) => (
//           <button
//             key={category}
//             type="button"
//             className={
//               activeCategory === category
//                 ? "active"
//                 : ""
//             }
//             onClick={() =>
//               setActiveCategory(category)
//             }
//           >
//             {category}
//           </button>
//         ))}

//       </section>

//       {/* =========================
//           PRODUCTS
//           ========================= */}

//       <section className="products">

//         {/* =========================
//             LOADING
//             ========================= */}

//         {loading && (
//           <div className="shop-empty">

//             <h2>Loading Products</h2>

//             <p>
//               Please wait while we load the
//               ABS CUT collection.
//             </p>

//           </div>
//         )}

//         {/* =========================
//             ERROR
//             ========================= */}

//         {!loading && error && (
//           <div className="shop-empty">

//             <h2>Unable to Load Products</h2>

//             <p>
//               {error}
//             </p>

//             <button
//               type="button"
//               onClick={() =>
//                 window.location.reload()
//               }
//             >
//               TRY AGAIN
//             </button>

//           </div>
//         )}

//         {/* =========================
//             PRODUCTS
//             ========================= */}

//         {!loading &&
//           !error &&
//           filteredProducts.length > 0 && (

//             filteredProducts.map((product) => (
//               <ProductCard
//                 key={product._id}
//                 product={product}
//               />
//             ))

//           )}

//         {/* =========================
//             EMPTY CATEGORY
//             ========================= */}

//         {!loading &&
//           !error &&
//           filteredProducts.length === 0 && (

//             <div className="shop-empty">

//               <h2>No Products Found</h2>

//               <p>
//                 There are currently no products
//                 in the {activeCategory} category.
//               </p>

//               <button
//                 type="button"
//                 onClick={() =>
//                   setActiveCategory("All")
//                 }
//               >
//                 VIEW ALL PRODUCTS
//               </button>

//             </div>

//           )}

//       </section>

//     </main>
//   );
// }

// export default Shop;
