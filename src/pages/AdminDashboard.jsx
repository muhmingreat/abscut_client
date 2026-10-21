import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../services/api";
import LoadingScreen from "./LoadingScreen";
import "./AdminDashboard.css";
function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest(
          "/admin/dashboard"
        );

        if (!data.success || !data.stats) {
          throw new Error(
            data.message ||
              "Unable to load dashboard."
          );
        }

        setStats(data.stats);
      } catch (err) {
        console.error(
          "Admin dashboard error:",
          err
        );

        setError(
          err.message ||
            "Unable to load the admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <LoadingScreen
        message="Loading your ABS CUT dashboard..."
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

          <h1>Dashboard Unavailable</h1>

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(
        stats.totalRevenue
      ),
      icon: "₦",
      className: "revenue",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: "◈",
      className: "orders",
    },
    {
      title: "Customers",
      value: stats.totalCustomers,
      icon: "♙",
      className: "customers",
    },
    {
      title: "Products",
      value: stats.totalProducts,
      icon: "◇",
      className: "products",
    },
  ];

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">

        {/* SIDEBAR */}

        <aside className="admin-sidebar">

          <div className="admin-brand">
            <div className="admin-brand-mark">
              A
            </div>

            <div>
              <strong>ABS CUT</strong>
              <span>ADMIN PANEL</span>
            </div>
          </div>

          <nav className="admin-nav">

            <Link
              to="/admin"
              className="admin-nav-link active"
            >
              <span>▦</span>
              Dashboard
            </Link>

            <Link
              to="/admin/orders"
              className="admin-nav-link"
            >
              <span>◈</span>
              Orders
            </Link>

            <Link
              to="/admin/products"
              className="admin-nav-link"
            >
              <span>◇</span>
              Products
            </Link>

            <Link
              to="/admin/customers"
              className="admin-nav-link"
            >
              <span>♙</span>
              Customers
            </Link>

            <Link
              to="/admin/payments"
              className="admin-nav-link"
            >
              <span>₦</span>
              Payments
            </Link>

            <Link
              to="/admin/custom-orders"
              className="admin-nav-link"
            >
              <span>✂</span>
              Custom Orders
            </Link>

            <Link
              to="/admin/inventory"
              className="admin-nav-link"
            >
              <span>▣</span>
              Inventory
            </Link>

            <Link
              to="/admin/chat"
              className="admin-nav-link"
            >
              <span>▣</span>
              Chat
            </Link>

            <Link
              to="/admin/reports"
              className="admin-nav-link"
            >
              <span>⌁</span>
              Reports
            </Link>

          </nav>

          <div className="admin-sidebar-footer">
            <Link
              to="/"
              className="admin-store-link"
            >
              ← Back to Store
            </Link>
          </div>

        </aside>

        {/* MAIN CONTENT */}

        <section className="admin-main">

          <header className="admin-header">

            <div>
              <span className="admin-eyebrow">
                ABS CUT MANAGEMENT
              </span>

              <h1>Dashboard</h1>

              <p>
                Welcome back. Here's what's
                happening with your business.
              </p>
            </div>

            <div className="admin-header-badge">
              <span></span>
              Admin
            </div>

          </header>

          {/* STATISTICS */}

          <section className="admin-stat-grid">

            {statCards.map((card, index) => (
              <article
                key={card.title}
                className={`admin-stat-card ${card.className}`}
                style={{
                  animationDelay:
                    `${index * 0.08}s`,
                }}
              >
                <div className="admin-stat-top">

                  <span className="admin-stat-title">
                    {card.title}
                  </span>

                  <div className="admin-stat-icon">
                    {card.icon}
                  </div>

                </div>

                <strong className="admin-stat-value">
                  {card.value}
                </strong>

                <div className="admin-stat-line">
                  <span></span>
                </div>

              </article>
            ))}

          </section>

          {/* BUSINESS OVERVIEW */}

          <section className="admin-overview-grid">

            <article className="admin-panel admin-orders-panel">

              <div className="admin-panel-header">

                <div>
                  <span>
                    ORDER ACTIVITY
                  </span>

                  <h2>Order Overview</h2>
                </div>

                <Link to="/admin/orders">
                  View All →
                </Link>

              </div>

              <div className="admin-order-summary">

                <div className="admin-summary-item">

                  <div className="admin-summary-icon pending">
                    !
                  </div>

                  <div>
                    <strong>
                      {stats.pendingOrders}
                    </strong>

                    <span>
                      Pending Orders
                    </span>
                  </div>

                </div>

                <div className="admin-summary-item">

                  <div className="admin-summary-icon paid">
                    ✓
                  </div>

                  <div>
                    <strong>
                      {stats.paidOrders}
                    </strong>

                    <span>
                      Paid Orders
                    </span>
                  </div>

                </div>

              </div>

            </article>

            <article className="admin-panel admin-revenue-panel">

              <div className="admin-panel-header">

                <div>
                  <span>
                    REVENUE
                  </span>

                  <h2>Business Revenue</h2>
                </div>

                <div className="admin-revenue-icon">
                  ₦
                </div>

              </div>

              <div className="admin-revenue-value">
                {formatCurrency(
                  stats.totalRevenue
                )}
              </div>

              <p>
                Total revenue from successfully
                paid orders.
              </p>

              <div className="admin-revenue-decoration">
                <span></span>
                <span></span>
                <span></span>
              </div>

            </article>

          </section>

          {/* QUICK ACTIONS */}

          <section className="admin-panel admin-quick-panel">

            <div className="admin-panel-header">

              <div>
                <span>
                  MANAGEMENT
                </span>

                <h2>Quick Actions</h2>
              </div>

            </div>

            <div className="admin-quick-grid">

              <Link
                to="/admin/products"
                className="admin-quick-card"
              >
                <span>◇</span>
                <strong>Add Product</strong>
                <small>
                  Manage your clothing catalog
                </small>
              </Link>

              <Link
                to="/admin/orders"
                className="admin-quick-card"
              >
                <span>◈</span>
                <strong>Manage Orders</strong>
                <small>
                  Review and update orders
                </small>
              </Link>

              <Link
                to="/admin/custom-orders"
                className="admin-quick-card"
              >
                <span>✂</span>
                <strong>Custom Orders</strong>
                <small>
                  Manage tailoring requests
                </small>
              </Link>

              <Link
                to="/admin/inventory"
                className="admin-quick-card"
              >
                <span>▣</span>
                <strong>Inventory</strong>
                <small>
                  Monitor available stock
                </small>
              </Link>

            </div>

          </section>

        </section>

      </div>
    </main>
  );
}

export default AdminDashboard;

