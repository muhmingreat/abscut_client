
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ProductReviews from "../../components/ProductReviews";
import { apiRequest } from "../../services/api";
import { useCart } from "../../context/AppContext";
import "./ProductDetails.css";

const PRODUCT_TYPES = {
  ready_to_wear: "Ready-to-Wear",
  raw_material: "Raw Material",
  monogram: "Monogram",
  phoenix_embroidery: "Phoenix Embroidery",
};

const DIGITAL_FORMATS = ["DST", "PES", "JEF", "EXP"];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

export default function ProductDetails() {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Physical / digital selection
  const [purchaseMode, setPurchaseMode] = useState("physical");

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest(`/products/${id}`);

        if (!data.success || !data.product) {
          throw new Error(
            data.message || "Unable to load this product."
          );
        }

        setProduct(data.product);
        setQuantity(1);

        setPurchaseMode(
          data.product.physicalAvailable
            ? "physical"
            : data.product.digitalAvailable
            ? "digital"
            : "physical"
        );
      } catch (err) {
        console.error("ABS CUT Product Details:", err);
        setError(err.message || "Unable to load this product.");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [id]);

  // =========================
  // PRODUCT HELPERS
  // =========================

  const productType = product?.productType || "ready_to_wear";

  const isRawMaterial = productType === "raw_material";

  const isDigitalMode = purchaseMode === "digital";

  const availableStock = isRawMaterial
    ? Number(product?.stockInYards || 0)
    : Number(product?.stock || 0);

  const availableForPurchase = isDigitalMode
    ? Boolean(product?.digitalAvailable)
    : Boolean(product?.physicalAvailable) &&
      availableStock > 0;

  const unitLabel = isRawMaterial
    ? "yard"
    : product?.priceUnit ||
      (productType === "ready_to_wear"
        ? "piece"
        : "design");

  const unitLabelPlural =
    unitLabel === "yard"
      ? "yards"
      : unitLabel === "piece"
      ? "pieces"
      : "designs";

  // =========================
  // PRICE
  // =========================

  const unitPrice = useMemo(() => {
    if (!product) return 0;

    if (isDigitalMode) {
      return Number(product.digitalPrice || 0);
    }

    if (
      product.physicalPrice !== null &&
      product.physicalPrice !== undefined &&
      product.physicalPrice !== ""
    ) {
      return Number(product.physicalPrice);
    }

    return Number(product.price || 0);
  }, [product, isDigitalMode]);

  const totalPrice = unitPrice * quantity;

  // =========================
  // QUANTITY
  // =========================

  const handleQuantityChange = (value) => {
    const nextQuantity = Number(value);

    if (!Number.isFinite(nextQuantity)) {
      setQuantity(1);
      return;
    }

    const minimum = 0.5;

    const maximum = isDigitalMode
      ? 999
      : availableStock;

    if (maximum <= 0) {
      setQuantity(1);
      return;
    }

    setQuantity(
      Math.min(
        maximum,
        Math.max(minimum, nextQuantity)
      )
    );
  };

  const handleDecrease = () => {
    setQuantity((current) =>
      Math.max(0.5, current - 0.5)
    );
  };

  const handleIncrease = () => {
    setQuantity((current) => {
      const maximum = isDigitalMode
        ? 999
        : availableStock;

      return Math.min(maximum, current + 0.5);
    });
  };

  // =========================
  // ADD TO CART
  // =========================

  const handleAddToCart = () => {
    if (!availableForPurchase) return;

    if (
      !isDigitalMode &&
      quantity > availableStock
    ) {
      return;
    }

    const cartProduct = {
      ...product,

      // Price selected by the customer
      price: unitPrice,

      // Preserve product type and purchase option
      productType,
      priceUnit: unitLabel,
      purchaseMode,

      // Yard quantity is measured in yards
      quantityUnit: unitLabel,
    };

    addToCart(cartProduct, quantity);
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="product-not-found">
        <h1>Loading Product...</h1>
        <p>
          Please wait while we load the ABS CUT product.
        </p>
      </main>
    );
  }

  // =========================
  // NOT FOUND
  // =========================

  if (error || !product) {
    return (
      <main className="product-not-found">
        <h1>Product Not Found</h1>
        <p>
          {error ||
            "Sorry, the product you are looking for does not exist."}
        </p>
      </main>
    );
  }

  const hasImage = Boolean(product.image);
  const hasVideo = Boolean(product.video);

  const productTypeLabel =
    PRODUCT_TYPES[productType] || productType;

  const digitalFiles = Array.isArray(product.digitalFiles)
    ? product.digitalFiles
    : [];

  return (
    <main className="product-details-page">
      <section className="product-details">

        {/* =========================
            PRODUCT MEDIA
        ========================== */}

        <div className="product-details-image">

          {hasImage && (
            <div className="image-wrapper">
              <img
                src={product.image}
                alt={product.name}
              />
            </div>
          )}

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

          {!hasImage && !hasVideo && (
            <div className="no-product-media">
              ABS CUT
            </div>
          )}

          <ProductReviews productId={product._id} />
        </div>

        {/* =========================
            PRODUCT INFORMATION
        ========================== */}

        <div className="product-details-info">

          <p className="product-category">
            {product.category}
          </p>

          <h1>{product.name}</h1>

          {/* PRODUCT TYPE */}

          <div className="product-type">
            <strong>Product Type:</strong>
            <span>{productTypeLabel}</span>
          </div>

          {/* PRICE */}

          <h2 className="product-price">
            {formatCurrency(unitPrice)}
            <small>
              {" "} / {unitLabel}
            </small>
          </h2>

          <div className="product-divider" />

          {/* DESCRIPTION */}

          {product.description && (
            <p className="product-description">
              {product.description}
            </p>
          )}

          {/* =========================
              RAW MATERIAL DETAILS
          ========================== */}

          {isRawMaterial && (
            <div className="product-type">
              <strong>Material Price:</strong>
              <span>
                {formatCurrency(unitPrice)} per yard
              </span>
            </div>
          )}

          {/* =========================
              DIGITAL AVAILABILITY
          ========================== */}

          {product.digitalAvailable && (
            <div className="product-type">
              <strong>Digital Version:</strong>
              <span>
                {formatCurrency(product.digitalPrice)}
              </span>
            </div>
          )}

          {/* =========================
              DIGITAL FILE FORMATS
          ========================== */}

          {productType === "phoenix_embroidery" &&
            digitalFiles.length > 0 && (
              <div className="product-digital-formats">
                <strong>Available Embroidery Formats</strong>

                <div className="product-format-list">
                  {[
                    ...new Set(
                      digitalFiles
                        .map((file) => file.format)
                        .filter((format) =>
                          DIGITAL_FORMATS.includes(format)
                        )
                    ),
                  ].map((format) => (
                    <span
                      className="product-format-badge"
                      key={format}
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* =========================
              PHYSICAL / DIGITAL OPTION
          ========================== */}

          {product.physicalAvailable &&
            product.digitalAvailable && (
              <div className="product-purchase-options">
                <strong>Choose Product Format</strong>

                <div className="product-purchase-options-buttons">
                  <button
                    type="button"
                    className={
                      purchaseMode === "physical"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setPurchaseMode("physical")
                    }
                  >
                    Physical Product
                  </button>

                  <button
                    type="button"
                    className={
                      purchaseMode === "digital"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setPurchaseMode("digital")
                    }
                  >
                    Digital Product
                  </button>
                </div>
              </div>
            )}

          {/* =========================
              STOCK
          ========================== */}

          {!isDigitalMode && (
            <div className="product-type">
              <strong>
                {isRawMaterial
                  ? "Available Material:"
                  : "Available Stock:"}
              </strong>

              <span>
                {availableStock > 0
                  ? isRawMaterial
                    ? `${availableStock} yards`
                    : `${availableStock} available`
                  : "Out of Stock"}
              </span>
            </div>
          )}

          {/* =========================
              QUANTITY
          ========================== */}

          {availableForPurchase && (
            <div className="quantity-section">
              <p>
                {isRawMaterial
                  ? "Select Number of Yards"
                  : "Quantity"}
              </p>

              <div className="quantity-control">

                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={quantity <= 0.5}
                  aria-label="Decrease quantity"
                >
                  −
                </button>

                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  max={
                    isDigitalMode
                      ? 999
                      : availableStock
                  }
                  value={quantity}
                  onChange={(event) =>
                    handleQuantityChange(
                      event.target.value
                    )
                  }
                  aria-label={
                    isRawMaterial
                      ? "Number of yards"
                      : "Product quantity"
                  }
                />

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={
                    !isDigitalMode &&
                    quantity >= availableStock
                  }
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* TOTAL PRICE */}

              <div className="product-total-price">
                <span>
                  Total Price ({quantity} {unitLabelPlural})
                </span>

                <strong>
                  {formatCurrency(totalPrice)}
                </strong>
              </div>
            </div>
          )}

          {/* =========================
              ADD TO CART
          ========================== */}

          <button
            type="button"
            className="add-to-cart"
            onClick={handleAddToCart}
            disabled={!availableForPurchase}
          >
            {availableForPurchase
              ? "ADD TO CART"
              : "UNAVAILABLE"}
          </button>

        </div>
      </section>
    </main>
  );
}
