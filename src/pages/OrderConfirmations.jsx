
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

import { apiRequest } from "../services/api";
import LoadingScreen from "./LoadingScreen";
import ReceiptModal from "./ReceiptModal";
import "./OrderConfirmations.css";

function OrderConfirmation() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

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
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // =========================================================
  // LOAD ORDER FROM MONGODB
  // =========================================================

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest(`/orders/${orderId}`);

        if (!data.success || !data.order) {
          throw new Error(
            data.message || "Unable to load your order."
          );
        }

        setOrder(data.order);

        // Save latest order locally too
        localStorage.setItem(
          "absCutLatestOrder",
          JSON.stringify(data.order)
        );
      } catch (error) {
        console.error(
          "Unable to load order:",
          error
        );

        setError(
          error.message ||
            "Unable to load your order."
        );
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <LoadingScreen
        message="Loading your order confirmation..."
      />
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error || !order) {
    return (
      <main className="order-confirmation-page">

        <section className="order-confirmation-hero">

          <div className="confirmation-success-icon">
            <span>!</span>
          </div>

          <p className="confirmation-label">
            ABS CUT
          </p>

          <h1>
            Unable To Load Order
          </h1>

          <p className="confirmation-message">
            {error ||
              "We could not find this order."}
          </p>

        </section>

        <section className="confirmation-content">

          <div className="confirmation-actions">

            <Link
              to="/my-orders"
              className="confirmation-primary"
            >
              MY ORDERS
              <span>→</span>
            </Link>

            <Link
              to="/shop"
              className="confirmation-secondary"
            >
              CONTINUE SHOPPING
            </Link>

          </div>

        </section>

      </main>
    );
  }

  // =========================================================
  // CALCULATE TOTAL ITEMS
  // =========================================================

  const totalItems = order.items.reduce(
    (total, item) =>
      total + Number(item.quantity),
    0
  );

  // =========================================================
  // RECEIPT ACCESS
  // =========================================================

  const receiptAvailable =
    order.paymentStatus === "paid" &&
    order.orderStatus === "confirmed";

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="order-confirmation-page">

      {/* =========================
          SUCCESS HERO
      ========================= */}

      <section className="order-confirmation-hero">

        <div className="confirmation-success-icon">
          <span>✓</span>
        </div>

        <p className="confirmation-label">
          ABS CUT
        </p>

        <h1>
          Order Received
        </h1>

        <p className="confirmation-message">
          Thank you for choosing ABS CUT.
          Your order has been successfully
          received and is now being reviewed.
        </p>

        <div className="confirmation-order-number">

          <span>
            ORDER NUMBER
          </span>

          <strong>
            {order._id}
          </strong>

        </div>

      </section>

      {/* =========================
          ORDER CONTENT
      ========================= */}

      <section className="confirmation-content">

        {/* =========================
            ORDER DETAILS
        ========================= */}

        <div className="confirmation-card">

          <div className="confirmation-card-header">

            <div>

              <p>
                ORDER DETAILS
              </p>

              <h2>
                Your Order
              </h2>

            </div>

            <span className="confirmation-status">
              {order.orderStatus}
            </span>

          </div>

          <div className="confirmation-meta">

            <div>

              <span>
                Order Date
              </span>

              <strong>
                {formatDate(order.createdAt)}
              </strong>

            </div>

            <div>

              <span>
                Items
              </span>

              <strong>
                {totalItems}
              </strong>

            </div>

            <div>

              <span>
                Payment
              </span>

              <strong>
                {order.paymentStatus}
              </strong>

            </div>

          </div>

        </div>

        {/* =========================
            PRODUCTS
        ========================= */}

        <div className="confirmation-card">

          <div className="confirmation-card-header">

            <div>

              <p>
                ORDERED ITEMS
              </p>

              <h2>
                Your Selection
              </h2>

            </div>

          </div>

          <div className="confirmation-products">

            {order.items.map(
              (item, index) => (

                <div
                  className="confirmation-product"
                  key={`${item.product}-${index}`}
                >

                  <div className="confirmation-product-image">

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

                  <div className="confirmation-product-info">

                    <h3>
                      {item.name}
                    </h3>

                    <p>
                      Quantity: {item.quantity}
                    </p>

                  </div>

                  <strong>
                    {formatPrice(
                      item.price *
                        item.quantity
                    )}
                  </strong>

                </div>

              )
            )}

          </div>

          <div className="confirmation-total">

            <span>
              Order Total
            </span>

            <strong>
              {formatPrice(order.total)}
            </strong>

          </div>

        </div>

        {/* =========================
            CUSTOMER & DELIVERY
        ========================= */}

        <div className="confirmation-details-grid">

          {/* CUSTOMER */}

          <div className="confirmation-card">

            <div className="confirmation-card-header">

              <div>

                <p>
                  CUSTOMER
                </p>

                <h2>
                  Customer Details
                </h2>

              </div>

            </div>

            <div className="confirmation-detail-list">

              <div>

                <span>
                  Name
                </span>

                <strong>
                  {order.customer.firstName}{" "}
                  {order.customer.lastName}
                </strong>

              </div>

              <div>

                <span>
                  Phone
                </span>

                <strong>
                  {order.customer.phone}
                </strong>

              </div>

              <div>

                <span>
                  Email
                </span>

                <strong>
                  {order.customer.email}
                </strong>

              </div>

            </div>

          </div>

          {/* DELIVERY */}

          <div className="confirmation-card">

            <div className="confirmation-card-header">

              <div>

                <p>
                  DELIVERY
                </p>

                <h2>
                  Delivery Details
                </h2>

              </div>

            </div>

            <div className="confirmation-detail-list">

              <div>

                <span>
                  Method
                </span>

                <strong>
                  {order.deliveryMethod ===
                  "delivery"
                    ? "Home Delivery"
                    : "Store Pickup"}
                </strong>

              </div>

              {order.deliveryMethod ===
                "delivery" && (
                <>

                  <div>

                    <span>
                      Address
                    </span>

                    <strong>
                      {
                        order
                          .shippingAddress
                          .address
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Location
                    </span>

                    <strong>
                      {
                        order
                          .shippingAddress
                          .city
                      }
                      ,{" "}
                      {
                        order
                          .shippingAddress
                          .state
                      }
                    </strong>

                  </div>

                </>
              )}

            </div>

          </div>

        </div>

        {/* =========================
            WHAT HAPPENS NEXT
        ========================= */}

        <div className="confirmation-next">

          <div className="confirmation-next-header">

            <p>
              WHAT HAPPENS NEXT
            </p>

            <h2>
              Your Order Journey
            </h2>

          </div>

          <div className="confirmation-steps">

            <div className="confirmation-step active">

              <span>
                01
              </span>

              <div>

                <strong>
                  Order Received
                </strong>

                <p>
                  Your order has been received
                  by ABS CUT.
                </p>

              </div>

            </div>

            <div className="confirmation-step">

              <span>
                02
              </span>

              <div>

                <strong>
                  Order Review
                </strong>

                <p>
                  Our team will review your
                  order details.
                </p>

              </div>

            </div>

            <div className="confirmation-step">

              <span>
                03
              </span>

              <div>

                <strong>
                  Processing
                </strong>

                <p>
                  Your order will move into
                  production.
                </p>

              </div>

            </div>

            <div className="confirmation-step">

              <span>
                04
              </span>

              <div>

                <strong>
                  Ready
                </strong>

                <p>
                  You will be notified when
                  your order is ready.
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* =========================
            ACTIONS
        ========================= */}

        <div className="confirmation-actions">

          {/* RECEIPT */}

          {receiptAvailable && (

            <button
              type="button"
              className="confirmation-primary"
              onClick={() =>
                setShowReceipt(true)
              }
            >
              VIEW RECEIPT
              <span>→</span>
            </button>

          )}

          {/* TRACK ORDER */}

          <Link
            to={`/track-order/${order._id}`}
            className="confirmation-primary"
          >
            TRACK ORDER
            <span>→</span>
          </Link>

          {/* MY ORDERS */}

          <Link
            to="/my-orders"
            className="confirmation-secondary"
          >
            MY ORDERS
          </Link>

          {/* SHOP */}

          <Link
            to="/shop"
            className="confirmation-secondary"
          >
            CONTINUE SHOPPING
          </Link>

        </div>

      </section>

      {/* =========================
          RECEIPT MODAL
      ========================= */}

      {showReceipt && receiptAvailable && (

        <ReceiptModal
          order={order}
          onClose={() =>
            setShowReceipt(false)
          }
        />

      )}

    </main>
  );
}

export default OrderConfirmation;


