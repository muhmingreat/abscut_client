
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { apiRequest } from "../services/api";
import { useCart } from "../context/AppContext";
import "./ProductDetails.css";

export default function ProductDetails() {
  const { id } = useParams();

  const { addToCart } = useCart();

  // =========================
  // PRODUCT STATE
  // =========================

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================
  // QUANTITY STATE
  // =========================

  const [quantity, setQuantity] = useState(1);

  console.log("ProductDetails rendered");
  console.log("URL ID:", id);
  console.log("Current quantity:", quantity);

  // =========================
  // LOAD PRODUCT FROM MONGODB
  // =========================

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");

        console.log(
          "Loading product from MongoDB:",
          id
        );

        const data = await apiRequest(
          `/products/${id}`
        );

        console.log(
          "Product received from backend:",
          data.product
        );

        if (!data.success || !data.product) {
          throw new Error(
            data.message ||
              "Unable to load this product."
          );
        }

        setProduct(data.product);

        // Reset quantity whenever product changes
        setQuantity(1);
      } catch (error) {
        console.error(
          "ABS CUT product details error:",
          error
        );

        setError(
          error.message ||
            "Unable to load this product."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // =========================
  // SCROLL TO TOP
  // =========================

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [id]);

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="product-not-found">
        <h1>
          Loading Product...
        </h1>

        <p>
          Please wait while we load the
          ABS CUT product.
        </p>
      </main>
    );
  }

  // =========================
  // PRODUCT NOT FOUND
  // =========================

  if (error || !product) {
    console.log(
      "PRODUCT NOT FOUND"
    );

    return (
      <main className="product-not-found">
        <h1>
          Product Not Found
        </h1>

        <p>
          {error ||
            "Sorry, the product you are looking for does not exist."}
        </p>
      </main>
    );
  }

  console.log(
    "Found product:",
    product
  );

  // =========================
  // FORMAT PRICE
  // =========================

  const formattedPrice =
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(product.price);

  // =========================
  // PRODUCT MEDIA
  // =========================

  const hasImage =
    Boolean(product.image);

  const hasVideo =
    Boolean(product.video);

  // =========================
  // DECREASE QUANTITY
  // =========================

  const handleDecrease = () => {
    console.log(
      "================================"
    );

    console.log(
      "MINUS BUTTON CLICKED"
    );

    console.log(
      "Quantity BEFORE decrease:",
      quantity
    );

    setQuantity((currentQuantity) => {
      const newQuantity = Math.max(
        1,
        currentQuantity - 1
      );

      console.log(
        "Quantity AFTER decrease:",
        newQuantity
      );

      return newQuantity;
    });
  };

  // =========================
  // INCREASE QUANTITY
  // =========================

  const handleIncrease = () => {
    console.log(
      "================================"
    );

    console.log(
      "PLUS BUTTON CLICKED"
    );

    console.log(
      "Quantity BEFORE increase:",
      quantity
    );

    setQuantity((currentQuantity) => {
      // Prevent quantity from exceeding stock
      if (
        product.stock > 0 &&
        currentQuantity >= product.stock
      ) {
        console.log(
          "Maximum stock reached:",
          product.stock
        );

        return currentQuantity;
      }

      const newQuantity =
        currentQuantity + 1;

      console.log(
        "Quantity AFTER increase:",
        newQuantity
      );

      return newQuantity;
    });
  };

  // =========================
  // ADD TO CART
  // =========================

  const handleAddToCart = () => {
    console.log(
      "================================"
    );

    console.log(
      "ADD TO CART CLICKED"
    );

    console.log(
      "Product:",
      product
    );

    console.log(
      "Quantity being added:",
      quantity
    );

    addToCart(
      product,
      quantity
    );
  };

  return (
    <main className="product-details-page">

      <section className="product-details">

        {/* =========================
            PRODUCT MEDIA
        ========================== */}

        <div className="product-details-image">

          {/* =========================
              IMAGE
          ========================== */}

          {hasImage && (
            <div className="image-wrapper">

              <img
                src={product.image}
                alt={product.name}
              />

            </div>
          )}

          {/* =========================
              VIDEO
          ========================== */}

          {hasVideo && (
            <div className="video-wrapper">

              <video
                src={product.video}
                controls
                playsInline
                preload="metadata"
              />

            </div>
          )}

          {/* =========================
              NO MEDIA
          ========================== */}

          {!hasImage && !hasVideo && (
            <div className="no-product-media">
              ABS CUT
            </div>
          )}

        </div>


        {/* =========================
            PRODUCT INFORMATION
        ========================== */}

        <div className="product-details-info">

          {/* CATEGORY */}

          <p className="product-category">
            {product.category}
          </p>


          {/* NAME */}

          <h1>
            {product.name}
          </h1>


          {/* PRICE */}

          <h2 className="product-price">
            {formattedPrice}
          </h2>


          {/* DIVIDER */}

          <div className="product-divider"></div>


          {/* DESCRIPTION */}

          <p className="product-description">
            {product.description}
          </p>


          {/* PRODUCT TYPE */}

          <div className="product-type">

            <strong>
              Product Type:
            </strong>

            <span>
              {product.type ||
                "Ready to Wear"}
            </span>

          </div>


          {/* =========================
              MEDIA TYPE
          ========================== */}

          <div className="product-type">

            <strong>
              Media:
            </strong>

            <span>
              {hasImage && hasVideo
                ? "Image & Video"
                : hasVideo
                ? "Video"
                : hasImage
                ? "Image"
                : "No Media"}
            </span>

          </div>


          {/* =========================
              STOCK
          ========================== */}

          <div className="product-type">

            <strong>
              Stock:
            </strong>

            <span>
              {product.stock > 0
                ? `${product.stock} available`
                : "Out of Stock"}
            </span>

          </div>


          {/* =========================
              QUANTITY
          ========================== */}

          <div className="quantity-section">

            <p>
              Quantity
            </p>

            <div className="quantity-control">

              {/* MINUS */}

              <button
                type="button"
                onClick={handleDecrease}
                disabled={
                  quantity <= 1
                }
                aria-label="Decrease quantity"
              >
                −
              </button>


              {/* NUMBER */}

              <span>
                {quantity}
              </span>


              {/* PLUS */}

              <button
                type="button"
                onClick={handleIncrease}
                disabled={
                  product.stock > 0 &&
                  quantity >=
                    product.stock
                }
                aria-label="Increase quantity"
              >
                +
              </button>

            </div>

          </div>


          {/* =========================
              ADD TO CART
          ========================== */}

          <button
            type="button"
            className="add-to-cart"
            onClick={handleAddToCart}
            disabled={
              product.stock <= 0
            }
          >
            {product.stock > 0
              ? "ADD TO CART"
              : "OUT OF STOCK"}
          </button>

        </div>

      </section>

    </main>
  );
};









// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";

// import { apiRequest } from "../services/api";
// import { useCart } from "../context/AppContext";

// export default function ProductDetails() {
//   const { id } = useParams();

//   const { addToCart } = useCart();

//   // =========================
//   // PRODUCT STATE
//   // =========================
//   const [product, setProduct] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // =========================
//   // QUANTITY STATE
//   // =========================
//   const [quantity, setQuantity] = useState(1);

//   console.log("ProductDetails rendered");
//   console.log("URL ID:", id);
//   console.log("Current quantity:", quantity);

//   // =========================
//   // LOAD PRODUCT FROM MONGODB
//   // =========================
//   useEffect(() => {
//     const loadProduct = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         console.log(
//           "Loading product from MongoDB:",
//           id
//         );

//         const data = await apiRequest(
//           `/products/${id}`
//         );

//         console.log(
//           "Product received from backend:",
//           data.product
//         );

//         setProduct(data.product);
//       } catch (error) {
//         console.error(
//           "ABS CUT product details error:",
//           error
//         );

//         setError(
//           error.message ||
//           "Unable to load this product."
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadProduct();
//   }, [id]);

//   // =========================
//   // LOADING
//   // =========================
//   if (loading) {
//     return (
//       <main className="product-not-found">
//         <h1>Loading Product...</h1>

//         <p>
//           Please wait while we load the
//           ABS CUT product.
//         </p>
//       </main>
//     );
//   }

//   // =========================
//   // PRODUCT NOT FOUND
//   // =========================
//   if (error || !product) {
//     console.log("PRODUCT NOT FOUND");

//     return (
//       <main className="product-not-found">
//         <h1>Product Not Found</h1>

//         <p>
//           {error ||
//             "Sorry, the product you are looking for does not exist."}
//         </p>
//       </main>
//     );
//   }

//   console.log(
//     "Found product:",
//     product
//   );

//   // =========================
//   // FORMAT PRICE
//   // =========================
//   const formattedPrice =
//     new Intl.NumberFormat("en-NG", {
//       style: "currency",
//       currency: "NGN",
//       maximumFractionDigits: 0,
//     }).format(product.price);

//   // =========================
//   // DECREASE QUANTITY
//   // =========================
//   const handleDecrease = () => {
//     console.log("================================");
//     console.log("MINUS BUTTON CLICKED");
//     console.log(
//       "Quantity BEFORE decrease:",
//       quantity
//     );

//     setQuantity((currentQuantity) => {
//       const newQuantity = Math.max(
//         1,
//         currentQuantity - 1
//       );

//       console.log(
//         "Quantity AFTER decrease:",
//         newQuantity
//       );

//       return newQuantity;
//     });
//   };

//   // =========================
//   // INCREASE QUANTITY
//   // =========================
//   const handleIncrease = () => {
//     console.log("================================");
//     console.log("PLUS BUTTON CLICKED");
//     console.log(
//       "Quantity BEFORE increase:",
//       quantity
//     );

//     setQuantity((currentQuantity) => {
//       const newQuantity =
//         currentQuantity + 1;

//       console.log(
//         "Quantity AFTER increase:",
//         newQuantity
//       );

//       return newQuantity;
//     });
//   };

//   // =========================
//   // ADD TO CART
//   // =========================
//   const handleAddToCart = () => {
//     console.log("================================");
//     console.log("ADD TO CART CLICKED");
//     console.log("Product:", product);
//     console.log(
//       "Quantity being added:",
//       quantity
//     );

//     addToCart(product, quantity);
//   };

//   return (
//     <main className="product-details-page">

//       <section className="product-details">

//         {/* =========================
//             PRODUCT IMAGE
//         ========================== */}
//         <div className="product-details-image">

//           <div className="image-wrapper">

//             <img
//               src={product.image}
//               alt={product.name}
//             />

//           </div>

//         </div>


//         {/* =========================
//             PRODUCT INFORMATION
//         ========================== */}
//         <div className="product-details-info">

//           {/* CATEGORY */}
//           <p className="product-category">
//             {product.category}
//           </p>


//           {/* NAME */}
//           <h1>
//             {product.name}
//           </h1>


//           {/* PRICE */}
//           <h2 className="product-price">
//             {formattedPrice}
//           </h2>


//           {/* DIVIDER */}
//           <div className="product-divider"></div>


//           {/* DESCRIPTION */}
//           <p className="product-description">
//             {product.description}
//           </p>


//           {/* PRODUCT TYPE */}
//           <div className="product-type">

//             <strong>
//               Product Type:
//             </strong>

//             <span>
//               {product.type || "Ready to Wear"}
//             </span>

//           </div>


//           {/* =========================
//               QUANTITY
//           ========================== */}
//           <div className="quantity-section">

//             <p>
//               Quantity
//             </p>

//             <div className="quantity-control">

//               {/* MINUS */}
//               <button
//                 type="button"
//                 onClick={handleDecrease}
//                 aria-label="Decrease quantity"
//               >
//                 −
//               </button>


//               {/* NUMBER */}
//               <span>
//                 {quantity}
//               </span>


//               {/* PLUS */}
//               <button
//                 type="button"
//                 onClick={handleIncrease}
//                 aria-label="Increase quantity"
//               >
//                 +
//               </button>

//             </div>

//           </div>


//           {/* =========================
//               ADD TO CART
//           ========================== */}
//           <button
//             type="button"
//             className="add-to-cart"
//             onClick={handleAddToCart}
//           >
//             ADD TO CART
//           </button>

//         </div>

//       </section>

//     </main>
//   );
// }
