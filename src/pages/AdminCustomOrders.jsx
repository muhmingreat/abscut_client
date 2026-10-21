import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AdminSidebar from "../components/AdminSidebar";
import { apiRequest } from "../services/api";
import "./AdminCustomOrders.css";

function AdminCustomOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCustomOrders();
  }, []);

  const loadCustomOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(
        "/custom-orders/admin"
      );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Unable to load custom orders."
        );
      }

      setOrders(response.customOrders || []);
    } catch (error) {
      console.error(
        "Load admin custom orders error:",
        error
      );

      setError(
        error.message ||
          "Unable to load custom orders."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusClass = (status) => {
    if (!status) {
      return "pending";
    }

    return status
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/,/g, "");
  };

  const pendingCount = orders.filter(
    (order) =>
      order.status === "Pending Review"
  ).length;

  const quotedCount = orders.filter(
    (order) =>
      order.quotation !== null &&
      order.quotation !== undefined
  ).length;

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">

        {/* SIDEBAR */}

        <AdminSidebar />

        {/* MAIN ADMIN AREA */}

        <section className="admin-main">

          {/* HEADER */}

          <div className="admin-custom-orders-header">

            <div>

              <span className="admin-eyebrow">
                CUSTOM SERVICE
              </span>

              <h1>
                Custom Orders
              </h1>

              <p>
                Review and manage customer custom
                tailoring, embroidery and monogram
                requests.
              </p>

            </div>

            <div className="admin-custom-orders-header-stat">

              <span>
                TOTAL REQUESTS
              </span>

              <strong>
                {orders.length}
              </strong>

            </div>

          </div>


          {/* ERROR */}

          {error && (
            <div className="admin-custom-orders-error">

              <div>
                <strong>
                  Unable to load custom orders
                </strong>

                <span>
                  {error}
                </span>
              </div>

              <button
                type="button"
                onClick={loadCustomOrders}
              >
                TRY AGAIN
              </button>

            </div>
          )}


          {/* CONTENT */}

          {!error && (
            <>

              {/* SUMMARY */}

              <section className="admin-custom-orders-summary">

                <div className="admin-custom-summary-card">

                  <span>
                    TOTAL REQUESTS
                  </span>

                  <strong>
                    {orders.length}
                  </strong>

                  <small>
                    All custom requests
                  </small>

                </div>


                <div className="admin-custom-summary-card">

                  <span>
                    PENDING REVIEW
                  </span>

                  <strong>
                    {pendingCount}
                  </strong>

                  <small>
                    Waiting for review
                  </small>

                </div>


                <div className="admin-custom-summary-card">

                  <span>
                    QUOTED
                  </span>

                  <strong>
                    {quotedCount}
                  </strong>

                  <small>
                    Requests with quotation
                  </small>

                </div>

              </section>


              {/* LOADING */}

              {loading && (
                <div className="admin-custom-orders-loading">

                  <div className="admin-custom-orders-spinner"></div>

                  <h2>
                    Loading Custom Orders...
                  </h2>

                  <p>
                    Please wait while we retrieve
                    customer requests.
                  </p>

                </div>
              )}


              {/* EMPTY */}

              {!loading &&
                orders.length === 0 && (
                  <div className="admin-custom-orders-empty">

                    <div className="admin-custom-orders-empty-icon">
                      ✂
                    </div>

                    <h2>
                      No Custom Orders Yet
                    </h2>

                    <p>
                      Customer custom requests will
                      appear here when they are submitted.
                    </p>

                  </div>
                )}


              {/* ORDERS */}

              {!loading &&
                orders.length > 0 && (
                  <section className="admin-custom-orders-card">

                    {/* CARD HEADER */}

                    <div className="admin-custom-orders-card-header">

                      <div>

                        <span>
                          REQUEST MANAGEMENT
                        </span>

                        <h2>
                          Customer Requests
                        </h2>

                      </div>

                      <button
                        type="button"
                        className="admin-custom-orders-refresh"
                        onClick={loadCustomOrders}
                      >
                        <span>↻</span>
                        REFRESH
                      </button>

                    </div>


                    {/* TABLE */}

                    <div className="admin-custom-orders-table-wrapper">

                      <table className="admin-custom-orders-table">

                        <thead>

                          <tr>
                            <th>
                              CUSTOMER
                            </th>

                            <th>
                              OUTFIT
                            </th>

                            <th>
                              SERVICE
                            </th>

                            <th>
                              MATERIAL
                            </th>

                            <th>
                              STATUS
                            </th>

                            <th>
                              QUOTATION
                            </th>

                            <th>
                              DATE
                            </th>

                            <th>
                              ACTION
                            </th>
                          </tr>

                        </thead>

                        <tbody>

                          {orders.map(
                            (order) => (
                              <tr
                                key={
                                  order._id
                                }
                              >

                                {/* CUSTOMER */}

                                <td>

                                  <div className="admin-custom-customer">

                                    <div className="admin-custom-avatar">
                                      {order.user
                                        ?.firstName
                                        ?.charAt(
                                          0
                                        )
                                        ?.toUpperCase() ||
                                        "C"}
                                    </div>

                                    <div>

                                      <strong>
                                        {order.user
                                          ? `${order.user.firstName} ${order.user.lastName}`
                                          : "Unknown Customer"}
                                      </strong>

                                      <span>
                                        {order
                                          .user
                                          ?.email ||
                                          "No email"}
                                      </span>

                                      {order.user
                                        ?.phone && (
                                        <small>
                                          {
                                            order
                                              .user
                                              .phone
                                          }
                                        </small>
                                      )}

                                    </div>

                                  </div>

                                </td>


                                {/* OUTFIT */}

                                <td>

                                  <strong className="admin-custom-outfit">
                                    {order.outfitType ||
                                      "—"}
                                  </strong>

                                </td>


                                {/* SERVICE */}

                                <td>

                                  <span className="admin-custom-service">
                                    {order.serviceType ||
                                      "Custom Tailoring"}
                                  </span>

                                </td>


                                {/* MATERIAL */}

                                <td>

                                  <span className="admin-custom-material">
                                    {order.materialSource ||
                                      "—"}
                                  </span>

                                </td>


                                {/* STATUS */}

                                <td>

                                  <span
                                    className={`admin-custom-status ${getStatusClass(
                                      order.status
                                    )}`}
                                  >
                                    <i></i>

                                    {order.status ||
                                      "Pending Review"}
                                  </span>

                                </td>


                                {/* QUOTATION */}

                                <td>

                                  <strong className="admin-custom-quotation">

                                    {order.quotation !==
                                      null &&
                                    order.quotation !==
                                      undefined
                                      ? formatCurrency(
                                          order.quotation
                                        )
                                      : "Not quoted"}

                                  </strong>

                                </td>


                                {/* DATE */}

                                <td>

                                  <span className="admin-custom-date">
                                    {formatDate(
                                      order.createdAt
                                    )}
                                  </span>

                                </td>


                                {/* ACTION */}

                                <td>

                                  <Link
                                    to={`/admin/custom-orders/${order._id}`}
                                    className="admin-custom-view-button"
                                  >
                                    VIEW

                                    <span>
                                      →
                                    </span>

                                  </Link>

                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                      </table>

                    </div>

                  </section>
                )}

            </>
          )}

        </section>

      </div>
    </main>
  );
}

export default AdminCustomOrders;