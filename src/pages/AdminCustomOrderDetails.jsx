
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AdminSidebar from "../components/AdminSidebar";
import { apiRequest } from "../services/api";

import "./AdminCustomOrderDetails.css";

function AdminCustomOrderDetails() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    status: "Pending Review",
    tailoringFee: 0,
    materialFee: 0,
    embroideryFee: 0,
    monogramFee: 0,
    pickupFee: 0,
    deliveryFee: 0,
    adminNotes: "",
    productionNotes: "",
  });

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await apiRequest(
        `/custom-orders/admin/${id}`
      );

      const customOrder = response.customOrder;

      if (!customOrder) {
        throw new Error("Custom order could not be found.");
      }

      setOrder(customOrder);
      populateForm(customOrder);
    } catch (error) {
      console.error("Load custom order error:", error);

      setError(
        error.message || "Unable to load custom order."
      );
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (customOrder) => {
    setForm({
      status: customOrder.status || "Pending Review",

      tailoringFee: customOrder.tailoringFee ?? 0,
      materialFee: customOrder.materialFee ?? 0,
      embroideryFee: customOrder.embroideryFee ?? 0,
      monogramFee: customOrder.monogramFee ?? 0,
      pickupFee: customOrder.pickupFee ?? 0,
      deliveryFee: customOrder.deliveryFee ?? 0,

      adminNotes: customOrder.adminNotes || "",
      productionNotes: customOrder.productionNotes || "",
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // The quotation preview is calculated from the current fee inputs.
  const quotation = useMemo(() => {
    return (
      Number(form.tailoringFee || 0) +
      Number(form.materialFee || 0) +
      Number(form.embroideryFee || 0) +
      Number(form.monogramFee || 0) +
      Number(form.pickupFee || 0) +
      Number(form.deliveryFee || 0)
    );
  }, [
    form.tailoringFee,
    form.materialFee,
    form.embroideryFee,
    form.monogramFee,
    form.pickupFee,
    form.deliveryFee,
  ]);

  // Payment information comes from the saved order, not editable form fields.
  const amountPaid = Number(order?.amountPaid || 0);

  const balance = Math.max(
    quotation - amountPaid,
    0
  );

  const paymentStatus =
    order?.paymentStatus || "Not Required";

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // IMPORTANT:
      // amountPaid and paymentStatus are intentionally omitted.
      // Verified payment processing owns those fields.
      const payload = {
        status: form.status,

        tailoringFee: Number(form.tailoringFee || 0),
        materialFee: Number(form.materialFee || 0),
        embroideryFee: Number(form.embroideryFee || 0),
        monogramFee: Number(form.monogramFee || 0),
        pickupFee: Number(form.pickupFee || 0),
        deliveryFee: Number(form.deliveryFee || 0),

        quotation: Number(quotation.toFixed(2)),

        adminNotes: form.adminNotes,
        productionNotes: form.productionNotes,
      };

      const response = await apiRequest(
        `/custom-orders/admin/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      if (!response.customOrder) {
        throw new Error(
          response.message ||
            "The server did not return the updated order."
        );
      }

      setOrder(response.customOrder);
      populateForm(response.customOrder);

      setSuccess(
        response.message ||
          "Custom order updated successfully."
      );
    } catch (error) {
      console.error("Update custom order error:", error);

      setError(
        error.message || "Unable to update custom order."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="admin-dashboard-page">
        <div className="admin-dashboard-shell">
          <AdminSidebar />

          <section className="admin-main">
            <div className="admin-custom-details-loading">
              <div className="admin-custom-details-spinner" />

              <h2>Loading Custom Order...</h2>

              <p>
                Please wait while we retrieve the request details.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="admin-dashboard-page">
        <div className="admin-dashboard-shell">
          {/* <AdminSidebar /> */}

          <section className="admin-main">
            <div className="admin-custom-details-error">
              <span>!</span>

              <div>
                <h2>Unable to load order</h2>
                <p>{error}</p>
              </div>

              <button
                type="button"
                onClick={loadOrder}
              >
                TRY AGAIN
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const customer = order?.user;

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar />

        <section className="admin-main">
          {/* PAGE HEADER */}
          <div className="admin-custom-details-header">
            <div>
              <Link
                to="/admin/custom-orders"
                className="admin-custom-details-back"
              >
                ← BACK TO CUSTOM ORDERS
              </Link>

              <span className="admin-eyebrow">
                CUSTOM SERVICE
              </span>

              <h1>Custom Order Details</h1>

              <p>
                Review the customer&apos;s request, prepare a
                quotation and manage production progress.
              </p>
            </div>

            <div className="admin-custom-details-id">
              <span>ORDER ID</span>
              <strong>{order?._id}</strong>
              <small>{formatDate(order?.createdAt)}</small>
            </div>
          </div>

          {error && (
            <div
              className="admin-custom-details-alert error"
              role="alert"
            >
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              className="admin-custom-details-alert success"
              role="status"
            >
              <span>{success}</span>
            </div>
          )}

          <div className="admin-custom-details-grid">
            {/* CUSTOMER */}
            <section className="admin-custom-details-card customer-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>CUSTOMER</span>
                  <h2>Customer Information</h2>
                </div>

                <div className="admin-custom-details-card-icon">
                  ♙
                </div>
              </div>

              <div className="admin-custom-customer-profile">
                <div className="admin-custom-customer-large-avatar">
                  {customer?.firstName
                    ?.charAt(0)
                    ?.toUpperCase() || "C"}
                </div>

                <div>
                  <h3>
                    {customer
                      ? `${customer.firstName} ${customer.lastName}`
                      : "Unknown Customer"}
                  </h3>

                  <p>
                    {customer?.email || "No email available"}
                  </p>

                  <p>
                    {customer?.phone || "No phone number"}
                  </p>
                </div>
              </div>
            </section>

            {/* REQUEST SUMMARY */}
            <section className="admin-custom-details-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>REQUEST</span>
                  <h2>Order Summary</h2>
                </div>

                <div className="admin-custom-details-card-icon">
                  ✂
                </div>
              </div>

              <div className="admin-custom-detail-list">
                <div>
                  <span>Outfit Type</span>
                  <strong>{order?.outfitType || "—"}</strong>
                </div>

                <div>
                  <span>Service</span>
                  <strong>{order?.serviceType || "—"}</strong>
                </div>

                <div>
                  <span>Material Source</span>
                  <strong>{order?.materialSource || "—"}</strong>
                </div>

                <div>
                  <span>Fabric</span>
                  <strong>{order?.fabric || "—"}</strong>
                </div>

                <div>
                  <span>Colour</span>
                  <strong>{order?.color || "—"}</strong>
                </div>

                <div>
                  <span>Measurement Method</span>
                  <strong>
                    {order?.measurementMethod || "—"}
                  </strong>
                </div>
              </div>
            </section>

            {/* EMBROIDERY AND MONOGRAM */}
            <section className="admin-custom-details-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>DESIGN SERVICES</span>
                  <h2>Embroidery &amp; Monogram</h2>
                </div>
              </div>

              <div className="admin-custom-service-boxes">
                <div>
                  <span>EMBROIDERY</span>
                  <strong>
                    {order?.embroidery === "yes"
                      ? "Requested"
                      : "Not Requested"}
                  </strong>

                  {order?.embroideryDetails && (
                    <p>{order.embroideryDetails}</p>
                  )}
                </div>

                <div>
                  <span>MONOGRAM</span>
                  <strong>
                    {order?.monogram === "yes"
                      ? "Requested"
                      : "Not Requested"}
                  </strong>

                  {order?.monogramText && (
                    <p>{order.monogramText}</p>
                  )}
                </div>
              </div>
            </section>

            {/* MEASUREMENTS */}
            <section className="admin-custom-details-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>MEASUREMENTS</span>
                  <h2>Customer Measurements</h2>
                </div>
              </div>

              <div className="admin-custom-measurements">
                {order?.measurements ? (
                  <p>{order.measurements}</p>
                ) : (
                  <span>No measurements provided.</span>
                )}
              </div>
            </section>

            {/* MATERIAL */}
            <section className="admin-custom-details-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>MATERIAL</span>
                  <h2>Material Information</h2>
                </div>
              </div>

              <div className="admin-custom-material-details">
                <div>
                  <span>Source</span>
                  <strong>{order?.materialSource || "—"}</strong>
                </div>

                <div>
                  <span>Description</span>
                  <p>
                    {order?.materialDescription ||
                      "No additional material description."}
                  </p>
                </div>
              </div>
            </section>

            {/* REFERENCE IMAGE */}
            {order?.referenceImage?.url && (
              <section className="admin-custom-details-card">
                <div className="admin-custom-details-card-heading">
                  <div>
                    <span>REFERENCE</span>
                    <h2>Customer Reference Image</h2>
                  </div>
                </div>

                <a
                  href={order.referenceImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-custom-reference-image-link"
                >
                  <img
                    src={order.referenceImage.url}
                    alt="Customer reference"
                  />

                  <span>OPEN FULL IMAGE ↗</span>
                </a>
              </section>
            )}

            {/* PICKUP */}
            <section className="admin-custom-details-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>LOGISTICS</span>
                  <h2>Pickup Information</h2>
                </div>
              </div>

              {order?.pickupRequired ? (
                <div className="admin-custom-location">
                  <strong>Pickup Required</strong>

                  <p>
                    {order.pickupLocation?.address || "—"}
                  </p>

                  {order.pickupLocation?.area && (
                    <p>Area: {order.pickupLocation.area}</p>
                  )}

                  {order.pickupLocation?.landmark && (
                    <p>
                      Landmark: {order.pickupLocation.landmark}
                    </p>
                  )}

                  <span>
                    Current pickup fee:{" "}
                    {formatCurrency(order.pickupFee)}
                  </span>
                </div>
              ) : (
                <div className="admin-custom-not-required">
                  Pickup was not requested.
                </div>
              )}
            </section>

            {/* DELIVERY */}
            <section className="admin-custom-details-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>LOGISTICS</span>
                  <h2>Delivery Information</h2>
                </div>
              </div>

              {order?.deliveryRequired ? (
                <div className="admin-custom-location">
                  <strong>Delivery Required</strong>

                  <p>
                    {order.deliveryLocation?.address || "—"}
                  </p>

                  {order.deliveryLocation?.area && (
                    <p>Area: {order.deliveryLocation.area}</p>
                  )}

                  {order.deliveryLocation?.landmark && (
                    <p>
                      Landmark: {order.deliveryLocation.landmark}
                    </p>
                  )}

                  <span>
                    Current delivery fee:{" "}
                    {formatCurrency(order.deliveryFee)}
                  </span>
                </div>
              ) : (
                <div className="admin-custom-not-required">
                  Delivery was not requested.
                </div>
              )}
            </section>

            {/* CUSTOMER NOTES */}
            {order?.notes && (
              <section className="admin-custom-details-card">
                <div className="admin-custom-details-card-heading">
                  <div>
                    <span>NOTES</span>
                    <h2>Customer Notes</h2>
                  </div>
                </div>

                <div className="admin-custom-note-box">
                  <span>CUSTOMER NOTES</span>
                  <p>{order.notes}</p>
                </div>
              </section>
            )}

            {/* MANAGEMENT */}
            <section className="admin-custom-details-card admin-custom-management-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>MANAGEMENT</span>
                  <h2>Order Management</h2>
                </div>

                <div className="admin-custom-details-card-icon">
                  ✓
                </div>
              </div>

              <div className="admin-custom-form-grid">
                <label>
                  <span>ORDER STATUS</span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Pending Review">
                      Pending Review
                    </option>
                    <option value="Under Review">
                      Under Review
                    </option>
                    <option value="Quote Sent">
                      Quote Sent
                    </option>
                    <option value="Awaiting Payment">
                      Awaiting Payment
                    </option>
                    <option value="Confirmed">
                      Confirmed
                    </option>
                    <option value="In Production">
                      In Production
                    </option>
                    <option value="Ready">Ready</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>
              </div>

              <p className="admin-custom-readonly-note">
                Payment status is updated automatically when a payment
                is verified. It cannot be changed from this form.
              </p>
            </section>

            {/* QUOTATION */}
            <section className="admin-custom-details-card admin-custom-quotation-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>PRICING</span>
                  <h2>Custom Quotation</h2>
                </div>

                <div className="admin-custom-details-card-icon">
                  ₦
                </div>
              </div>

              <div className="admin-custom-fee-grid">
                <label>
                  <span>TAILORING FEE (₦)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="tailoringFee"
                    value={form.tailoringFee}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>MATERIAL FEE (₦)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="materialFee"
                    value={form.materialFee}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>EMBROIDERY FEE (₦)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="embroideryFee"
                    value={form.embroideryFee}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>MONOGRAM FEE (₦)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="monogramFee"
                    value={form.monogramFee}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <span>PICKUP FEE (₦)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="pickupFee"
                    value={form.pickupFee}
                    onChange={handleChange}
                    disabled={!order?.pickupRequired}
                  />
                </label>

                <label>
                  <span>DELIVERY FEE (₦)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="deliveryFee"
                    value={form.deliveryFee}
                    onChange={handleChange}
                    disabled={!order?.deliveryRequired}
                  />
                </label>
              </div>

              <div className="admin-custom-total-box">
                <div>
                  <span>TOTAL QUOTATION</span>
                  <strong>{formatCurrency(quotation)}</strong>
                </div>

                <div>
                  <span>VERIFIED AMOUNT PAID</span>
                  <strong>{formatCurrency(amountPaid)}</strong>
                  <small>
                    Managed by the payment system
                  </small>
                </div>

                <div>
                  <span>ESTIMATED BALANCE</span>
                  <strong>{formatCurrency(balance)}</strong>
                  <small>
                    Based on the current fee inputs
                  </small>
                </div>
              </div>

              <div className="admin-custom-payment-summary">
                <div>
                  <span>RECORDED PAYMENT STATUS</span>
                  <strong>{paymentStatus}</strong>
                </div>

                <p>
                  The balance preview changes as you edit fees.
                  Saving the quotation does not record a payment.
                  Payments must be verified through the payment system.
                </p>
              </div>
            </section>

            {/* INTERNAL NOTES */}
            <section className="admin-custom-details-card">
              <div className="admin-custom-details-card-heading">
                <div>
                  <span>INTERNAL</span>
                  <h2>Admin &amp; Production Notes</h2>
                </div>
              </div>

              <div className="admin-custom-textareas">
                <label>
                  <span>ADMIN NOTES</span>

                  <textarea
                    name="adminNotes"
                    value={form.adminNotes}
                    onChange={handleChange}
                    placeholder="Add internal notes about this order..."
                    rows="5"
                  />
                </label>

                <label>
                  <span>PRODUCTION NOTES</span>

                  <textarea
                    name="productionNotes"
                    value={form.productionNotes}
                    onChange={handleChange}
                    placeholder="Add instructions for production..."
                    rows="5"
                  />
                </label>
              </div>
            </section>
          </div>

          {/* SAVE BAR */}
          <div className="admin-custom-details-save-bar">
            <Link
              to="/admin/custom-orders"
              className="admin-custom-details-cancel"
            >
              CANCEL
            </Link>

            <button
              type="button"
              className="admin-custom-details-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "SAVING..." : "SAVE CHANGES"}
              <span>→</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AdminCustomOrderDetails;
