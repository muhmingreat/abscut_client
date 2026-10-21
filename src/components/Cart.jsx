import { Link } from "react-router-dom";
import { useCart } from "../context/AppContext";
import LoadingScreen from "../pages/LoadingScreen";
import "./Cart.css";
function Cart() {
  const {
    cartItems,
     cartLoading,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    totalItems,
    totalPrice,
  } = useCart();

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (cartLoading) {
  return (
    <LoadingScreen
      message="Loading your  cart..."
    />
  );
}
  /* =========================
     EMPTY CART
     ========================= */

  if (cartItems.length === 0) {
    return (
      <main className="cart-page">
        <section className="cart-empty">
          <div className="cart-empty-icon">
            🛒
          </div>

          <p className="cart-label">
            ABS CUT SHOPPING BAG
          </p>

          <h1>Your Cart Is Empty</h1>

          <p className="cart-empty-text">
            You haven't added any products to your cart yet.
            Explore our collection and find something made for you.
          </p>

          <Link
            to="/shop"
            className="cart-shop-button"
          >
            EXPLORE COLLECTION
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page">

      {/* =========================
          CART HEADER
          ========================= */}

      <section className="cart-header">

        <div>
          <p className="cart-label">
            ABS CUT SHOPPING BAG
          </p>

          <h1>Your Cart</h1>

          <span>
            Review your selected items before checkout.
          </span>
        </div>

        <div className="cart-item-count">
          <strong>{totalItems}</strong>
          <span>
            {totalItems === 1 ? "Item" : "Items"}
          </span>
        </div>

      </section>


      {/* =========================
          CART CONTENT
          ========================= */}

      <section className="cart-content">

        {/* =========================
            CART ITEMS
            ========================= */}

        <div className="cart-items">

          {cartItems.map((item) => {

            const itemTotal =
              item.price * item.quantity;

            return (
              <article
                className="cart-item"
                key={item.id}
              >

                {/* PRODUCT IMAGE */}

                <div className="cart-item-image">
                  <img
                    src={item.image}
                    alt={item.name}
                  />
                </div>


                {/* PRODUCT INFORMATION */}

                <div className="cart-item-info">

                  <p className="cart-item-category">
                    {item.category}
                  </p>

                  <h2>
                    {item.name}
                  </h2>

                  <p className="cart-item-price">
                    {formatPrice(item.price)}
                  </p>

                </div>


                {/* QUANTITY */}

                <div className="cart-item-quantity">

                  <span>Quantity</span>

                  <div className="quantity-control">

                    <button
                      type="button"
                      onClick={() =>
                        decreaseQuantity(item.id)
                      }
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      −
                    </button>

                    <strong>
                      {item.quantity}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        increaseQuantity(item.id)
                      }
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      +
                    </button>

                  </div>

                </div>


                {/* ITEM TOTAL */}

                <div className="cart-item-total">

                  <span>Total</span>

                  <strong>
                    {formatPrice(itemTotal)}
                  </strong>

                </div>


                {/* REMOVE */}

                <button
                  type="button"
                  className="cart-remove-button"
                  onClick={() =>
                    removeFromCart(item.id)
                  }
                  aria-label={`Remove ${item.name} from cart`}
                >
                  ×
                </button>

              </article>
            );
          })}

        </div>


        {/* =========================
            CART SUMMARY
            ========================= */}

        <aside className="cart-summary">

          <div className="cart-summary-header">
            <p>ORDER SUMMARY</p>

            <h2>
              Cart Summary
            </h2>
          </div>


          <div className="cart-summary-row">

            <span>
              Items
            </span>

            <strong>
              {totalItems}
            </strong>

          </div>


          <div className="cart-summary-row">

            <span>
              Subtotal
            </span>

            <strong>
              {formatPrice(totalPrice)}
            </strong>

          </div>


          <div className="cart-summary-divider"></div>


          <div className="cart-summary-total">

            <span>
              Total
            </span>

            <strong>
              {formatPrice(totalPrice)}
            </strong>

          </div>


          <Link
            to="/checkout"
            className="cart-checkout-button"
          >
            PROCEED TO CHECKOUT
            <span>→</span>
          </Link>


          <Link
            to="/shop"
            className="cart-continue-button"
          >
            ← CONTINUE SHOPPING
          </Link>


          <div className="cart-security">

            <span>✓</span>

            <p>
              Your cart items are saved automatically.
            </p>

          </div>

        </aside>

      </section>

    </main>
  );
}

export default Cart;

