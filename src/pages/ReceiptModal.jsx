
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "./ReceiptModal.css";

function ReceiptModal({ order, onClose }) {
  const [actionLoading, setActionLoading] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [receiptError, setReceiptError] = useState("");

  // =========================================================
  // CLOSE WITH ESCAPE
  // =========================================================

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // =========================================================
  // LOAD SECURE RECEIPT FROM BACKEND
  // =========================================================

  useEffect(() => {
    const loadReceipt = async () => {
      if (!order?._id) {
        setReceiptError(
          "Receipt information is unavailable."
        );
        setReceiptLoading(false);
        return;
      }

      try {
        setReceiptLoading(true);
        setReceiptError("");

        const data = await apiRequest(
          `/orders/${order._id}/receipt`
        );

        if (!data.success || !data.receipt) {
          throw new Error(
            data.message ||
              "Unable to load receipt."
          );
        }

        setReceipt(data.receipt);
      } catch (error) {
        console.error(
          "Receipt loading error:",
          error
        );

        setReceiptError(
          error.message ||
            "Unable to load your receipt."
        );
      } finally {
        setReceiptLoading(false);
      }
    };

    loadReceipt();
  }, [order?._id]);

  // =========================================================
  // SAFETY CHECK
  // =========================================================

  if (!order) {
    return null;
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (receiptLoading) {
    return (
      <div className="receipt-modal-overlay">
        <div className="receipt-modal-loading">

          <div className="receipt-modal-loading-spinner">
            <div></div>
          </div>

          <h2>
            Loading Receipt
          </h2>

          <p>
            Verifying your receipt securely...
          </p>

        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (receiptError) {
    return (
      <div className="receipt-modal-overlay">
        <div className="receipt-modal-error">

          <div className="receipt-modal-error-icon">
            !
          </div>

          <h2>
            Receipt Unavailable
          </h2>

          <p>
            {receiptError}
          </p>

          <button
            type="button"
            onClick={onClose}
          >
            CLOSE
          </button>

        </div>
      </div>
    );
  }

  // =========================================================
  // SAFETY CHECK
  // =========================================================

  if (!receipt) {
    return null;
  }

  // =========================================================
  // FORMAT PRICE
  // =========================================================

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  // =========================================================
  // CUSTOMER NAME
  // =========================================================

  const customerName =
    `${receipt.customer?.firstName || ""} ${
      receipt.customer?.lastName || ""
    }`.trim();

  // =========================================================
  // RECEIPT TEXT
  // =========================================================

  const createReceiptText = () => {
    const items = (receipt.items || [])
      .map(
        (item) =>
          `${item.name} × ${item.quantity} — ${formatPrice(
            item.price * item.quantity
          )}`
      )
      .join("\n");

    const deliveryInformation =
      receipt.deliveryMethod === "delivery"
        ? `${receipt.shippingAddress?.address || ""}, ${
            receipt.shippingAddress?.city || ""
          }, ${
            receipt.shippingAddress?.state || ""
          }`
        : "Pickup";

    return `ABS CUT
Premium Fashion & Custom Tailoring

ORDER RECEIPT

Order: #${receipt._id}
Date: ${formatDate(receipt.createdAt)}

CUSTOMER
${customerName}
${receipt.customer?.email || ""}
${receipt.customer?.phone || ""}

ITEMS
${items}

Subtotal: ${formatPrice(receipt.subtotal)}
Delivery Fee: ${formatPrice(receipt.deliveryFee)}
TOTAL PAID: ${formatPrice(receipt.total)}

Payment Status: PAID
Payment Reference: ${
      receipt.paymentReference || "N/A"
    }

Delivery:
${deliveryInformation}

Thank you for choosing ABS CUT.`;
  };

  // =========================================================
  // PRINT / SAVE PDF
  // =========================================================

  const handlePrint = () => {
    window.print();
  };

  // =========================================================
  // DOWNLOAD RECEIPT
  // =========================================================

  const handleDownload = () => {
    try {
      setActionLoading("download");

      const itemsHtml = (receipt.items || [])
        .map(
          (item) => `
            <tr>
              <td>
                <strong>${item.name}</strong>
              </td>

              <td>
                ${item.quantity}
              </td>

              <td>
                ${formatPrice(item.price)}
              </td>

              <td>
                ${formatPrice(
                  item.price * item.quantity
                )}
              </td>
            </tr>
          `
        )
        .join("");

      const deliveryInformation =
        receipt.deliveryMethod === "delivery"
          ? `${receipt.shippingAddress?.address || ""}, ${
              receipt.shippingAddress?.city || ""
            }, ${
              receipt.shippingAddress?.state || ""
            }`
          : "Pickup";

      const receiptHtml = `
<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
  ABS CUT Receipt - ${receipt._id}
</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 40px 20px;
  background: #f8f5ed;
  color: #1e2924;
  font-family: Arial, Helvetica, sans-serif;
}

.receipt {
  max-width: 850px;
  margin: 0 auto;
  background: #ffffff;
  padding: 45px;
  border-top: 6px solid #c9a227;
  box-shadow: 0 15px 50px rgba(0,0,0,0.08);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid #dedbd2;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  background: #0b3d2e;
  color: #c9a227;
  font-weight: 800;
  font-size: 17px;
  letter-spacing: 2px;
}

h1 {
  margin: 0;
  color: #0b3d2e;
  font-size: 25px;
}

.brand p {
  margin: 5px 0 0;
  color: #66736d;
  font-size: 13px;
}

.title {
  text-align: right;
}

.title span {
  display: block;
  color: #66736d;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
}

.title strong {
  display: inline-block;
  margin-top: 8px;
  color: #0b3d2e;
  font-size: 13px;
}

.info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin: 30px 0;
}

.info-card {
  padding: 18px;
  background: #f8f5ed;
  border: 1px solid #dedbd2;
}

.label {
  display: block;
  margin-bottom: 8px;
  color: #c9a227;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.info-card strong {
  display: block;
  color: #0b3d2e;
  margin-bottom: 5px;
}

.info-card p {
  margin: 4px 0;
  color: #66736d;
  font-size: 13px;
  word-break: break-word;
}

.section-title {
  margin: 30px 0 15px;
  color: #0b3d2e;
  font-size: 18px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 12px 10px;
  background: #0b3d2e;
  color: #ffffff;
  text-align: left;
  font-size: 11px;
  letter-spacing: 1px;
}

td {
  padding: 15px 10px;
  border-bottom: 1px solid #dedbd2;
  font-size: 13px;
}

.summary {
  max-width: 400px;
  margin: 25px 0 25px auto;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 0;
}

.summary-total {
  margin-top: 8px;
  padding: 17px;
  background: #0b3d2e;
  color: #ffffff;
}

.summary-total strong {
  color: #c9a227;
  font-size: 18px;
}

.delivery {
  margin-top: 25px;
  padding: 20px;
  background: #f8f5ed;
  border-left: 4px solid #c9a227;
}

.delivery strong {
  display: block;
  margin-bottom: 7px;
  color: #0b3d2e;
}

.delivery p {
  margin: 0;
  color: #66736d;
  font-size: 13px;
}

.footer {
  margin-top: 35px;
  padding-top: 25px;
  border-top: 1px solid #dedbd2;
  text-align: center;
}

.footer strong {
  color: #0b3d2e;
}

.footer p {
  color: #66736d;
  font-size: 13px;
}

@media (max-width: 650px) {

  body {
    padding: 15px;
  }

  .receipt {
    padding: 25px 18px;
  }

  .header {
    flex-direction: column;
  }

  .title {
    text-align: left;
  }

  .info {
    grid-template-columns: 1fr;
  }

  table {
    font-size: 12px;
  }

  th,
  td {
    padding: 9px 5px;
  }

}

</style>

</head>

<body>

<div class="receipt">

  <div class="header">

    <div class="brand">

      <div class="logo">
        ABS
      </div>

      <div>
        <h1>ABS CUT</h1>
        <p>
          Premium Fashion & Custom Tailoring
        </p>
      </div>

    </div>

    <div class="title">

      <span>
        ORDER RECEIPT
      </span>

      <strong>
        PAID
      </strong>

    </div>

  </div>

  <div class="info">

    <div class="info-card">

      <span class="label">
        CUSTOMER
      </span>

      <strong>
        ${customerName}
      </strong>

      <p>
        ${receipt.customer?.email || ""}
      </p>

      <p>
        ${receipt.customer?.phone || ""}
      </p>

    </div>

    <div class="info-card">

      <span class="label">
        ORDER
      </span>

      <strong>
        #${receipt._id}
      </strong>

      <p>
        ${formatDate(receipt.createdAt)}
      </p>

    </div>

    <div class="info-card">

      <span class="label">
        PAYMENT
      </span>

      <strong>
        PAID
      </strong>

      <p>
        Ref: ${receipt.paymentReference || "N/A"}
      </p>

    </div>

  </div>

  <h2 class="section-title">
    Items Purchased
  </h2>

  <table>

    <thead>

      <tr>
        <th>PRODUCT</th>
        <th>QTY</th>
        <th>PRICE</th>
        <th>TOTAL</th>
      </tr>

    </thead>

    <tbody>
      ${itemsHtml}
    </tbody>

  </table>

  <div class="summary">

    <div class="summary-row">
      <span>Subtotal</span>
      <strong>
        ${formatPrice(receipt.subtotal)}
      </strong>
    </div>

    <div class="summary-row">
      <span>Delivery Fee</span>
      <strong>
        ${formatPrice(receipt.deliveryFee)}
      </strong>
    </div>

    <div class="summary-row summary-total">

      <strong>
        TOTAL PAID
      </strong>

      <strong>
        ${formatPrice(receipt.total)}
      </strong>

    </div>

  </div>

  <div class="delivery">

    <strong>
      ${
        receipt.deliveryMethod === "delivery"
          ? "Home Delivery"
          : "Pickup"
      }
    </strong>

    <p>
      ${deliveryInformation}
    </p>

  </div>

  <div class="footer">

    <strong>
      Thank you for choosing ABS CUT.
    </strong>

    <p>
      Premium fashion, custom tailoring and exceptional style.
    </p>

  </div>

</div>

</body>
</html>
      `;

      const blob = new Blob(
        [receiptHtml],
        {
          type: "text/html;charset=utf-8",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `ABS-CUT-Receipt-${receipt._id}.html`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);

    } catch (error) {
      console.error(
        "Receipt download error:",
        error
      );
    } finally {
      setActionLoading("");
    }
  };

  // =========================================================
  // SHARE RECEIPT
  // =========================================================

  const handleShare = async () => {
    try {
      setActionLoading("share");

      const receiptText =
        createReceiptText();

      if (navigator.share) {
        await navigator.share({
          title:
            "ABS CUT Order Receipt",
          text: receiptText,
        });

        return;
      }

      await navigator.clipboard.writeText(
        receiptText
      );

      alert(
        "Receipt details copied to your clipboard."
      );

    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(
          "Receipt share error:",
          error
        );

        alert(
          "Unable to share the receipt right now."
        );
      }
    } finally {
      setActionLoading("");
    }
  };

  // =========================================================
  // MODAL
  // =========================================================

  return (
    <div
      className="receipt-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <div
        className="receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
      >

        {/* CLOSE */}

        <button
          type="button"
          className="receipt-modal-close"
          onClick={onClose}
          aria-label="Close receipt"
        >
          ×
        </button>

        {/* HEADER */}

        <div className="receipt-modal-header">

          <div className="receipt-modal-brand">

            <div className="receipt-modal-logo">
              ABS
            </div>

            <div>

              <h2>
                ABS CUT
              </h2>

              <p>
                Premium Fashion & Custom Tailoring
              </p>

            </div>

          </div>

          <div className="receipt-modal-title">

            <span>
              ORDER RECEIPT
            </span>

            <strong>
              PAID
            </strong>

          </div>

        </div>

        {/* CUSTOMER DETAILS */}

        <div className="receipt-modal-details">

          <div>

            <span>
              CUSTOMER
            </span>

            <strong>
              {receipt.customer?.firstName}{" "}
              {receipt.customer?.lastName}
            </strong>

            <p>
              {receipt.customer?.email}
            </p>

            <p>
              {receipt.customer?.phone}
            </p>

          </div>

          <div>

            <span>
              ORDER
            </span>

            <strong>
              #{receipt._id}
            </strong>

            <p>
              {formatDate(receipt.createdAt)}
            </p>

          </div>

          <div>

            <span>
              PAYMENT REFERENCE
            </span>

            <strong>
              {receipt.paymentReference || "N/A"}
            </strong>

          </div>

        </div>

        {/* PRODUCTS */}

        <div className="receipt-modal-products">

          <div className="receipt-modal-products-heading">

            <span>
              PRODUCT
            </span>

            <span>
              QTY
            </span>

            <span>
              TOTAL
            </span>

          </div>

          {receipt.items?.map(
            (item, index) => (

              <div
                className="receipt-modal-product"
                key={`${item.product}-${index}`}
              >

                <div className="receipt-modal-product-info">

                  <div className="receipt-modal-product-image">

                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                      />
                    ) : (
                      <span>
                        ABS
                      </span>
                    )}

                  </div>

                  <div>

                    <strong>
                      {item.name}
                    </strong>

                    <span>
                      {formatPrice(item.price)}
                    </span>

                  </div>

                </div>

                <span>
                  {item.quantity}
                </span>

                <strong>
                  {formatPrice(
                    item.price *
                      item.quantity
                  )}
                </strong>

              </div>

            )
          )}

        </div>

        {/* TOTALS */}

        <div className="receipt-modal-summary">

          <div>

            <span>
              Subtotal
            </span>

            <strong>
              {formatPrice(
                receipt.subtotal
              )}
            </strong>

          </div>

          <div>

            <span>
              Delivery Fee
            </span>

            <strong>
              {formatPrice(
                receipt.deliveryFee
              )}
            </strong>

          </div>

          <div className="receipt-modal-total">

            <span>
              TOTAL PAID
            </span>

            <strong>
              {formatPrice(
                receipt.total
              )}
            </strong>

          </div>

        </div>

        {/* DELIVERY */}

        <div className="receipt-modal-delivery">

          <span>
            DELIVERY INFORMATION
          </span>

          <strong>
            {receipt.deliveryMethod ===
            "delivery"
              ? "Home Delivery"
              : "Pickup"}
          </strong>

          {receipt.deliveryMethod ===
            "delivery" &&
            receipt.shippingAddress && (
              <p>
                {receipt.shippingAddress.address},{" "}
                {receipt.shippingAddress.city},{" "}
                {receipt.shippingAddress.state}
              </p>
            )}

        </div>

        {/* FOOTER */}

        <div className="receipt-modal-footer">

          <p>
            Thank you for choosing ABS CUT.
          </p>

          <div className="receipt-modal-actions">

            <button
              type="button"
              className="receipt-print-button"
              onClick={handlePrint}
              disabled={Boolean(
                actionLoading
              )}
            >
              PRINT / SAVE PDF
            </button>

            <button
              type="button"
              className="receipt-download-button"
              onClick={handleDownload}
              disabled={Boolean(
                actionLoading
              )}
            >
              {actionLoading ===
              "download"
                ? "DOWNLOADING..."
                : "DOWNLOAD RECEIPT"}
            </button>

            <button
              type="button"
              className="receipt-share-button"
              onClick={handleShare}
              disabled={Boolean(
                actionLoading
              )}
            >
              {actionLoading === "share"
                ? "SHARING..."
                : "SHARE RECEIPT"}
            </button>

            <button
              type="button"
              className="receipt-close-button"
              onClick={onClose}
              disabled={Boolean(
                actionLoading
              )}
            >
              CLOSE
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default ReceiptModal;

