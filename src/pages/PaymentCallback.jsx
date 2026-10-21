
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { apiRequest } from "../services/api";
import LoadingScreen from "./LoadingScreen";
import "./PaymentCallback.css";

const VERIFICATION_TIMEOUT = 30000;

function withTimeout(promise, timeoutMs = VERIFICATION_TIMEOUT) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          "Payment verification is taking too long. Check My Orders before attempting another payment."
        )
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function saveOrderSafely(key, value) {
  if (!value) return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Navigation should still work if browser storage is unavailable.
    console.warn("Could not save payment details locally:", error);
  }
}

function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  // A stable string avoids relying on URLSearchParams object identity.
  const queryString = searchParams.toString();

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      setError("");

      try {
        const params = new URLSearchParams(queryString);

        const reference =
          params.get("reference") ||
          params.get("tx_ref") ||
          params.get("trxref");

        const transactionId =
          params.get("transaction_id") ||
          params.get("transactionId");

        if (!reference) {
          throw new Error(
            "The payment reference was not found. Please check My Orders."
          );
        }

        let data;
        let order;
        let customOrder;
        let orderId;
        let orderType;

        /*
         * FLUTTERWAVE
         *
         * The backend verifies the transaction with Flutterwave.
         * A redirect status alone is not proof of payment.
         */
        if (reference.startsWith("ABS-CUT-FLW-")) {
          if (!transactionId) {
            throw new Error(
              "Flutterwave did not return a transaction ID. Check My Orders before attempting another payment."
            );
          }

          const endpoint =
            `/payments/flutterwave/verify/${encodeURIComponent(reference)}` +
            `?transaction_id=${encodeURIComponent(transactionId)}`;

          data = await withTimeout(apiRequest(endpoint));

          if (!data?.success) {
            throw new Error(
              data?.message ||
                "Flutterwave payment verification failed."
            );
          }

          order = data.order || null;
          customOrder = data.customOrder || null;

          orderType =
            data.orderType ||
            (customOrder ? "CustomOrder" : "Order");

          orderId =
            data.orderId ||
            customOrder?._id ||
            order?._id;

          if (!orderId) {
            throw new Error(
              "The payment was verified, but the backend did not return an order ID. Please contact ABS CUT before paying again."
            );
          }

          if (cancelled) return;

          saveOrderSafely("absCutLatestOrder", order);
          saveOrderSafely("absCutLatestCustomOrder", customOrder);

          navigate(
            orderType === "CustomOrder"
              ? `/custom-order-details/${orderId}`
              : `/order-confirmation/${orderId}`,
            { replace: true }
          );

          return;
        }

        /*
         * PAYSTACK CUSTOM ORDER
         */
        if (reference.startsWith("ABS-CUT-CUSTOM-")) {
          data = await withTimeout(
            apiRequest(
              `/payments/custom-order/verify/${encodeURIComponent(reference)}`
            )
          );

          if (!data?.success) {
            throw new Error(
              data?.message ||
                "Custom-order payment verification failed."
            );
          }

          customOrder = data.customOrder || data.order || null;

          orderId =
            data.orderId ||
            data.customOrderId ||
            customOrder?._id;

          if (!orderId) {
            throw new Error(
              "The payment was verified, but the custom order ID was not returned. Please check My Orders before attempting another payment."
            );
          }

          if (cancelled) return;

          saveOrderSafely(
            "absCutLatestCustomOrder",
            customOrder
          );

          navigate(`/custom-order-details/${orderId}`, {
            replace: true,
          });

          return;
        }

        /*
         * PAYSTACK NORMAL STORE ORDER
         */
        data = await withTimeout(
          apiRequest(
            `/payments/verify/${encodeURIComponent(reference)}`
          )
        );

        if (!data?.success) {
          throw new Error(
            data?.message ||
              "Paystack payment verification failed."
          );
        }

        order = data.order || null;

        orderId = data.orderId || order?._id;

        if (!orderId) {
          throw new Error(
            "The payment was verified, but the order ID was not returned. Please check My Orders."
          );
        }

        if (cancelled) return;

        saveOrderSafely("absCutLatestOrder", order);

        navigate(`/order-confirmation/${orderId}`, {
          replace: true,
        });
      } catch (err) {
        console.error("Payment verification error:", err);

        if (!cancelled) {
          setError(
            err.message ||
              "We could not verify your payment. Please check My Orders before trying again."
          );
        }
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [navigate, queryString, retryKey]);

  if (error) {
    return (
      <div className="payment-callback-page">
        <div className="payment-callback-card">
          <div className="payment-callback-icon">!</div>

          <h1>Payment Verification Needs Attention</h1>

          <p>{error}</p>

          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
          >
            RETRY VERIFICATION
          </button>

          <button
            type="button"
            onClick={() => navigate("/my-orders")}
          >
            VIEW MY ORDERS
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
          >
            RETURN HOME
          </button>
        </div>
      </div>
    );
  }

  return (
    <LoadingScreen message="Verifying your payment securely..." />
  );
}

export default PaymentCallback;
