
import { Link } from "react-router-dom";
import "./ProductCard.css";

function ProductCard({ product }) {
  const formattedPrice =
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(product.price);

  const hasImage = Boolean(product.image);
  const hasVideo = Boolean(product.video);

  return (
    <article className="product-card">

      <div className="product-image">

        {/* =========================
            IMAGE
        ========================= */}

        {hasImage && (
          <img
            src={product.image}
            alt={product.name}
          />
        )}

        {/* =========================
            VIDEO ONLY
        ========================= */}

        {!hasImage && hasVideo && (
          <video
            src={product.video}
            muted
            playsInline
            preload="metadata"
            onMouseEnter={(event) => {
              event.currentTarget
                .play()
                .catch(() => {});
            }}
            onMouseLeave={(event) => {
              event.currentTarget.pause();
              event.currentTarget.currentTime = 0;
            }}
          />
        )}

        {/* =========================
            IMAGE + VIDEO BADGE
        ========================= */}

        {hasImage && hasVideo && (
          <span className="product-video-badge">
            ▶ VIDEO
          </span>
        )}

        {/* =========================
            NO MEDIA FALLBACK
        ========================= */}

        {!hasImage && !hasVideo && (
          <div className="product-no-media">
            ABS CUT
          </div>
        )}

      </div>

      <div className="product-info">

        <p>
          {product.category}
        </p>

        <h2>
          {product.name}
        </h2>

        <h3>
          {formattedPrice}
        </h3>

        <button type="button">
          <Link
            to={`/product/${product._id}`}
            className="view-product-btn"
          >
            VIEW PRODUCT
          </Link>
        </button>

      </div>

    </article>
  );
}

export default ProductCard;

