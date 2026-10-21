
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminPayments.css";

// ==========================================
// ABS CUT — PAYMENT HELPERS
// ==========================================

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const getProviderLabel = (provider) => {
  const labels = {
    paystack: "Paystack",
    flutterwave: "Flutterwave",
    bank_transfer: "Bank Transfer",
  };

  return labels[String(provider || "").toLowerCase()] || "Other";
};

const getStatusLabel = (status) => {
  const labels = {
    successful: "Successful",
    success: "Successful",
    paid: "Paid",
    pending: "Pending",
    processing: "Processing",
    awaiting_confirmation: "Awaiting Confirmation",
    rejected: "Rejected",
    failed: "Failed",
  };

  const normalized = String(status || "").toLowerCase();

  return labels[normalized] || status || "Unknown";
};

const isAwaitingBankConfirmation = (payment) =>
  String(payment.provider || "").toLowerCase() === "bank_transfer" &&
  String(payment.status || "").toLowerCase() ===
    "awaiting_confirmation";

const isSuccessfulPayment = (payment) =>
  ["successful", "success", "paid"].includes(
    String(payment.status || "").toLowerCase()
  );

const getCustomerName = (payment) => {
  const user = payment.user;
  const customer = payment.orderId?.customer;

  const fullName = [
    user?.firstName || customer?.firstName,
    user?.lastName || customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    fullName ||
    user?.name ||
    customer?.name ||
    user?.email ||
    customer?.email ||
    "Customer"
  );
};

const getCustomerEmail = (payment) =>
  payment.user?.email ||
  payment.orderId?.customer?.email ||
  "No email available";

const getOrderReference = (payment) => {
  const order = payment.orderId;

  if (!order || typeof order !== "object") {
    return String(order || payment.reference || "—");
  }

  return (
    order.orderNumber ||
    order.customOrderNumber ||
    order.reference ||
    order._id ||
    payment.reference ||
    "—"
  );
};

// Optional aliases for fields returned by the backend.
const getTransactionNumber = (payment) =>
  payment.transactionNumber ||
  payment.bankTransactionNumber ||
  payment.bankTransactionId ||
  payment.transactionId ||
  "";

const getSessionId = (payment) =>
  payment.sessionId ||
  payment.bankSessionId ||
  "";

const getTransactionType = (payment) =>
  payment.transactionType ||
  payment.bankTransactionType ||
  "";

// ==========================================
// ADMIN PAYMENTS
// ==========================================

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");

  const [expandedPaymentId, setExpandedPaymentId] = useState(null);

  const [activePayment, setActivePayment] = useState(null);
  const [actionType, setActionType] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ==========================================
  // LOAD PAYMENT HISTORY
  // ==========================================

  const loadPayments = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await apiRequest("/payments/admin/history");

      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch (err) {
      setError(err.message || "Unable to load payment history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // ==========================================
  // PAYMENT STATISTICS
  // ==========================================

  const pendingBankTransfers = useMemo(
    () => payments.filter(isAwaitingBankConfirmation),
    [payments]
  );

  const totalPending = useMemo(
    () =>
      pendingBankTransfers.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0
      ),
    [pendingBankTransfers]
  );

  const successfulPayments = useMemo(
    () => payments.filter(isSuccessfulPayment),
    [payments]
  );

  const totalSuccessful = useMemo(
    () =>
      successfulPayments.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0
      ),
    [successfulPayments]
  );

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const provider = String(payment.provider || "").toLowerCase();

      const matchesProvider =
        providerFilter === "all" || provider === providerFilter;

      if (!matchesProvider) return false;
      if (!query) return true;

      const searchable = [
        getCustomerName(payment),
        getCustomerEmail(payment),
        getOrderReference(payment),
        payment.reference,
        getTransactionNumber(payment),
        getSessionId(payment),
        getTransactionType(payment),
        payment.transferSenderName,
        payment.provider,
        payment.status,
        payment._id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [payments, providerFilter, search]);

  // ==========================================
  // EXPAND / COLLAPSE PAYMENT DETAILS
  // ==========================================

  const togglePaymentDetails = (paymentId) => {
    setExpandedPaymentId((currentId) =>
      currentId === paymentId ? null : paymentId
    );
  };

  // ==========================================
  // CONFIRMATION / REJECTION MODAL
  // ==========================================

  const closeAction = () => {
    if (submitting) return;

    setActivePayment(null);
    setActionType("");
    setTransactionId("");
    setRejectionReason("");
  };

  const openAction = (payment, type) => {
    setNotice("");
    setError("");
    setActivePayment(payment);
    setActionType(type);
    setTransactionId("");
    setRejectionReason("");
  };

  const handleAction = async (event) => {
    event.preventDefault();

    if (!activePayment || submitting) return;

    if (actionType === "confirm" && !transactionId.trim()) {
      setError("Enter the verified bank transaction number.");
      return;
    }

    if (actionType === "reject" && !rejectionReason.trim()) {
      setError("Enter a reason for rejecting this transfer.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      if (actionType === "confirm") {
        await apiRequest("/payments/bank-transfer/confirm", {
          method: "POST",
          body: JSON.stringify({
            paymentId: activePayment._id,
            bankTransactionId: transactionId.trim(),
          }),
        });

        setNotice(
          "Payment confirmed successfully. The backend has accepted the confirmation."
        );
      } else if (actionType === "reject") {
        await apiRequest("/payments/bank-transfer/reject", {
          method: "POST",
          body: JSON.stringify({
            paymentId: activePayment._id,
            rejectionReason: rejectionReason.trim(),
          }),
        });

        setNotice("Bank transfer rejected successfully.");
      }

      setActivePayment(null);
      setActionType("");
      setTransactionId("");
      setRejectionReason("");

      await loadPayments(true);
    } catch (err) {
      setError(
        err.message || "The payment action could not be completed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="admin-payments-page">
      <AdminSidebar />

      <main className="admin-payments-main">
        {/* HEADER */}
        <header className="payments-header">
          <div>
            <span className="payments-eyebrow">
              ABS CUT MANAGEMENT
            </span>

            <h1>Payments</h1>

            <p>
              Manage payment activity, review bank transfers, and verify
              incoming funds before approving payments.
            </p>
          </div>

          <button
            type="button"
            className="payments-refresh-button"
            onClick={() => loadPayments(true)}
            disabled={loading || refreshing}
          >
            <span aria-hidden="true">↻</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {/* SUCCESS NOTICE */}
        {notice && (
          <div className="payments-notice" role="status">
            <span aria-hidden="true">✓</span>
            <span>{notice}</span>

            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* GENERAL ERROR */}
        {error && !activePayment && (
          <div className="payments-error" role="alert">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* STATISTICS */}
        <section className="payments-stats">
          <article className="payments-stat-card">
            <span className="payments-stat-icon" aria-hidden="true">
              ₦
            </span>

            <div>
              <p>Awaiting Verification</p>
              <h2>{pendingBankTransfers.length}</h2>
              <span>Bank transfers awaiting review</span>
            </div>
          </article>

          <article className="payments-stat-card">
            <span className="payments-stat-icon" aria-hidden="true">
              ↗
            </span>

            <div>
              <p>Pending Transfer Value</p>
              <h2>{formatMoney(totalPending)}</h2>
              <span>Awaiting bank verification</span>
            </div>
          </article>

          <article className="payments-stat-card">
            <span className="payments-stat-icon" aria-hidden="true">
              ✓
            </span>

            <div>
              <p>Successful Payments</p>
              <h2>{successfulPayments.length}</h2>
              <span>
                {formatMoney(totalSuccessful)} recorded as successful
              </span>
            </div>
          </article>
        </section>

        {/* PAYMENT HISTORY */}
        <section className="payments-panel">
          <div className="payments-panel-header">
            <div>
              <h2>Payment History</h2>
              <p>
                Search payments and review transaction details. Expand a
                record whenever you need its full information.
              </p>
            </div>

            <label className="payments-search">
              <span aria-hidden="true">⌕</span>

              <input
                type="search"
                placeholder="Search customer, order or reference..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="payments-provider-filter">
              <span>Payment method</span>

              <select
                value={providerFilter}
                onChange={(event) =>
                  setProviderFilter(event.target.value)
                }
              >
                <option value="all">All payment methods</option>
                <option value="paystack">Paystack</option>
                <option value="flutterwave">Flutterwave</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </label>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="payments-state">
              <span className="payments-spinner" />
              <h3>Loading payments</h3>
              <p>Retrieving payment history...</p>
            </div>
          ) : error && payments.length === 0 ? (
            /* LOAD ERROR */
            <div className="payments-state">
              <h3>Payments could not be loaded</h3>
              <p>{error}</p>

              <button
                type="button"
                className="payments-primary-button"
                onClick={() => loadPayments()}
              >
                Try again
              </button>
            </div>
          ) : filteredPayments.length === 0 ? (
            /* EMPTY STATE */
            <div className="payments-state">
              <span className="payments-empty-icon">₦</span>

              <h3>
                {search || providerFilter !== "all"
                  ? "No matching payments"
                  : "No payments found"}
              </h3>

              <p>
                {search || providerFilter !== "all"
                  ? "Try another search term or payment method."
                  : "Payment records will appear here when available."}
              </p>
            </div>
          ) : (
            /* PAYMENT TABLE */
            <div className="payments-table-wrap">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Payment / Order</th>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Transaction Details</th>
                    <th>Customer</th>
                    <th>Submitted</th>
                    <th>Receipt</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayments.map((payment) => {
                    const isExpanded =
                      expandedPaymentId === payment._id;

                    return (
                      <tr key={payment._id}>
                        {/* ORDER INFORMATION */}
                        <td className="payments-order-cell">
                          <strong
                            className="payments-order-ref"
                            title={getOrderReference(payment)}
                          >
                            {getOrderReference(payment)}
                          </strong>

                          <span
                            className="payments-reference"
                            title={payment.reference || payment._id}
                          >
                            {payment.reference || payment._id}
                          </span>

                          <span className="payments-order-type">
                            {payment.orderType === "CustomOrder"
                              ? "Custom order"
                              : "Store order"}
                          </span>
                        </td>

                        {/* PAYMENT PROVIDER */}
                        <td>
                          <span
                            className={`payments-provider payments-provider-${String(
                              payment.provider || "other"
                            ).toLowerCase()}`}
                          >
                            {getProviderLabel(payment.provider)}
                          </span>
                        </td>

                        {/* AMOUNT */}
                        <td>
                          <strong className="payments-amount">
                            {formatMoney(payment.amount)}
                          </strong>
                        </td>

                        {/* STATUS */}
                        <td>
                          <span
                            className={`payments-status payments-status-${String(
                              payment.status || "unknown"
                            ).toLowerCase()}`}
                          >
                            {getStatusLabel(payment.status)}
                          </span>
                        </td>

                        {/* COMPACT TRANSACTION DETAILS */}
                        <td className="payments-transaction-cell">
                          <div className="payments-transaction-details">
                            <strong
                              className="payments-transaction-sender"
                              title={
                                payment.transferSenderName ||
                                "No sender name"
                              }
                            >
                              {payment.transferSenderName ||
                                "No sender name"}
                            </strong>

                            <span className="payments-compact-value">
                              Transaction:{" "}
                              {getTransactionNumber(payment) ||
                                "Not recorded"}
                            </span>

                            {isExpanded && (
                              <div className="payments-expanded-details">
                                <div className="payments-detail-item">
                                  <span>Session ID</span>
                                  <strong>
                                    {getSessionId(payment) ||
                                      "Not recorded"}
                                  </strong>
                                </div>

                                <div className="payments-detail-item">
                                  <span>Transaction type</span>
                                  <strong>
                                    {getTransactionType(payment) ||
                                      "Not recorded"}
                                  </strong>
                                </div>

                                <div className="payments-detail-item">
                                  <span>Payment reference</span>
                                  <strong>
                                    {payment.reference ||
                                      "Not available"}
                                  </strong>
                                </div>

                                <div className="payments-detail-item">
                                  <span>Payment record ID</span>
                                  <strong>
                                    {payment._id || "Not available"}
                                  </strong>
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              className="payments-details-toggle"
                              aria-expanded={isExpanded}
                              aria-label={`${
                                isExpanded
                                  ? "Hide"
                                  : "View"
                              } transaction details for ${getOrderReference(
                                payment
                              )}`}
                              onClick={() =>
                                togglePaymentDetails(payment._id)
                              }
                            >
                              {isExpanded
                                ? "Show Less"
                                : "View Details"}

                              <span aria-hidden="true">
                                {isExpanded ? " ↑" : " ↓"}
                              </span>
                            </button>
                          </div>
                        </td>

                        {/* COMPACT CUSTOMER INFORMATION */}
                        <td className="payments-customer-cell">
                          <strong
                            className="payments-customer-name"
                            title={getCustomerName(payment)}
                          >
                            {getCustomerName(payment)}
                          </strong>

                          <span
                            className="payments-customer-email"
                            title={getCustomerEmail(payment)}
                          >
                            {getCustomerEmail(payment)}
                          </span>
                        </td>

                        {/* DATE */}
                        <td>
                          <span
                            className="payments-date"
                            title={formatDate(payment.createdAt)}
                          >
                            {formatDate(payment.createdAt)}
                          </span>
                        </td>

                        {/* RECEIPT */}
                        <td>
                          {payment.receiptUrl ? (
                            <a
                              className="payments-receipt-link"
                              href={payment.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View receipt ↗
                            </a>
                          ) : (
                            <span className="payments-no-receipt">
                              No receipt
                            </span>
                          )}
                        </td>

                        {/* ADMIN ACTIONS */}
                        <td>
                          <div className="payments-actions">
                            {isAwaitingBankConfirmation(payment) ? (
                              <>
                                <button
                                  type="button"
                                  className="payments-approve-button"
                                  onClick={() =>
                                    openAction(payment, "confirm")
                                  }
                                >
                                  Confirm
                                </button>

                                <button
                                  type="button"
                                  className="payments-reject-button"
                                  onClick={() =>
                                    openAction(payment, "reject")
                                  }
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="payments-muted">
                                {isSuccessfulPayment(payment)
                                  ? "Verified"
                                  : String(
                                      payment.status || ""
                                    ).toLowerCase() === "rejected"
                                    ? "Rejected"
                                    : "No action required"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE FOOTER */}
          {!loading && filteredPayments.length > 0 && (
            <footer className="payments-table-footer">
              Showing {filteredPayments.length} of {payments.length} payment
              records
            </footer>
          )}
        </section>

        {/* CONFIRM / REJECT MODAL */}
        {activePayment && (
          <div
            className="payments-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeAction();
              }
            }}
          >
            <section
              className="payments-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="payments-modal-title"
            >
              <button
                type="button"
                className="payments-modal-close"
                onClick={closeAction}
                disabled={submitting}
                aria-label="Close dialog"
              >
                ×
              </button>

              <span className="payments-modal-eyebrow">
                BANK TRANSFER REVIEW
              </span>

              <h2 id="payments-modal-title">
                {actionType === "confirm"
                  ? "Confirm payment"
                  : "Reject transfer"}
              </h2>

              <p className="payments-modal-description">
                {actionType === "confirm"
                  ? "Verify the funds in the ABS CUT bank account before confirming this payment."
                  : "Provide a clear reason for rejecting this submission."}
              </p>

              {/* PAYMENT SUMMARY */}
              <div className="payments-modal-summary">
                <span>Order reference</span>
                <strong>{getOrderReference(activePayment)}</strong>

                <span>Payment method</span>
                <strong>
                  {getProviderLabel(activePayment.provider)}
                </strong>

                <span>Transfer sender</span>
                <strong>
                  {activePayment.transferSenderName || "Not supplied"}
                </strong>

                <span>Amount</span>
                <strong>{formatMoney(activePayment.amount)}</strong>

                <span>Payment reference</span>
                <strong>
                  {activePayment.reference || "—"}
                </strong>

                <span>Transaction number</span>
                <strong>
                  {getTransactionNumber(activePayment) ||
                    "Not recorded"}
                </strong>

                <span>Session ID</span>
                <strong>
                  {getSessionId(activePayment) || "Not recorded"}
                </strong>

                {activePayment.receiptUrl && (
                  <>
                    <span>Submitted receipt</span>

                    <a
                      href={activePayment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open receipt in new tab ↗
                    </a>
                  </>
                )}
              </div>

              {/* ACTION FORM */}
              <form onSubmit={handleAction}>
                {actionType === "confirm" ? (
                  <label className="payments-form-field">
                    Verified bank transaction number

                    <input
                      type="text"
                      value={transactionId}
                      onChange={(event) =>
                        setTransactionId(event.target.value)
                      }
                      placeholder="Enter the transaction number from bank records"
                      required
                      maxLength={150}
                      autoComplete="off"
                    />

                    <span>
                      Enter the transaction number from your bank records.
                      Do not substitute the customer's payment reference.
                      Confirm only after verifying the incoming funds.
                    </span>
                  </label>
                ) : (
                  <label className="payments-form-field">
                    Reason for rejection

                    <textarea
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      placeholder="Explain what needs to be corrected..."
                      required
                      maxLength={1000}
                      rows={4}
                    />
                  </label>
                )}

                {error && (
                  <div className="payments-error" role="alert">
                    {error}
                  </div>
                )}

                <div className="payments-modal-actions">
                  <button
                    type="button"
                    className="payments-cancel-button"
                    onClick={closeAction}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className={
                      actionType === "confirm"
                        ? "payments-approve-button"
                        : "payments-reject-button"
                    }
                    disabled={submitting}
                  >
                    {submitting
                      ? "Processing..."
                      : actionType === "confirm"
                        ? "Confirm payment"
                        : "Reject transfer"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPayments;
