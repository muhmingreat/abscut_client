
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../services/api";
import LoadingScreen from "./LoadingScreen";
import ReceiptModal from "./ReceiptModal";
import "./MyOrder.css";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // RECEIPT MODAL
  // =========================================================

  const [selectedReceiptOrder, setSelectedReceiptOrder] =
    useState(null);

  // =========================================================
  // FORMAT PRICE
  // =========================================================

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // =========================================================
  // LOAD ORDERS FROM MONGODB
  // =========================================================

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest(
          "/orders/my-orders"
        );

        if (!data.success) {
          throw new Error(
            data.message ||
              "Unable to load your orders."
          );
        }

        setOrders(data.orders || []);
      } catch (error) {
        console.error(
          "ABS CUT orders error:",
          error
        );

        setError(
          error.message ||
            "Unable to load your orders."
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // =========================================================
  // OPEN RECEIPT
  // =========================================================

  const handleOpenReceipt = (order) => {
    setSelectedReceiptOrder(order);
  };

  // =========================================================
  // CLOSE RECEIPT
  // =========================================================

  const handleCloseReceipt = () => {
    setSelectedReceiptOrder(null);
  };

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <LoadingScreen
        message="Loading your ABS CUT orders..."
      />
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <main className="my-orders-page">

        <section className="my-orders-empty">

          <div className="my-orders-empty-icon">
            !
          </div>

          <p className="my-orders-label">
            ABS CUT CUSTOMER AREA
          </p>

          <h1>
            Unable To Load Orders
          </h1>

          <p>
            {error}
          </p>

          <Link
            to="/shop"
            className="my-orders-shop-button"
          >
            SHOP COLLECTION
          </Link>

        </section>

      </main>
    );
  }

  // =========================================================
  // EMPTY ORDERS
  // =========================================================

  if (orders.length === 0) {
    return (
      <main className="my-orders-page">

        <section className="my-orders-empty">

          <div className="my-orders-empty-icon">
            📦
          </div>

          <p className="my-orders-label">
            ABS CUT CUSTOMER AREA
          </p>

          <h1>
            No Orders Yet
          </h1>

          <p>
            You haven't placed an order yet.
            Explore our collection and find
            your next ABS CUT style.
          </p>

          <Link
            to="/shop"
            className="my-orders-shop-button"
          >
            SHOP COLLECTION
          </Link>

        </section>

      </main>
    );
  }

  // =========================================================
  // ORDERS PAGE
  // =========================================================

  return (
    <>
      <main className="my-orders-page">

        {/* =========================
            HEADER
        ========================= */}

        <section className="my-orders-header">

          <div>

            <p className="my-orders-label">
              ABS CUT CUSTOMER AREA
            </p>

            <h1>
              My Orders
            </h1>

            <span>
              View your orders and track
              their progress.
            </span>

          </div>

          <div className="orders-count">

            <strong>
              {orders.length}
            </strong>

            <span>
              {orders.length === 1
                ? "Order"
                : "Orders"}
            </span>

          </div>

        </section>

        {/* =========================
            ORDERS
        ========================= */}

        <section className="orders-list">

          {orders.map((order) => {

            const totalItems =
              (order.items || []).reduce(
                (total, item) =>
                  total +
                  Number(item.quantity || 0),
                0
              );

            const receiptAvailable =
              order.paymentStatus === "paid" &&
              order.orderStatus === "confirmed";

            return (
              <article
                className="order-card"
                key={order._id}
              >

                {/* =========================
                    ORDER TOP
                ========================= */}

                <div className="order-card-top">

                  <div>

                    <span>
                      ORDER NUMBER
                    </span>

                    <h2>
                      {order._id}
                    </h2>

                  </div>

                  <div className="order-status">

                    <span>
                      STATUS
                    </span>

                    <strong
                      className={`order-status-${order.orderStatus}`}
                    >
                      {order.orderStatus}
                    </strong>

                  </div>

                </div>

                {/* =========================
                    ORDER INFO
                ========================= */}

                <div className="order-card-info">

                  <div>

                    <span>
                      DATE
                    </span>

                    <strong>
                      {formatDate(
                        order.createdAt
                      )}
                    </strong>

                  </div>

                  <div>

                    <span>
                      ITEMS
                    </span>

                    <strong>
                      {totalItems}
                    </strong>

                  </div>

                  <div>

                    <span>
                      TOTAL
                    </span>

                    <strong>
                      {formatPrice(
                        order.total
                      )}
                    </strong>

                  </div>

                  <div>

                    <span>
                      PAYMENT
                    </span>

                    <strong
                      className={`order-payment-${order.paymentStatus}`}
                    >
                      {order.paymentStatus}
                    </strong>

                  </div>

                </div>

                {/* =========================
                    PRODUCTS
                ========================= */}

                <div className="order-card-products">

                  {(order.items || [])
                    .slice(0, 3)
                    .map((item, index) => (

                      <div
                        className="order-product-preview"
                        key={`${item.product}-${index}`}
                      >

                        <div className="order-product-image">

                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                            />
                          ) : (
                            <span>
                              ABS
                            </span>
                          )}

                        </div>

                        <div>

                          <strong>
                            {item.name}
                          </strong>

                          <span>
                            Qty: {item.quantity}
                          </span>

                        </div>

                      </div>

                    ))}

                  {order.items?.length > 3 && (
                    <div className="order-more-products">
                      +{order.items.length - 3} more
                    </div>
                  )}

                </div>

                {/* =========================
                    ACTIONS
                ========================= */}

                <div className="order-card-actions">

                  <Link
                    to={`/track-order/${order._id}`}
                    className="order-track-button"
                  >
                    TRACK ORDER
                    <span>
                      →
                    </span>
                  </Link>

                  <Link
                    to={`/order-confirmation/${order._id}`}
                    className="order-view-button"
                  >
                    VIEW ORDER
                  </Link>

                  {/* =========================
                      RECEIPT
                  ========================= */}

                  {receiptAvailable && (
                    <button
                      type="button"
                      className="order-receipt-button"
                      onClick={() =>
                        handleOpenReceipt(order)
                      }
                    >
                      VIEW RECEIPT
                    </button>
                  )}

                </div>

              </article>
            );
          })}

        </section>

        {/* =========================
            BOTTOM CTA
        ========================= */}

        <section className="my-orders-cta">

          <div>

            <p>
              ABS CUT COLLECTION
            </p>

            <h2>
              Looking for your next style?
            </h2>

            <span>
              Explore our latest native
              fashion collection.
            </span>

          </div>

          <Link to="/shop">

            SHOP COLLECTION

            <span>
              →
            </span>

          </Link>

        </section>

      </main>

      {/* =====================================================
          SECURE RECEIPT MODAL
      ===================================================== */}

      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          onClose={handleCloseReceipt}
        />
      )}
    </>
  );
}

export default MyOrders;



