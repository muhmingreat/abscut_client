
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../services/api";
import "./MyCustomOrders.css";

function MyCustomOrders() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * =====================================================
   * LOAD CUSTOM ORDERS
   * =====================================================
   */

  const loadCustomOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(
        "/custom-orders",
      );

      console.log(
        "MY CUSTOM ORDERS:",
        response.customOrders,
      );

      setRequests(
        response.customOrders || [],
      );
    } catch (error) {
      console.error(
        "Load custom orders error:",
        error,
      );

      setError(
        error.message ||
          "Unable to load your custom orders.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomOrders();
  }, []);

  /*
   * =====================================================
   * DATE
   * =====================================================
   */

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  };

  /*
   * =====================================================
   * CURRENCY
   * =====================================================
   */

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  /*
   * =====================================================
   * STATUS CLASS
   * =====================================================
   */

  const getStatusClass = (status) => {
    if (!status) return "pending";

    return status
      .toLowerCase()
      .replace(/\s+/g, "-");
  };

  /*
   * =====================================================
   * BALANCE
   * =====================================================
   */

  const getBalance = (request) => {
    const quotation =
      Number(request.quotation || 0);

    const amountPaid =
      Number(request.amountPaid || 0);

    return Math.max(
      quotation - amountPaid,
      0,
    );
  };

  /*
   * =====================================================
   * ORDER SUMMARY
   * =====================================================
   */

  const summary = useMemo(() => {
    const total = requests.length;

    const active = requests.filter(
      (request) =>
        ![
          "Completed",
          "Cancelled",
        ].includes(request.status),
    ).length;

    const completed = requests.filter(
      (request) =>
        request.status === "Completed",
    ).length;

    return {
      total,
      active,
      completed,
    };
  }, [requests]);

  /*
   * =====================================================
   * LOADING STATE
   * =====================================================
   */

  if (loading) {
    return (
      <main className="my-custom-orders-page">

        <section className="empty-custom-orders">

          <p className="custom-orders-label">
            ABS CUT CUSTOM SERVICE
          </p>

          <div className="custom-orders-loading">
            <span className="custom-orders-spinner" />
          </div>

          <h1>
            Loading Your Orders
          </h1>

          <p>
            Please wait while we load your
            custom order requests.
          </p>

        </section>

      </main>
    );
  }

  /*
   * =====================================================
   * ERROR STATE
   * =====================================================
   */

  if (error) {
    return (
      <main className="my-custom-orders-page">

        <section className="empty-custom-orders custom-orders-error">

          <p className="custom-orders-label">
            ABS CUT CUSTOM SERVICE
          </p>

          <h1>
            Unable to Load Orders
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="custom-orders-create-button"
            onClick={loadCustomOrders}
          >
            TRY AGAIN
          </button>

        </section>

      </main>
    );
  }

  /*
   * =====================================================
   * EMPTY STATE
   * =====================================================
   */

  if (requests.length === 0) {
    return (
      <main className="my-custom-orders-page">

        <section className="empty-custom-orders">

          <p className="custom-orders-label">
            ABS CUT CUSTOM SERVICE
          </p>

          <h1>
            No Custom Requests Yet
          </h1>

          <p>
            You haven't submitted a custom outfit
            request yet. Create your first request
            and let ABS CUT bring your design to life.
          </p>

          <Link
            to="/custom-order"
            className="custom-orders-create-button"
          >
            CREATE CUSTOM ORDER
          </Link>

        </section>

      </main>
    );
  }

  /*
   * =====================================================
   * PAGE
   * =====================================================
   */

  return (
    <main className="my-custom-orders-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <section className="my-custom-orders-header">

        <p className="custom-orders-label">
          ABS CUT CUSTOM SERVICE
        </p>

        <h1>
          My Custom Orders
        </h1>

        <span>
          View and manage your custom outfit
          requests.
        </span>

      </section>

      {/* =========================================
          SUMMARY
      ========================================= */}

      <section className="custom-orders-summary">

        <div className="custom-orders-summary-card">

          <span>
            Total Requests
          </span>

          <strong>
            {summary.total}
          </strong>

        </div>

        <div className="custom-orders-summary-card">

          <span>
            Active Orders
          </span>

          <strong>
            {summary.active}
          </strong>

        </div>

        <div className="custom-orders-summary-card">

          <span>
            Completed
          </span>

          <strong>
            {summary.completed}
          </strong>

        </div>

      </section>

      {/* =========================================
          ORDERS
      ========================================= */}

      <section className="custom-orders-container">

        {requests.map((request) => {

          const quotation =
            Number(
              request.quotation || 0,
            );

          const amountPaid =
            Number(
              request.amountPaid || 0,
            );

          const balance =
            getBalance(request);

          const isPaid =
            request.paymentStatus ===
            "Paid";

          const isCancelled =
            request.status ===
            "Cancelled";

          return (
            <article
              className="custom-order-card"
              key={request._id}
            >

              {/* =================================
                  CARD HEADER
              ================================= */}

              <div className="custom-order-card-top">

                <div>

                  <span>
                    REQUEST NUMBER
                  </span>

                  <h2>
                    {request._id}
                  </h2>

                </div>

                <div className="custom-order-status">

                  <span>
                    STATUS
                  </span>

                  <strong
                    className={`status-${getStatusClass(
                      request.status,
                    )}`}
                  >
                    {request.status ||
                      "Pending Review"}
                  </strong>

                </div>

              </div>

              {/* =================================
                  ORDER DETAILS
              ================================= */}

              <div className="custom-order-card-info">

                <div>

                  <span>
                    Outfit Type
                  </span>

                  <strong>
                    {request.outfitType ||
                      "—"}
                  </strong>

                </div>

                <div>

                  <span>
                    Fabric
                  </span>

                  <strong>
                    {request.fabric ||
                      "—"}
                  </strong>

                </div>

                <div>

                  <span>
                    Colour
                  </span>

                  <strong>
                    {request.color ||
                      "—"}
                  </strong>

                </div>

                <div>

                  <span>
                    Date
                  </span>

                  <strong>
                    {formatDate(
                      request.createdAt,
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Embroidery
                  </span>

                  <strong>
                    {request.embroidery ===
                    "yes"
                      ? "Requested"
                      : "No"}
                  </strong>

                </div>

                <div>

                  <span>
                    Monogram
                  </span>

                  <strong>
                    {request.monogram ===
                    "yes"
                      ? "Requested"
                      : "No"}
                  </strong>

                </div>

              </div>

              {/* =================================
                  PAYMENT INFORMATION
              ================================= */}

              {request.quotation !== null &&
                request.quotation !== undefined && (

                  <div className="custom-order-payment-summary">

                    <div>

                      <span>
                        Quotation
                      </span>

                      <strong>
                        {formatCurrency(
                          quotation,
                        )}
                      </strong>

                    </div>

                    <div>

                      <span>
                        Amount Paid
                      </span>

                      <strong>
                        {formatCurrency(
                          amountPaid,
                        )}
                      </strong>

                    </div>

                    <div>

                      <span>
                        Balance
                      </span>

                      <strong>
                        {formatCurrency(
                          balance,
                        )}
                      </strong>

                    </div>

                    <div>

                      <span>
                        Payment Status
                      </span>

                      <strong>
                        {request.paymentStatus ||
                          "Pending"}
                      </strong>

                    </div>

                  </div>
                )}

              {/* =================================
                  PAYMENT NOTICE
              ================================= */}

              {quotation > 0 &&
                balance > 0 &&
                !isPaid &&
                !isCancelled && (

                  <div className="custom-order-card-payment-notice">

                    <span>
                      ₦
                    </span>

                    <div>

                      <strong>
                        Payment Available
                      </strong>

                      <p>
                        Your quotation is ready.
                        Open the request to
                        continue with payment.
                      </p>

                    </div>

                  </div>
                )}

              {/* =================================
                  FULLY PAID NOTICE
              ================================= */}

              {isPaid && (

                <div className="custom-order-card-payment-paid">

                  <span>
                    ✓
                  </span>

                  <div>

                    <strong>
                      Fully Paid
                    </strong>

                    <p>
                      Your custom order has
                      been fully paid.
                    </p>

                  </div>

                </div>
              )}

              {/* =================================
                  ACTIONS
              ================================= */}

              <div className="custom-order-card-actions">

                <Link
                  to={`/custom-order-details/${request._id}`}
                  className="view-custom-order-button"
                >
                  VIEW REQUEST
                </Link>

                <Link
                  to="/custom-order"
                  className="new-custom-order-button"
                >
                  NEW REQUEST
                </Link>

              </div>

            </article>
          );
        })}

      </section>

    </main>
  );
}

export default MyCustomOrders;

