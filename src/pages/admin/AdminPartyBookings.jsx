
import { useCallback, useEffect, useState } from "react";
import { apiRequest, uploadRequest } from "../../services/api";
import "./AdminPartyBookings.css";

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const emptyMaterial = () => ({
  name: "",
  category: "Lace",
  variety: "",
  description: "",
  image: "",
  colors: "",
  stock: "0",
  active: true,
  packages: [
    { name: "Standard", yards: "5", price: "", description: "" },
  ],
  headwear: {
    available: false,
    type: "cap-or-gele",
    price: "0",
    stock: "0",
  },
});

const statusLabels = {
  "pending-review": "Pending review",
  quoted: "Quoted",
  confirmed: "Confirmed",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
      }).format(new Date(value))
    : "—";

const dateInputValue = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function AdminPartyBookings() {
  const [tab, setTab] = useState("bookings");
  const [reviewingScheduleId, setReviewingScheduleId] = useState("");

  const [bookings, setBookings] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editingId, setEditingId] = useState("");
  const [materialForm, setMaterialForm] = useState(emptyMaterial());

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [bookingEdits, setBookingEdits] = useState({});

  // =====================================================
  // LOAD BOOKINGS AND MATERIALS
  // =====================================================

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [bookingData, materialData] = await Promise.all([
        apiRequest("/party-bookings/admin/all"),
        apiRequest("/party-bookings/materials/admin/all"),
      ]);

      const nextBookings = Array.isArray(bookingData.bookings)
        ? bookingData.bookings
        : [];

      const nextMaterials = Array.isArray(materialData.materials)
        ? materialData.materials
        : [];

      setBookings(nextBookings);
      setMaterials(nextMaterials);

      setBookingEdits((old) => {
        const next = { ...old };

        nextBookings.forEach((booking) => {
          next[booking._id] = {
            status: booking.status,
            quotationAmount: booking.quotationAmount ?? "",
            fulfilmentDate: dateInputValue(booking.fulfilmentDate),
            paymentDeadline: dateInputValue(booking.paymentDeadline),
            adminNotes: booking.adminNotes || "",
          };
        });

        return next;
      });
    } catch (err) {
      setError(
        err.message ||
          "Could not load bookings and materials. Confirm your admin access and routes."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // =====================================================
  // BOOKING MANAGEMENT
  // =====================================================

  function updateBookingField(id, key, value) {
    setBookingEdits((old) => ({
      ...old,
      [id]: {
        ...(old[id] || {}),
        [key]: value,
      },
    }));
  }

  async function saveBooking(id) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const edit = bookingEdits[id] || {};

      const payload = {
        status: edit.status,
        fulfilmentDate: edit.fulfilmentDate || null,
        paymentDeadline: edit.paymentDeadline || null,
        adminNotes: edit.adminNotes || "",
      };

      if (
        edit.quotationAmount !== "" &&
        edit.quotationAmount !== null &&
        edit.quotationAmount !== undefined
      ) {
        payload.quotationAmount = Number(edit.quotationAmount);
      }

      const result = await apiRequest(`/party-bookings/admin/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setNotice(result.message || "Booking updated.");

      await loadAll();
    } catch (err) {
      setError(err.message || "Could not update booking.");
    } finally {
      setSaving(false);
    }
  }


  // =====================================================
// INSTALLMENT SCHEDULE REVIEW
// =====================================================

async function reviewInstallmentSchedule(booking, decision) {
  const isApproval = decision === "approve";

  const confirmed = window.confirm(
    isApproval
      ? "Approve this installment schedule? The booking will be confirmed and its required stock will be reserved."
      : "Reject this installment schedule? The customer will need to submit a revised schedule."
  );

  if (!confirmed) return;

  setReviewingScheduleId(booking._id);
  setError("");
  setNotice("");

  try {
    const edit = bookingEdits[booking._id] || {};

    const result = await apiRequest(
      `/party-bookings/admin/${booking._id}/installment-schedule`,
      {
        method: "PATCH",
        body: JSON.stringify({
          decision,
          adminNotes: edit.adminNotes || "",
        }),
      }
    );

    setNotice(
      result.message ||
        (isApproval
          ? "Installment schedule approved successfully."
          : "Installment schedule rejected.")
    );

    await loadAll();
  } catch (err) {
    setError(
      err.message || "Could not review the installment schedule."
    );
  } finally {
    setReviewingScheduleId("");
  }
}
  // =====================================================
  // IMAGE MANAGEMENT
  // =====================================================

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Image size must not exceed 50MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);

    setImagePreview((oldPreview) => {
      if (oldPreview.startsWith("blob:")) {
        URL.revokeObjectURL(oldPreview);
      }

      return previewUrl;
    });
  }

  function handleImageUrlChange(value) {
    setImageFile(null);
    setImagePreview("");
    setMaterialForm((old) => ({
      ...old,
      image: value,
    }));
  }

  function removeMaterialImage() {
    setImageFile(null);
    setImagePreview("");

    setMaterialForm((old) => ({
      ...old,
      image: "",
    }));
  }

  // async function uploadMaterialImage() {
  //   if (!imageFile) {
  //     return materialForm.image;
  //   }

  //   const formData = new FormData();

  //   formData.append("image", imageFile);

  //   const result = await uploadRequest(
  //     "/uploads/product-image",
  //     formData
  //   );

  //   const uploadedUrl =
  //     result?.url ||
  //     result?.image ||
  //     result?.secure_url ||
  //     result?.data?.url ||
  //     result?.data?.secure_url;

  //   if (!uploadedUrl) {
  //     throw new Error(
  //       "Image upload completed without returning an image URL. Check uploadController.js."
  //     );
  //   }

  //   return uploadedUrl;
  // }

async function uploadMaterialImage() {
  if (!imageFile) {
    return materialForm.image;
  }

  const formData = new FormData();
  formData.append("image", imageFile);

  const result = await uploadRequest(
    "/uploads/product-image",
    formData
  );

  const uploadedImage = result?.image;

  const uploadedUrl =
    typeof uploadedImage === "string"
      ? uploadedImage
      : uploadedImage?.url ||
        result?.url ||
        result?.secure_url;

  if (!uploadedUrl || typeof uploadedUrl !== "string") {
    throw new Error(
      "Image upload did not return a valid image URL."
    );
  }

  return uploadedUrl;
}

  // =====================================================
  // MATERIAL FORM MANAGEMENT
  // =====================================================

  function beginEdit(material) {
    setEditingId(material._id);

    setImageFile(null);
    setImagePreview(material.image || "");

    setMaterialForm({
      name: material.name || "",
      category: material.category || "Other",
      variety: material.variety || "",
      description: material.description || "",
      image: material.image || "",
      colors: (material.colors || []).join(", "),
      stock: String(material.stock ?? 0),
      active: material.active !== false,

      packages: (material.packages || []).map((pack) => ({
        _id: pack._id,
        name: pack.name,
        yards: String(pack.yards ?? 0),
        price: String(pack.price ?? ""),
        description: pack.description || "",
      })),

      headwear: {
        available: Boolean(material.headwear?.available),
        type: material.headwear?.type || "cap-or-gele",
        price: String(material.headwear?.price ?? 0),
        stock: String(material.headwear?.stock ?? 0),
      },
    });

    setError("");
    setNotice("");
    setTab("materials");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetMaterial() {
    setEditingId("");
    setMaterialForm(emptyMaterial());
    setImageFile(null);

    setImagePreview((oldPreview) => {
      if (oldPreview.startsWith("blob:")) {
        URL.revokeObjectURL(oldPreview);
      }

      return "";
    });
  }

  function setPackage(index, key, value) {
    setMaterialForm((old) => ({
      ...old,
      packages: old.packages.map((pack, i) =>
        i === index
          ? { ...pack, [key]: value }
          : pack
      ),
    }));
  }

  function addPackage() {
    setMaterialForm((old) => ({
      ...old,
      packages: [
        ...old.packages,
        {
          name: "",
          yards: "5",
          price: "",
          description: "",
        },
      ],
    }));
  }

  function removePackage(index) {
    setMaterialForm((old) => ({
      ...old,
      packages: old.packages.filter((_, i) => i !== index),
    }));
  }

  // =====================================================
  // SAVE MATERIAL
  // =====================================================

  async function saveMaterial(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    try {
      let imageUrl = materialForm.image;

      if (imageFile) {
        setUploadingImage(true);

        imageUrl = await uploadMaterialImage();

        if (!imageUrl) {
          throw new Error("Could not upload material image.");
        }
      }

      const payload = {
        ...materialForm,

        image: imageUrl,

        stock: Number(materialForm.stock),

        colors: materialForm.colors
          .split(",")
          .map((color) => color.trim())
          .filter(Boolean),

        packages: materialForm.packages.map((pack) => ({
          ...(pack._id ? { _id: pack._id } : {}),
          name: pack.name.trim(),
          yards: Number(pack.yards || 0),
          price: Number(pack.price),
          description: pack.description || "",
        })),

        headwear: {
          ...materialForm.headwear,
          price: Number(materialForm.headwear.price || 0),
          stock: Number(materialForm.headwear.stock || 0),
        },
      };

      const result = editingId
        ? await apiRequest(
            `/party-bookings/materials/${editingId}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            }
          )
        : await apiRequest("/party-bookings/materials", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setNotice(
        result.message ||
          (editingId ? "Material updated." : "Material added.")
      );

      resetMaterial();

      await loadAll();
    } catch (err) {
      setError(err.message || "Could not save material.");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  // =====================================================
  // DEACTIVATE MATERIAL
  // =====================================================

  async function deactivateMaterial(material) {
    if (
      !window.confirm(
        `Deactivate ${material.name}? It will no longer appear in the customer catalogue.`
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `/party-bookings/materials/${material._id}`,
        {
          method: "DELETE",
        }
      );

      setNotice(result.message || "Material deactivated.");

      await loadAll();
    } catch (err) {
      setError(err.message || "Could not deactivate material.");
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="abs-feature-page abs-admin-feature-page abs-admin-party-bookings-page">
      <section className="abs-feature-hero abs-admin-hero">
        <span className="abs-feature-eyebrow">
          ADMIN INVENTORY & RESERVATIONS
        </span>

        <h1>
          Party <em>Materials</em>
        </h1>

        <p>
          Manage the dedicated party-material catalogue, review
          reservation requests, and prepare quotations. This stock
          is separate from ready-to-wear products.
        </p>
      </section>

      <section className="abs-feature-content abs-admin-content">
        {notice && (
          <div className="abs-feature-alert is-success" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="abs-feature-alert is-error" role="alert">
            {error}
          </div>
        )}

        <div className="abs-feature-tabs">
          <button
            className={tab === "bookings" ? "is-active" : ""}
            onClick={() => setTab("bookings")}
            type="button"
          >
            Reservations <span>{bookings.length}</span>
          </button>

          <button
            className={tab === "materials" ? "is-active" : ""}
            onClick={() => setTab("materials")}
            type="button"
          >
            Materials <span>{materials.length}</span>
          </button>
        </div>

        {/* ===============================================
            BOOKINGS
        =============================================== */}

        {tab === "bookings" ? (
          <section className="abs-admin-list-section">
            <div className="abs-material-toolbar">
              <div>
                <h2>Reservation requests</h2>
                <p>
                  Set a quotation and update status after checking
                  availability.
                </p>
              </div>

              <button
                className="abs-feature-button abs-feature-button-secondary"
                type="button"
                onClick={loadAll}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="abs-feature-state">
                Loading reservations…
              </div>
            ) : bookings.length === 0 ? (
              <div className="abs-feature-empty">
                <h2>No reservation requests yet</h2>
                <p>Customer requests will appear here.</p>
              </div>
            ) : (
              <div className="abs-booking-list">
                {bookings.map((booking) => {
                  const edit = bookingEdits[booking._id] || {};

                  return (
                    <article
                      className="abs-booking-admin-card"
                      key={booking._id}
                    >
                      <div className="abs-booking-card-top">
                        <div>
                          <span className="abs-feature-eyebrow">
                            BOOKING ·{" "}
                            {String(booking._id)
                              .slice(-7)
                              .toUpperCase()}
                          </span>

                          <h3>
                            {booking.contactName ||
                              booking.customer?.name ||
                              "Customer"}
                          </h3>

                          <p>
                            {booking.eventType} ·{" "}
                            {dateLabel(booking.eventDate)} · Party of{" "}
                            {booking.partySize}
                          </p>
                        </div>

                        <span
                          className={`abs-feature-status status-${booking.status}`}
                        >
                          {statusLabels[booking.status] ||
                            booking.status}
                        </span>
                      </div>

                      <div className="abs-booking-customer-details">
                        <span>
                          <strong>Phone</strong>
                          {booking.phone ||
                            booking.customer?.phone ||
                            "—"}
                        </span>

                        <span>
                          <strong>Delivery</strong>
                          {booking.deliveryMethod === "delivery"
                            ? booking.deliveryAddress
                            : "Collection"}
                        </span>

                        <span>
                          <strong>Requested</strong>
                          {dateLabel(booking.createdAt)}
                        </span>
                      </div>

                      <div className="abs-booking-items">
                        {(booking.items || []).map((item, index) => (
                          <div
                            key={`${item.material}-${index}`}
                          >
                            <span>
                              <strong>{item.materialName}</strong>

                              <small>
                                {item.category}
                                {item.variety
                                  ? ` · ${item.variety}`
                                  : ""}{" "}
                                — {item.packageName} ({item.yards} yards)
                                × {item.quantity}
                                {item.headwearQuantity
                                  ? ` · ${item.headwearType} × ${item.headwearQuantity}`
                                  : ""}
                              </small>
                            </span>

                            <span>
                              {money(
                                item.unitPrice * item.quantity +
                                  item.headwearUnitPrice *
                                    item.headwearQuantity
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      {booking.customerNotes && (
                        <p className="abs-booking-notes">
                          <strong>Customer notes:</strong>{" "}
                          {booking.customerNotes}
                        </p>
                      )}
{/* ===============================================
    INSTALLMENT SCHEDULE REVIEW
=============================================== */}

{Array.isArray(booking.installmentSchedule) &&
  booking.installmentSchedule.length > 0 && (
    <section className="abs-installment-review">
      <div className="abs-installment-review-heading">
        <div>
          <span className="abs-feature-eyebrow">
            PAYMENT PLAN
          </span>

          <h3>Installment schedule</h3>

          <p>
            Review the customer's proposed payment dates
            and amounts.
          </p>
        </div>

        <span
          className={`abs-feature-status schedule-${booking.scheduleStatus}`}
        >
          {booking.scheduleStatus === "pending-review"
            ? "Awaiting approval"
            : booking.scheduleStatus === "approved"
            ? "Approved"
            : booking.scheduleStatus === "rejected"
            ? "Rejected"
            : "Not submitted"}
        </span>
      </div>

      <div className="abs-installment-summary">
        <div>
          <span>Quotation</span>
          <strong>{money(booking.quotationAmount)}</strong>
        </div>

        <div>
          <span>Amount paid</span>
          <strong>{money(booking.amountPaid)}</strong>
        </div>

        <div>
          <span>Outstanding</span>
          <strong>
            {money(
              Math.max(
                0,
                Number(booking.quotationAmount || 0) -
                  Number(booking.amountPaid || 0)
              )
            )}
          </strong>
        </div>
      </div>

      <div className="abs-installment-dates">
        <span>
          <strong>Payment deadline</strong>
          {dateLabel(booking.paymentDeadline)}
        </span>

        <span>
          <strong>Fulfilment date</strong>
          {dateLabel(booking.fulfilmentDate)}
        </span>
      </div>

      <div className="abs-installment-list">
        {booking.installmentSchedule.map((installment, index) => (
          <div
            className="abs-installment-row"
            key={installment._id || index}
          >
            <div className="abs-installment-number">
              {String(index + 1).padStart(2, "0")}
            </div>

            <div className="abs-installment-details">
              <strong>Installment {index + 1}</strong>
              <span>Due {dateLabel(installment.dueDate)}</span>
            </div>

            <div className="abs-installment-amount">
              {money(installment.amount)}
            </div>

            <span
              className={`abs-installment-status installment-${installment.status}`}
            >
              {installment.status || "scheduled"}
            </span>
          </div>
        ))}
      </div>

      {booking.scheduleStatus === "pending-review" && (
        <div className="abs-installment-review-actions">
          <p>
            This schedule is waiting for your decision.
            Approving it confirms the booking and reserves
            the required material stock.
          </p>

          <div>
            <button
              type="button"
              className="abs-feature-button abs-installment-approve"
              disabled={
                saving ||
                reviewingScheduleId === booking._id
              }
              onClick={() =>
                reviewInstallmentSchedule(booking, "approve")
              }
            >
              {reviewingScheduleId === booking._id
                ? "Processing…"
                : "Approve schedule"}
            </button>

            <button
              type="button"
              className="abs-feature-button abs-installment-reject"
              disabled={
                saving ||
                reviewingScheduleId === booking._id
              }
              onClick={() =>
                reviewInstallmentSchedule(booking, "reject")
              }
            >
              {reviewingScheduleId === booking._id
                ? "Processing…"
                : "Reject schedule"}
            </button>
          </div>
        </div>
      )}

      {booking.scheduleStatus === "approved" && (
        <p className="abs-installment-feedback is-approved">
          <strong>Schedule approved.</strong> This booking
          has passed installment-schedule review.
        </p>
      )}

      {booking.scheduleStatus === "rejected" && (
        <p className="abs-installment-feedback is-rejected">
          <strong>Schedule rejected.</strong> The customer
          can submit a revised payment schedule.
        </p>
      )}
    </section>
  )}
                      <div className="abs-booking-edit-grid">
                        <label className="abs-feature-field">
                          Quotation (₦)
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={edit.quotationAmount ?? ""}
                            onChange={(event) =>
                              updateBookingField(
                                booking._id,
                                "quotationAmount",
                                event.target.value
                              )
                            }
                            placeholder="Enter quotation"
                          />
                        </label>

                        <label className="abs-feature-field">
                          Booking status
                          <select
                            value={edit.status || booking.status}
                            onChange={(event) =>
                              updateBookingField(
                                booking._id,
                                "status",
                                event.target.value
                              )
                            }
                          >
                            {Object.entries(statusLabels).map(
                              ([value, label]) => (
                                <option
                                  value={value}
                                  key={value}
                                  disabled={
                                    value === "confirmed" &&
                                    booking.status !== "confirmed"
                                  }
                                >
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label className="abs-feature-field">
                          Fulfilment date
                          <input
                            type="date"
                            value={edit.fulfilmentDate || ""}
                            onChange={(event) =>
                              updateBookingField(
                                booking._id,
                                "fulfilmentDate",
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label className="abs-feature-field">
                          Payment deadline
                          <input
                            type="date"
                            value={edit.paymentDeadline || ""}
                            onChange={(event) =>
                              updateBookingField(
                                booking._id,
                                "paymentDeadline",
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label className="abs-feature-field abs-field-full">
                          Admin notes
                          <textarea
                            rows="2"
                            maxLength="3000"
                            value={edit.adminNotes || ""}
                            onChange={(event) =>
                              updateBookingField(
                                booking._id,
                                "adminNotes",
                                event.target.value
                              )
                            }
                            placeholder="Availability check, quotation notes, customer follow-up…"
                          />
                        </label>
                      </div>

                      <div className="abs-booking-balance">
                        <span>
                          Payment status:{" "}
                          <strong>
                            {booking.paymentStatus || "unpaid"}
                          </strong>
                        </span>

                        <span>
                          Amount paid:{" "}
                          <strong>
                            {money(booking.amountPaid)}
                          </strong>
                        </span>

                        {booking.quotationAmount !== null &&
                          booking.quotationAmount !== undefined && (
                            <span>
                              Balance:{" "}
                              <strong>
                                {money(
                                  Math.max(
                                    0,
                                    Number(booking.quotationAmount) -
                                      Number(booking.amountPaid || 0)
                                  )
                                )}
                              </strong>
                            </span>
                          )}
                      </div>

                      <button
                        className="abs-feature-button"
                        type="button"
                        disabled={saving}
                        onClick={() => saveBooking(booking._id)}
                      >
                        {saving
                          ? "Saving…"
                          : "Save booking updates"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* =============================================
              MATERIALS
          ============================================= */

          <section className="abs-admin-list-section">
            <section className="abs-admin-panel">
              <div className="abs-admin-panel-heading">
                <div>
                  <span className="abs-feature-eyebrow">
                    CATALOGUE MANAGEMENT
                  </span>

                  <h2>
                    {editingId ? "Edit material" : "Add a material"}
                  </h2>

                  <p>
                    Set packages, yards, prices, stock, and optional
                    cap/gele availability.
                  </p>
                </div>

                {editingId && (
                  <button
                    className="abs-feature-button abs-feature-button-quiet"
                    type="button"
                    onClick={resetMaterial}
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              <form
                className="abs-feature-form"
                onSubmit={saveMaterial}
              >
                <div className="abs-feature-form-grid">
                  <label className="abs-feature-field">
                    Material name
                    <input
                      required
                      maxLength="120"
                      value={materialForm.name}
                      onChange={(event) =>
                        setMaterialForm({
                          ...materialForm,
                          name: event.target.value,
                        })
                      }
                      placeholder="e.g. Premium Lace"
                    />
                  </label>

                  <label className="abs-feature-field">
                    Category
                    <select
                      value={materialForm.category}
                      onChange={(event) =>
                        setMaterialForm({
                          ...materialForm,
                          category: event.target.value,
                        })
                      }
                    >
                      {[
                        "Lace",
                        "Guinea",
                        "Wool",
                        "Cashmere",
                        "Jokoso",
                        "Linear",
                        "Ankara",
                        "Trouser Material",
                        "Aso-Oke",
                        "Other",
                      ].map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>

                  <label className="abs-feature-field">
                    Variety
                    <input
                      value={materialForm.variety}
                      onChange={(event) =>
                        setMaterialForm({
                          ...materialForm,
                          variety: event.target.value,
                        })
                      }
                      placeholder="e.g. Sanyan, Alari, Etù"
                    />
                  </label>

                  <label className="abs-feature-field">
                    Stock (package units)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={materialForm.stock}
                      onChange={(event) =>
                        setMaterialForm({
                          ...materialForm,
                          stock: event.target.value,
                        })
                      }
                    />
                  </label>

                  {/* IMAGE URL AND FILE UPLOAD */}

                  <div className="abs-feature-field abs-field-full">
                    <label htmlFor="party-material-image-url">
                      Image URL (optional)
                    </label>

                    <input
                      id="party-material-image-url"
                      type="url"
                      value={materialForm.image}
                      onChange={(event) =>
                        handleImageUrlChange(event.target.value)
                      }
                      placeholder="https://…"
                      disabled={Boolean(imageFile)}
                    />

                    <label
                      htmlFor="party-material-image-file"
                      style={{
                        display: "block",
                        marginTop: "12px",
                      }}
                    >
                      Upload material image
                    </label>

                    <input
                      id="party-material-image-file"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />

                    <small>
                      Select an image from your device. It will be
                      uploaded to Cloudinary when you save the material.
                      Maximum size: 50MB.
                    </small>

                    {imagePreview && (
                      <div
                        className="abs-material-image-preview"
                        style={{
                          marginTop: "16px",
                          maxWidth: "320px",
                        }}
                      >
                        <img
                          src={imagePreview}
                          alt="Material preview"
                          style={{
                            display: "block",
                            width: "100%",
                            maxHeight: "240px",
                            objectFit: "cover",
                            borderRadius: "12px",
                            border: "1px solid #dedbd2",
                          }}
                        />

                        <button
                          type="button"
                          className="abs-feature-button abs-feature-button-quiet"
                          onClick={removeMaterialImage}
                          style={{ marginTop: "10px" }}
                        >
                          Remove image
                        </button>
                      </div>
                    )}
                  </div>

                  <label className="abs-feature-field abs-field-full">
                    Description
                    <textarea
                      rows="2"
                      value={materialForm.description}
                      onChange={(event) =>
                        setMaterialForm({
                          ...materialForm,
                          description: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="abs-feature-field abs-field-full">
                    Colours (comma separated)
                    <input
                      value={materialForm.colors}
                      onChange={(event) =>
                        setMaterialForm({
                          ...materialForm,
                          colors: event.target.value,
                        })
                      }
                      placeholder="Gold, wine, royal blue"
                    />
                  </label>
                </div>

                {/* PACKAGES */}

                <div className="abs-admin-packages-heading">
                  <div>
                    <h3>Packages and prices</h3>
                    <p>
                      For example: Lace 5 yards, or 10 yards for
                      Agbada. Configure your own package rules.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="abs-feature-button abs-feature-button-secondary"
                    onClick={addPackage}
                  >
                    Add package
                  </button>
                </div>

                {materialForm.packages.map((pack, index) => (
                  <div
                    className="abs-admin-package-row"
                    key={pack._id || index}
                  >
                    <label className="abs-feature-field">
                      Package name
                      <input
                        required
                        value={pack.name}
                        onChange={(event) =>
                          setPackage(
                            index,
                            "name",
                            event.target.value
                          )
                        }
                        placeholder="Standard / Agbada"
                      />
                    </label>

                    <label className="abs-feature-field">
                      Yards
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={pack.yards}
                        onChange={(event) =>
                          setPackage(
                            index,
                            "yards",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="abs-feature-field">
                      Price (₦)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={pack.price}
                        onChange={(event) =>
                          setPackage(
                            index,
                            "price",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="abs-admin-remove-package"
                      onClick={() => removePackage(index)}
                      disabled={materialForm.packages.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {/* HEADWEAR */}

                <div className="abs-admin-headwear">
                  <label className="abs-feature-check">
                    <input
                      type="checkbox"
                      checked={materialForm.headwear.available}
                      onChange={(event) =>
                        setMaterialForm({
                          ...materialForm,
                          headwear: {
                            ...materialForm.headwear,
                            available: event.target.checked,
                          },
                        })
                      }
                    />

                    <span>
                      <strong>Offer optional cap or gele</strong>
                      <small>
                        Headwear is priced separately from the fabric
                        package.
                      </small>
                    </span>
                  </label>

                  {materialForm.headwear.available && (
                    <div className="abs-feature-form-grid">
                      <label className="abs-feature-field">
                        Headwear type
                        <select
                          value={materialForm.headwear.type}
                          onChange={(event) =>
                            setMaterialForm({
                              ...materialForm,
                              headwear: {
                                ...materialForm.headwear,
                                type: event.target.value,
                              },
                            })
                          }
                        >
                          <option value="cap-or-gele">
                            Cap or gele
                          </option>
                          <option value="cap">Cap only</option>
                          <option value="gele">Gele only</option>
                        </select>
                      </label>

                      <label className="abs-feature-field">
                        Price each (₦)
                        <input
                          type="number"
                          min="0"
                          value={materialForm.headwear.price}
                          onChange={(event) =>
                            setMaterialForm({
                              ...materialForm,
                              headwear: {
                                ...materialForm.headwear,
                                price: event.target.value,
                              },
                            })
                          }
                        />
                      </label>

                      <label className="abs-feature-field">
                        Headwear stock
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={materialForm.headwear.stock}
                          onChange={(event) =>
                            setMaterialForm({
                              ...materialForm,
                              headwear: {
                                ...materialForm.headwear,
                                stock: event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>

                <label className="abs-feature-check">
                  <input
                    type="checkbox"
                    checked={materialForm.active}
                    onChange={(event) =>
                      setMaterialForm({
                        ...materialForm,
                        active: event.target.checked,
                      })
                    }
                  />

                  <span>
                    <strong>
                      Available in customer catalogue
                    </strong>
                  </span>
                </label>

                <button
                  className="abs-feature-button"
                  type="submit"
                  disabled={saving || uploadingImage}
                >
                  {uploadingImage
                    ? "Uploading image…"
                    : saving
                    ? "Saving material…"
                    : editingId
                    ? "Save material"
                    : "Add material"}
                </button>
              </form>
            </section>

            {/* MATERIAL CATALOGUE */}

            <div className="abs-material-toolbar">
              <div>
                <h2>Material catalogue</h2>
                <p>
                  {materials.length} material record
                  {materials.length === 1 ? "" : "s"}
                </p>
              </div>

              <button
                className="abs-feature-button abs-feature-button-secondary"
                type="button"
                onClick={loadAll}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="abs-feature-state">
                Loading materials…
              </div>
            ) : materials.length === 0 ? (
              <div className="abs-feature-empty">
                <h2>No materials configured</h2>
                <p>
                  Add your first material above to make it available
                  to customers.
                </p>
              </div>
            ) : (
              <div className="abs-admin-material-list">
                {materials.map((material) => (
                  <article
                    className="abs-admin-material-row"
                    key={material._id}
                  >
                    <div className="abs-admin-material-thumb">
                      {material.image ? (
                        <img
                          src={material.image}
                          alt={material.name}
                          loading="lazy"
                        />
                      ) : (
                        <span>AC</span>
                      )}
                    </div>

                    <div className="abs-admin-material-info">
                      <span
                        className={`abs-feature-status ${
                          material.active ? "is-live" : "is-draft"
                        }`}
                      >
                        {material.active ? "Active" : "Inactive"}
                      </span>

                      <h3>{material.name}</h3>

                      <p>
                        {material.category}
                        {material.variety
                          ? ` · ${material.variety}`
                          : ""}{" "}
                        · Stock: {material.stock}
                      </p>

                      <small>
                        {(material.packages || [])
                          .map(
                            (pack) =>
                              `${pack.name}: ${money(pack.price)}${
                                pack.yards
                                  ? ` / ${pack.yards} yd`
                                  : ""
                              }`
                          )
                          .join(" · ") ||
                          "No packages configured"}
                      </small>
                    </div>

                    <div className="abs-admin-row-actions">
                      <button
                        type="button"
                        onClick={() => beginEdit(material)}
                      >
                        Edit
                      </button>

                      {material.active && (
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() =>
                            deactivateMaterial(material)
                          }
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

