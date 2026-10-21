
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../services/api";
import LoadingScreen from "./LoadingScreen";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminProducts.css";

function AdminProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        "/admin/products"
      );

      if (!data.success) {
        throw new Error(
          data.message ||
            "Unable to load products."
        );
      }

      setProducts(data.products || []);
    } catch (err) {
      console.error(
        "Admin products error:",
        err
      );

      setError(
        err.message ||
          "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        products.map(
          (product) => product.category
        )
      ),
    ];

    return uniqueCategories;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        product.category
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesCategory =
        category === "all" ||
        product.category === category;

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    products,
    search,
    category,
  ]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStockClass = (stock) => {
    if (stock <= 0) {
      return "out";
    }

    if (stock <= 5) {
      return "low";
    }

    return "good";
  };

  /*
    ==========================================
    PRODUCT MEDIA
    ==========================================

    image only   → image
    video only   → video
    image + video → image + video badge
    neither      → ABS CUT
  */

  const renderProductMedia = (product) => {
    if (product.image) {
      return (
        <>
          <img
            src={product.image}
            alt={product.name}
          />

          {product.video && (
            <div className="admin-product-video-badge">
              <span>▶</span>
              VIDEO
            </div>
          )}
        </>
      );
    }

    if (product.video) {
      return (
        <>
          <video
            src={product.video}
            muted
            playsInline
            preload="metadata"
            onMouseEnter={(e) => {
              e.currentTarget
                .play()
                .catch(() => {});
            }}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />

          <div className="admin-product-video-badge video-only">
            <span>▶</span>
            VIDEO
          </div>
        </>
      );
    }

    return (
      <span>
        ABS CUT
      </span>
    );
  };

  if (loading) {
    return (
      <LoadingScreen
        message="Loading products..."
      />
    );
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">

        <AdminSidebar />

        <section className="admin-main">

          {/* HEADER */}

          <div className="admin-products-header">
            <div>
              <span className="admin-eyebrow">
                INVENTORY
              </span>

              <h1>Products</h1>

              <p>
                Manage your ABS CUT products,
                pricing, inventory and media.
              </p>
            </div>

            <button
              type="button"
              className="admin-add-product-btn"
              onClick={() =>
                navigate(
                  "/admin/products/new"
                )
              }
            >
              <span>+</span>
              ADD PRODUCT
            </button>
          </div>

          {/* ERROR */}

          {error && (
            <div className="admin-products-error">
              <strong>
                Unable to load products
              </strong>

              <span>{error}</span>

              <button
                type="button"
                onClick={loadProducts}
              >
                TRY AGAIN
              </button>
            </div>
          )}

          {/* CONTROLS */}

          {!error && (
            <>
              <section className="admin-products-toolbar">

                <div className="admin-products-search">
                  <span>⌕</span>

                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="admin-products-filter">

                  <label htmlFor="product-category">
                    CATEGORY
                  </label>

                  <select
                    id="product-category"
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value
                      )
                    }
                  >
                    <option value="all">
                      All Categories
                    </option>

                    {categories.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </section>

              {/* SUMMARY */}

              <section className="admin-products-summary">

                <div>
                  <span>
                    TOTAL PRODUCTS
                  </span>

                  <strong>
                    {products.length}
                  </strong>
                </div>

                <div>
                  <span>
                    ACTIVE
                  </span>

                  <strong>
                    {
                      products.filter(
                        (product) =>
                          product.active
                      ).length
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    LOW STOCK
                  </span>

                  <strong>
                    {
                      products.filter(
                        (product) =>
                          product.stock > 0 &&
                          product.stock <= 5
                      ).length
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    OUT OF STOCK
                  </span>

                  <strong>
                    {
                      products.filter(
                        (product) =>
                          product.stock <= 0
                      ).length
                    }
                  </strong>
                </div>

              </section>

              {/* PRODUCTS */}

              {filteredProducts.length === 0 ? (
                <div className="admin-products-empty">

                  <div>◇</div>

                  <h2>
                    No products found
                  </h2>

                  <p>
                    Try changing your search
                    or category filter.
                  </p>

                </div>
              ) : (
                <section className="admin-products-grid">

                  {filteredProducts.map(
                    (product) => (
                      <article
                        className="admin-product-card"
                        key={product._id}
                      >

                        {/* MEDIA */}

                        <div className="admin-product-image">

                          {renderProductMedia(
                            product
                          )}

                          <div
                            className={`admin-product-stock ${getStockClass(
                              product.stock
                            )}`}
                          >
                            {product.stock <= 0
                              ? "OUT OF STOCK"
                              : `${product.stock} IN STOCK`}
                          </div>

                        </div>

                        {/* CONTENT */}

                        <div className="admin-product-content">

                          <div className="admin-product-category">
                            {product.category}
                          </div>

                          <h2>
                            {product.name}
                          </h2>

                          <strong className="admin-product-price">
                            {formatCurrency(
                              product.price
                            )}
                          </strong>

                          {/* MEDIA STATUS */}

                          <div className="admin-product-media-status">

                            {product.image && (
                              <span>
                                <i>●</i>
                                IMAGE
                              </span>
                            )}

                            {product.video && (
                              <span className="has-video">
                                <i>▶</i>
                                VIDEO
                              </span>
                            )}

                          </div>

                          <div className="admin-product-meta">

                            <span>
                              {product.featured
                                ? "★ Featured"
                                : "Standard"}
                            </span>

                            <span
                              className={
                                product.active
                                  ? "active"
                                  : "inactive"
                              }
                            >
                              {product.active
                                ? "Active"
                                : "Inactive"}
                            </span>

                          </div>

                          <button
                            type="button"
                            className="admin-product-manage-btn"
                            onClick={() =>
                              navigate(
                                `/admin/products/${product._id}`
                              )
                            }
                          >
                            MANAGE PRODUCT

                            <span>→</span>
                          </button>

                        </div>

                      </article>
                    )
                  )}

                </section>
              )}

            </>
          )}

        </section>

      </div>
    </main>
  );
}

export default AdminProducts;













// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";

// import { apiRequest } from "../services/api";
// import LoadingScreen from "./LoadingScreen";
// import AdminSidebar from "../components/AdminSidebar";

// function AdminProducts() {
//   const navigate = useNavigate();

//   const [products, setProducts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const [search, setSearch] = useState("");
//   const [category, setCategory] = useState("all");

//   const loadProducts = async () => {
//     try {
//       setLoading(true);
//       setError("");

//       const data = await apiRequest(
//         "/admin/products"
//       );

//       if (!data.success) {
//         throw new Error(
//           data.message ||
//             "Unable to load products."
//         );
//       }

//       setProducts(data.products || []);
//     } catch (err) {
//       console.error(
//         "Admin products error:",
//         err
//       );

//       setError(
//         err.message ||
//           "Unable to load products."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadProducts();
//   }, []);

//   const categories = useMemo(() => {
//     const uniqueCategories = [
//       ...new Set(
//         products.map(
//           (product) => product.category
//         )
//       ),
//     ];

//     return uniqueCategories;
//   }, [products]);

//   const filteredProducts = useMemo(() => {
//     return products.filter((product) => {
//       const matchesSearch =
//         product.name
//           .toLowerCase()
//           .includes(
//             search.toLowerCase()
//           ) ||
//         product.category
//           .toLowerCase()
//           .includes(
//             search.toLowerCase()
//           );

//       const matchesCategory =
//         category === "all" ||
//         product.category === category;

//       return (
//         matchesSearch &&
//         matchesCategory
//       );
//     });
//   }, [
//     products,
//     search,
//     category,
//   ]);

//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat("en-NG", {
//       style: "currency",
//       currency: "NGN",
//       maximumFractionDigits: 0,
//     }).format(amount || 0);
//   };

//   const getStockClass = (stock) => {
//     if (stock <= 0) {
//       return "out";
//     }

//     if (stock <= 5) {
//       return "low";
//     }

//     return "good";
//   };

//   if (loading) {
//     return (
//       <LoadingScreen
//         message="Loading products..."
//       />
//     );
//   }

//   return (
//     <main className="admin-dashboard-page">
//       <div className="admin-dashboard-shell">

//         <AdminSidebar />

//         <section className="admin-main">

//           {/* HEADER */}

//           <div className="admin-products-header">
//             <div>
//               <span className="admin-eyebrow">
//                 INVENTORY
//               </span>

//               <h1>Products</h1>

//               <p>
//                 Manage your ABS CUT products,
//                 pricing and inventory.
//               </p>
//             </div>

//             <button
//               type="button"
//               className="admin-add-product-btn"
//               onClick={() =>
//                 navigate(
//                   "/admin/products/new"
//                 )
//               }
//             >
//               <span>+</span>
//               ADD PRODUCT
//             </button>
//           </div>


//           {/* ERROR */}

//           {error && (
//             <div className="admin-products-error">
//               <strong>
//                 Unable to load products
//               </strong>

//               <span>{error}</span>

//               <button
//                 type="button"
//                 onClick={loadProducts}
//               >
//                 TRY AGAIN
//               </button>
//             </div>
//           )}


//           {/* CONTROLS */}

//           {!error && (
//             <>
//               <section className="admin-products-toolbar">

//                 <div className="admin-products-search">
//                   <span>⌕</span>

//                   <input
//                     type="text"
//                     placeholder="Search products..."
//                     value={search}
//                     onChange={(e) =>
//                       setSearch(
//                         e.target.value
//                       )
//                     }
//                   />
//                 </div>


//                 <div className="admin-products-filter">
//                   <label htmlFor="product-category">
//                     CATEGORY
//                   </label>

//                   <select
//                     id="product-category"
//                     value={category}
//                     onChange={(e) =>
//                       setCategory(
//                         e.target.value
//                       )
//                     }
//                   >
//                     <option value="all">
//                       All Categories
//                     </option>

//                     {categories.map(
//                       (item) => (
//                         <option
//                           key={item}
//                           value={item}
//                         >
//                           {item}
//                         </option>
//                       )
//                     )}
//                   </select>
//                 </div>

//               </section>


//               {/* SUMMARY */}

//               <section className="admin-products-summary">

//                 <div>
//                   <span>
//                     TOTAL PRODUCTS
//                   </span>

//                   <strong>
//                     {products.length}
//                   </strong>
//                 </div>

//                 <div>
//                   <span>
//                     ACTIVE
//                   </span>

//                   <strong>
//                     {
//                       products.filter(
//                         (product) =>
//                           product.active
//                       ).length
//                     }
//                   </strong>
//                 </div>

//                 <div>
//                   <span>
//                     LOW STOCK
//                   </span>

//                   <strong>
//                     {
//                       products.filter(
//                         (product) =>
//                           product.stock > 0 &&
//                           product.stock <= 5
//                       ).length
//                     }
//                   </strong>
//                 </div>

//                 <div>
//                   <span>
//                     OUT OF STOCK
//                   </span>

//                   <strong>
//                     {
//                       products.filter(
//                         (product) =>
//                           product.stock <= 0
//                       ).length
//                     }
//                   </strong>
//                 </div>

//               </section>


//               {/* PRODUCTS */}

//               {filteredProducts.length === 0 ? (
//                 <div className="admin-products-empty">
//                   <div>◇</div>

//                   <h2>
//                     No products found
//                   </h2>

//                   <p>
//                     Try changing your search
//                     or category filter.
//                   </p>
//                 </div>
//               ) : (
//                 <section className="admin-products-grid">

//                   {filteredProducts.map(
//                     (product) => (
//                       <article
//                         className="admin-product-card"
//                         key={product._id}
//                       >

//                         <div className="admin-product-image">

//                           {product.image ? (
//                             <img
//                               src={product.image}
//                               alt={product.name}
//                             />
//                           ) : (
//                             <span>
//                               ABS CUT
//                             </span>
//                           )}

//                           <div
//                             className={`admin-product-stock ${getStockClass(
//                               product.stock
//                             )}`}
//                           >
//                             {product.stock <= 0
//                               ? "OUT OF STOCK"
//                               : `${product.stock} IN STOCK`}
//                           </div>

//                         </div>


//                         <div className="admin-product-content">

//                           <div className="admin-product-category">
//                             {product.category}
//                           </div>

//                           <h2>
//                             {product.name}
//                           </h2>

//                           <strong className="admin-product-price">
//                             {formatCurrency(
//                               product.price
//                             )}
//                           </strong>

//                           <div className="admin-product-meta">

//                             <span>
//                               {product.featured
//                                 ? "★ Featured"
//                                 : "Standard"}
//                             </span>

//                             <span
//                               className={
//                                 product.active
//                                   ? "active"
//                                   : "inactive"
//                               }
//                             >
//                               {product.active
//                                 ? "Active"
//                                 : "Inactive"}
//                             </span>

//                           </div>

//                           <button
//                             type="button"
//                             className="admin-product-manage-btn"
//                             onClick={() =>
//                               navigate(
//                                 `/admin/products/${product._id}`
//                               )
//                             }
//                           >
//                             MANAGE PRODUCT
//                             <span>→</span>
//                           </button>

//                         </div>

//                       </article>
//                     )
//                   )}

//                 </section>
//               )}

//             </>
//           )}

//         </section>

//       </div>
//     </main>
//   );
// }

// export default AdminProducts;

