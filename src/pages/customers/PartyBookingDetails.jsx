import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  apiRequest,
  uploadRequest,
} from "../../services/api";

import LoadingScreen from "../LoadingScreen";
import "./PartyBookingDetails.css";

/* =========================================
   HELPERS
========================================= */

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusLabel(value) {
  return String(value || "pending")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function statusClass(value) {
  return String(value || "pending")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function getBankDetails(result) {
  const data = result?.data || result;

  return (
    data?.bankDetails ||
    data?.bankAccount ||
    data?.accountDetails ||
    data?.bank ||
    {}
  );
}

function getPaymentId(result) {
  const data = result?.data || result;

  return (
    data?.paymentId ||
    data?.payment?._id ||
    null
  );
}

function getUploadedImageUrl(result) {
  const image = result?.image;

  return (
    (typeof image === "string" ? image : image?.url) ||
    result?.url ||
    result?.secure_url ||
    result?.data?.url ||
    result?.data?.secure_url ||
    ""
  );
}

/* =========================================
   COMPONENT
========================================= */

export default function PartyBookingDetails() {
  const { id } = useParams();

  /* -----------------------------------------
     BOOKING STATE
  ----------------------------------------- */

  const [booking, setBooking] = useState(null);
  const [settings, setSettings] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /* -----------------------------------------
     INSTALLMENT STATE
  ----------------------------------------- */

  const [scheduleRows, setScheduleRows] = useState([
    { amount: "", dueDate: "" },
  ]);

  const [processingId, setProcessingId] = useState("");
  const [submittingSchedule, setSubmittingSchedule] =
    useState(false);

  /* -----------------------------------------
     BANK TRANSFER STATE
  ----------------------------------------- */

  const [bankTransfer, setBankTransfer] = useState(null);

  const [transferForm, setTransferForm] = useState({
    transferSenderName: "",
    receiptUrl: "",
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");

  const [uploadingReceipt, setUploadingReceipt] =
    useState(false);

  const [submittingTransfer, setSubmittingTransfer] =
    useState(false);

  /* =========================================
     RECEIPT IMAGE HANDLERS
  ========================================= */

  function handleReceiptChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid receipt image.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Receipt image must not exceed 10MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setReceiptFile(file);

    const previewUrl = URL.createObjectURL(file);

    setReceiptPreview((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return previewUrl;
    });

    // A newly selected image replaces any previous URL.
    setTransferForm((previous) => ({
      ...previous,
      receiptUrl: "",
    }));
  }

  function removeReceiptImage() {
    setReceiptFile(null);

    setReceiptPreview((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return "";
    });

    setTransferForm((previous) => ({
      ...previous,
      receiptUrl: "",
    }));

    const input = document.getElementById(
      "party-bank-receipt-file"
    );

    if (input) input.value = "";
  }

  useEffect(() => {
    return () => {
      if (receiptPreview.startsWith("blob:")) {
        URL.revokeObjectURL(receiptPreview);
      }
    };
  }, [receiptPreview]);

  /* =========================================
     UPLOAD RECEIPT
  ========================================= */

  async function uploadBankReceipt() {
    if (!receiptFile) {
      return transferForm.receiptUrl.trim();
    }

    const formData = new FormData();

    formData.append("image", receiptFile);

    
    const result = await uploadRequest(
      "/uploads/custom-reference",
      formData
    );
    console.log("BANK RECEIPT UPLOAD RESPONSE:", result);

    const uploadedUrl = getUploadedImageUrl(result);

    if (!uploadedUrl || typeof uploadedUrl !== "string") {
      throw new Error(
        "Receipt upload did not return a valid image URL."
      );
    }

    return uploadedUrl;
  }

  /* =========================================
     LOAD BOOKING
  ========================================= */

  const loadBooking = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [bookingResult, settingsResult] =
        await Promise.all([
          apiRequest("/party-bookings/mine"),

          apiRequest(
            "/payments/party-booking/installment-settings"
          ).catch(() => null),
        ]);

      const bookings = Array.isArray(
        bookingResult.bookings
      )
        ? bookingResult.bookings
        : [];

      const foundBooking = bookings.find(
        (item) => String(item._id) === String(id)
      );

      if (!foundBooking) {
        setBooking(null);

        setError(
          "We couldn't find this booking in your account."
        );

        return;
      }

      setBooking(foundBooking);

      setSettings(
        settingsResult?.settings ||
          settingsResult ||
          null
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to load your booking details."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  /* =========================================
     PAYMENT SUMMARY
  ========================================= */

  const paymentSummary = useMemo(() => {
    if (!booking) {
      return {
        quotation: 0,
        paid: 0,
        balance: 0,
        progress: 0,
      };
    }

    const quotation =
      Number(booking.quotationAmount) || 0;

    const paid =
      Number(booking.amountPaid) || 0;

    const balance = Math.max(
      quotation - paid,
      0
    );

    return {
      quotation,
      paid,
      balance,

      progress:
        quotation > 0
          ? Math.min((paid / quotation) * 100, 100)
          : 0,
    };
  }, [booking]);

  const scheduleTotal = scheduleRows.reduce(
    (total, row) =>
      total + Number(row.amount || 0),
    0
  );

  /* =========================================
     MINIMUM DEPOSIT
  ========================================= */

  function getMinimumDeposit(balance) {
    const value = Number(
      settings?.minimumDepositValue ?? 50
    );

    const type =
      settings?.minimumDepositType ||
      "percentage";

    if (type === "percentage") {
      return (balance * value) / 100;
    }

    return value;
  }

  /* =========================================
     INSTALLMENT FORM
  ========================================= */

  function updateScheduleRow(index, field, value) {
    setScheduleRows((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: value }
          : row
      )
    );
  }

  function addScheduleRow() {
    const maxInstallments = Number(
      settings?.maxInstallments || 4
    );

    if (scheduleRows.length >= maxInstallments) {
      return;
    }

    setScheduleRows((previous) => [
      ...previous,
      { amount: "", dueDate: "" },
    ]);
  }

  function removeScheduleRow(index) {
    setScheduleRows((previous) =>
      previous.filter(
        (_, rowIndex) => rowIndex !== index
      )
    );
  }

  /* =========================================
     ACCEPT QUOTATION
  ========================================= */

  async function acceptQuotation() {
    if (!booking) return;

    const confirmed = window.confirm(
      "Do you want to accept the quotation for this party booking?"
    );

    if (!confirmed) return;

    setProcessingId(booking._id);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `/party-bookings/${booking._id}/accept-quotation`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      setNotice(
        result.message ||
          "Quotation accepted successfully."
      );

      await loadBooking();
    } catch (err) {
      setError(
        err.message ||
          "Could not accept this quotation."
      );
    } finally {
      setProcessingId("");
    }
  }

  /* =========================================
     SUBMIT INSTALLMENT SCHEDULE
  ========================================= */

  async function submitSchedule(event) {
    event.preventDefault();

    if (!booking) return;

    const balance = paymentSummary.balance;

    if (balance <= 0) {
      setError("There is no outstanding balance.");
      return;
    }

    if (!scheduleRows.length) {
      setError("Add at least one installment.");
      return;
    }

    if (
      scheduleRows.some(
        (row) =>
          !Number.isFinite(Number(row.amount)) ||
          Number(row.amount) <= 0 ||
          !row.dueDate
      )
    ) {
      setError(
        "Enter a valid amount and due date for every installment."
      );
      return;
    }

    const totalInKobo = Math.round(scheduleTotal * 100);
    const balanceInKobo = Math.round(balance * 100);

    if (totalInKobo !== balanceInKobo) {
      setError(
        `Your installment amounts must total ${money(balance)}.`
      );
      return;
    }

    const minimumDeposit = getMinimumDeposit(balance);

    if (Number(scheduleRows[0].amount) < minimumDeposit) {
      setError(
        `Your first installment must be at least ${money(minimumDeposit)}.`
      );
      return;
    }

    const dueDates = scheduleRows.map(
      (row) => row.dueDate
    );

    if (
      dueDates.some(
        (date, index) =>
          index > 0 && date < dueDates[index - 1]
      )
    ) {
      setError(
        "Installment dates must be in chronological order."
      );
      return;
    }

    setSubmittingSchedule(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `/party-bookings/${booking._id}/installment-schedule`,
        {
          method: "POST",
          body: JSON.stringify({
            installments: scheduleRows.map((row) => ({
              amount: Number(row.amount),
              dueDate: row.dueDate,
            })),
          }),
        }
      );

      setNotice(
        result.message ||
          "Your installment schedule has been submitted for review."
      );

      setScheduleRows([
        { amount: "", dueDate: "" },
      ]);

      await loadBooking();
    } catch (err) {
      setError(
        err.message ||
          "Could not submit your installment schedule."
      );
    } finally {
      setSubmittingSchedule(false);
    }
  }

  /* =========================================
     PAYSTACK / FLUTTERWAVE
  ========================================= */

  async function initializePayment(installment, provider) {
    if (!booking || !installment?._id) {
      setError(
        "The installment information is incomplete."
      );
      return;
    }

    if (installment.status === "paid") {
      setError(
        "This installment has already been paid."
      );
      return;
    }

    setProcessingId(installment._id);
    setError("");
    setNotice("");

    try {
      let result;
      let paymentUrl = "";

      if (provider === "paystack") {
        result = await apiRequest(
          "/payments/party-booking/initialize",
          {
            method: "POST",
            body: JSON.stringify({
              partyBookingId: booking._id,
              installmentId: installment._id,
            }),
          }
        );

        paymentUrl =
          result.authorization_url ||
          result.data?.authorization_url;
      }

      if (provider === "flutterwave") {
        result = await apiRequest(
          "/payments/flutterwave/initialize",
          {
            method: "POST",
            body: JSON.stringify({
              partyBookingId: booking._id,
              installmentId: installment._id,
            }),
          }
        );

        paymentUrl =
          result.link ||
          result.data?.link ||
          result.checkoutUrl;
      }

      if (!paymentUrl) {
        throw new Error(
          `${provider} did not return a checkout URL.`
        );
      }

      window.location.assign(paymentUrl);
    } catch (err) {
      setError(
        err.message ||
          "Could not initialize payment."
      );

      setProcessingId("");
    }
  }

  /* =========================================
     INITIALIZE BANK TRANSFER
  ========================================= */

  async function initializeBankTransfer(installment) {
    if (!booking || !installment?._id) {
      setError(
        "The installment information is incomplete."
      );
      return;
    }

    if (installment.status === "paid") {
      setError(
        "This installment has already been paid."
      );
      return;
    }

    setProcessingId(installment._id);
    setError("");
    setNotice("");
    setBankTransfer(null);

    // Reset receipt selection for a new transfer.
    setReceiptFile(null);
    setReceiptPreview((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return "";
    });

    setTransferForm({
      transferSenderName: "",
      receiptUrl: "",
    });

    try {
      const result = await apiRequest(
        "/payments/bank-transfer/initialize",
        {
          method: "POST",
          body: JSON.stringify({
            partyBookingId: booking._id,
            installmentId: installment._id,
          }),
        }
      );

      const data = result?.data || result;
      const paymentId = getPaymentId(result);

      if (!paymentId) {
        throw new Error(
          "Bank transfer initialization did not return a payment ID."
        );
      }

      const bankDetails = getBankDetails(result);

      setBankTransfer({
        paymentId,
        installmentId: installment._id,

        reference:
          data.reference ||
          data.paymentReference ||
          data.transactionReference ||
          "",

        amount:
          data.amount ??
          installment.amount,

        bankDetails,
        submitted: false,
      });

      setNotice(
        "Your bank transfer details are ready. Complete the transfer and submit the details for verification."
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not initialize bank transfer."
      );
    } finally {
      setProcessingId("");
    }
  }

  /* =========================================
     SUBMIT BANK TRANSFER
  ========================================= */

  async function submitBankTransfer(event) {
    event.preventDefault();
    const transferAmount = Number(bankTransfer.amount);

if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
  throw new Error("The initialized bank transfer amount is invalid.");
}

    if (!bankTransfer?.paymentId) {
      setError(
        "Initialize your bank transfer first."
      );
      return;
    }

    if (!transferForm.transferSenderName.trim()) {
      setError(
        "Enter the account name used for the transfer."
      );
      return;
    }

    setSubmittingTransfer(true);
    setError("");
    setNotice("");

    let uploadedReceiptUrl = "";

    try {
      /*
       * Upload the selected image first.
       * The backend receives the Cloudinary URL,
       * not the browser's temporary blob URL.
       */
      if (receiptFile) {
        setUploadingReceipt(true);

        uploadedReceiptUrl = await uploadBankReceipt();

        setTransferForm((previous) => ({
          ...previous,
          receiptUrl: uploadedReceiptUrl,
        }));
      } else {
        uploadedReceiptUrl =
          transferForm.receiptUrl.trim();
      }

      console.log("BANK TRANSFER SUBMISSION:", {
  paymentId: bankTransfer?.paymentId,
  transferSenderName: transferForm.transferSenderName,
  receiptUrl: transferForm.receiptUrl,
  receiptFile,
});
      const result = await apiRequest(
        "/payments/bank-transfer/submit",
        {
          method: "POST",
          body: JSON.stringify({
            paymentId: bankTransfer.paymentId,

            transferSenderName:
              transferForm.transferSenderName.trim(),
                   transferAmount,

            ...(uploadedReceiptUrl
              ? {
                  receiptUrl: uploadedReceiptUrl,
                }
              : {}),
          }),
        }
      );

      setBankTransfer((previous) => ({
        ...previous,
        submitted: true,
      }));

      setNotice(
        result.message ||
          "Your bank transfer has been submitted and is awaiting verification."
      );

      await loadBooking();
    } catch (err) {
      setError(
        err.message ||
          "Could not submit your bank transfer."
      );
    } finally {
      setSubmittingTransfer(false);
      setUploadingReceipt(false);
    }
  }

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return <LoadingScreen />;
  }

  /* =========================================
     BOOKING NOT FOUND
  ========================================= */

  if (!booking) {
    return (
      <main className="party-booking-details-page">
        <section className="abs-feature-empty">
          <span className="abs-feature-empty-mark">
            AC
          </span>

          <h2>Booking unavailable</h2>

          <p>
            {error ||
              "This booking could not be found."}
          </p>

          <Link
            to="/my-party-bookings"
            className="abs-feature-button"
          >
            Back to My Bookings
          </Link>
        </section>
      </main>
    );
  }

  /* =========================================
     BOOKING CONDITIONS
  ========================================= */

  const canAcceptQuotation =
    booking.status === "quoted" &&
    !booking.quotationAcceptedAt;

  const canSubmitSchedule =
    Boolean(booking.quotationAcceptedAt) &&
    ["not-submitted", "rejected"].includes(
      booking.scheduleStatus
    ) &&
    paymentSummary.balance > 0;

  const scheduleApproved =
    booking.scheduleStatus === "approved";

  /* =========================================
     RENDER
  ========================================= */

  return (
    <main className="party-booking-details-page">

      {/* HERO */}

      <section className="abs-feature-hero">
        <span className="abs-feature-eyebrow">
          ABS CUT · PARTY RESERVATIONS
        </span>

        <h1>
          Booking <em>Details</em>
        </h1>

        <p>
          Follow your reservation, review your quotation
          and manage your installment payments.
        </p>

        <div className="abs-booking-reference">
          Booking reference:{" "}
          <strong>
            {String(booking._id)
              .slice(-8)
              .toUpperCase()}
          </strong>
        </div>
      </section>

      <section className="abs-feature-content">

        {/* ALERTS */}

        {notice && (
          <div
            className="abs-feature-alert is-success"
            role="status"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            className="abs-feature-alert is-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* BOOKING OVERVIEW */}

        <section className="abs-feature-card">

          <div className="abs-booking-section-heading">
            <div>
              <span className="abs-feature-eyebrow">
                RESERVATION
              </span>

              <h2>Booking overview</h2>
            </div>

            <span
              className={`abs-party-status is-${statusClass(
                booking.status
              )}`}
            >
              {statusLabel(booking.status)}
            </span>
          </div>

          <div className="abs-party-detail-grid">

            <div>
              <small>Event type</small>
              <strong>
                {booking.eventType || "Not specified"}
              </strong>
            </div>

            <div>
              <small>Event date</small>
              <strong>{formatDate(booking.eventDate)}</strong>
            </div>

            <div>
              <small>Party size</small>
              <strong>
                {booking.partySize || "Not specified"}
              </strong>
            </div>

            <div>
              <small>Contact name</small>
              <strong>
                {booking.contactName || "Not specified"}
              </strong>
            </div>

            <div>
              <small>Phone number</small>
              <strong>
                {booking.phone || "Not specified"}
              </strong>
            </div>

            <div>
              <small>Fulfilment method</small>
              <strong>
                {booking.deliveryMethod === "delivery"
                  ? "Delivery"
                  : "Collection"}
              </strong>
            </div>

            <div>
              <small>Fulfilment date</small>
              <strong>
                {formatDate(booking.fulfilmentDate)}
              </strong>
            </div>

            <div>
              <small>Payment deadline</small>
              <strong>
                {formatDate(booking.paymentDeadline)}
              </strong>
            </div>

          </div>

          {booking.deliveryMethod === "delivery" &&
            booking.deliveryAddress && (
              <div className="abs-booking-note">
                <span>Delivery address</span>
                <p>{booking.deliveryAddress}</p>
              </div>
            )}

          {booking.customerNotes && (
            <div className="abs-booking-note">
              <span>Your notes</span>
              <p>{booking.customerNotes}</p>
            </div>
          )}

        </section>

        {/* MATERIALS */}

        <section className="abs-feature-card">

          <span className="abs-feature-eyebrow">
            MATERIAL SELECTION
          </span>

          <h2>Reserved materials</h2>

          {booking.items?.length > 0 ? (
            <div className="abs-booking-material-list">

              {booking.items.map((item, index) => {
                const packageTotal =
                  Number(item.unitPrice || 0) *
                  Number(item.quantity || 1);

                const headwearTotal =
                  Number(item.headwearUnitPrice || 0) *
                  Number(item.headwearQuantity || 0);

                const itemTotal =
                  packageTotal + headwearTotal;

                return (
                  <article
                    className="abs-booking-material-item"
                    key={item._id || index}
                  >
                    <div>
                      <h3>
                        {item.materialName || "Party material"}
                      </h3>

                      <p>
                        {item.category || "Material"}
                        {item.variety ? ` · ${item.variety}` : ""}
                      </p>

                      <p>
                        Package:{" "}
                        {item.packageName || "Not specified"}
                      </p>

                      <p>
                        Yardage: {item.yards || 0} yards
                      </p>

                      <p>
                        Quantity: {item.quantity || 1}
                      </p>

                      {item.headwearType &&
                        item.headwearType !== "none" && (
                          <p>
                            Headwear:{" "}
                            {statusLabel(item.headwearType)}
                            {" · "}Quantity:{" "}
                            {item.headwearQuantity || 0}
                          </p>
                        )}
                    </div>

                    {itemTotal > 0 && (
                      <strong>{money(itemTotal)}</strong>
                    )}
                  </article>
                );
              })}

            </div>
          ) : (
            <p>No material details are available.</p>
          )}

        </section>

        {/* PAYMENT OVERVIEW */}

        <section className="abs-feature-card">

          <div className="abs-booking-section-heading">
            <div>
              <span className="abs-feature-eyebrow">
                PAYMENT OVERVIEW
              </span>

              <h2>Quotation and balance</h2>
            </div>

            <span
              className={`abs-party-status is-${statusClass(
                booking.paymentStatus
              )}`}
            >
              {statusLabel(booking.paymentStatus)}
            </span>
          </div>

          {paymentSummary.quotation > 0 ? (
            <>
              <div className="abs-party-payment-overview">

                <div>
                  <small>Quotation amount</small>
                  <strong>
                    {money(paymentSummary.quotation)}
                  </strong>
                </div>

                <div>
                  <small>Amount paid</small>
                  <strong>{money(paymentSummary.paid)}</strong>
                </div>

                <div>
                  <small>Outstanding balance</small>
                  <strong>
                    {money(paymentSummary.balance)}
                  </strong>
                </div>

              </div>

              <div className="abs-party-booking-progress">

                <div>
                  <span>Payment progress</span>

                  <strong>
                    {Math.round(paymentSummary.progress)}%
                  </strong>
                </div>

                <div className="abs-party-progress-track">
                  <span
                    style={{
                      width: `${paymentSummary.progress}%`,
                    }}
                  />
                </div>

              </div>
            </>
          ) : (
            <p>
              Your reservation is awaiting an admin quotation.
            </p>
          )}

          <div className="abs-party-detail-grid">

            <div>
              <small>Quotation accepted</small>

              <strong>
                {booking.quotationAcceptedAt
                  ? formatDate(booking.quotationAcceptedAt)
                  : "Not yet accepted"}
              </strong>
            </div>

            <div>
              <small>Schedule status</small>

              <strong>
                {statusLabel(booking.scheduleStatus)}
              </strong>
            </div>

          </div>

          {canAcceptQuotation && (
            <div className="abs-party-action-panel">

              <h3>Your quotation is ready</h3>

              <p>
                Review the quotation and fulfilment details
                before accepting. Your payment schedule can
                be submitted after acceptance.
              </p>

              <button
                type="button"
                className="abs-feature-button"
                disabled={processingId === booking._id}
                onClick={acceptQuotation}
              >
                {processingId === booking._id
                  ? "Processing…"
                  : "Accept quotation"}
              </button>

            </div>
          )}

        </section>

        {/* INSTALLMENT SCHEDULE FORM */}

        {canSubmitSchedule && (
          <section className="abs-feature-card">

            <span className="abs-feature-eyebrow">
              PAYMENT PLANNING
            </span>

            <h2>Submit installment schedule</h2>

            <p>
              Outstanding balance:{" "}
              <strong>{money(paymentSummary.balance)}</strong>
            </p>

            <p>
              Your installment amounts must total the
              outstanding balance. ABS CUT will review
              your proposed dates and amounts.
            </p>

            <form
              className="abs-feature-form"
              onSubmit={submitSchedule}
            >

              {scheduleRows.map((row, index) => (
                <div
                  className="abs-party-schedule-row"
                  key={index}
                >

                  <label className="abs-feature-field">
                    Installment {index + 1} amount

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={row.amount}
                      onChange={(event) =>
                        updateScheduleRow(
                          index,
                          "amount",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="abs-feature-field">
                    Proposed payment date

                    <input
                      type="date"
                      required
                      value={row.dueDate}
                      onChange={(event) =>
                        updateScheduleRow(
                          index,
                          "dueDate",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  {scheduleRows.length > 1 && (
                    <button
                      type="button"
                      className="abs-feature-button abs-feature-button-secondary"
                      onClick={() => removeScheduleRow(index)}
                    >
                      Remove
                    </button>
                  )}

                </div>
              ))}

              <div className="abs-party-schedule-total">
                <span>Schedule total</span>
                <strong>{money(scheduleTotal)}</strong>
              </div>

              {scheduleTotal !== paymentSummary.balance && (
                <p className="abs-party-validation-note">
                  Amount remaining to allocate:{" "}
                  {money(
                    paymentSummary.balance - scheduleTotal
                  )}
                </p>
              )}

              {scheduleRows.length <
                Number(settings?.maxInstallments || 4) && (
                <button
                  type="button"
                  className="abs-feature-button abs-feature-button-secondary"
                  onClick={addScheduleRow}
                >
                  Add another installment
                </button>
              )}

              <button
                type="submit"
                className="abs-feature-button"
                disabled={submittingSchedule}
              >
                {submittingSchedule
                  ? "Submitting schedule…"
                  : "Submit installment schedule"}
              </button>

            </form>

          </section>
        )}

        {/* SCHEDULE UNDER REVIEW */}

        {booking.scheduleStatus === "pending-review" && (
          <section className="abs-feature-card">

            <span className="abs-feature-eyebrow">
              INSTALLMENT SCHEDULE
            </span>

            <h2>Schedule under review</h2>

            <p>
              Your proposed installment schedule has
              been submitted. You can make payments
              after ABS CUT approves it.
            </p>

          </section>
        )}

        {/* REJECTED SCHEDULE */}

        {booking.scheduleStatus === "rejected" && (
          <section className="abs-feature-card">

            <span className="abs-feature-eyebrow">
              INSTALLMENT SCHEDULE
            </span>

            <h2>Schedule needs revision</h2>

            <p>
              Your previous installment schedule was
              not approved. You can review the details
              and submit another schedule.
            </p>

          </section>
        )}

        {/* APPROVED INSTALLMENTS */}

        {scheduleApproved && (
          <section className="abs-feature-card">

            <span className="abs-feature-eyebrow">
              APPROVED PAYMENT PLAN
            </span>

            <h2>Installment payments</h2>

            {booking.installmentSchedule?.length > 0 ? (
              <div className="abs-installment-list">

                {booking.installmentSchedule.map(
                  (installment, index) => (
                    <article
                      className="abs-installment-item"
                      key={installment._id || index}
                    >

                      <div>
                        <strong>
                          Installment {index + 1}
                        </strong>

                        <span>
                          Due: {formatDate(installment.dueDate)}
                        </span>

                        <span
                          className={`abs-party-installment-status is-${statusClass(
                            installment.status
                          )}`}
                        >
                          {statusLabel(installment.status)}
                        </span>
                      </div>

                      <div className="abs-party-payment-actions">

                        <strong>
                          {money(installment.amount)}
                        </strong>

                        {installment.status !== "paid" &&
                          paymentSummary.balance > 0 && (
                            <>

                              {/* PAYSTACK */}

                              <button
                                type="button"
                                className="abs-feature-button"
                                disabled={
                                  processingId === installment._id
                                }
                                onClick={() =>
                                  initializePayment(
                                    installment,
                                    "paystack"
                                  )
                                }
                              >
                                {processingId === installment._id
                                  ? "Processing…"
                                  : "Pay with Paystack"}
                              </button>

                              {/* FLUTTERWAVE */}

                              <button
                                type="button"
                                className="abs-feature-button abs-feature-button-secondary"
                                disabled={
                                  processingId === installment._id
                                }
                                onClick={() =>
                                  initializePayment(
                                    installment,
                                    "flutterwave"
                                  )
                                }
                              >
                                Pay with Flutterwave
                              </button>

                              {/* BANK TRANSFER */}

                              <button
                                type="button"
                                className="abs-feature-button abs-feature-button-secondary"
                                disabled={
                                  processingId === installment._id
                                }
                                onClick={() =>
                                  initializeBankTransfer(
                                    installment
                                  )
                                }
                              >
                                {processingId === installment._id
                                  ? "Preparing transfer…"
                                  : "Pay by Bank Transfer"}
                              </button>

                            </>
                          )}

                      </div>

                    </article>
                  )
                )}

              </div>
            ) : (
              <p>No installment records are available yet.</p>
            )}

          </section>
        )}

        {/* BANK TRANSFER DETAILS */}

        {bankTransfer && (
          <section className="abs-feature-card abs-bank-transfer-card">

            <span className="abs-feature-eyebrow">
              BANK TRANSFER
            </span>

            <h2>Complete your bank transfer</h2>

            <p>
              Transfer the exact amount below to the
              ABS CUT account. After completing the
              transfer, submit your transfer details
              for verification.
            </p>

            <div className="abs-bank-transfer-details">

              <div>
                <small>Bank name</small>

                <strong>
                  {bankTransfer.bankDetails.bankName ||
                    bankTransfer.bankDetails.bank ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <small>Account name</small>

                <strong>
                  {bankTransfer.bankDetails.accountName ||
                    bankTransfer.bankDetails.accountHolder ||
                    bankTransfer.bankDetails.account_name ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <small>Account number</small>

                <strong>
                  {bankTransfer.bankDetails.accountNumber ||
                    bankTransfer.bankDetails.account_number ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <small>Transfer amount</small>

                <strong>{money(bankTransfer.amount)}</strong>
              </div>

              <div>
                <small>Payment reference</small>

                <strong>
                  {bankTransfer.reference || "Not available"}
                </strong>
              </div>

            </div>

            {bankTransfer.submitted ? (
              <div
                className="abs-feature-alert is-success"
                role="status"
              >
                Your bank transfer details have been
                submitted successfully. Your payment
                is awaiting verification by ABS CUT.
              </div>
            ) : (
              <form
                className="abs-feature-form"
                onSubmit={submitBankTransfer}
              >

                {/* TRANSFER SENDER */}

                <label className="abs-feature-field">
                  Account name used for the transfer

                  <input
                    type="text"
                    value={transferForm.transferSenderName}
                    onChange={(event) =>
                      setTransferForm((previous) => ({
                        ...previous,
                        transferSenderName:
                          event.target.value,
                      }))
                    }
                    placeholder="Enter the sender's account name"
                    required
                  />
                </label>

                {/* RECEIPT IMAGE UPLOAD */}

                <div className="abs-feature-field abs-bank-receipt-field">

                  <div className="abs-bank-receipt-heading">
                    <strong>Transfer receipt</strong>

                    <span className="abs-bank-receipt-optional">
                      Optional
                    </span>
                  </div>

                  <p>
                    Upload a screenshot or photo of your
                    bank transfer confirmation for verification.
                  </p>

                  <label
                    htmlFor="party-bank-receipt-file"
                    className="abs-bank-receipt-upload"
                  >
                    <span className="abs-bank-receipt-upload-icon">
                      <i className="fa-solid fa-cloud-arrow-up" />
                    </span>

                    <span>
                      <strong>
                        {receiptFile
                          ? "Choose another receipt"
                          : "Upload receipt image"}
                      </strong>

                      <small>
                        PNG, JPG, WEBP · Maximum 10MB
                      </small>
                    </span>
                  </label>

                  <input
                    id="party-bank-receipt-file"
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptChange}
                    disabled={
                      submittingTransfer ||
                      uploadingReceipt
                    }
                  />

                  {/* IMAGE PREVIEW */}

                  {receiptPreview && (
                    <div className="abs-bank-receipt-preview">

                      <div className="abs-bank-receipt-preview-heading">
                        <strong>Receipt preview</strong>

                        {receiptFile && (
                          <small>
                            {(
                              receiptFile.size / 1024
                            ).toFixed(1)} KB
                          </small>
                        )}
                      </div>

                      <div className="abs-bank-receipt-image">
                        <img
                          src={receiptPreview}
                          alt="Bank transfer receipt preview"
                        />
                      </div>

                      <div className="abs-bank-receipt-actions">

                        <label
                          htmlFor="party-bank-receipt-file"
                          className="abs-feature-button abs-feature-button-secondary"
                        >
                          <i className="fa-solid fa-rotate" />
                          Replace receipt
                        </label>

                        <button
                          type="button"
                          className="abs-feature-button abs-feature-button-quiet"
                          onClick={removeReceiptImage}
                          disabled={
                            submittingTransfer ||
                            uploadingReceipt
                          }
                        >
                          <i className="fa-solid fa-trash" />
                          Remove
                        </button>

                      </div>

                    </div>
                  )}

                  {!receiptPreview && (
                    <div className="abs-bank-receipt-empty">
                      <i className="fa-regular fa-image" />
                      <span>No receipt image selected</span>
                    </div>
                  )}

                </div>

                {/* SUBMIT */}

                <button
                  type="submit"
                  className="abs-feature-button"
                  disabled={
                    submittingTransfer ||
                    uploadingReceipt
                  }
                >
                  {uploadingReceipt
                    ? "Uploading receipt…"
                    : submittingTransfer
                      ? "Submitting transfer…"
                      : "Submit Transfer for Verification"}
                </button>

              </form>
            )}

          </section>
        )}

        {/* ADMIN NOTES */}

        {booking.adminNotes && (
          <section className="abs-feature-card">

            <span className="abs-feature-eyebrow">
              ABS CUT UPDATE
            </span>

            <h2>Message from our team</h2>

            <p>{booking.adminNotes}</p>

          </section>
        )}

        {/* NAVIGATION */}

        <div className="abs-booking-details-actions">

          <Link
            to="/my-party-bookings"
            className="abs-feature-button abs-feature-button-secondary"
          >
            Back to my bookings
          </Link>

          <Link
            to="/party-materials"
            className="abs-feature-button"
          >
            Browse more materials
          </Link>

        </div>

      </section>
    </main>
  );
}
