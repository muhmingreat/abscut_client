
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useCart } from "../context/AppContext";
import { apiRequest, uploadRequest } from "../services/api";

import "./Checkout.css";

// =====================================================
// CONSTANTS
// =====================================================

const RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  area: "",
  landmark: "",
  city: "",
  state: "",
  deliveryMethod: "delivery",
  notes: "",
};

const PAYMENT_METHODS = [
  {
    value: "paystack",
    title: "Paystack",
    description: "Online payment is temporarily unavailable.",
    unavailable: true,
  },
  {
    value: "flutterwave",
    title: "Flutterwave",
    description: "Online payment is temporarily unavailable.",
    unavailable: true,
  },
  {
    value: "bank_transfer",
    title: "Bank Transfer",
    description: "Transfer directly and submit your receipt.",
    unavailable: false,
  },
];

// =====================================================
// HELPERS
// =====================================================

function getErrorMessage(error, fallback) {
  const message = error?.message;

  if (
    !message ||
    message.includes("Unexpected token '<'") ||
    message.includes("<!DOCTYPE") ||
    message.includes("is not valid JSON")
  ) {
    return fallback;
  }

  return message;
}

function getProductId(item) {
  return String(
    item.productId ||
    item._id ||
    item.id ||
    item.product?._id ||
    "",
  );
}

function getPurchaseMode(item) {
  return item.purchaseMode === "digital"
    ? "digital"
    : "physical";
}

function getPriceUnit(item) {
  if (item.priceUnit) {
    return item.priceUnit;
  }

  if (item.productType === "raw_material") {
    return "yard";
  }

  if (
    item.productType === "monogram" ||
    item.productType === "phoenix_embroidery"
  ) {
    return "design";
  }

  return "piece";
}

function getUnitLabel(unit) {
  switch (unit) {
    case "yard":
      return "Yards";

    case "design":
      return "Designs";

    default:
      return "Pieces";
  }
}

// =====================================================
// CHECKOUT COMPONENT
// =====================================================

function Checkout() {
  const { cartItems, totalPrice } = useCart();

  // ===================================================
  // CART CLASSIFICATION
  // ===================================================

  const physicalCartItems = cartItems.filter(
    (item) => getPurchaseMode(item) === "physical",
  );

  const digitalCartItems = cartItems.filter(
    (item) => getPurchaseMode(item) === "digital",
  );

  const hasPhysicalItems = physicalCartItems.length > 0;
  const hasDigitalItems = digitalCartItems.length > 0;

  const isDigitalOnly =
    !hasPhysicalItems && hasDigitalItems;

  const isMixedCart =
    hasPhysicalItems && hasDigitalItems;

  // ===================================================
  // FORM STATE
  // ===================================================

  const [formData, setFormData] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  const [orderLoading, setOrderLoading] = useState(false);

  // ===================================================
  // DELIVERY ZONES
  // ===================================================

  const [deliveryZones, setDeliveryZones] = useState([]);

  const [deliveryZonesLoading, setDeliveryZonesLoading] =
    useState(true);

  const [deliveryZonesError, setDeliveryZonesError] =
    useState("");

  // ===================================================
  // DELIVERY QUOTATION
  // ===================================================

  const [deliveryQuote, setDeliveryQuote] = useState(null);

  const [deliveryQuoteLoading, setDeliveryQuoteLoading] =
    useState(false);

  const [deliveryQuoteError, setDeliveryQuoteError] =
    useState("");

  const quoteRequestRef = useRef(0);

  // ===================================================
  // PAYMENT STATE
  // ===================================================

  const [paymentMethod, setPaymentMethod] =
    useState("bank_transfer");

  const [pendingOrder, setPendingOrder] = useState(null);

  const [transferInfo, setTransferInfo] = useState(null);

  const [transferSenderName, setTransferSenderName] =
    useState("");

  const [receiptFile, setReceiptFile] = useState(null);

  const [transferSubmitting, setTransferSubmitting] =
    useState(false);

  const [receiptUploading, setReceiptUploading] =
    useState(false);

  const [transferSubmitted, setTransferSubmitted] =
    useState(false);

  const [transferMessage, setTransferMessage] =
    useState("");

  // ===================================================
  // PRICE FORMATTER
  // ===================================================

  const formatPrice = useCallback((price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);
  }, []);

  // ===================================================
  // DELIVERY FEE AND TOTAL
  // ===================================================

  const estimatedDeliveryFee =
    hasPhysicalItems &&
    formData.deliveryMethod === "delivery"
      ? Number(deliveryQuote?.fee || 0)
      : 0;

  const estimatedTotal =
    Number(totalPrice || 0) + estimatedDeliveryFee;

  // ===================================================
  // AUTOMATIC DELIVERY METHOD
  // ===================================================

  useEffect(() => {
    if (!hasPhysicalItems) {
      quoteRequestRef.current += 1;

      setDeliveryQuote(null);
      setDeliveryQuoteError("");
      setDeliveryQuoteLoading(false);

      setFormData((current) => ({
        ...current,
        deliveryMethod: "digital",
      }));

      return;
    }

    setFormData((current) => {
      if (current.deliveryMethod === "digital") {
        return {
          ...current,
          deliveryMethod: "delivery",
        };
      }

      return current;
    });
  }, [hasPhysicalItems]);

  // ===================================================
  // LOAD ACTIVE DELIVERY ZONES
  // ===================================================

  useEffect(() => {
    let isMounted = true;

    const loadDeliveryZones = async () => {
      try {
        setDeliveryZonesLoading(true);
        setDeliveryZonesError("");

        const response = await apiRequest("/delivery/zones");

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to load delivery locations.",
          );
        }

        const zones =
          response.zones ||
          response.data?.zones ||
          [];

        if (isMounted) {
          setDeliveryZones(
            Array.isArray(zones)
              ? zones.filter(
                  (zone) => zone.active !== false,
                )
              : [],
          );
        }
      } catch (error) {
        console.error(
          "Delivery zones loading error:",
          error,
        );

        if (isMounted) {
          setDeliveryZonesError(
            getErrorMessage(
              error,
              "Unable to load delivery locations. Please refresh the page.",
            ),
          );
        }
      } finally {
        if (isMounted) {
          setDeliveryZonesLoading(false);
        }
      }
    };

    loadDeliveryZones();

    return () => {
      isMounted = false;
    };
  }, []);

  // ===================================================
  // DELIVERY LOCATION OPTIONS
  // ===================================================

  const availableStates = [
    ...new Set(
      deliveryZones
        .map((zone) => zone.state)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const zonesForSelectedState = deliveryZones.filter(
    (zone) => zone.state === formData.state,
  );

  const availableCities = [
    ...new Set(
      zonesForSelectedState
        .map((zone) => zone.city)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const zonesForSelectedCity = zonesForSelectedState.filter(
    (zone) => zone.city === formData.city,
  );

  const availableAreas = [
    ...new Set(
      zonesForSelectedCity.flatMap((zone) =>
        Array.isArray(zone.areas)
          ? zone.areas
          : [],
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const hasCityWideZone = zonesForSelectedCity.some(
    (zone) =>
      !Array.isArray(zone.areas) ||
      zone.areas.length === 0,
  );

  const areaRequired =
    zonesForSelectedCity.length > 0 &&
    !hasCityWideZone &&
    availableAreas.length > 0;

  // ===================================================
  // LOAD SAVED CUSTOMER INFORMATION
  // ===================================================

  useEffect(() => {
    try {
      const savedCustomer =
        localStorage.getItem("absCutCustomer");

      if (!savedCustomer) return;

      const customer = JSON.parse(savedCustomer);

      setFormData((current) => ({
        ...current,
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        phone: customer.phone || "",
        email: customer.email || "",
      }));
    } catch (error) {
      console.error(
        "Unable to load saved customer:",
        error,
      );
    }
  }, []);

  // ===================================================
  // SAVE CUSTOMER INFORMATION
  // ===================================================

  const saveCustomer = () => {
    try {
      localStorage.setItem(
        "absCutCustomer",
        JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim().toLowerCase(),
        }),
      );
    } catch (error) {
      console.warn(
        "Unable to save customer details:",
        error,
      );
    }
  };

  // ===================================================
  // INVALIDATE DELIVERY QUOTATION
  // ===================================================

  const invalidateDeliveryQuote = () => {
    quoteRequestRef.current += 1;

    setDeliveryQuote(null);
    setDeliveryQuoteError("");
    setDeliveryQuoteLoading(false);
  };

  // ===================================================
  // FORM CHANGE HANDLER
  // ===================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (
      [
        "address",
        "area",
        "landmark",
        "city",
        "state",
        "deliveryMethod",
      ].includes(name)
    ) {
      invalidateDeliveryQuote();
    }

    setFormData((current) => {
      const updated = {
        ...current,
        [name]: value,
      };

      if (name === "state") {
        updated.city = "";
        updated.area = "";
      }

      if (name === "city") {
        updated.area = "";
      }

      if (
        name === "deliveryMethod" &&
        value === "pickup"
      ) {
        updated.area = "";
      }

      return updated;
    });

    setErrors((current) => ({
      ...current,
      [name]: "",

      ...(name === "state"
        ? { city: "", area: "" }
        : {}),

      ...(name === "city"
        ? { area: "" }
        : {}),

      deliveryQuote: "",
      submit: "",
    }));
  };

  // ===================================================
  // PAYMENT METHOD HANDLER
  // ===================================================

  const handlePaymentMethodChange = (method) => {
    const selectedMethod = PAYMENT_METHODS.find(
      (item) => item.value === method,
    );

    if (
      !selectedMethod ||
      selectedMethod.unavailable ||
      orderLoading ||
      transferSubmitting ||
      transferInfo
    ) {
      return;
    }

    setPaymentMethod(method);

    setErrors((current) => ({
      ...current,
      submit: "",
    }));
  };

  // ===================================================
  // FORM VALIDATION
  // ===================================================

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.firstName.trim()) {
      nextErrors.firstName =
        "First name is required.";
    }

    if (!formData.lastName.trim()) {
      nextErrors.lastName =
        "Last name is required.";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone =
        "Phone number is required.";
    } else if (
      formData.phone.replace(/\D/g, "").length < 10
    ) {
      nextErrors.phone =
        "Please enter a valid phone number.";
    }

    if (!formData.email.trim()) {
      nextErrors.email =
        "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email.trim(),
      )
    ) {
      nextErrors.email =
        "Please enter a valid email address.";
    }

    // Delivery validation only applies to physical orders.
    if (
      hasPhysicalItems &&
      formData.deliveryMethod === "delivery"
    ) {
      if (!formData.address.trim()) {
        nextErrors.address =
          "Delivery address is required.";
      }

      if (!formData.city.trim()) {
        nextErrors.city =
          "Please select your city.";
      }

      if (!formData.state.trim()) {
        nextErrors.state =
          "Please select your state.";
      }

      if (
        areaRequired &&
        !formData.area.trim()
      ) {
        nextErrors.area =
          "Please select your delivery area.";
      }

      if (
        !deliveryQuote ||
        deliveryQuoteError ||
        deliveryQuoteLoading
      ) {
        nextErrors.deliveryQuote =
          "Calculate your delivery fee before continuing.";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  // ===================================================
  // CALCULATE DELIVERY QUOTATION
  // ===================================================

  const calculateDeliveryQuote = async () => {
    if (
      !hasPhysicalItems ||
      formData.deliveryMethod !== "delivery"
    ) {
      return;
    }

    if (
      deliveryQuoteLoading ||
      orderLoading ||
      transferInfo ||
      deliveryZonesLoading
    ) {
      return;
    }

    if (
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      (areaRequired && !formData.area.trim())
    ) {
      setDeliveryQuote(null);

      setDeliveryQuoteError(
        "Enter your address and select your state and city. Select an area where required.",
      );

      return;
    }

    const requestId = ++quoteRequestRef.current;

    try {
      setDeliveryQuoteLoading(true);
      setDeliveryQuoteError("");
      setDeliveryQuote(null);

      const response = await apiRequest(
        "/delivery/quote",
        {
          method: "POST",
          body: JSON.stringify({
            state: formData.state.trim(),
            city: formData.city.trim(),
            area: formData.area.trim(),
          }),
        },
      );

      // Ignore outdated requests.
      if (requestId !== quoteRequestRef.current) {
        return;
      }

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to calculate delivery fee.",
        );
      }

      if (
        !response.deliveryAvailable ||
        !response.quote
      ) {
        setDeliveryQuoteError(
          response.message ||
            "Delivery is not automatically available in this location. Please contact ABS CUT for a quotation.",
        );

        return;
      }

      const fee = Number(response.quote.fee);

      if (!Number.isFinite(fee) || fee < 0) {
        throw new Error(
          "The server returned an invalid delivery fee.",
        );
      }

      setDeliveryQuote({
        ...response.quote,
        fee,
      });

      setErrors((current) => ({
        ...current,
        deliveryQuote: "",
        submit: "",
      }));
    } catch (error) {
      if (requestId !== quoteRequestRef.current) {
        return;
      }

      console.error(
        "Delivery quotation error:",
        error,
      );

      setDeliveryQuoteError(
        getErrorMessage(
          error,
          "Unable to calculate delivery fee. Please try again.",
        ),
      );
    } finally {
      if (requestId === quoteRequestRef.current) {
        setDeliveryQuoteLoading(false);
      }
    }
  };

  // ===================================================
  // RECEIPT VALIDATION
  // ===================================================

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setReceiptFile(null);
      return;
    }

    if (!RECEIPT_TYPES.includes(file.type)) {
      setReceiptFile(null);
      event.target.value = "";

      setTransferMessage(
        "Choose a JPG, PNG, or WebP image for your receipt.",
      );

      return;
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      setReceiptFile(null);
      event.target.value = "";

      setTransferMessage(
        "Your receipt must be 5MB or smaller.",
      );

      return;
    }

    setReceiptFile(file);
    setTransferMessage("");
  };

  // ===================================================
  // CHECKOUT SIGNATURE
  // ===================================================

  const getCheckoutSignature = () => {
    const cart = cartItems.map((item) => ({
      id: getProductId(item),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      purchaseMode: getPurchaseMode(item),
      priceUnit: getPriceUnit(item),
    }));

    return JSON.stringify({
      cart,

      customer: {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
      },

      shippingAddress:
        hasPhysicalItems &&
        formData.deliveryMethod === "delivery"
          ? {
              address: formData.address.trim(),
              area: formData.area.trim(),
              landmark: formData.landmark.trim(),
              city: formData.city.trim(),
              state: formData.state.trim(),
            }
          : null,

      deliveryMethod: hasPhysicalItems
        ? formData.deliveryMethod
        : "digital",

      notes: formData.notes.trim(),
    });
  };

  // ===================================================
  // CREATE OR REUSE ORDER
  // ===================================================

  const createOrReuseOrder = async () => {
    const signature = getCheckoutSignature();

    // Reuse the current pending order if unchanged.
    if (
      pendingOrder?._id &&
      pendingOrder.__checkoutSignature === signature
    ) {
      return pendingOrder;
    }

    // Recover a pending checkout from local storage.
    try {
      const savedCheckout = localStorage.getItem(
        "absCutPendingCheckout",
      );

      if (savedCheckout) {
        const parsed = JSON.parse(savedCheckout);

        if (
          parsed?.order?._id &&
          parsed.signature === signature
        ) {
          const recoveredOrder = {
            ...parsed.order,
            __checkoutSignature: signature,
          };

          setPendingOrder(recoveredOrder);

          return recoveredOrder;
        }
      }
    } catch (error) {
      console.warn(
        "Unable to recover saved checkout:",
        error,
      );
    }

    // Create a new order.
    const response = await apiRequest(
      "/orders",
      {
        method: "POST",

        body: JSON.stringify({
          customer: {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim().toLowerCase(),
          },

          shippingAddress: {
            address:
              hasPhysicalItems &&
              formData.deliveryMethod === "delivery"
                ? formData.address.trim()
                : "",

            area:
              hasPhysicalItems &&
              formData.deliveryMethod === "delivery"
                ? formData.area.trim()
                : "",

            landmark:
              hasPhysicalItems &&
              formData.deliveryMethod === "delivery"
                ? formData.landmark.trim()
                : "",

            city:
              hasPhysicalItems &&
              formData.deliveryMethod === "delivery"
                ? formData.city.trim()
                : "",

            state:
              hasPhysicalItems &&
              formData.deliveryMethod === "delivery"
                ? formData.state.trim()
                : "",
          },

          deliveryMethod: hasPhysicalItems
            ? formData.deliveryMethod
            : "digital",

          notes: formData.notes.trim(),
        }),
      },
    );

    const createdOrder =
      response?.order ||
      response?.data?.order ||
      null;

    if (!response?.success || !createdOrder?._id) {
      throw new Error(
        response?.message ||
          "Unable to create your order.",
      );
    }

    const orderWithSignature = {
      ...createdOrder,
      __checkoutSignature: signature,
    };

    setPendingOrder(orderWithSignature);

    try {
      localStorage.setItem(
        "absCutPendingCheckout",
        JSON.stringify({
          order: createdOrder,
          signature,
        }),
      );

      localStorage.setItem(
        "absCutLatestOrder",
        JSON.stringify(createdOrder),
      );
    } catch (error) {
      console.warn(
        "Unable to save pending checkout:",
        error,
      );
    }

    return orderWithSignature;
  };

  // ===================================================
  // INITIALIZE BANK TRANSFER
  // ===================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      orderLoading ||
      transferInfo ||
      transferSubmitting
    ) {
      return;
    }

    if (!cartItems.length) {
      setErrors({
        submit: "Your cart is empty.",
      });

      return;
    }

    if (!validateForm()) {
      return;
    }

    if (paymentMethod !== "bank_transfer") {
      setErrors({
        submit:
          "This payment method is temporarily unavailable. Please use bank transfer.",
      });

      return;
    }

    try {
      setOrderLoading(true);
      setErrors({});

      saveCustomer();

      const order = await createOrReuseOrder();

      const payment = await apiRequest(
        "/payments/bank-transfer/initialize",
        {
          method: "POST",

          body: JSON.stringify({
            orderId: order._id,
          }),
        },
      );

      if (!payment?.success) {
        throw new Error(
          payment?.message ||
            "Unable to initialize bank transfer.",
        );
      }

      const details =
        payment?.bankDetails ||
        payment?.data?.bankDetails ||
        payment?.data ||
        payment;

      const record =
        payment?.payment ||
        payment?.data?.payment ||
        {};

      const paymentId =
        record._id ||
        record.id ||
        payment?.paymentId ||
        payment?.data?.paymentId;

      const reference =
        record.reference ||
        payment?.reference ||
        payment?.data?.reference;

      const amount = Number(
        record.amount ??
          payment?.amount ??
          payment?.data?.amount ??
          order.total ??
          totalPrice,
      );

      if (!paymentId || !reference) {
        console.error(
          "Bank-transfer initialization response:",
          payment,
        );

        throw new Error(
          "The server did not return the payment ID and reference.",
        );
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
          "The server returned an invalid transfer amount.",
        );
      }

      const status = String(
        record.status || "",
      ).toLowerCase();

      const info = {
        paymentId,
        reference,
        amount,
        status,

        receiptUrl: record.receiptUrl || "",

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

        transferSenderName:
          record.transferSenderName || "",
      };

      setTransferInfo(info);

      setTransferSenderName(
        info.transferSenderName,
      );

      setReceiptFile(null);

      const alreadySubmitted =
        status === "awaiting_confirmation";

      setTransferSubmitted(alreadySubmitted);

      setTransferMessage(
        alreadySubmitted
          ? "Your receipt has already been submitted and is awaiting ABS CUT's verification."
          : "",
      );
    } catch (error) {
      console.error(
        "ABS CUT checkout error:",
        error,
      );

      setErrors({
        submit: getErrorMessage(
          error,
          "Unable to continue checkout. Please try again.",
        ),
      });
    } finally {
      setOrderLoading(false);
    }
  };

  // ===================================================
  // SUBMIT BANK-TRANSFER RECEIPT
  // ===================================================

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
        "Enter the name used for the bank transfer.",
      );

      return;
    }

    if (
      !receiptFile &&
      !transferInfo.receiptUrl
    ) {
      setTransferMessage(
        "Please upload your bank transfer receipt.",
      );

      return;
    }

    if (
      !transferInfo.bankName ||
      !transferInfo.accountName ||
      !transferInfo.accountNumber
    ) {
      setTransferMessage(
        "The bank details are incomplete. Contact ABS CUT before transferring money.",
      );

      return;
    }

    try {
      setTransferSubmitting(true);
      setTransferMessage("");

      let receiptUrl =
        transferInfo.receiptUrl || "";

      // Upload receipt image.
      if (receiptFile) {
        setReceiptUploading(true);

        const imageData = new FormData();

        imageData.append("image", receiptFile);

        const uploadResponse = await uploadRequest(
          "/uploads/custom-reference",
          imageData,
        );

        receiptUrl =
          uploadResponse?.image?.url ||
          uploadResponse?.data?.image?.url ||
          "";

        if (
          !uploadResponse?.success ||
          !receiptUrl
        ) {
          throw new Error(
            uploadResponse?.message ||
              "Receipt upload failed. Please try again.",
          );
        }

        setTransferInfo((current) =>
          current
            ? {
                ...current,
                receiptUrl,
              }
            : current,
        );
      }

      setReceiptUploading(false);

      // Submit receipt for admin verification.
      const response = await apiRequest(
        "/payments/bank-transfer/submit",
        {
          method: "POST",

          body: JSON.stringify({
            paymentId: transferInfo.paymentId,
            transferSenderName:
              transferSenderName.trim(),
            transferAmount: transferInfo.amount,
            receiptUrl,
          }),
        },
      );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to submit your transfer receipt.",
        );
      }

      setTransferSubmitted(true);

      setTransferInfo((current) =>
        current
          ? {
              ...current,
              status: "awaiting_confirmation",
              receiptUrl,
            }
          : current,
      );

      setReceiptFile(null);

      setTransferMessage(
        "Your receipt has been submitted. ABS CUT will verify the actual bank credit before confirming your payment. Uploading a receipt does not mean the payment has been confirmed.",
      );
    } catch (error) {
      console.error(
        "Bank-transfer submission error:",
        error,
      );

      setTransferMessage(
        getErrorMessage(
          error,
          "Unable to submit your receipt. Please try again.",
        ),
      );
    } finally {
      setTransferSubmitting(false);
      setReceiptUploading(false);
    }
  };

  // ===================================================
  // EMPTY CART
  // ===================================================

  if (!cartItems.length) {
    return (
      <main className="checkout-page">
        <section className="checkout-empty">
          <div
            className="checkout-empty-icon"
            aria-hidden="true"
          >
            🛒
          </div>

          <p className="checkout-label">
            ABS CUT CHECKOUT
          </p>

          <h1>Your Cart Is Empty</h1>

          <p>
            Add products to your cart before continuing
            to checkout.
          </p>

          <Link
            to="/shop"
            className="checkout-shop-button"
          >
            SHOP COLLECTION
          </Link>
        </section>
      </main>
    );
  }

  // ===================================================
  // CHECKOUT PAGE
  // ===================================================

  return (
    <main className="checkout-page">

      {/* ================================================
          PAGE HEADER
      ================================================= */}

      <section className="checkout-header">
        <p className="checkout-label">
          ABS CUT CHECKOUT
        </p>

        <h1>Complete Your Order</h1>

        <span>
          Provide your details, choose an available payment
          method, and review your order.
        </span>
      </section>

      <section className="checkout-content">

        {/* ==============================================
            CHECKOUT FORM
        ============================================== */}

        <form
          className="checkout-form"
          onSubmit={handleSubmit}
        >

          {/* ============================================
              01. CUSTOMER INFORMATION
          ============================================ */}

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
                <label htmlFor="firstName">
                  First Name
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  autoComplete="given-name"
                  disabled={!!transferInfo}
                />

                {errors.firstName && (
                  <small className="checkout-error">
                    {errors.firstName}
                  </small>
                )}
              </div>

              <div className="checkout-form-group">
                <label htmlFor="lastName">
                  Last Name
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  autoComplete="family-name"
                  disabled={!!transferInfo}
                />

                {errors.lastName && (
                  <small className="checkout-error">
                    {errors.lastName}
                  </small>
                )}
              </div>

            </div>

            <div className="checkout-form-row">

              <div className="checkout-form-group">
                <label htmlFor="phone">
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08012345678"
                  autoComplete="tel"
                  disabled={!!transferInfo}
                />

                {errors.phone && (
                  <small className="checkout-error">
                    {errors.phone}
                  </small>
                )}
              </div>

              <div className="checkout-form-group">
                <label htmlFor="email">
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={!!transferInfo}
                />

                {errors.email && (
                  <small className="checkout-error">
                    {errors.email}
                  </small>
                )}
              </div>

            </div>
          </div>

          {/* ============================================
              02. DELIVERY INFORMATION
          ============================================ */}

          <div className="checkout-card">

            <div className="checkout-card-header">
              <div className="checkout-step">02</div>

              <div>
                <p>DELIVERY</p>

                <h2>
                  {isDigitalOnly
                    ? "Digital Delivery"
                    : "Delivery Information"}
                </h2>
              </div>
            </div>

            {/* DIGITAL-ONLY CART */}

            {!hasPhysicalItems && (
              <div className="checkout-quote-success">
                <strong>
                  Digital delivery selected
                </strong>

                <p>
                  Your purchase contains digital products
                  only. No shipping address, store pickup,
                  or physical delivery fee is required.
                </p>
              </div>
            )}

            {/* PHYSICAL OR MIXED CART */}

            {hasPhysicalItems && (
              <>
                {isMixedCart && (
                  <p className="checkout-payment-note">
                    Your cart contains physical and digital
                    products. Delivery arrangements apply
                    only to your physical products.
                  </p>
                )}

                <div className="delivery-methods">

                  {/* HOME DELIVERY */}

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
                      checked={
                        formData.deliveryMethod === "delivery"
                      }
                      onChange={handleChange}
                      disabled={!!transferInfo}
                    />

                    <span>
                      <strong>Home Delivery</strong>

                      <small>
                        Have your order delivered to your
                        address.
                      </small>
                    </span>
                  </label>

                  {/* STORE PICKUP */}

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
                      checked={
                        formData.deliveryMethod === "pickup"
                      }
                      onChange={handleChange}
                      disabled={!!transferInfo}
                    />

                    <span>
                      <strong>Store Pickup</strong>

                      <small>
                        Pick up your order from ABS CUT.
                      </small>
                    </span>
                  </label>

                </div>

                {/* HOME DELIVERY FIELDS */}

                {formData.deliveryMethod === "delivery" && (
                  <>

                    {/* FULL ADDRESS */}

                    <div className="checkout-form-group">
                      <label htmlFor="address">
                        Full Delivery Address
                      </label>

                      <input
                        id="address"
                        name="address"
                        type="text"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="House number, street name and address"
                        autoComplete="street-address"
                        disabled={!!transferInfo}
                      />

                      {errors.address && (
                        <small className="checkout-error">
                          {errors.address}
                        </small>
                      )}
                    </div>

                    {/* STATE AND CITY */}

                    <div className="checkout-form-row">

                      <div className="checkout-form-group">
                        <label htmlFor="state">
                          State / Region
                        </label>

                        <select
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          disabled={
                            !!transferInfo ||
                            deliveryZonesLoading ||
                            availableStates.length === 0
                          }
                        >
                          <option value="">
                            {deliveryZonesLoading
                              ? "Loading delivery locations..."
                              : "Select your state"}
                          </option>

                          {availableStates.map((state) => (
                            <option
                              key={state}
                              value={state}
                            >
                              {state}
                            </option>
                          ))}
                        </select>

                        {errors.state && (
                          <small className="checkout-error">
                            {errors.state}
                          </small>
                        )}
                      </div>

                      <div className="checkout-form-group">
                        <label htmlFor="city">
                          City / Town
                        </label>

                        <select
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          disabled={
                            !!transferInfo ||
                            !formData.state ||
                            availableCities.length === 0
                          }
                        >
                          <option value="">
                            {!formData.state
                              ? "Select a state first"
                              : "Select your city"}
                          </option>

                          {availableCities.map((city) => (
                            <option
                              key={city}
                              value={city}
                            >
                              {city}
                            </option>
                          ))}
                        </select>

                        {errors.city && (
                          <small className="checkout-error">
                            {errors.city}
                          </small>
                        )}
                      </div>

                    </div>

                    {/* AREA AND LANDMARK */}

                    <div className="checkout-form-row">

                      <div className="checkout-form-group">
                        <label htmlFor="area">
                          Area / Neighborhood
                          {areaRequired
                            ? " *"
                            : " (Optional)"}
                        </label>

                        {availableAreas.length > 0 ? (
                          <select
                            id="area"
                            name="area"
                            value={formData.area}
                            onChange={handleChange}
                            disabled={
                              !!transferInfo ||
                              !formData.city
                            }
                          >
                            <option value="">
                              {areaRequired
                                ? "Select your delivery area"
                                : "Select an area or leave blank"}
                            </option>

                            {availableAreas.map((area) => (
                              <option
                                key={area}
                                value={area}
                              >
                                {area}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id="area"
                            name="area"
                            type="text"
                            value={formData.area}
                            onChange={handleChange}
                            placeholder="Area or neighborhood (optional)"
                            disabled={
                              !!transferInfo ||
                              !formData.city
                            }
                          />
                        )}

                        {errors.area && (
                          <small className="checkout-error">
                            {errors.area}
                          </small>
                        )}
                      </div>

                      <div className="checkout-form-group">
                        <label htmlFor="landmark">
                          Nearby Landmark
                        </label>

                        <input
                          id="landmark"
                          name="landmark"
                          type="text"
                          value={formData.landmark}
                          onChange={handleChange}
                          placeholder="Nearby landmark (optional)"
                          disabled={!!transferInfo}
                        />
                      </div>

                    </div>

                    {/* DELIVERY LOCATION MESSAGES */}

                    {deliveryZonesLoading && (
                      <p className="checkout-payment-note">
                        Loading available delivery locations...
                      </p>
                    )}

                    {deliveryZonesError && (
                      <p
                        className="checkout-error"
                        role="alert"
                      >
                        {deliveryZonesError}
                      </p>
                    )}

                    {!deliveryZonesLoading &&
                      !deliveryZonesError &&
                      deliveryZones.length === 0 && (
                        <p
                          className="checkout-error"
                          role="alert"
                        >
                          No delivery zones are currently
                          configured. Please contact ABS CUT
                          for assistance.
                        </p>
                      )}

                    {!deliveryZonesLoading &&
                      !deliveryZonesError &&
                      deliveryZones.length > 0 &&
                      availableStates.length === 0 && (
                        <p
                          className="checkout-error"
                          role="alert"
                        >
                          No active delivery locations are
                          available.
                        </p>
                      )}

                    {formData.state &&
                      availableCities.length === 0 &&
                      !deliveryZonesLoading && (
                        <p
                          className="checkout-error"
                          role="alert"
                        >
                          No active delivery cities are
                          configured for this state.
                        </p>
                      )}

                    {/* DELIVERY QUOTATION */}

                    <div className="checkout-delivery-quote">

                      <button
                        type="button"
                        className="checkout-quote-button"
                        onClick={calculateDeliveryQuote}
                        disabled={
                          deliveryQuoteLoading ||
                          !!transferInfo ||
                          deliveryZonesLoading ||
                          !formData.address.trim() ||
                          !formData.city ||
                          !formData.state ||
                          (areaRequired && !formData.area)
                        }
                      >
                        {deliveryQuoteLoading
                          ? "CALCULATING DELIVERY..."
                          : deliveryQuote
                            ? "RECALCULATE DELIVERY FEE"
                            : "CALCULATE DELIVERY FEE"}
                      </button>

                      {deliveryQuote && (
                        <div
                          className="checkout-quote-success"
                          role="status"
                        >
                          <strong>
                            <span aria-hidden="true">
                              ✓{" "}
                            </span>
                            Delivery quotation available
                          </strong>

                          <p>
                            Delivery zone:{" "}
                            {deliveryQuote.zoneName}
                          </p>

                          <p>
                            Delivery fee:{" "}
                            {formatPrice(
                              deliveryQuote.fee,
                            )}
                          </p>

                          {deliveryQuote.estimatedDelivery && (
                            <p>
                              Estimated delivery:{" "}
                              {deliveryQuote.estimatedDelivery}
                            </p>
                          )}
                        </div>
                      )}

                      {deliveryQuoteError && (
                        <p
                          className="checkout-error"
                          role="alert"
                        >
                          {deliveryQuoteError}
                        </p>
                      )}

                      {errors.deliveryQuote && (
                        <p
                          className="checkout-error"
                          role="alert"
                        >
                          {errors.deliveryQuote}
                        </p>
                      )}

                    </div>
                  </>
                )}

                {/* STORE PICKUP MESSAGE */}

                {formData.deliveryMethod === "pickup" && (
                  <div className="checkout-quote-success">
                    <strong>Store pickup selected</strong>

                    <p>
                      No delivery charge will be added to
                      your order.
                    </p>
                  </div>
                )}
              </>
            )}

          </div>

          {/* ============================================
              03. ORDER NOTES
          ============================================ */}

          <div className="checkout-card">

            <div className="checkout-card-header">
              <div className="checkout-step">03</div>

              <div>
                <p>ADDITIONAL INFORMATION</p>
                <h2>Order Notes</h2>
              </div>
            </div>

            <div className="checkout-form-group">
              <label htmlFor="notes">
                Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any special instructions for your order..."
                rows={4}
                disabled={!!transferInfo}
              />
            </div>

          </div>

          {/* ============================================
              04. PAYMENT METHOD
          ============================================ */}

          <div className="checkout-card">

            <div className="checkout-card-header">
              <div className="checkout-step">04</div>

              <div>
                <p>SECURE CHECKOUT</p>
                <h2>Choose Payment Method</h2>
              </div>
            </div>

            <div className="delivery-methods">

              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className={[
                    "delivery-option",
                    paymentMethod === method.value
                      ? "active"
                      : "",
                    method.unavailable
                      ? "payment-unavailable"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}

                  aria-disabled={method.unavailable}

                  title={
                    method.unavailable
                      ? `${method.title} is temporarily under maintenance`
                      : undefined
                  }
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={
                      paymentMethod === method.value
                    }
                    onChange={() =>
                      handlePaymentMethodChange(
                        method.value,
                      )
                    }
                    disabled={
                      method.unavailable ||
                      orderLoading ||
                      !!transferInfo
                    }
                  />

                  <span>
                    <strong>{method.title}</strong>

                    <small>
                      {method.description}
                    </small>

                    {method.unavailable && (
                      <span className="checkout-maintenance-notice">
                        <span aria-hidden="true">
                          ⏳
                        </span>
                        Under Maintenance
                      </span>
                    )}

                    {!method.unavailable && (
                      <span className="checkout-payment-available">
                        Available
                      </span>
                    )}
                  </span>
                </label>
              ))}

            </div>

            <p className="checkout-payment-note">
              Paystack and Flutterwave are temporarily
              unavailable. We are working to restore them.
              Bank transfer is currently available.
            </p>

          </div>

          {/* ============================================
              05. BANK TRANSFER INSTRUCTIONS
          ============================================ */}

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
                Transfer the exact amount displayed below.
                Once you have made the transfer, enter the
                sender's name and upload your receipt.
                ABS CUT must verify the funds before your
                payment is confirmed.
              </p>

              {/* BANK DETAILS */}

              <div className="checkout-summary-details">

                <div>
                  <span>Amount to Transfer</span>

                  <strong>
                    {formatPrice(transferInfo.amount)}
                  </strong>
                </div>

                <div>
                  <span>Bank</span>

                  <strong>
                    {transferInfo.bankName ||
                      "Not provided"}
                  </strong>
                </div>

                <div>
                  <span>Account Name</span>

                  <strong>
                    {transferInfo.accountName ||
                      "Not provided"}
                  </strong>
                </div>

                <div>
                  <span>Account Number</span>

                  <strong>
                    {transferInfo.accountNumber ||
                      "Not provided"}
                  </strong>
                </div>

                <div>
                  <span>Payment Reference</span>

                  <strong>
                    {transferInfo.reference}
                  </strong>
                </div>

              </div>

              {!transferInfo.bankName ||
              !transferInfo.accountName ||
              !transferInfo.accountNumber ? (
                <p
                  className="checkout-error"
                  role="alert"
                >
                  Some bank details are missing. Contact
                  ABS CUT before transferring money.
                </p>
              ) : null}

              {/* RECEIPT ALREADY SUBMITTED */}

              {transferSubmitted ? (
                <div
                  className="checkout-transfer-success"
                  role="status"
                >
                  <strong>
                    Receipt submitted — awaiting verification
                  </strong>

                  <p>
                    ABS CUT will compare your submission
                    with its bank records. Your payment is
                    not confirmed yet. Do not make another
                    transfer for this order unless ABS CUT
                    instructs you to do so.
                  </p>
                </div>
              ) : (
                <>

                  {/* SENDER NAME */}

                  <div className="checkout-form-group">
                    <label htmlFor="transferSenderName">
                      Name Used for the Transfer
                    </label>

                    <input
                      id="transferSenderName"
                      type="text"
                      value={transferSenderName}
                      onChange={(event) => {
                        setTransferSenderName(
                          event.target.value,
                        );

                        setTransferMessage("");
                      }}
                      placeholder="Name on the sending bank account"
                      autoComplete="name"
                      disabled={transferSubmitting}
                    />

                    <small>
                      Enter the name shown on the account
                      you transferred from.
                    </small>
                  </div>

                  {/* RECEIPT UPLOAD */}

                  <div className="checkout-form-group receipt-upload">

                    <label htmlFor="bankTransferReceipt">
                      Bank Transfer Receipt
                    </label>

                    <p>
                      Upload a clear screenshot or image
                      of the transfer receipt from your
                      banking app.
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

                        <span aria-hidden="true">
                          ✓
                        </span>

                        <span>
                          <strong>
                            {receiptFile.name}
                          </strong>

                          <small>
                            {(receiptFile.size / 1024).toFixed(0)} KB
                          </small>
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setReceiptFile(null)
                          }
                          disabled={transferSubmitting}
                          aria-label="Remove selected receipt"
                        >
                          Remove
                        </button>

                      </div>
                    )}

                    {transferInfo.receiptUrl &&
                      !receiptFile && (
                        <small>
                          A receipt has already been uploaded
                          for this payment. Choose another
                          image only if you need to replace
                          it before submitting.
                        </small>
                      )}

                    <small>
                      JPG, PNG, or WebP. Maximum file size:
                      5MB.
                    </small>

                  </div>

                  {transferMessage && (
                    <p
                      className="checkout-error"
                      role="alert"
                    >
                      {transferMessage}
                    </p>
                  )}

                  {/* SUBMIT RECEIPT */}

                  <button
                    type="button"
                    className="checkout-submit-button"
                    onClick={handleTransferSubmit}
                    disabled={
                      transferSubmitting ||
                      !transferSenderName.trim() ||
                      (!receiptFile &&
                        !transferInfo.receiptUrl) ||
                      !transferInfo.bankName ||
                      !transferInfo.accountName ||
                      !transferInfo.accountNumber
                    }
                  >
                    <span>
                      {receiptUploading
                        ? "UPLOADING RECEIPT..."
                        : transferSubmitting
                          ? "SUBMITTING RECEIPT..."
                          : "SUBMIT PAYMENT RECEIPT"}
                    </span>

                    <strong>
                      {transferSubmitting ? "..." : "→"}
                    </strong>
                  </button>

                </>
              )}

              {transferSubmitted && transferMessage && (
                <p role="status">
                  {transferMessage}
                </p>
              )}

            </div>
          )}

          {/* ============================================
              CHECKOUT ERRORS
          ============================================ */}

          {errors.submit && (
            <div
              className="checkout-submit-error"
              role="alert"
            >
              {errors.submit}
            </div>
          )}

          {/* ============================================
              GET BANK TRANSFER DETAILS
          ============================================ */}

          {!transferInfo && (
            <button
              type="submit"
              className="checkout-submit-button"
              disabled={
                orderLoading ||
                deliveryQuoteLoading
              }
            >
              <span>
                {orderLoading
                  ? "PREPARING BANK TRANSFER..."
                  : "GET BANK TRANSFER DETAILS"}
              </span>

              <strong>
                {orderLoading ? "..." : "→"}
              </strong>
            </button>
          )}

        </form>

        {/* ==============================================
            ORDER SUMMARY
        ============================================== */}

        <aside className="checkout-summary">

          <div className="checkout-summary-header">
            <p>YOUR ORDER</p>
            <h2>Order Summary</h2>
          </div>

          {/* CART PRODUCTS */}

          <div className="checkout-products">

            {cartItems.map((item, index) => {
              const purchaseMode =
                getPurchaseMode(item);

              const priceUnit =
                getPriceUnit(item);

              const quantity =
                Number(item.quantity || 0);

              const unitPrice =
                Number(item.price || 0);

              const itemTotal =
                unitPrice * quantity;

              const productKey =
                getProductId(item) ||
                `${item.name}-${index}`;

              return (
                <div
                  className="checkout-product"
                  key={`${productKey}-${purchaseMode}`}
                >

                  {/* PRODUCT IMAGE */}

                  <div className="checkout-product-image">

                    {item.video ? (
                      <video
                        src={item.video}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="checkout-product-media-placeholder">
                        <span>ABS CUT</span>
                        <small>
                          Preview unavailable
                        </small>
                      </div>
                    )}

                    <span className="checkout-product-quantity">
                      {quantity}
                    </span>

                  </div>

                  {/* PRODUCT INFORMATION */}

                  <div className="checkout-product-info">

                    <h3>{item.name}</h3>

                    <p>{item.category}</p>

                    <small>
                      {purchaseMode === "digital"
                        ? "Digital Purchase"
                        : "Physical Purchase"}
                    </small>

                    <small>
                      {getUnitLabel(priceUnit)}
                    </small>

                  </div>

                  {/* ITEM TOTAL */}

                  <strong>
                    {formatPrice(itemTotal)}
                  </strong>

                </div>
              );
            })}

          </div>

          {/* ORDER TOTALS */}

          <div className="checkout-summary-details">

            <div>
              <span>Order Lines</span>

              <strong>
                {cartItems.length}
              </strong>
            </div>

            <div>
              <span>Physical Products</span>

              <strong>
                {physicalCartItems.length}
              </strong>
            </div>

            <div>
              <span>Digital Products</span>

              <strong>
                {digitalCartItems.length}
              </strong>
            </div>

            <div>
              <span>Subtotal</span>

              <strong>
                {formatPrice(totalPrice)}
              </strong>
            </div>

            <div>
              <span>Delivery Fee</span>

              <strong>
                {!hasPhysicalItems
                  ? formatPrice(0)
                  : formData.deliveryMethod === "pickup"
                    ? formatPrice(0)
                    : deliveryQuote
                      ? formatPrice(deliveryQuote.fee)
                      : "Awaiting quotation"}
              </strong>
            </div>

            <div className="checkout-summary-divider" />

            <div className="checkout-grand-total">
              <span>Estimated Total</span>

              <strong>
                {formatPrice(estimatedTotal)}
              </strong>
            </div>

            {hasPhysicalItems &&
              formData.deliveryMethod === "delivery" &&
              !deliveryQuote && (
                <small>
                  Calculate your delivery fee to see the
                  estimated total. Your final amount is
                  confirmed by the server when the order
                  is created.
                </small>
              )}

          </div>

          {/* SUMMARY NOTE */}

          <div className="checkout-summary-note">

            <span aria-hidden="true">
              ✓
            </span>

            <p>
              {transferSubmitted
                ? "Your receipt has been submitted and your payment is awaiting verification."

                : transferInfo
                  ? "Your transfer remains pending until ABS CUT verifies the actual bank credit."

                  : isDigitalOnly
                    ? "Digital-only order. No physical delivery fee is required."

                    : formData.deliveryMethod === "pickup"
                      ? "Store pickup selected. No delivery charge will be added."

                      : deliveryQuote
                        ? "Your delivery quotation is ready. The backend will verify the fee again when creating your order."

                        : "Select your delivery location and calculate your delivery fee before proceeding to payment."}
            </p>

          </div>

        </aside>

      </section>
    </main>
  );
}

export default Checkout;
