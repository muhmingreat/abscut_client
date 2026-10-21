import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../services/api";
import LoadingScreen from "./LoadingScreen";
import "./TrackOrder.css";

function TrackOrder() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // FORMAT PRICE
  // =========================================================

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price);
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
  // FORMAT DATE + TIME
  // =========================================================

  const formatDateTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
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

        const data = await apiRequest(
          `/orders/${orderId}`
        );

        if (!data.success || !data.order) {
          throw new Error(
            data.message ||
              "Unable to load this order."
          );
        }

        setOrder(data.order);

      } catch (error) {
        console.error(
          "ABS CUT track order error:",
          error
        );

        setError(
          error.message ||
            "Unable to load this order."
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
        message="Loading your ABS CUT order..."
      />
    );
  }

  // =========================================================
  // ORDER NOT FOUND / ERROR
  // =========================================================

  if (error || !order) {
    return (
      <main className="track-order-page">

        <section className="track-order-not-found">

          <div className="track-error-icon">
            !
          </div>

          <p className="track-order-label">
            ABS CUT ORDER TRACKING
          </p>

          <h1>
            Order Not Found
          </h1>

          <p>
            {error ||
              "We couldn't find this order."}
          </p>

          <strong className="missing-order-id">
            {orderId}
          </strong>

          <div className="track-not-found-actions">

            <Link
              to="/my-orders"
              className="track-primary-button"
            >
              VIEW MY ORDERS
            </Link>

            <Link
              to="/shop"
              className="track-secondary-button"
            >
              CONTINUE SHOPPING
            </Link>

          </div>

        </section>

      </main>
    );
  }

  // =========================================================
  // TOTAL ITEMS
  // =========================================================

  const totalItems = order.items.reduce(
    (total, item) =>
      total + Number(item.quantity),
    0
  );

  // =========================================================
  // ORDER STATUS
  // =========================================================

  /*
    Backend statuses:

    pending
    confirmed
    processing
    shipped
    delivered
    cancelled

    We map them into the existing ABS CUT
    tracking timeline.
  */

  const trackingSteps = [
    {
      key: "pending",
      title: "Order Received",
      description:
        "Your order has been received by ABS CUT.",
      icon: "✓",
    },

    {
      key: "confirmed",
      title: "Order Confirmed",
      description:
        "Your order has been reviewed and confirmed.",
      icon: "✓",
    },

    {
      key: "processing",
      title: "Processing",
      description:
        "Your order is being prepared for dispatch.",
      icon: "✦",
    },

    {
      key: "shipped",
      title: "Shipped",
      description:
        "Your order has been dispatched.",
      icon: "→",
    },

    {
      key: "delivered",
      title: "Delivered",
      description:
        "Your order has been delivered successfully.",
      icon: "✓",
    },
  ];

  const normalizedStatus =
    order.orderStatus?.toLowerCase() ||
    "pending";

  const currentStepIndex =
    trackingSteps.findIndex(
      (step) =>
        step.key === normalizedStatus
    );

  const activeStepIndex =
    currentStepIndex >= 0
      ? currentStepIndex
      : 0;

  const activeStep =
    trackingSteps[activeStepIndex];

  // =========================================================
  // DELIVERY METHOD
  // =========================================================

  const deliveryMethod =
    order.deliveryMethod === "pickup"
      ? "Store Pickup"
      : "Home Delivery";

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="track-order-page">

      {/* ==============================
          HEADER
      ============================== */}

      <section className="track-order-header">

        <div>

          <p className="track-order-label">
            ABS CUT ORDER TRACKING
          </p>

          <h1>
            Track Your Order
          </h1>

          <p className="track-order-intro">
            Follow the progress of your ABS CUT
            order from confirmation to completion.
          </p>

        </div>

        <div className="track-order-number">

          <span>
            ORDER NUMBER
          </span>

          <strong>
            {order._id}
          </strong>

        </div>

      </section>

      {/* ==============================
          ORDER STATUS HERO
      ============================== */}

      <section className="tracking-status-card">

        <div className="tracking-status-main">

          <div className="tracking-status-icon">
            {normalizedStatus === "delivered"
              ? "✓"
              : "↗"}
          </div>

          <div>

            <span>
              CURRENT STATUS
            </span>

            <h2>
              {activeStep.title}
            </h2>

            <p>
              {activeStep.description}
            </p>

          </div>

        </div>

        <div className="tracking-status-meta">

          <div>

            <span>
              ORDER DATE
            </span>

            <strong>
              {formatDate(order.createdAt)}
            </strong>

          </div>

          <div>

            <span>
              PAYMENT
            </span>

            <strong>
              {order.paymentStatus}
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

        </div>

      </section>

      {/* ==============================
          TRACKING TIMELINE
      ============================== */}

      <section className="tracking-section">

        <div className="tracking-section-heading">

          <div>

            <p>
              ORDER JOURNEY
            </p>

            <h2>
              Order Progress
            </h2>

          </div>

          <span>
            Step {activeStepIndex + 1} of{" "}
            {trackingSteps.length}
          </span>

        </div>

        <div className="tracking-timeline">

          {trackingSteps.map(
            (step, index) => {

              const isCompleted =
                index < activeStepIndex;

              const isCurrent =
                index === activeStepIndex;

              const isUpcoming =
                index > activeStepIndex;

              return (
                <div
                  className={`tracking-step ${
                    isCompleted
                      ? "completed"
                      : ""
                  } ${
                    isCurrent
                      ? "current"
                      : ""
                  } ${
                    isUpcoming
                      ? "upcoming"
                      : ""
                  }`}
                  key={step.key}
                >

                  <div className="tracking-step-marker">

                    <span>
                      {step.icon}
                    </span>

                  </div>

                  {index !==
                    trackingSteps.length -
                      1 && (
                    <div className="tracking-step-line">

                      <span
                        className={
                          isCompleted
                            ? "tracking-line-active"
                            : ""
                        }
                      ></span>

                    </div>
                  )}

                  <div className="tracking-step-content">

                    <div className="tracking-step-heading">

                      <h3>
                        {step.title}
                      </h3>

                      {isCompleted && (
                        <span className="tracking-complete-badge">
                          COMPLETED
                        </span>
                      )}

                      {isCurrent && (
                        <span className="tracking-current-badge">
                          CURRENT
                        </span>
                      )}

                    </div>

                    <p>
                      {step.description}
                    </p>

                    {isCurrent && (
                      <small>
                        Last recorded status:{" "}
                        {formatDateTime(
                          order.updatedAt ||
                            order.createdAt
                        )}
                      </small>
                    )}

                  </div>

                </div>
              );
            }
          )}

        </div>

      </section>

      {/* ==============================
          PRODUCTS
      ============================== */}

      <section className="tracking-products-section">

        <div className="tracking-section-heading">

          <div>

            <p>
              YOUR PURCHASE
            </p>

            <h2>
              Order Items
            </h2>

          </div>

          <span>
            {order.items.length}{" "}
            {order.items.length === 1
              ? "Product"
              : "Products"}
          </span>

        </div>

        <div className="tracking-products">

          {order.items.map(
            (item, index) => (

              <article
                className="tracking-product"
                key={`${item.product}-${index}`}
              >

                <div className="tracking-product-image">

                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                    />
                  ) : (
                    <span>
                      ABS CUT
                    </span>
                  )}

                </div>

                <div className="tracking-product-info">

                  <p>
                    ABS CUT COLLECTION
                  </p>

                  <h3>
                    {item.name}
                  </h3>

                  <span>
                    Quantity: {item.quantity}
                  </span>

                </div>

                <div className="tracking-product-price">

                  <span>
                    ITEM TOTAL
                  </span>

                  <strong>
                    {formatPrice(
                      item.price *
                        item.quantity
                    )}
                  </strong>

                </div>

              </article>

            )
          )}

        </div>

        <div className="tracking-total">

          <span>
            ORDER TOTAL
          </span>

          <strong>
            {formatPrice(order.total)}
          </strong>

        </div>

      </section>

      {/* ==============================
          CUSTOMER + DELIVERY
      ============================== */}

      <section className="tracking-information-grid">

        {/* CUSTOMER */}

        <div className="tracking-info-card">

          <div className="tracking-info-card-heading">

            <span className="tracking-info-icon">
              ◉
            </span>

            <div>

              <p>
                CUSTOMER
              </p>

              <h2>
                Customer Details
              </h2>

            </div>

          </div>

          <div className="tracking-info-details">

            <div>

              <span>
                NAME
              </span>

              <strong>
                {order.customer?.firstName}{" "}
                {order.customer?.lastName}
              </strong>

            </div>

            <div>

              <span>
                PHONE
              </span>

              <strong>
                {order.customer?.phone ||
                  "Not provided"}
              </strong>

            </div>

            <div>

              <span>
                EMAIL
              </span>

              <strong>
                {order.customer?.email ||
                  "Not provided"}
              </strong>

            </div>

          </div>

        </div>

        {/* DELIVERY */}

        <div className="tracking-info-card">

          <div className="tracking-info-card-heading">

            <span className="tracking-info-icon">
              ◆
            </span>

            <div>

              <p>
                DELIVERY
              </p>

              <h2>
                {deliveryMethod}
              </h2>

            </div>

          </div>

          <div className="tracking-info-details">

            {order.deliveryMethod ===
            "pickup" ? (
              <div>

                <span>
                  PICKUP
                </span>

                <strong>
                  ABS CUT Store
                </strong>

              </div>
            ) : (
              <>

                <div>

                  <span>
                    ADDRESS
                  </span>

                  <strong>
                    {order.shippingAddress
                      ?.address ||
                      "Not provided"}
                  </strong>

                </div>

                <div>

                  <span>
                    LOCATION
                  </span>

                  <strong>
                    {order.shippingAddress
                      ?.city || ""},{" "}
                    {order.shippingAddress
                      ?.state || ""}
                  </strong>

                </div>

              </>
            )}

          </div>

        </div>

      </section>

      {/* ==============================
          NOTES
      ============================== */}

      {order.notes && (
        <section className="tracking-notes">

          <div>

            <p>
              ORDER NOTES
            </p>

            <h2>
              Additional Information
            </h2>

          </div>

          <span>
            {order.notes}
          </span>

        </section>
      )}

      {/* ==============================
          ACTIONS
      ============================== */}

      <section className="tracking-actions">

        <Link
          to="/my-orders"
          className="track-primary-button"
        >
          ← MY ORDERS
        </Link>

        <Link
          to="/shop"
          className="track-secondary-button"
        >
          SHOP COLLECTION
          <span>
            →
          </span>
        </Link>

      </section>

      {/* ==============================
          FOOTER NOTE
      ============================== */}

      <section className="tracking-footer-note">

        <span>
          ✓
        </span>

        <p>
          Your order information is securely
          connected to your ABS CUT account.
          Order status updates will appear here
          as your order progresses.
        </p>

      </section>

    </main>
  );
}

export default TrackOrder;
