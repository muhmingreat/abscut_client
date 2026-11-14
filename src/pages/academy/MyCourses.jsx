
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  apiRequest,
  uploadRequest,
} from "../../services/api";

import "./MyCourses.css";

const RECEIPT_UPLOAD_ENDPOINT =
    "/uploads/academy-payment-receipt";

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function formatMoney(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getCourse(enrollment) {
  return enrollment?.course || enrollment?.courseSnapshot || {};
}

function getPaymentLabel(enrollment) {
  if (enrollment.status === "completed") {
    return "Completed";
  }

  switch (enrollment.paymentStatus) {
    case "paid":
      return "Paid";

    case "partially_paid":
      return "Partially paid";

    case "pending":
      return "Payment pending";

    case "not_required":
      return "Free course";

    default:
      return "Payment required";
  }
}

function getPaymentStatusClass(enrollment) {
  if (enrollment.status === "completed") return "success";

  if (
    ["paid", "not_required"].includes(
      enrollment.paymentStatus
    )
  ) {
    return "success";
  }

  if (enrollment.paymentStatus === "partially_paid") {
    return "partial";
  }

  return "pending";
}

function MyCourses() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment UI state is kept separately for each enrollment.
  const [paymentSessions, setPaymentSessions] = useState({});

  const updatePaymentSession = (enrollmentId, updates) => {
    setPaymentSessions((previous) => ({
      ...previous,
      [enrollmentId]: {
        ...previous[enrollmentId],
        ...updates,
      },
    }));
  };

  useEffect(() => {
    loadMyCourses();
  }, []);

  async function loadMyCourses() {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(
        "/academy/enrollments/me"
      );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to load your courses."
        );
      }

      setEnrollments(response.enrollments || []);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load your enrolled courses."
      );
    } finally {
      setLoading(false);
    }
  }

  function continueLearning(enrollment) {
    if (!enrollment?._id) {
      setError(
        "Enrollment ID is missing. Please refresh your courses."
      );
      return;
    }

    navigate(`/academy/learn/${enrollment._id}`);
  }

  function canAccessCourse(enrollment) {
    return (
      ["active", "completed"].includes(enrollment.status) &&
      ["paid", "partially_paid", "not_required"].includes(
        enrollment.paymentStatus
      )
    );
  }

  function getPaymentAmount(enrollment) {
    const total = Number(
      enrollment.courseSnapshot?.price ??
        enrollment.course?.price ??
        enrollment.amountDue ??
        0
    );

    const paid = Number(enrollment.amountPaid || 0);

    return Math.max(0, total - paid);
  }

  function getPaymentOptions(enrollment) {
    const paid = Number(enrollment.amountPaid || 0);

    if (
      enrollment.paymentStatus === "partially_paid" &&
      Number(enrollment.installmentsPaid || 0) === 1
    ) {
      return [
        {
          value: "installment",
          label: "Second installment",
          description: "Pay the remaining balance",
        },
      ];
    }

    if (paid > 0) {
      return [];
    }

    return [
      {
        value: "full",
        label: "Full payment",
        description: "Pay the entire course fee now",
      },
      {
        value: "installment",
        label: "50% installment",
        description: "Pay half now and the balance later",
      },
    ];
  }

  async function startBankTransfer(enrollment) {
    const enrollmentId = enrollment?._id;

    if (!enrollmentId) return;

    const currentSession = paymentSessions[enrollmentId];

    if (currentSession?.loading) return;

    const paymentOption =
      currentSession?.paymentOption || "full";

    try {
      updatePaymentSession(enrollmentId, {
        loading: true,
        error: "",
        success: "",
      });

      // Fetch official Academy bank details.
      const bankResponse = await apiRequest(
        "/academy/payments/bank-details"
      );

      if (!bankResponse?.success) {
        throw new Error(
          bankResponse?.message ||
            "Unable to retrieve bank account details."
        );
      }

      // Create the payment record.
      const paymentResponse = await apiRequest(
        "/academy/payments/bank-transfer/initialize",
        {
          method: "POST",
          body: JSON.stringify({
            enrollmentId,
            paymentOption,
          }),
        }
      );

      if (
        !paymentResponse?.success ||
        !paymentResponse?.payment?._id
      ) {
        throw new Error(
          paymentResponse?.message ||
            "Unable to initialize bank transfer."
        );
      }

      updatePaymentSession(enrollmentId, {
        loading: false,
        payment: paymentResponse.payment,
        bankDetails: bankResponse.bankDetails || {},
        paymentOption,
        senderName: "",
        receiptFile: null,
        receiptPreview: "",
        error: "",
        success: "",
      });
    } catch (err) {
      updatePaymentSession(enrollmentId, {
        loading: false,
        error:
          err.message ||
          "Unable to initialize bank transfer.",
      });
    }
  }

  function handleReceiptChange(enrollmentId, file) {
    if (!file) return;

    if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
      updatePaymentSession(enrollmentId, {
        error:
          "Please upload a JPG, PNG, or WebP receipt image.",
      });
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      updatePaymentSession(enrollmentId, {
        error: "Receipt image must not exceed 5MB.",
      });
      return;
    }

    updatePaymentSession(enrollmentId, {
      receiptFile: file,
      receiptPreview: URL.createObjectURL(file),
      error: "",
      success: "",
    });
  }

  async function submitReceipt(enrollmentId) {
    const session = paymentSessions[enrollmentId];

    if (!session?.payment?._id) {
      updatePaymentSession(enrollmentId, {
        error: "Please initialize your bank transfer first.",
      });
      return;
    }

    if (!session.senderName?.trim()) {
      updatePaymentSession(enrollmentId, {
        error: "Please enter the transfer sender's name.",
      });
      return;
    }

    if (!session.receiptFile) {
      updatePaymentSession(enrollmentId, {
        error: "Please select your payment receipt.",
      });
      return;
    }

    try {
      updatePaymentSession(enrollmentId, {
        uploading: true,
        submitting: false,
        error: "",
        success: "",
      });

      // Upload receipt to the Academy Cloudinary endpoint.
      const formData = new FormData();

      formData.append("receipt", session.receiptFile);

      const uploadResponse = await uploadRequest(
        RECEIPT_UPLOAD_ENDPOINT,
        formData
      );

      const receiptUrl =
        uploadResponse?.receiptUrl ||
        uploadResponse?.imageUrl ||
        uploadResponse?.url;

      if (!uploadResponse?.success || !receiptUrl) {
        throw new Error(
          uploadResponse?.message ||
            "Receipt upload did not return a valid URL."
        );
      }

      updatePaymentSession(enrollmentId, {
        uploading: false,
        submitting: true,
      });

      // Submit the receipt and sender name.
      const evidenceResponse = await apiRequest(
        "/academy/payments/bank-transfer/submit",
        {
          method: "POST",
          body: JSON.stringify({
            paymentId: session.payment._id,
            transferSenderName: session.senderName.trim(),
            receiptUrl,
          }),
        }
      );

      if (!evidenceResponse?.success) {
        throw new Error(
          evidenceResponse?.message ||
            "Unable to submit payment evidence."
        );
      }

      updatePaymentSession(enrollmentId, {
        uploading: false,
        submitting: false,
        payment: {
          ...session.payment,
          status:
            evidenceResponse.payment?.status ||
            "awaiting_confirmation",
        },
        receiptUrl,
        receiptFile: null,
        success:
          evidenceResponse.message ||
          "Your receipt has been submitted successfully.",
        error: "",
      });
    } catch (err) {
      updatePaymentSession(enrollmentId, {
        uploading: false,
        submitting: false,
        error:
          err.message ||
          "Unable to submit payment receipt.",
      });
    }
  }

  function closePaymentPanel(enrollmentId) {
    setPaymentSessions((previous) => {
      const updated = { ...previous };
      delete updated[enrollmentId];
      return updated;
    });
  }

  if (loading) {
    return (
      <main className="my-courses-page">
        <div className="my-courses-loading">
          <div className="my-courses-spinner" />
          <p>Loading your learning journey...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="my-courses-page">
      <header className="my-courses-header">
        <Link to="/academy" className="my-courses-brand">
          ABS CUT
          <span>FASHION ACADEMY</span>
        </Link>

        <Link to="/academy" className="my-courses-back">
          Explore Academy
        </Link>
      </header>

      <section className="my-courses-hero">
        <span className="my-courses-eyebrow">
          YOUR LEARNING JOURNEY
        </span>

        <h1>My Courses</h1>

        <p>
          Continue learning, develop your tailoring skills,
          and turn your creativity into craftsmanship.
        </p>

        <div className="my-courses-count">
          <strong>{enrollments.length}</strong>
          <span>
            {enrollments.length === 1
              ? "Enrolled Course"
              : "Enrolled Courses"}
          </span>
        </div>
      </section>

      <section className="my-courses-content">
        {error && (
          <div className="my-courses-error">
            <span>{error}</span>
            <button onClick={loadMyCourses}>
              Try again
            </button>
          </div>
        )}

        {enrollments.length === 0 ? (
          <div className="my-courses-empty">
            <span className="my-courses-empty-icon">✂</span>

            <h2>Your learning journey starts here</h2>

            <p>
              You haven't enrolled in any courses yet.
              Explore our fashion classes and start learning.
            </p>

            <Link
              to="/academy"
              className="my-courses-explore-button"
            >
              Explore Courses
            </Link>
          </div>
        ) : (
          <div className="my-courses-grid">
            {enrollments.map((enrollment) => {
              const course = getCourse(enrollment);

              const session =
                paymentSessions[enrollment._id] || {};

              const progress = Math.min(
                100,
                Math.max(
                  0,
                  Number(enrollment.progressPercentage) || 0
                )
              );

              const isCompleted =
                enrollment.status === "completed" ||
                progress >= 100;

              const canAccess =
                canAccessCourse(enrollment);

              const paymentOptions =
                getPaymentOptions(enrollment);

              const remainingAmount =
                getPaymentAmount(enrollment);

              const paymentStatusLabel =
                getPaymentLabel(enrollment);

              const paymentStatusClass =
                getPaymentStatusClass(enrollment);

              const hasPaymentSession =
                Boolean(session.payment?._id);

              const evidenceSubmitted =
                session.payment?.status ===
                "awaiting_confirmation";

              const isBusy =
                session.loading ||
                session.uploading ||
                session.submitting;

              return (
                <article
                  className="my-course-card"
                  key={enrollment._id}
                >
                  <div className="my-course-image">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title || "Course"}
                      />
                    ) : (
                      <div className="my-course-image-placeholder">
                        ABS CUT
                        <span>FASHION ACADEMY</span>
                      </div>
                    )}

                    <span className="my-course-status">
                      {isCompleted
                        ? "Completed"
                        : paymentStatusLabel}
                    </span>
                  </div>

                  <div className="my-course-card-body">
                    <div className="my-course-card-topline">
                      <span className="my-course-category">
                        {course.category ||
                          "Fashion & Tailoring"}
                      </span>

                      <span
                        className={`my-course-payment-badge ${paymentStatusClass}`}
                      >
                        {paymentStatusLabel}
                      </span>
                    </div>

                    <h2>
                      {course.title || "Untitled Course"}
                    </h2>

                    <p className="my-course-description">
                      {course.shortDescription ||
                        course.description ||
                        "Continue developing your fashion and tailoring skills."}
                    </p>

                    <div className="my-course-progress-info">
                      <span>Course Progress</span>
                      <strong>{progress}%</strong>
                    </div>

                    <div className="my-course-progress-track">
                      <div
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="my-course-card-footer">
                      <span>
                        {enrollment.completedLessonIds?.length || 0}{" "}
                        lessons completed
                      </span>
                    </div>

                    {canAccess ? (
                      <button
                        className="my-course-continue"
                        onClick={() =>
                          continueLearning(enrollment)
                        }
                      >
                        {isCompleted
                          ? "Review Course"
                          : "Continue Learning"}
                        <span>→</span>
                      </button>
                    ) : (
                      <div className="my-course-payment-area">
                        <div className="my-course-fee">
                          <span>
                            {enrollment.paymentStatus ===
                            "partially_paid"
                              ? "Remaining balance"
                              : "Course fee"}
                          </span>

                          <strong>
                            {formatMoney(remainingAmount)}
                          </strong>
                        </div>

                        {evidenceSubmitted ? (
                          <div className="my-course-awaiting">
                            <span className="my-course-awaiting-icon">
                              ◷
                            </span>

                            <div>
                              <strong>
                                Receipt submitted
                              </strong>

                              <p>
                                Your transfer is awaiting
                                administrator confirmation.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {!hasPaymentSession && (
                              <>
                                {paymentOptions.length > 1 && (
                                  <div className="my-course-payment-options">
                                    <span className="my-course-field-label">
                                      Choose payment plan
                                    </span>

                                    {paymentOptions.map((option) => (
                                      <label
                                        className={`my-course-payment-option ${
                                          (session.paymentOption ||
                                            "full") === option.value
                                            ? "selected"
                                            : ""
                                        }`}
                                        key={option.value}
                                      >
                                        <input
                                          type="radio"
                                          name={`payment-${enrollment._id}`}
                                          value={option.value}
                                          checked={
                                            (session.paymentOption ||
                                              "full") === option.value
                                          }
                                          onChange={() =>
                                            updatePaymentSession(
                                              enrollment._id,
                                              {
                                                paymentOption:
                                                  option.value,
                                              }
                                            )
                                          }
                                        />

                                        <span className="my-course-radio-mark" />

                                        <span className="my-course-option-copy">
                                          <strong>
                                            {option.label}
                                          </strong>
                                          <small>
                                            {option.description}
                                          </small>
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                )}

                                {paymentOptions.length === 1 && (
                                  <p className="my-course-installment-note">
                                    {paymentOptions[0].description}
                                  </p>
                                )}

                                <button
                                  className="my-course-continue my-course-pay-button"
                                  disabled={session.loading}
                                  onClick={() =>
                                    startBankTransfer(enrollment)
                                  }
                                >
                                  {session.loading
                                    ? "Preparing payment..."
                                    : "Pay by Bank Transfer"}
                                  <span>→</span>
                                </button>
                              </>
                            )}

                            {hasPaymentSession && (
                              <div className="my-course-bank-panel">
                                <div className="my-course-bank-heading">
                                  <div>
                                    <span className="my-course-field-label">
                                      BANK TRANSFER
                                    </span>
                                    <h3>
                                      Make your transfer
                                    </h3>
                                  </div>

                                  <button
                                    type="button"
                                    className="my-course-close-payment"
                                    onClick={() =>
                                      closePaymentPanel(
                                        enrollment._id
                                      )
                                    }
                                    aria-label="Close payment panel"
                                  >
                                    ×
                                  </button>
                                </div>

                                <div className="my-course-payment-reference">
                                  <span>Payment reference</span>
                                  <strong>
                                    {session.payment.reference}
                                  </strong>
                                </div>

                                <div className="my-course-bank-details">
                                  <div>
                                    <span>Bank name</span>
                                    <strong>
                                      {session.bankDetails.bankName ||
                                        "Not configured"}
                                    </strong>
                                  </div>

                                  <div>
                                    <span>Account name</span>
                                    <strong>
                                      {session.bankDetails.accountName ||
                                        "Not configured"}
                                    </strong>
                                  </div>

                                  <div className="my-course-account-number">
                                    <span>Account number</span>

                                    <strong>
                                      {session.bankDetails.accountNumber ||
                                        "Not configured"}
                                    </strong>

                                    {session.bankDetails.accountNumber && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          navigator.clipboard.writeText(
                                            session.bankDetails.accountNumber
                                          )
                                        }
                                      >
                                        Copy
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="my-course-transfer-amount">
                                  <span>Transfer exactly</span>
                                  <strong>
                                    {formatMoney(
                                      session.payment.amount,
                                      session.payment.currency || "NGN"
                                    )}
                                  </strong>
                                  <small>
                                    {session.payment.paymentPlan ===
                                    "installment"
                                      ? `Installment ${session.payment.installmentNumber} of 2`
                                      : "Full course payment"}
                                  </small>
                                </div>

                                <div className="my-course-form-group">
                                  <label
                                    htmlFor={`sender-${enrollment._id}`}
                                  >
                                    Transfer sender name
                                  </label>

                                  <input
                                    id={`sender-${enrollment._id}`}
                                    type="text"
                                    placeholder="Name on the account used"
                                    value={session.senderName || ""}
                                    onChange={(event) =>
                                      updatePaymentSession(
                                        enrollment._id,
                                        {
                                          senderName:
                                            event.target.value,
                                        }
                                      )
                                    }
                                  />
                                </div>

                                <div className="my-course-form-group">
                                  <label>
                                    Payment receipt
                                  </label>

                                  <label
                                    className="my-course-receipt-upload"
                                    htmlFor={`receipt-${enrollment._id}`}
                                  >
                                    {session.receiptPreview ? (
                                      <img
                                        src={session.receiptPreview}
                                        alt="Selected payment receipt"
                                      />
                                    ) : (
                                      <>
                                        <span className="my-course-upload-icon">
                                          ↑
                                        </span>
                                        <strong>
                                          Choose receipt image
                                        </strong>
                                        <small>
                                          JPG, PNG or WebP · Maximum 5MB
                                        </small>
                                      </>
                                    )}
                                  </label>

                                  <input
                                    id={`receipt-${enrollment._id}`}
                                    className="my-course-file-input"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) =>
                                      handleReceiptChange(
                                        enrollment._id,
                                        event.target.files?.[0]
                                      )
                                    }
                                  />

                                  {session.receiptFile && (
                                    <div className="my-course-selected-file">
                                      <span>
                                        {session.receiptFile.name}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          updatePaymentSession(
                                            enrollment._id,
                                            {
                                              receiptFile: null,
                                              receiptPreview: "",
                                            }
                                          )
                                        }
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <button
                                  className="my-course-continue my-course-submit-receipt"
                                  disabled={isBusy}
                                  onClick={() =>
                                    submitReceipt(enrollment._id)
                                  }
                                >
                                  {session.uploading
                                    ? "Uploading receipt..."
                                    : session.submitting
                                      ? "Submitting evidence..."
                                      : "Submit Payment Receipt"}
                                </button>

                                <p className="my-course-secure-note">
                                  Your receipt will be reviewed by
                                  the ABS CUT Academy administration.
                                  Course payment is not confirmed
                                  until verification is complete.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {session.error && (
                      <div className="my-course-inline-error">
                        {session.error}
                      </div>
                    )}

                    {session.success && (
                      <div className="my-course-inline-success">
                        {session.success}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default MyCourses;
