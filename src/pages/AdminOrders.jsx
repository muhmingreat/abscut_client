
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "../services/api";
import LoadingScreen from "./LoadingScreen";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminOrders.css";

function AdminOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest(
          "/admin/orders"
        );

        if (!data.success) {
          throw new Error(
            data.message ||
              "Unable to load orders."
          );
        }

        setOrders(data.orders || []);
      } catch (err) {
        console.error(
          "Admin orders error:",
          err
        );

        setError(
          err.message ||
            "Unable to load admin orders."
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat(
      "en-NG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(date));
  };

  if (loading) {
    return (
      <LoadingScreen
        message="Loading customer orders..."
      />
    );
  }

  if (error) {
    return (
      <main className="admin-dashboard-page">
        <div className="admin-error-card">
          <div className="admin-error-icon">
            !
          </div>

          <h1>Orders Unavailable</h1>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
          >
            TRY AGAIN
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
     <AdminSidebar />

        <section className="admin-main">
          <header className="admin-header">
            <div>
              <span className="admin-eyebrow">
                ABS CUT MANAGEMENT
              </span>

              <h1>Orders</h1>

              <p>
                Manage customer orders and
                monitor their progress.
              </p>
            </div>

            <div className="admin-header-badge">
              <span></span>
              {orders.length} Orders
            </div>
          </header>

          <section className="admin-panel admin-orders-list-panel">
            <div className="admin-panel-header">
              <div>
                <span>ORDER MANAGEMENT</span>

                <h2>Customer Orders</h2>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="admin-empty-state">
                <div>◈</div>

                <h3>No Orders Yet</h3>

                <p>
                  Customer orders will appear
                  here when they are created.
                </p>
              </div>
            ) : (
              <div className="admin-orders-table-wrapper">
                <table className="admin-orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id}>
                        <td>
                          <strong>
                            #
                            {order._id
                              .slice(-6)
                              .toUpperCase()}
                          </strong>
                        </td>

                        <td>
                          <div className="admin-customer-cell">
                            <strong>
                              {order.customer
                                ?.firstName ||
                                order.user
                                  ?.firstName}{" "}
                              {order.customer
                                ?.lastName ||
                                order.user
                                  ?.lastName}
                            </strong>

                            <span>
                              {order.customer
                                ?.email ||
                                order.user
                                  ?.email}
                            </span>
                          </div>
                        </td>

                        <td>
                          <strong>
                            {formatCurrency(
                              order.total
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`admin-status-badge payment-${order.paymentStatus}`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`admin-status-badge order-${order.orderStatus}`}
                          >
                            {order.orderStatus}
                          </span>
                        </td>

                        <td>
                          <span className="admin-order-date">
                            {formatDate(
                              order.createdAt
                            )}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="admin-view-order-btn"
                            onClick={() =>
                              navigate(
                                `/admin/orders/${order._id}`
                              )
                            }
                          >
                            VIEW
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

export default AdminOrders;

