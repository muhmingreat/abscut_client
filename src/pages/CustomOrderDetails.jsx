
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, uploadRequest } from "../services/api";
import "./CustomOrderDetails.css";

const DEFAULT_INSTALLMENT_SETTINGS = {
  enabled: false,
  minimumDepositType: "percentage",
  minimumDepositValue: 30,
  maxInstallments: 4,
  requireDepositBeforeProduction: true,
};

const PAYMENT_METHODS = [
  {
    value: "paystack",
    title: "Paystack",
    description: "Pay securely through Paystack.",
  },
  {
    value: "flutterwave",
    title: "Flutterwave",
    description: "Continue to Flutterwave to pay.",
  },
  {
    value: "bank_transfer",
    title: "Bank Transfer",
    description: "Transfer and submit your payment receipt.",
  },
];

const ACCEPTED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function CustomOrderDetails() {
  const { customOrderId } = useParams();

  // -----------------------------------------------------
  // ORDER STATE
  // -----------------------------------------------------

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -----------------------------------------------------
  // INSTALLMENT SETTINGS
  // -----------------------------------------------------

  const [installmentSettings, setInstallmentSettings] =
    useState(DEFAULT_INSTALLMENT_SETTINGS);

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");

  // -----------------------------------------------------
  // PAYMENT STATE
  // -----------------------------------------------------

  const [paymentMethod, setPaymentMethod] = useState("paystack");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // -----------------------------------------------------
  // BANK TRANSFER STATE
  // -----------------------------------------------------

  const [transferInfo, setTransferInfo] = useState(null);
  const [transferSenderName, setTransferSenderName] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [transferMessage, setTransferMessage] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [transferSubmitted, setTransferSubmitted] = useState(false);

  // -----------------------------------------------------
  // HELPERS
  // -----------------------------------------------------

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }, []);

  const formatDate = useCallback((date) => {
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
  }, []);

  const getErrorMessage = (err, fallback) => {
    const message = err?.message;

    if (
      !message ||
      message.includes("Unexpected token '<'") ||
      message.includes("<!DOCTYPE") ||
      message.includes("is not valid JSON")
    ) {
      return fallback;
    }

    return message;
  };

  // -----------------------------------------------------
  // LOAD CUSTOM ORDER
  // -----------------------------------------------------

  const loadCustomOrder = useCallback(async () => {
    if (!customOrderId) {
      setOrder(null);
      setError("Invalid custom order.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(
        `/custom-orders/${customOrderId}`
      );

      const customOrder =
        response?.customOrder ||
        response?.data?.customOrder ||
        response?.data ||
        null;

      if (!response?.success && !customOrder) {
        throw new Error(
          response?.message || "Unable to load this custom order."
        );
      }

      if (!customOrder) {
        throw new Error("Custom order details were not returned.");
      }

      setOrder(customOrder);
    } catch (err) {
      console.error("Load custom order details error:", err);

      setError(
        getErrorMessage(err, "Unable to load this custom order.")
      );
    } finally {
      setLoading(false);
    }
  }, [customOrderId]);

  useEffect(() => {
    loadCustomOrder();
  }, [loadCustomOrder]);

  // -----------------------------------------------------
  // LOAD ADMINISTRATOR INSTALLMENT SETTINGS
  // -----------------------------------------------------

  useEffect(() => {
    let active = true;

    const loadInstallmentSettings = async () => {
      try {
        setSettingsLoading(true);
        setSettingsError("");

        const response = await apiRequest(
          "/payments/custom-order/installment-settings"
        );

        if (response?.success === false) {
          throw new Error(
            response.message ||
              "Unable to load installment settings."
          );
        }

        const settings =
          response?.settings ||
          response?.data?.settings ||
          response?.data ||
          response;

        if (!settings || typeof settings !== "object") {
          throw new Error("Installment settings were not returned.");
        }

        if (active) {
          setInstallmentSettings({
            ...DEFAULT_INSTALLMENT_SETTINGS,
            ...settings,
          });
        }
      } catch (err) {
        console.error("Load installment settings error:", err);

        if (active) {
          // If settings cannot be retrieved, allow full-balance
          // payment only. Never assume installments are enabled.
          setInstallmentSettings({
            ...DEFAULT_INSTALLMENT_SETTINGS,
            enabled: false,
          });

          setSettingsError(
            "Installment settings are temporarily unavailable. Only full-balance payment is available until the settings can be verified."
          );
        }
      } finally {
        if (active) {
          setSettingsLoading(false);
        }
      }
    };

    loadInstallmentSettings();

    return () => {
      active = false;
    };
  }, []);

  // -----------------------------------------------------
  // ORDER STATUS
  // -----------------------------------------------------

  const isCompleted = order?.status === "Completed";
  const isCancelled = order?.status === "Cancelled";

  // -----------------------------------------------------
  // PAYMENT CALCULATIONS
  // -----------------------------------------------------

  const quotationAmount = Math.max(
    0,
    Number(order?.quotation || 0)
  );

  const amountPaid = Math.max(
    0,
    Number(order?.amountPaid || 0)
  );

  const balance = useMemo(() => {
    return Math.max(quotationAmount - amountPaid, 0);
  }, [quotationAmount, amountPaid]);

  const hasQuotation = quotationAmount > 0;
  const hasBalance = balance > 0;

  const isPaid =
    order?.paymentStatus === "Paid" ||
    (hasQuotation && balance <= 0);

  const isInstallmentsEnabled =
    installmentSettings.enabled === true;

  // A percentage deposit is calculated from the total quotation.
  // A fixed deposit uses the administrator's configured amount.
  const configuredDeposit = useMemo(() => {
    const configuredValue = Math.max(
      0,
      Number(installmentSettings.minimumDepositValue || 0)
    );

    if (installmentSettings.minimumDepositType === "fixed") {
      return Math.min(balance, configuredValue);
    }

    const percentage = Math.min(configuredValue, 100);

    return Math.min(
      balance,
      Math.ceil((quotationAmount * percentage) / 100)
    );
  }, [
    balance,
    quotationAmount,
    installmentSettings.minimumDepositType,
    installmentSettings.minimumDepositValue,
  ]);

  // The minimum deposit applies to the initial payment.
  // Subsequent installments can be smaller, subject to backend
  // validation and the administrator's installment-count limit.
  const minimumPayable = isInstallmentsEnabled
    ? amountPaid <= 0
      ? Math.min(balance, configuredDeposit)
      : Math.min(balance, 1)
    : balance;

  const selectedPaymentAmount = Number(paymentAmount);

  const isPaymentAmountValid =
    paymentAmount.trim() !== "" &&
    Number.isSafeInteger(selectedPaymentAmount) &&
    selectedPaymentAmount > 0 &&
    selectedPaymentAmount <= balance &&
    (
      !isInstallmentsEnabled ||
      selectedPaymentAmount >= minimumPayable
    ) &&
    (
      isInstallmentsEnabled ||
      selectedPaymentAmount === balance
    );

  const canPay =
    Boolean(order) &&
    hasQuotation &&
    hasBalance &&
    !isPaid &&
    !isCancelled;

  const paymentWaitingForQuotation =
    Boolean(order) &&
    !hasQuotation &&
    !isCancelled;

  const paymentFullyPaid =
    Boolean(order) &&
    hasQuotation &&
    balance <= 0;

  // Set a sensible default whenever a different order is loaded,
  // the balance changes, or the administrator changes the policy.
  useEffect(() => {
    if (!order || balance <= 0) {
      setPaymentAmount("");
      return;
    }

    const defaultAmount = isInstallmentsEnabled
      ? Math.min(balance, minimumPayable)
      : balance;

    setPaymentAmount(String(defaultAmount));
  }, [
    order?._id,
    balance,
    minimumPayable,
    isInstallmentsEnabled,
  ]);

  // -----------------------------------------------------
  // INITIALIZE ONLINE OR BANK-TRANSFER PAYMENT
  // -----------------------------------------------------

  const handlePayBalance = async () => {
    if (!order?._id) {
      setPaymentError("Custom order information is missing.");
      return;
    }

    if (
      !canPay ||
      paying ||
      transferInfo ||
      settingsLoading ||
      !isPaymentAmountValid
    ) {
      setPaymentError(
        "Please enter a valid payment amount before continuing."
      );
      return;
    }

    try {
      setPaying(true);
      setPaymentError("");
      setTransferMessage("");

      let response;
      let endpoint;

      const payload = {
        customOrderId: order._id,
        amount: selectedPaymentAmount,
      };

      if (paymentMethod === "paystack") {
        endpoint = "/payments/custom-order/initialize";
      } else if (paymentMethod === "flutterwave") {
        endpoint = "/payments/flutterwave/initialize";
      } else if (paymentMethod === "bank_transfer") {
        endpoint = "/payments/bank-transfer/initialize";
      } else {
        throw new Error("Please select a valid payment method.");
      }

      response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to initialize payment."
        );
      }

      // Paystack checkout
      if (paymentMethod === "paystack") {
        const authorizationUrl =
          response.authorizationUrl ||
          response.data?.authorizationUrl ||
          response.data?.authorization_url;

        if (!authorizationUrl) {
          throw new Error(
            "Paystack did not return a payment link."
          );
        }

        window.location.assign(authorizationUrl);
        return;
      }

      // Flutterwave checkout
      if (paymentMethod === "flutterwave") {
        const authorizationUrl =
          response.authorizationUrl ||
          response.data?.authorizationUrl ||
          response.data?.link ||
          response.data?.checkout_url;

        if (!authorizationUrl) {
          throw new Error(
            "Flutterwave did not return a payment link."
          );
        }

        window.location.assign(authorizationUrl);
        return;
      }

      // Bank-transfer instructions
      if (paymentMethod === "bank_transfer") {
        const details =
          response.bankDetails ||
          response.data?.bankDetails ||
          response;

        const paymentRecord =
          response.payment ||
          response.data?.payment ||
          {};

        const paymentId =
          paymentRecord._id ||
          paymentRecord.id ||
          response.paymentId ||
          response.data?.paymentId;

        const reference =
          paymentRecord.reference ||
          response.reference ||
          response.data?.reference;

        const amount = Number(
          paymentRecord.amount ??
            response.amount ??
            response.data?.amount ??
            selectedPaymentAmount
        );

        if (!paymentId || !reference) {
          console.error("Bank transfer initialization:", response);

          throw new Error(
            "The server did not return the payment ID and reference."
          );
        }

        setTransferInfo({
          paymentId,
          reference,
          amount,
          bankName:
            details.bankName ||
            details.BANK_NAME ||
            details.bank ||
            "",
          accountName:
            details.accountName ||
            details.accountHolder ||
            details.BANK_ACCOUNT_NAME ||
            "",
          accountNumber:
            details.accountNumber ||
            details.BANK_ACCOUNT_NUMBER ||
            "",
        });

        setTransferSubmitted(false);
        setTransferSenderName("");
        setReceiptFile(null);
        setTransferMessage("");
      }
    } catch (err) {
      console.error("Custom order payment error:", err);

      setPaymentError(
        getErrorMessage(err, "Unable to start payment. Please try again.")
      );
    } finally {
      setPaying(false);
    }
  };

  // -----------------------------------------------------
  // BANK-TRANSFER RECEIPT SUBMISSION
  // -----------------------------------------------------

  const handleTransferSubmit = async () => {
    if (
      !transferInfo ||
      transferSubmitting ||
      transferSubmitted
    ) {
      return;
    }

    if (!transferSenderName.trim()) {
      setTransferMessage(
        "Please enter the name used for the transfer."
      );
      return;
    }

    if (!receiptFile) {
      setTransferMessage("Please upload your payment receipt.");
      return;
    }

    try {
      setTransferSubmitting(true);
      setReceiptUploading(true);
      setTransferMessage("");

      const imageData = new FormData();
      imageData.append("image", receiptFile);

      const uploadResponse = await uploadRequest(
        "/uploads/custom-reference",
        imageData
      );

      const receiptUrl =
        uploadResponse?.image?.url ||
        uploadResponse?.data?.image?.url;

      if (
        !uploadResponse?.success ||
        !receiptUrl
      ) {
        throw new Error(
          uploadResponse?.message ||
            "Receipt upload failed. Please try again."
        );
      }

      setReceiptUploading(false);

      const response = await apiRequest(
        "/payments/bank-transfer/submit",
        {
          method: "POST",
          body: JSON.stringify({
            paymentId: transferInfo.paymentId,
            transferSenderName: transferSenderName.trim(),
            receiptUrl,
          }),
        }
      );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to submit your transfer details."
        );
      }

      setTransferSubmitted(true);
      setReceiptFile(null);

      setTransferMessage(
        "Your receipt has been submitted. ABS CUT will verify the transfer before crediting your order."
      );
    } catch (err) {
      console.error("Bank transfer submission error:", err);

      setTransferMessage(
        getErrorMessage(
          err,
          "Unable to submit your receipt. Please try again."
        )
      );
    } finally {
      setTransferSubmitting(false);
      setReceiptUploading(false);
    }
  };

  // -----------------------------------------------------
  // ORDER TIMELINE
  // -----------------------------------------------------

  const timeline = [
    "Pending Review",
    "Under Review",
    "Quote Sent",
    "Awaiting Payment",
    "Confirmed",
    "In Production",
    "Ready",
    "Completed",
  ];

  const currentStep = order
    ? timeline.indexOf(order.status)
    : -1;

  // -----------------------------------------------------
  // LOADING SCREEN
  // -----------------------------------------------------

  if (loading) {
    return (
      <main className="custom-order-details-page">
        <section className="custom-order-details-loading">
          <div className="custom-order-details-spinner" />

          <h1>Loading Custom Order</h1>

          <p>
            Please wait while we retrieve your order details.
          </p>
        </section>
      </main>
    );
  }

  // -----------------------------------------------------
  // ERROR SCREEN
  // -----------------------------------------------------

  if (error || !order) {
    return (
      <main className="custom-order-details-page">
        <section className="custom-order-details-error">
          <p className="custom-order-details-label">
            ABS CUT CUSTOM SERVICE
          </p>

          <h1>Order Not Found</h1>

          <p>
            {error || "We could not find this custom order."}
          </p>

          <Link
            to="/my-custom-orders"
            className="custom-order-details-primary-button"
          >
            BACK TO MY CUSTOM ORDERS
          </Link>
        </section>
      </main>
    );
  }

  // -----------------------------------------------------
  // PAGE
  // -----------------------------------------------------

  return (
    <main className="custom-order-details-page">
      {/* HEADER */}
      <section className="custom-order-details-header">
        <div>
          <p className="custom-order-details-label">
            ABS CUT CUSTOM SERVICE
          </p>

          <h1>Custom Order Details</h1>

          <p>
            Follow your custom outfit from request to completion.
          </p>
        </div>

        <Link
          to="/my-custom-orders"
          className="custom-order-details-back"
        >
          ← MY CUSTOM ORDERS
        </Link>
      </section>

      {/* ORDER ID AND STATUS */}
      <section className="custom-order-details-hero">
        <div>
          <span>REQUEST NUMBER</span>

          <h2>{order._id}</h2>

          <p>Submitted {formatDate(order.createdAt)}</p>
        </div>

        <div className="custom-order-details-status">
          <span>CURRENT STATUS</span>
          <strong>{order.status}</strong>
        </div>
      </section>

      {/* PROGRESS TIMELINE */}
      {!isCompleted && !isCancelled && (
        <section className="custom-order-details-card">
          <div className="custom-order-details-card-header">
            <div>
              <p>ORDER PROGRESS</p>
              <h2>Your Custom Outfit Journey</h2>
            </div>
          </div>

          <div className="custom-order-timeline">
            {timeline.map((status, index) => {
              const completed = currentStep >= 0 && index < currentStep;
              const active = index === currentStep;

              return (
                <div
                  key={status}
                  className={`custom-order-timeline-step ${
                    completed ? "completed" : ""
                  } ${active ? "active" : ""}`}
                >
                  <div className="custom-order-timeline-marker">
                    {completed ? "✓" : index + 1}
                  </div>

                  <span>{status}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* OUTFIT DETAILS */}
      <section className="custom-order-details-grid">
        <div className="custom-order-details-card">
          <div className="custom-order-details-card-header">
            <div>
              <p>ORDER INFORMATION</p>
              <h2>Outfit Details</h2>
            </div>
          </div>

          <div className="custom-order-detail-list">
            <div>
              <span>Outfit Type</span>
              <strong>{order.outfitType || "—"}</strong>
            </div>

            <div>
              <span>Fabric</span>
              <strong>{order.fabric || "—"}</strong>
            </div>

            <div>
              <span>Colour</span>
              <strong>{order.color || "—"}</strong>
            </div>

            <div>
              <span>Material Source</span>
              <strong>{order.materialSource || "—"}</strong>
            </div>

            <div>
              <span>Service</span>
              <strong>
                {order.serviceType || "Custom Tailoring"}
              </strong>
            </div>
          </div>
        </div>

        {/* DESIGN SERVICES */}
        <div className="custom-order-details-card">
          <div className="custom-order-details-card-header">
            <div>
              <p>DESIGN SERVICES</p>
              <h2>Special Requests</h2>
            </div>
          </div>

          <div className="custom-order-service-list">
            <div className={order.embroidery === "yes" ? "requested" : ""}>
              <span>Embroidery</span>
              <strong>
                {order.embroidery === "yes"
                  ? "Requested"
                  : "Not Requested"}
              </strong>
            </div>

            {order.embroidery === "yes" && order.embroideryDetails && (
              <div>
                <span>Embroidery Details</span>
                <strong>{order.embroideryDetails}</strong>
              </div>
            )}

            <div className={order.monogram === "yes" ? "requested" : ""}>
              <span>Monogram</span>
              <strong>
                {order.monogram === "yes"
                  ? "Requested"
                  : "Not Requested"}
              </strong>
            </div>

            {order.monogram === "yes" && order.monogramText && (
              <div>
                <span>Monogram Text</span>
                <strong>{order.monogramText}</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MEASUREMENTS */}
      <section className="custom-order-details-card">
        <div className="custom-order-details-card-header">
          <div>
            <p>MEASUREMENTS</p>
            <h2>Fitting Information</h2>
          </div>
        </div>

        <div className="custom-order-detail-list">
          <div>
            <span>Measurement Method</span>
            <strong>
              {order.measurementMethod || "To Be Confirmed"}
            </strong>
          </div>

          <div>
            <span>Measurements</span>
            <strong>
              {order.measurements || "To be confirmed"}
            </strong>
          </div>
        </div>
      </section>

      {/* PICKUP AND DELIVERY */}
      <section className="custom-order-details-grid">
        <div className="custom-order-details-card">
          <div className="custom-order-details-card-header">
            <div>
              <p>PICKUP</p>
              <h2>Material Pickup</h2>
            </div>
          </div>

          {order.pickupRequired ? (
            <div className="custom-order-location">
              <strong>Pickup Requested</strong>

              <p>
                {order.pickupLocation?.address ||
                  "Address not provided"}
              </p>

              {order.pickupLocation?.area && (
                <span>{order.pickupLocation.area}</span>
              )}

              {order.pickupLocation?.landmark && (
                <span>
                  Landmark: {order.pickupLocation.landmark}
                </span>
              )}
            </div>
          ) : (
            <p className="custom-order-muted">
              No pickup requested.
            </p>
          )}
        </div>

        <div className="custom-order-details-card">
          <div className="custom-order-details-card-header">
            <div>
              <p>DELIVERY</p>
              <h2>Finished Outfit</h2>
            </div>
          </div>

          {order.deliveryRequired ? (
            <div className="custom-order-location">
              <strong>Delivery Requested</strong>

              <p>
                {order.deliveryLocation?.address ||
                  "Address not provided"}
              </p>

              {order.deliveryLocation?.area && (
                <span>{order.deliveryLocation.area}</span>
              )}

              {order.deliveryLocation?.landmark && (
                <span>
                  Landmark: {order.deliveryLocation.landmark}
                </span>
              )}
            </div>
          ) : (
            <p className="custom-order-muted">
              No delivery requested.
            </p>
          )}
        </div>
      </section>

      {/* QUOTATION AND PAYMENT */}
      <section className="custom-order-details-card custom-order-quotation-card">
        <div className="custom-order-details-card-header">
          <div>
            <p>PAYMENT</p>
            <h2>Quotation &amp; Payment</h2>
          </div>

          {order.paymentStatus && (
            <span
              className={`custom-order-payment-status ${String(
                order.paymentStatus
              )
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {order.paymentStatus}
            </span>
          )}
        </div>

        {/* FEE BREAKDOWN */}
        <div className="custom-order-quotation-breakdown">
          <div>
            <span>Tailoring Fee</span>
            <strong>{formatCurrency(order.tailoringFee)}</strong>
          </div>

          <div>
            <span>Material Fee</span>
            <strong>{formatCurrency(order.materialFee)}</strong>
          </div>

          <div>
            <span>Embroidery Fee</span>
            <strong>{formatCurrency(order.embroideryFee)}</strong>
          </div>

          <div>
            <span>Monogram Fee</span>
            <strong>{formatCurrency(order.monogramFee)}</strong>
          </div>

          <div>
            <span>Pickup Fee</span>
            <strong>{formatCurrency(order.pickupFee)}</strong>
          </div>

          <div>
            <span>Delivery Fee</span>
            <strong>{formatCurrency(order.deliveryFee)}</strong>
          </div>
        </div>

        {/* TOTAL QUOTATION */}
        <div className="custom-order-quotation-total">
          <span>Total Quotation</span>
          <strong>
            {hasQuotation
              ? formatCurrency(quotationAmount)
              : "Awaiting quotation"}
          </strong>
        </div>

        {/* PAYMENT SUMMARY */}
        <div className="custom-order-payment-details">
          <div>
            <span>Amount Paid</span>
            <strong>{formatCurrency(amountPaid)}</strong>
          </div>

          <div>
            <span>Outstanding Balance</span>
            <strong>{formatCurrency(balance)}</strong>
          </div>

          <div>
            <span>Payment Status</span>
            <strong>{order.paymentStatus || "Not Paid"}</strong>
          </div>
        </div>

        {/* INSTALLMENT PAYMENT */}
        {canPay && (
          <div className="custom-order-payment-action">
            {!transferInfo && (
              <>
                <div className="custom-order-payment-action-content">
                  <div>
                    <span className="custom-order-payment-action-label">
                      OUTSTANDING BALANCE
                    </span>

                    <strong>{formatCurrency(balance)}</strong>
                  </div>
                </div>

                {/* AMOUNT SELECTOR */}
                <div className="custom-order-installment-panel">
                  <label htmlFor="customOrderPaymentAmount">
                    {isInstallmentsEnabled
                      ? "Amount you want to pay now"
                      : "Full outstanding balance"}
                  </label>

                  <input
                    id="customOrderPaymentAmount"
                    type="number"
                    inputMode="numeric"
                    min={minimumPayable}
                    max={balance}
                    step="1"
                    value={paymentAmount}
                    onChange={(event) => {
                      setPaymentAmount(event.target.value);
                      setPaymentError("");
                    }}
                    disabled={
                      paying ||
                      settingsLoading ||
                      !isInstallmentsEnabled
                    }
                  />

                  {settingsLoading ? (
                    <p>Loading payment policy...</p>
                  ) : isInstallmentsEnabled ? (
                    <>
                      <p>
                        {amountPaid <= 0
                          ? "Minimum initial deposit: "
                          : "Minimum next payment: "}
                        {formatCurrency(minimumPayable)}
                      </p>

                      <p>
                        Maximum payable now: {formatCurrency(balance)}
                      </p>

                      <p>
                        Administrator's installment limit:{" "}
                        {installmentSettings.maxInstallments} payments.
                      </p>
                    </>
                  ) : (
                    <p>
                      Installments are disabled or the policy is
                      unavailable. You must pay the full balance.
                    </p>
                  )}

                  {settingsError && (
                    <p
                      className="custom-order-payment-error"
                      role="status"
                    >
                      {settingsError}
                    </p>
                  )}

                  {paymentAmount !== "" && !isPaymentAmountValid && (
                    <p
                      className="custom-order-payment-error"
                      role="alert"
                    >
                      Enter a whole-naira amount between{" "}
                      {formatCurrency(minimumPayable)} and{" "}
                      {formatCurrency(balance)}.
                    </p>
                  )}

                  <div className="custom-order-installment-preview">
                    <span>Remaining after this payment</span>

                    <strong>
                      {formatCurrency(
                        Math.max(
                          balance -
                            (isPaymentAmountValid
                              ? selectedPaymentAmount
                              : 0),
                          0
                        )
                      )}
                    </strong>
                  </div>
                </div>

                {/* PAYMENT METHODS */}
                <div className="delivery-methods">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.value}
                      className={
                        paymentMethod === method.value
                          ? "delivery-option active"
                          : "delivery-option"
                      }
                    >
                      <input
                        type="radio"
                        name="customOrderPaymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={() => {
                          setPaymentMethod(method.value);
                          setPaymentError("");
                        }}
                        disabled={paying}
                      />

                      <span>
                        <strong>{method.title}</strong>
                        <small>{method.description}</small>
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  className="custom-order-pay-button"
                  onClick={handlePayBalance}
                  disabled={
                    paying ||
                    settingsLoading ||
                    !isPaymentAmountValid
                  }
                >
                  {paying
                    ? "INITIALIZING PAYMENT..."
                    : paymentMethod === "bank_transfer"
                      ? `GET TRANSFER DETAILS — ${formatCurrency(
                          selectedPaymentAmount
                        )}`
                      : `PAY ${formatCurrency(
                          selectedPaymentAmount
                        )} WITH ${
                          paymentMethod === "paystack"
                            ? "PAYSTACK"
                            : "FLUTTERWAVE"
                        } →`}
                </button>

                <p>
                  You are about to pay{" "}
                  {formatCurrency(
                    isPaymentAmountValid
                      ? selectedPaymentAmount
                      : 0
                  )}
                  . Your order balance will only be updated after
                  successful payment verification or administrator
                  confirmation.
                </p>
              </>
            )}

            {/* BANK TRANSFER DETAILS */}
            {transferInfo && (
              <div className="custom-order-bank-transfer">
                <h3>Complete Your Bank Transfer</h3>

                <p>
                  Transfer the exact amount shown below. Your payment
                  will remain pending until ABS CUT confirms receipt
                  of the funds.
                </p>

                <div className="custom-order-quotation-breakdown">
                  <div>
                    <span>Amount to Transfer</span>
                    <strong>
                      {formatCurrency(transferInfo.amount)}
                    </strong>
                  </div>

                  <div>
                    <span>Bank / Provider</span>
                    <strong>
                      {transferInfo.bankName || "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Account Name</span>
                    <strong>
                      {transferInfo.accountName || "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Account Number</span>
                    <strong>
                      {transferInfo.accountNumber || "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Payment Reference</span>
                    <strong>{transferInfo.reference}</strong>
                  </div>
                </div>

                {(
                  !transferInfo.bankName ||
                  !transferInfo.accountName ||
                  !transferInfo.accountNumber
                ) && (
                  <p
                    className="custom-order-payment-error"
                    role="alert"
                  >
                    Some bank details are missing. Contact ABS CUT
                    before transferring any money.
                  </p>
                )}

                {!transferSubmitted && (
                  <>
                    <div className="checkout-form-group">
                      <label htmlFor="customTransferSenderName">
                        Name Used for the Transfer
                      </label>

                      <input
                        id="customTransferSenderName"
                        type="text"
                        autoComplete="name"
                        value={transferSenderName}
                        onChange={(event) => {
                          setTransferSenderName(event.target.value);
                          setTransferMessage("");
                        }}
                        placeholder="Sender's account name"
                        disabled={transferSubmitting}
                      />
                    </div>

                    <div className="checkout-form-group receipt-upload">
                      <label htmlFor="customTransferReceipt">
                        Upload Payment Receipt
                      </label>

                      <input
                        id="customTransferReceipt"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={transferSubmitting}
                        onChange={(event) => {
                          const file = event.target.files?.[0];

                          if (!file) {
                            setReceiptFile(null);
                            return;
                          }

                          if (
                            !ACCEPTED_RECEIPT_TYPES.includes(file.type)
                          ) {
                            setReceiptFile(null);
                            event.target.value = "";

                            setTransferMessage(
                              "Select a JPG, PNG, or WebP receipt image."
                            );
                            return;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            setReceiptFile(null);
                            event.target.value = "";

                            setTransferMessage(
                              "Your receipt must be 5MB or smaller."
                            );
                            return;
                          }

                          setReceiptFile(file);
                          setTransferMessage("");
                        }}
                      />

                      {receiptFile && (
                        <p>
                          Selected: {receiptFile.name} (
                          {(receiptFile.size / 1024).toFixed(0)} KB)

                          <button
                            type="button"
                            onClick={() => setReceiptFile(null)}
                            disabled={transferSubmitting}
                          >
                            Remove
                          </button>
                        </p>
                      )}

                      <small>JPG, PNG, or WebP. Maximum 5MB.</small>
                    </div>

                    <button
                      type="button"
                      className="custom-order-pay-button"
                      onClick={handleTransferSubmit}
                      disabled={
                        transferSubmitting ||
                        !transferSenderName.trim() ||
                        !receiptFile ||
                        !transferInfo.bankName ||
                        !transferInfo.accountName ||
                        !transferInfo.accountNumber
                      }
                    >
                      {receiptUploading
                        ? "UPLOADING RECEIPT..."
                        : transferSubmitting
                          ? "SUBMITTING DETAILS..."
                          : "SUBMIT PAYMENT RECEIPT →"}
                    </button>
                  </>
                )}

                {transferMessage && (
                  <p
                    className={
                      transferSubmitted
                        ? "custom-order-payment-success"
                        : "custom-order-payment-error"
                    }
                    role="status"
                  >
                    {transferMessage}
                  </p>
                )}

                {transferSubmitted && (
                  <p>
                    Keep your transfer receipt. Do not transfer again
                    unless ABS CUT instructs you to do so.
                  </p>
                )}

                {!transferSubmitted && (
                  <button
                    type="button"
                    className="custom-order-details-secondary-button"
                    onClick={() => {
                      setTransferInfo(null);
                      setTransferMessage("");
                      setTransferSenderName("");
                      setReceiptFile(null);
                      setPaymentError("");
                    }}
                    disabled={transferSubmitting}
                  >
                    ← BACK TO PAYMENT METHODS
                  </button>
                )}
              </div>
            )}

            {paymentError && (
              <p
                className="custom-order-payment-error"
                role="alert"
              >
                {paymentError}
              </p>
            )}
          </div>
        )}

        {/* WAITING FOR QUOTATION */}
        {paymentWaitingForQuotation && (
          <div className="custom-order-payment-waiting">
            <span>◷</span>

            <div>
              <strong>Quotation Not Available Yet</strong>

              <p>
                ABS CUT is still reviewing your request. Your payment
                options will appear here once your quotation is ready.
              </p>
            </div>
          </div>
        )}

        {/* FULLY PAID */}
        {paymentFullyPaid && (
          <div className="custom-order-payment-success">
            <span>✓</span>

            <div>
              <strong>Payment Complete</strong>

              <p>
                Your quotation has been fully paid.
              </p>
            </div>
          </div>
        )}

        {/* CANCELLED */}
        {isCancelled && (
          <div className="custom-order-payment-waiting">
            <span>!</span>

            <div>
              <strong>Payment Unavailable</strong>

              <p>
                This custom order has been cancelled, so payment is
                no longer available.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* REFERENCE IMAGE */}
      {order.referenceImage?.url && (
        <section className="custom-order-details-card">
          <div className="custom-order-details-card-header">
            <div>
              <p>DESIGN REFERENCE</p>
              <h2>Your Reference Image</h2>
            </div>
          </div>

          <div className="custom-order-reference-image">
            <img
              src={order.referenceImage.url}
              alt="Custom order reference"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* CUSTOMER NOTES */}
      {order.notes && (
        <section className="custom-order-details-card">
          <div className="custom-order-details-card-header">
            <div>
              <p>YOUR NOTES</p>
              <h2>Additional Instructions</h2>
            </div>
          </div>

          <p className="custom-order-notes">{order.notes}</p>
        </section>
      )}

      {/* FOOTER ACTIONS */}
      <section className="custom-order-details-actions">
        <Link
          to="/my-custom-orders"
          className="custom-order-details-secondary-button"
        >
          ← MY CUSTOM ORDERS
        </Link>

        <Link
          to="/custom-order"
          className="custom-order-details-primary-button"
        >
          CREATE ANOTHER REQUEST →
        </Link>
      </section>
    </main>
  );
}

export default CustomOrderDetails;





