import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../services/api";
import "./CustomOrderConfirmation.css";

function CustomOrderConfirmation() {
  const { customOrderId } = useParams();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCustomOrder = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest(`/custom-orders/${customOrderId}`);

        setRequest(response.customOrder);
      } catch (error) {
        console.error("Load custom order error:", error);

        setError(error.message || "Unable to load this custom order.");
      } finally {
        setLoading(false);
      }
    };

    if (customOrderId) {
      loadCustomOrder();
    } else {
      setLoading(false);
      setError("Invalid custom order.");
    }
  }, [customOrderId]);

  /*
    ==========================================
    LOADING STATE
    ==========================================
  */

  if (loading) {
    return (
      <main className="custom-confirmation-page">
        <section className="custom-confirmation-not-found">
          <div className="custom-confirmation-icon">...</div>

          <p className="custom-confirmation-label">ABS CUT</p>

          <h1>Loading Request</h1>

          <p>Please wait while we load your custom order request.</p>
        </section>
      </main>
    );
  }

  /*
    ==========================================
    REQUEST NOT FOUND
    ==========================================
  */

  if (!request) {
    return (
      <main className="custom-confirmation-page">
        <section className="custom-confirmation-not-found">
          <div className="custom-confirmation-icon">!</div>

          <p className="custom-confirmation-label">ABS CUT</p>

          <h1>Request Not Found</h1>

          <p>
            {error ||
              "We could not find the custom order request you are looking for."}
          </p>

          <Link to="/custom-order" className="custom-confirmation-primary">
            CREATE CUSTOM ORDER
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="custom-confirmation-page">
      <section className="custom-confirmation">
        <div className="custom-confirmation-icon">✓</div>

        <p className="custom-confirmation-label">ABS CUT CUSTOM SERVICE</p>

        <h1>Custom Request Received</h1>

        <p className="custom-confirmation-message">
          Thank you for choosing ABS CUT. Your custom outfit request has been
          successfully received. Our team will review your requirements and
          provide a quotation.
        </p>

        <div className="custom-request-number">
          <span>REQUEST NUMBER</span>

          <strong>{request._id}</strong>
        </div>

        <div className="custom-request-summary">
          <div>
            <span>Outfit Type</span>
            <strong>{request.outfitType || "Not specified"}</strong>
          </div>

          <div>
            <span>Fabric</span>
            <strong>{request.fabric || "Not specified"}</strong>
          </div>

          <div>
            <span>Colour</span>
            <strong>{request.color || "Not specified"}</strong>
          </div>

          <div>
            <span>Material</span>
            <strong>{request.materialSource || "Not specified"}</strong>
          </div>

          <div>
            <span>Embroidery</span>
            <strong>
              {request.embroidery === "yes" ? "Requested" : "Not Requested"}
            </strong>
          </div>

          <div>
            <span>Monogram</span>
            <strong>
              {request.monogram === "yes"
                ? request.monogramText || "Requested"
                : "Not Requested"}
            </strong>
          </div>

          <div>
            <span>Pickup</span>
            <strong>
              {request.pickupRequired ? "Requested" : "Not Requested"}
            </strong>
          </div>

          <div>
            <span>Delivery</span>
            <strong>
              {request.deliveryRequired ? "Requested" : "Not Requested"}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{request.status}</strong>
          </div>
        </div>

        <div className="custom-confirmation-note">
          <h2>What Happens Next?</h2>

          <p>
            ABS CUT will review your measurements, fabric choice, design
            requirements and reference information. We will then determine the
            quotation and production requirements for your custom outfit.
          </p>
        </div>

        <div className="custom-confirmation-actions">
          <Link to="/custom-order" className="custom-confirmation-primary">
            CREATE ANOTHER REQUEST
          </Link>

          <Link to="/shop" className="custom-confirmation-secondary">
            CONTINUE SHOPPING
          </Link>

          <Link to="/" className="custom-confirmation-home">
            BACK TO HOME
          </Link>
        </div>
      </section>
    </main>
  );
}

export default CustomOrderConfirmation;
