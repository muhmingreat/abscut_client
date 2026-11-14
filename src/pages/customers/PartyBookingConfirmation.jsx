
import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useSearchParams,
} from "react-router-dom";

import { apiRequest } from "../../services/api";
import LoadingScreen from "../LoadingScreen";
import './PartyBookingConfirmation.css' 

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PartyBookingConfirmation() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState(
    location.state?.booking || null
  );

  const [loading, setLoading] = useState(!location.state?.booking);
  const [error, setError] = useState("");

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setError(
        "The booking reference is missing. Please check your bookings."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await apiRequest("/party-bookings/mine");

      const bookings = Array.isArray(result.bookings)
        ? result.bookings
        : [];

      const foundBooking = bookings.find(
        (item) => String(item._id) === String(bookingId)
      );

      if (!foundBooking) {
        setBooking(null);
        setError(
          "We couldn't find this booking in your account."
        );
        return;
      }

      setBooking(foundBooking);
    } catch (err) {
      setError(
        err.message || "Unable to retrieve your booking."
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!booking?._id || String(booking._id) !== String(bookingId)) {
      loadBooking();
    }
  }, [booking, bookingId, loadBooking]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!booking?._id) {
    return (
      <main className="abs-feature-page abs-party-page">
        <section className="abs-feature-empty">
          <span className="abs-feature-empty-mark">AC</span>

          <h2>Booking confirmation unavailable</h2>

          <p>
            {error || "We couldn't retrieve your booking details."}
          </p>

          <Link
            to="/my-party-bookings"
            className="abs-feature-button"
          >
            View my bookings
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="abs-feature-page abs-party-page">
      <section className="abs-feature-hero">
        <span className="abs-feature-eyebrow">
          ABS CUT · PARTY MATERIAL RESERVATIONS
        </span>

        <div className="abs-feature-empty">
          <span className="abs-feature-empty-mark">AC</span>

          <h1>
            Booking <em>Submitted!</em>
          </h1>

          <p>
            Your party material reservation request has been
            received successfully. Our team will review your
            selection and prepare a quotation.
          </p>

          <div className="abs-party-detail-grid">
            <div>
              <small>Booking reference</small>
              <strong>
                {String(booking._id).slice(-8).toUpperCase()}
              </strong>
            </div>

            <div>
              <small>Event type</small>
              <strong>
                {booking.eventType || "Party booking"}
              </strong>
            </div>

            <div>
              <small>Event date</small>
              <strong>{formatDate(booking.eventDate)}</strong>
            </div>

            <div>
              <small>Booking status</small>
              <strong>
                {String(booking.status || "pending-review")
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (letter) =>
                    letter.toUpperCase()
                  )}
              </strong>
            </div>
          </div>

          <div className="abs-party-action-panel">
            <h3>What happens next?</h3>

            <p>
              1. ABS CUT reviews your material selection and availability.
            </p>

            <p>
              2. Our team prepares your quotation and fulfilment details.
            </p>

            <p>
              3. You can accept the quotation and manage your
              payment schedule from your booking details.
            </p>
          </div>

          <div className="abs-feature-actions">
            <Link
              to={`/my-party-bookings/${booking._id}`}
              className="abs-feature-button"
            >
              View booking details
            </Link>

            <Link
              to="/my-party-bookings"
              className="abs-feature-button abs-feature-button-secondary"
            >
              View all bookings
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
