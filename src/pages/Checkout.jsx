import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useCart } from "../context/AppContext";
import { apiRequest, uploadRequest } from "../services/api";
import "./Checkout.css";

function Checkout() {
  const { cartItems, totalItems, totalPrice } = useCart();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    deliveryMethod: "delivery",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [orderLoading, setOrderLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("paystack");

  // Reuse an unpaid order if payment initialization needs to be retried.
  const [pendingOrder, setPendingOrder] = useState(null);

  const [transferInfo, setTransferInfo] = useState(null);
  const [transferSenderName, setTransferSenderName] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSubmitted, setTransferSubmitted] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUploading, setReceiptUploading] = useState(false);

  // --------------------------------------------------
  // LOAD SAVED CUSTOMER
  // --------------------------------------------------

  useEffect(() => {
    const savedCustomer = localStorage.getItem("absCutCustomer");

    if (!savedCustomer) return;

    try {
      const customer = JSON.parse(savedCustomer);

      setFormData((current) => ({
        ...current,
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        phone: customer.phone || "",
        email: customer.email || "",
      }));
    } catch (error) {
      console.error("Unable to load customer information:", error);
    }
  }, []);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatPrice = (price) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));

    // Customer or delivery changes mean the previous order may be stale.
    setPendingOrder(null);
  };

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setReceiptFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setReceiptFile(null);
      event.target.value = "";
      setTransferMessage("Please select a JPG, PNG, or WebP receipt image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setReceiptFile(null);
      event.target.value = "";
      setTransferMessage("Your receipt must be 5MB or smaller.");
      return;
    }

    setReceiptFile(file);
    setTransferMessage("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (formData.phone.replace(/\D/g, "").length < 10) {
      newErrors.phone = "Please enter a valid phone number.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (formData.deliveryMethod === "delivery") {
      if (!formData.address.trim()) {
        newErrors.address = "Delivery address is required.";
      }

      if (!formData.city.trim()) {
        newErrors.city = "City is required.";
      }

      if (!formData.state.trim()) {
        newErrors.state = "State is required.";
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const saveCustomer = () => {
    localStorage.setItem(
      "absCutCustomer",
      JSON.stringify({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
      }),
    );
  };

  // --------------------------------------------------
  // CREATE OR REUSE ORDER
  // --------------------------------------------------

  const createOrReuseOrder = async () => {
    if (pendingOrder?._id) {
      return pendingOrder;
    }

    const response = await apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        customer: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim().toLowerCase(),
        },

        shippingAddress: {
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
        },

        deliveryMethod: formData.deliveryMethod,
        notes: formData.notes.trim(),
      }),
    });

    if (!response.success || !response.order?._id) {
      throw new Error(response.message || "Unable to create your order.");
    }

    setPendingOrder(response.order);

    localStorage.setItem("absCutLatestOrder", JSON.stringify(response.order));

    return response.order;
  };

  // --------------------------------------------------
  // CHECKOUT AND PAYMENT
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (orderLoading || transferInfo) return;

    if (!cartItems.length) {
      setErrors({ submit: "Your cart is empty." });
      return;
    }

    if (!validateForm()) return;

    try {
      setOrderLoading(true);
      setErrors({});

      saveCustomer();

      const order = await createOrReuseOrder();

      // PAYSTACK — EXISTING ROUTE PRESERVED
      if (paymentMethod === "paystack") {
        const payment = await apiRequest("/payments/initialize", {
          method: "POST",
          body: JSON.stringify({ orderId: order._id }),
        });

        if (!payment.success || !payment.authorizationUrl) {
          throw new Error(
            payment.message || "Unable to initialize Paystack payment.",
          );
        }

        window.location.href = payment.authorizationUrl;
        return;
      }

      // FLUTTERWAVE
      if (paymentMethod === "flutterwave") {
        const payment = await apiRequest("/payments/flutterwave/initialize", {
          method: "POST",
          body: JSON.stringify({ orderId: order._id }),
        });

        if (!payment.success || !payment.authorizationUrl) {
          throw new Error(
            payment.message || "Unable to initialize Flutterwave payment.",
          );
        }

        window.location.href = payment.authorizationUrl;
        return;
      }

      // OPAY / BANK TRANSFER
      if (paymentMethod === "bank_transfer") {
        const payment = await apiRequest("/payments/bank-transfer/initialize", {
          method: "POST",
          body: JSON.stringify({ orderId: order._id }),
        });

        if (!payment.success) {
          throw new Error(
            payment.message || "Unable to initialize bank transfer.",
          );
        }

        // const details = payment.bankDetails || payment;
        // const paymentRecord = payment.payment || payment.data?.payment || {};

        // const paymentId =
        //   payment.paymentId ||
        //   paymentRecord._id ||
        //   payment._id;

        // const reference =
        //   payment.reference ||
        //   paymentRecord.reference;

        // if (!paymentId || !reference) {
        //   throw new Error(
        //     "The server did not return the payment ID and reference. Please check the bank-transfer controller response."
        //   );
        // }

        // setTransferInfo({
        //   paymentId,
        //   reference,
        //   amount: payment.amount ?? paymentRecord.amount ?? order.total ?? totalPrice,
        //   bankName:
        //     details.bankName ||
        //     details.BANK_NAME ||
        //     "",
        //   accountName:
        //     details.accountName ||
        //     details.accountHolder ||
        //     details.BANK_ACCOUNT_NAME ||
        //     "",
        //   accountNumber:
        //     details.accountNumber ||
        //     details.BANK_ACCOUNT_NUMBER ||
        //     "",
        // });

        // setTransferMessage("");
        // setTransferSubmitted(false);

        const details = payment.bankDetails || payment;
        const paymentRecord = payment.payment || payment.data?.payment || {};

        const paymentId =
          paymentRecord.id ||
          paymentRecord._id ||
          payment.paymentId ||
          payment._id;

        const reference = paymentRecord.reference || payment.reference;

        const amount =
          paymentRecord.amount ?? payment.amount ?? order.total ?? totalPrice;

        if (!paymentId || !reference) {
          console.error("Bank transfer response:", payment);

          throw new Error(
            "The server did not return the payment ID and reference. Please check the bank-transfer controller response.",
          );
        }

        setTransferInfo({
          paymentId,
          reference,
          amount,
          bankName: details.bankName || details.BANK_NAME || "",
          accountName:
            details.accountName ||
            details.accountHolder ||
            details.BANK_ACCOUNT_NAME ||
            "",
          accountNumber:
            details.accountNumber || details.BANK_ACCOUNT_NUMBER || "",
        });

        setTransferMessage("");
        setTransferSubmitted(false);
      }
    } catch (error) {
      console.error("ABS CUT checkout error:", error);

      setErrors({
        submit:
          error.message || "Unable to continue checkout. Please try again.",
      });
    } finally {
      setOrderLoading(false);
    }
  };

  // --------------------------------------------------
  // SUBMIT BANK TRANSFER DETAILS
  // --------------------------------------------------

  // const handleTransferSubmit = async () => {
  //   if (!transferInfo || transferSubmitting || transferSubmitted) return;

  //   if (!transferSenderName.trim()) {
  //     setTransferMessage("Please enter the name used for the transfer.");
  //     return;
  //   }

  //   try {
  //     setTransferSubmitting(true);
  //     setTransferMessage("");

  //     const response = await apiRequest("/payments/bank-transfer/submit", {
  //       method: "POST",
  //       body: JSON.stringify({
  //         paymentId: transferInfo.paymentId,
  //         transferSenderName: transferSenderName.trim(),
  //       }),
  //     });

  //     if (!response.success) {
  //       throw new Error(
  //         response.message || "Unable to submit transfer details.",
  //       );
  //     }

  //     setTransferSubmitted(true);

  //     setTransferMessage(
  //       "Your transfer details have been submitted. Your payment is awaiting verification by ABS CUT.",
  //     );
  //   } catch (error) {
  //     setTransferMessage(
  //       error.message || "Unable to submit transfer details. Please try again.",
  //     );
  //   } finally {
  //     setTransferSubmitting(false);
  //   }
  // };

  const handleTransferSubmit = async () => {
    if (!transferInfo || transferSubmitting || transferSubmitted) {
      return;
    }

    if (!transferSenderName.trim()) {
      setTransferMessage("Please enter the name used for the transfer.");
      return;
    }

    if (!receiptFile) {
      setTransferMessage(
        "Please upload your payment receipt before submitting.",
      );
      return;
    }

    try {
      setTransferSubmitting(true);
      setReceiptUploading(true);
      setTransferMessage("");

      // STEP 1: Upload the receipt image to Cloudinary
      const imageData = new FormData();
      imageData.append("image", receiptFile);

      const uploadResponse = await uploadRequest(
        "/uploads/custom-reference",
        imageData,
      );

      if (!uploadResponse?.success || !uploadResponse?.image?.url) {
        throw new Error(
          uploadResponse?.message || "Receipt upload failed. Please try again.",
        );
      }

      const receiptUrl = uploadResponse.image.url;

      // STEP 2: Submit the receipt URL with the payment details
      setReceiptUploading(false);

      const response = await apiRequest("/payments/bank-transfer/submit", {
        method: "POST",
        body: JSON.stringify({
          paymentId: transferInfo.paymentId,
          transferSenderName: transferSenderName.trim(),
          receiptUrl,
        }),
      });

      if (!response.success) {
        throw new Error(
          response.message || "Unable to submit transfer details.",
        );
      }

      // STEP 3: Update the checkout UI
      setTransferSubmitted(true);
      setReceiptFile(null);

      setTransferMessage(
        "Your payment receipt and transfer details have been submitted. Your payment is awaiting verification by ABS CUT.",
      );
    } catch (error) {
      console.error("Bank transfer receipt submission error:", error);

      setTransferMessage(
        error.message || "Unable to submit your receipt. Please try again.",
      );
    } finally {
      setTransferSubmitting(false);
      setReceiptUploading(false);
    }
  };

  // --------------------------------------------------
  // EMPTY CART
  // --------------------------------------------------

  if (!cartItems.length) {
    return (
      <main className="checkout-page">
        <section className="checkout-empty">
          <div className="checkout-empty-icon">🛒</div>

          <p className="checkout-label">ABS CUT CHECKOUT</p>

          <h1>Your Cart Is Empty</h1>

          <p>Add products to your cart before continuing to checkout.</p>

          <Link to="/shop" className="checkout-shop-button">
            SHOP COLLECTION
          </Link>
        </section>
      </main>
    );
  }

  // --------------------------------------------------
  // CHECKOUT PAGE
  // --------------------------------------------------

  return (
    <main className="checkout-page">
      <section className="checkout-header">
        <p className="checkout-label">ABS CUT CHECKOUT</p>

        <h1>Complete Your Order</h1>

        <span>
          Provide your details, choose a payment method, and review your order.
        </span>
      </section>

      <section className="checkout-content">
        <form className="checkout-form" onSubmit={handleSubmit}>
          {/* CUSTOMER INFORMATION */}

          <div className="checkout-card">
            <div className="checkout-card-header">
              <div className="checkout-step">01</div>

              <div>
                <p>YOUR INFORMATION</p>
                <h2>Customer Details</h2>
              </div>
            </div>

            <div className="checkout-form-row">
              <div className="checkout-form-group">
                <label htmlFor="firstName">First Name</label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  autoComplete="given-name"
                />

                {errors.firstName && (
                  <small className="checkout-error">{errors.firstName}</small>
                )}
              </div>

              <div className="checkout-form-group">
                <label htmlFor="lastName">Last Name</label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  autoComplete="family-name"
                />

                {errors.lastName && (
                  <small className="checkout-error">{errors.lastName}</small>
                )}
              </div>
            </div>

            <div className="checkout-form-row">
              <div className="checkout-form-group">
                <label htmlFor="phone">Phone Number</label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08012345678"
                  autoComplete="tel"
                />

                {errors.phone && (
                  <small className="checkout-error">{errors.phone}</small>
                )}
              </div>

              <div className="checkout-form-group">
                <label htmlFor="email">Email Address</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                />

                {errors.email && (
                  <small className="checkout-error">{errors.email}</small>
                )}
              </div>
            </div>
          </div>

          {/* DELIVERY INFORMATION */}

          <div className="checkout-card">
            <div className="checkout-card-header">
              <div className="checkout-step">02</div>

              <div>
                <p>DELIVERY</p>
                <h2>Delivery Information</h2>
              </div>
            </div>

            <div className="delivery-methods">
              <label
                className={
                  formData.deliveryMethod === "delivery"
                    ? "delivery-option active"
                    : "delivery-option"
                }
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="delivery"
                  checked={formData.deliveryMethod === "delivery"}
                  onChange={handleChange}
                />

                <span>
                  <strong>Home Delivery</strong>
                  <small>Have your order delivered to your address.</small>
                </span>
              </label>

              <label
                className={
                  formData.deliveryMethod === "pickup"
                    ? "delivery-option active"
                    : "delivery-option"
                }
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="pickup"
                  checked={formData.deliveryMethod === "pickup"}
                  onChange={handleChange}
                />

                <span>
                  <strong>Store Pickup</strong>
                  <small>Pick up your order from ABS CUT.</small>
                </span>
              </label>
            </div>

            {formData.deliveryMethod === "delivery" && (
              <>
                <div className="checkout-form-group">
                  <label htmlFor="address">Delivery Address</label>

                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your delivery address"
                    autoComplete="street-address"
                  />

                  {errors.address && (
                    <small className="checkout-error">{errors.address}</small>
                  )}
                </div>

                <div className="checkout-form-row">
                  <div className="checkout-form-group">
                    <label htmlFor="city">City</label>

                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      autoComplete="address-level2"
                    />

                    {errors.city && (
                      <small className="checkout-error">{errors.city}</small>
                    )}
                  </div>

                  <div className="checkout-form-group">
                    <label htmlFor="state">State</label>

                    <input
                      id="state"
                      name="state"
                      type="text"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="State"
                      autoComplete="address-level1"
                    />

                    {errors.state && (
                      <small className="checkout-error">{errors.state}</small>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ORDER NOTES */}

          <div className="checkout-card">
            <div className="checkout-card-header">
              <div className="checkout-step">03</div>

              <div>
                <p>ADDITIONAL INFORMATION</p>
                <h2>Order Notes</h2>
              </div>
            </div>

            <div className="checkout-form-group">
              <label htmlFor="notes">Notes</label>

              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any special instructions for your order..."
                rows="5"
              />
            </div>
          </div>

          {/* PAYMENT METHOD */}

          <div className="checkout-card">
            <div className="checkout-card-header">
              <div className="checkout-step">04</div>

              <div>
                <p>SECURE CHECKOUT</p>
                <h2>Choose Payment Method</h2>
              </div>
            </div>

            <div className="delivery-methods">
              <label
                className={
                  paymentMethod === "paystack"
                    ? "delivery-option active"
                    : "delivery-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paystack"
                  checked={paymentMethod === "paystack"}
                  onChange={() => setPaymentMethod("paystack")}
                  disabled={orderLoading || !!transferInfo}
                />

                <span>
                  <strong>Paystack</strong>
                  <small>Use your existing Paystack checkout.</small>
                </span>
              </label>

              <label
                className={
                  paymentMethod === "flutterwave"
                    ? "delivery-option active"
                    : "delivery-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="flutterwave"
                  checked={paymentMethod === "flutterwave"}
                  onChange={() => setPaymentMethod("flutterwave")}
                  disabled={orderLoading || !!transferInfo}
                />

                <span>
                  <strong>Flutterwave</strong>
                  <small>Continue to Flutterwave to make your payment.</small>
                </span>
              </label>

              <label
                className={
                  paymentMethod === "bank_transfer"
                    ? "delivery-option active"
                    : "delivery-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === "bank_transfer"}
                  onChange={() => setPaymentMethod("bank_transfer")}
                  disabled={orderLoading || !!transferInfo}
                />

                <span>
                  <strong>OPay / Bank Transfer</strong>
                  <small>Transfer directly to the ABS CUT account.</small>
                </span>
              </label>
            </div>
          </div>

          {/* BANK TRANSFER INSTRUCTIONS */}

          {transferInfo && (
            <div className="checkout-card">
              <div className="checkout-card-header">
                <div className="checkout-step">05</div>

                <div>
                  <p>PAYMENT INSTRUCTIONS</p>
                  <h2>Complete Your Bank Transfer</h2>
                </div>
              </div>

              <p>
                Transfer the exact amount below and use the payment reference if
                your banking app allows it. Your payment remains pending until
                ABS CUT verifies that the funds have arrived.
              </p>

              <div className="checkout-summary-details">
                <div>
                  <span>Amount to Transfer</span>
                  <strong>{formatPrice(transferInfo.amount)}</strong>
                </div>

                <div>
                  <span>Bank / Provider</span>
                  <strong>{transferInfo.bankName || "Not provided"}</strong>
                </div>

                <div>
                  <span>Account Name</span>
                  <strong>{transferInfo.accountName || "Not provided"}</strong>
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

              {(!transferInfo.bankName ||
                !transferInfo.accountName ||
                !transferInfo.accountNumber) && (
                <p className="checkout-error">
                  Some bank details are missing. Please contact ABS CUT before
                  transferring any money.
                </p>
              )}

              {!transferSubmitted && (
                <div className="checkout-form-group">
                  <label htmlFor="transferSenderName">
                    Name Used for the Transfer
                  </label>

                  {!transferSubmitted && (
                    <div className="checkout-form-group receipt-upload">
                      <label htmlFor="bankTransferReceipt">
                        Upload Payment Receipt
                      </label>

                      <p>
                        After transferring, upload a screenshot or receipt from
                        your banking app.
                      </p>

                      <input
                        id="bankTransferReceipt"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleReceiptChange}
                        disabled={transferSubmitting}
                      />

                      {receiptFile && (
                        <div className="receipt-file-selected">
                          <span aria-hidden="true">✓</span>

                          <span>
                            <strong>{receiptFile.name}</strong>
                            <small>
                              {(receiptFile.size / 1024).toFixed(0)} KB
                            </small>
                          </span>

                          <button
                            type="button"
                            onClick={() => setReceiptFile(null)}
                            disabled={transferSubmitting}
                            aria-label="Remove selected receipt"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      <small>JPG, PNG, or WebP · Maximum 5MB</small>
                    </div>
                  )}

                  <input
                    id="transferSenderName"
                    type="text"
                    value={transferSenderName}
                    onChange={(event) => {
                      setTransferSenderName(event.target.value);
                      setTransferMessage("");
                    }}
                    placeholder="Enter the sender's account name"
                    disabled={transferSubmitting}
                  />
                </div>
              )}

              {transferMessage && (
                <p
                  className={transferSubmitted ? "" : "checkout-error"}
                  role="status"
                >
                  {transferMessage}
                </p>
              )}

              {/* {!transferSubmitted && (
                <button
                  type="button"
                  className="checkout-submit-button"
                  disabled={
                    transferSubmitting ||
                    !transferSenderName.trim() ||
                    !transferInfo.bankName ||
                    !transferInfo.accountName ||
                    !transferInfo.accountNumber
                  }
                  onClick={handleTransferSubmit}
                >
                  <span>
                    {transferSubmitting
                      ? "SUBMITTING..."
                      : "I HAVE MADE THE TRANSFER"}
                  </span>

                  <strong>{transferSubmitting ? "..." : "→"}</strong>
                </button>
              )} */}

              {!transferSubmitted && (
                <button
                  type="button"
                  className="checkout-submit-button"
                  disabled={
                    transferSubmitting ||
                    !transferSenderName.trim() ||
                    !receiptFile ||
                    !transferInfo.bankName ||
                    !transferInfo.accountName ||
                    !transferInfo.accountNumber
                  }
                  onClick={handleTransferSubmit}
                >
                  <span>
                    {receiptUploading
                      ? "UPLOADING RECEIPT..."
                      : transferSubmitting
                        ? "SUBMITTING PAYMENT DETAILS..."
                        : "SUBMIT PAYMENT RECEIPT"}
                  </span>

                  <strong>{transferSubmitting ? "..." : "→"}</strong>
                </button>
              )}

              {transferSubmitted && (
                <p>
                  Keep your transfer receipt until ABS CUT confirms your
                  payment. Do not transfer again unless instructed.
                </p>
              )}
            </div>
          )}

          {/* ERRORS */}

          {errors.submit && (
            <div className="checkout-submit-error" role="alert">
              {errors.submit}
            </div>
          )}

          {/* PLACE ORDER */}

          <button
            type="submit"
            className="checkout-submit-button"
            disabled={orderLoading || !!transferInfo}
          >
            <span>
              {orderLoading
                ? "CONNECTING TO PAYMENT..."
                : transferInfo
                  ? "BANK TRANSFER INITIALIZED"
                  : "PROCEED TO PAYMENT"}
            </span>

            <strong>{orderLoading ? "..." : "→"}</strong>
          </button>
        </form>

        {/* ORDER SUMMARY */}

        <aside className="checkout-summary">
          <div className="checkout-summary-header">
            <p>YOUR ORDER</p>
            <h2>Order Summary</h2>
          </div>

          <div className="checkout-products">
            {cartItems.map((item) => (
              <div className="checkout-product" key={item.id}>
                <div className="checkout-product-image">
                  <img src={item.image} alt={item.name} />

                  <span>{item.quantity}</span>
                </div>

                <div className="checkout-product-info">
                  <h3>{item.name}</h3>
                  <p>{item.category}</p>
                </div>

                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>

          <div className="checkout-summary-details">
            <div>
              <span>Items</span>
              <strong>{totalItems}</strong>
            </div>

            <div>
              <span>Subtotal</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>

            <div className="checkout-summary-divider" />

            <div className="checkout-grand-total">
              <span>Total</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>
          </div>

          <div className="checkout-summary-note">
            <span>✓</span>

            <p>
              {paymentMethod === "paystack"
                ? "You will be redirected to Paystack to complete your payment."
                : paymentMethod === "flutterwave"
                  ? "You will be redirected to Flutterwave to complete your payment."
                  : "Your bank-transfer payment will remain pending until ABS CUT verifies receipt of the funds."}
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default Checkout;
