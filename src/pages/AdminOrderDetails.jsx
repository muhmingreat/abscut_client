import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../services/api";
import LoadingScreen from "./LoadingScreen";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminOrderDetails.css";

function AdminOrderDetails() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest(`/admin/orders/${id}`);

        if (!data.success || !data.order) {
          throw new Error(data.message || "Unable to load order.");
        }

        setOrder(data.order);
      } catch (err) {
        console.error("Admin order details error:", err);

        setError(err.message || "Unable to load order details.");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const updateOrderStatus = async (newStatus) => {
    if (!order || newStatus === order.orderStatus) {
      return;
    }

    try {
      setStatusUpdating(true);
      setStatusMessage("");
      setStatusError("");

      const data = await apiRequest(`/admin/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          orderStatus: newStatus,
        }),
      });

      if (!data.success || !data.order) {
        throw new Error(data.message || "Unable to update order status.");
      }

      setOrder(data.order);

      setStatusMessage("Order status updated successfully.");
    } catch (err) {
      console.error("Order status update error:", err);

      setStatusError(err.message || "Unable to update order status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const orderStatusSteps = [
    {
      key: "pending",
      label: "Pending",
      description: "Order received",
    },
    {
      key: "confirmed",
      label: "Confirmed",
      description: "Order accepted",
    },
    {
      key: "processing",
      label: "Processing",
      description: "Order being prepared",
    },
    {
      key: "shipped",
      label: "Shipped",
      description: "Order dispatched",
    },
    {
      key: "delivered",
      label: "Delivered",
      description: "Order completed",
    },
  ];

  const currentStatusIndex = orderStatusSteps.findIndex(
    (step) => step.key === order?.orderStatus,
  );

  if (loading) {
    return <LoadingScreen message="Loading order details..." />;
  }

  if (error) {
    return (
      <main className="admin-dashboard-page">
        <div className="admin-error-card">
          <div className="admin-error-icon">!</div>

          <h1>Order Unavailable</h1>

          <p>{error}</p>

          <Link to="/admin/orders" className="admin-error-back">
            ← BACK TO ORDERS
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar />

        <section className="admin-main">
          <div className="admin-order-detail-top">
            <Link to="/admin/orders" className="admin-back-link">
              ← Back to Orders
            </Link>

            <span className="admin-eyebrow">ORDER DETAILS</span>

            <h1>#{order._id.slice(-6).toUpperCase()}</h1>

            <p>Created {formatDate(order.createdAt)}</p>

            <div className="admin-order-status-control">
              <div className="admin-order-status-heading">
                <span>ORDER STATUS</span>
                <strong>{order.orderStatus}</strong>
              </div>

              <select
                value={order.orderStatus}
                onChange={(e) => updateOrderStatus(e.target.value)}
                disabled={statusUpdating}
              >
                <option value="pending">Pending</option>

                <option value="confirmed">Confirmed</option>

                <option value="processing">Processing</option>

                <option value="shipped">Shipped</option>

                <option value="delivered">Delivered</option>

                <option value="cancelled">Cancelled</option>
              </select>

              {statusUpdating && (
                <span className="admin-status-updating">Updating...</span>
              )}

              {statusMessage && (
                <span className="admin-status-success">✓ {statusMessage}</span>
              )}

              {statusError && (
                <span className="admin-status-error">{statusError}</span>
              )}
            </div>

            <div className="admin-order-status-timeline">
              <div className="admin-status-timeline-header">
                <div>
                  <span>ORDER PROGRESS</span>
                  <h2>Order Status Timeline</h2>
                </div>

                <div className="admin-status-timeline-current">
                  {order.orderStatus}
                </div>
              </div>

              <div className="admin-status-timeline-track">
                {orderStatusSteps.map((step, index) => {
                  const isCompleted = currentStatusIndex > index;

                  const isCurrent = currentStatusIndex === index;

                  const isLast = index === orderStatusSteps.length - 1;

                  return (
                    <div
                      className={`admin-status-step ${
                        isCompleted ? "completed" : ""
                      } ${isCurrent ? "current" : ""}`}
                      key={step.key}
                    >
                      <div className="admin-status-step-marker">
                        {isCompleted ? "✓" : index + 1}
                      </div>

                      <div className="admin-status-step-content">
                        <strong>{step.label}</strong>

                        <span>{step.description}</span>
                      </div>

                      {!isLast && (
                        <div
                          className={`admin-status-step-line ${
                            isCompleted ? "completed" : ""
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <section className="admin-order-detail-grid">
            <article className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <span>CUSTOMER</span>
                  <h2>Customer Information</h2>
                </div>
              </div>

              <div className="admin-detail-list">
                <div>
                  <span>Name</span>

                  <strong>
                    {order.customer?.firstName} {order.customer?.lastName}
                  </strong>
                </div>

                <div>
                  <span>Email</span>

                  <strong>{order.customer?.email}</strong>
                </div>

                <div>
                  <span>Phone</span>

                  <strong>{order.customer?.phone}</strong>
                </div>
              </div>
            </article>

            <article className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <span>DELIVERY</span>
                  <h2>Shipping Information</h2>
                </div>
              </div>

              <div className="admin-detail-list">
                <div>
                  <span>Method</span>

                  <strong>{order.deliveryMethod}</strong>
                </div>

                <div>
                  <span>Address</span>

                  <strong>{order.shippingAddress?.address || "—"}</strong>
                </div>

                <div>
                  <span>Location</span>

                  <strong>
                    {order.shippingAddress?.city || "—"}
                    {order.shippingAddress?.state
                      ? `, ${order.shippingAddress.state}`
                      : ""}
                  </strong>
                </div>
              </div>
            </article>
          </section>

          <section className="admin-panel admin-order-items-panel">
            <div className="admin-panel-header">
              <div>
                <span>ORDER ITEMS</span>
                <h2>Products</h2>
              </div>
            </div>

            <div className="admin-order-items">
              {order.items.map((item, index) => (
                <div
                  className="admin-order-item"
                  key={`${item.product?._id || item.product}-${index}`}
                >
                  <div className="admin-order-item-image">
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <span>ABS</span>
                    )}
                  </div>

                  <div className="admin-order-item-info">
                    <strong>{item.name}</strong>

                    <span>Quantity: {item.quantity}</span>
                  </div>

                  <div className="admin-order-item-price">
                    <span>
                      {formatCurrency(item.price)} × {item.quantity}
                    </span>

                    <strong>
                      {formatCurrency(item.price * item.quantity)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-order-bottom-grid">
            <article className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <span>PAYMENT</span>
                  <h2>Payment Information</h2>
                </div>
              </div>

              <div className="admin-payment-detail">
                <div>
                  <span>Status</span>

                  <span
                    className={`admin-status-badge payment-${order.paymentStatus}`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>

                <div>
                  <span>Reference</span>

                  <strong>{order.paymentReference || "—"}</strong>
                </div>

                <div>
                  <span>Transaction ID</span>

                  <strong>{order.paymentTransactionId || "—"}</strong>
                </div>

                <div>
                  <span>Paid At</span>

                  <strong>
                    {order.paidAt ? formatDate(order.paidAt) : "Not paid"}
                  </strong>
                </div>
              </div>
            </article>

            <article className="admin-panel admin-order-total-panel">
              <div className="admin-panel-header">
                <div>
                  <span>SUMMARY</span>
                  <h2>Order Total</h2>
                </div>
              </div>

              <div className="admin-total-list">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(order.subtotal)}</strong>
                </div>

                <div>
                  <span>Delivery</span>
                  <strong>{formatCurrency(order.deliveryFee)}</strong>
                </div>

                <div className="admin-grand-total">
                  <span>Total</span>
                  <strong>{formatCurrency(order.total)}</strong>
                </div>
              </div>
            </article>
          </section>

          {order.notes && (
            <section className="admin-panel admin-notes-panel">
              <div className="admin-panel-header">
                <div>
                  <span>CUSTOMER NOTE</span>
                  <h2>Order Notes</h2>
                </div>
              </div>

              <p>{order.notes}</p>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

export default AdminOrderDetails;
