
import { Link } from "react-router-dom";
import "./ProductCard.css";

function ProductCard({ product, onImageClick }) {
  const formattedPrice = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(product.price) || 0);

  const hasImage = Boolean(product.image);
  const hasVideo = Boolean(product.video);
  const productUrl = `/product/${product._id}`;

  const handleVideoPlay = (event) => {
    event.currentTarget.play().catch(() => {});
  };

  const handleVideoReset = (event) => {
    event.currentTarget.pause();
    event.currentTarget.currentTime = 0;
  };

  const productMedia = (
    <>
      {hasImage && (
        <img
          src={product.image}
          alt={product.name || "ABS CUT product"}
          loading="lazy"
        />
      )}

      {!hasImage && hasVideo && (
        <video
          src={product.video}
          muted
          playsInline
          preload="metadata"
          onMouseEnter={handleVideoPlay}
          onMouseLeave={handleVideoReset}
          onFocus={handleVideoPlay}
          onBlur={handleVideoReset}
        />
      )}

      {hasImage && hasVideo && (
        <span className="product-video-badge">▶ VIDEO</span>
      )}

      {!hasImage && !hasVideo && (
        <div className="product-no-media">ABS CUT</div>
      )}
    </>
  );

  return (
    <article className="product-card">
      <div className="product-image">
        {onImageClick ? (
          <button
            type="button"
            className="product-image-trigger"
            onClick={onImageClick}
            aria-label={`View ${product.name} and related products`}
          >
            {productMedia}
          </button>
        ) : (
          <Link
            to={productUrl}
            className="product-image-trigger"
            aria-label={`View ${product.name}`}
          >
            {productMedia}
          </Link>
        )}
      </div>

      <div className="product-info">
        <p>{product.category}</p>

        <h2>
          <Link to={productUrl} className="product-name-link">
            {product.name}
          </Link>
        </h2>

        <h3>{formattedPrice}</h3>

        <Link to={productUrl} className="view-product-btn">
          VIEW PRODUCT
        </Link>
      </div>
    </article>
  );
}

export default ProductCard;




// import { Link } from "react-router-dom";
// import "./ProductCard.css";

// function ProductCard({ product }) {
//   const formattedPrice =
//     new Intl.NumberFormat("en-NG", {
//       style: "currency",
//       currency: "NGN",
//       maximumFractionDigits: 0,
//     }).format(product.price);

//   const hasImage = Boolean(product.image);
//   const hasVideo = Boolean(product.video);

//   return (
//     <article className="product-card">

//       <div className="product-image">

//         {/* =========================
//             IMAGE
//         ========================= */}

//         {hasImage && (
//           <img
//             src={product.image}
//             alt={product.name}
//           />
//         )}

//         {/* =========================
//             VIDEO ONLY
//         ========================= */}

//         {!hasImage && hasVideo && (
//           <video
//             src={product.video}
//             muted
//             playsInline
//             preload="metadata"
//             onMouseEnter={(event) => {
//               event.currentTarget
//                 .play()
//                 .catch(() => {});
//             }}
//             onMouseLeave={(event) => {
//               event.currentTarget.pause();
//               event.currentTarget.currentTime = 0;
//             }}
//           />
//         )}

//         {/* =========================
//             IMAGE + VIDEO BADGE
//         ========================= */}

//         {hasImage && hasVideo && (
//           <span className="product-video-badge">
//             ▶ VIDEO
//           </span>
//         )}

//         {/* =========================
//             NO MEDIA FALLBACK
//         ========================= */}

//         {!hasImage && !hasVideo && (
//           <div className="product-no-media">
//             ABS CUT
//           </div>
//         )}

//       </div>

//       <div className="product-info">

//         <p>
//           {product.category}
//         </p>

//         <h2>
//           {product.name}
//         </h2>

//         <h3>
//           {formattedPrice}
//         </h3>

//         <button type="button">
//           <Link
//             to={`/product/${product._id}`}
//             className="view-product-btn"
//           >
//             VIEW PRODUCT
//           </Link>
//         </button>

//       </div>

//     </article>
//   );
// }

// export default ProductCard;

