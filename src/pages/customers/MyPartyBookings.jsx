
import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useLocation,
} from "react-router-dom";

import { apiRequest } from "../../services/api";
import LoadingScreen from "../LoadingScreen";
import "./MyPartyBookings.css";

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

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

function statusLabel(value) {
  return String(value || "pending-review")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(value) {
  return String(value || "pending-review")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

export default function MyPartyBookings() {
  const location = useLocation();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    location.state?.notice || ""
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/party-bookings/mine");

      setBookings(
        Array.isArray(result.bookings)
          ? result.bookings
          : []
      );
    } catch (err) {
      setError(
        err.message || "Could not load your party bookings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <main className="my-party-bookings-page">
      <section className="abs-feature-hero">
        <span className="abs-feature-eyebrow">
          YOUR ABS CUT RESERVATIONS
        </span>

        <h1>
          My Party <em>Bookings</em>
        </h1>

        <p>
          View your reservations, follow quotations and keep track
          of your party material payments.
        </p>
      </section>

      <section className="abs-feature-content">
        {notice && (
          <div className="abs-feature-alert is-success" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="abs-feature-alert is-error" role="alert">
            {error}

            <button
              type="button"
              className="abs-feature-button"
              onClick={loadBookings}
            >
              Try again
            </button>
          </div>
        )}

        <div className="abs-material-toolbar">
          <div>
            <h2>Your reservations</h2>
            <p>
              {bookings.length} booking
              {bookings.length === 1 ? "" : "s"} found
            </p>
          </div>

          <Link
            to="/party-materials"
            className="abs-feature-button abs-feature-button-secondary"
          >
            Browse materials
          </Link>
        </div>

        {!error && bookings.length === 0 ? (
          <div className="abs-feature-empty">
            <span className="abs-feature-empty-mark">AC</span>

            <h2>No party bookings yet</h2>

            <p>
              Your material reservations will appear here after
              you submit your first request.
            </p>

            <Link
              to="/party-materials"
              className="abs-feature-button"
            >
              Explore party materials
            </Link>
          </div>
        ) : (
          <div className="abs-party-booking-list">
            {bookings.map((booking) => {
              const quotation = Number(booking.quotationAmount) || 0;
              const paid = Number(booking.amountPaid) || 0;
              const balance = Math.max(quotation - paid, 0);

              const progress =
                quotation > 0
                  ? Math.min((paid / quotation) * 100, 100)
                  : 0;

              return (
                <article
                  className="abs-party-booking-card"
                  key={booking._id}
                >
                  <div className="abs-party-booking-card-top">
                    <div>
                      <span className="abs-feature-eyebrow">
                        PARTY BOOKING
                      </span>

                      <h3>
                        {booking.eventType || "Event reservation"}
                      </h3>

                      <p>
                        Booking reference:{" "}
                        <strong>
                          {String(booking._id)
                            .slice(-8)
                            .toUpperCase()}
                        </strong>
                      </p>
                    </div>

                    <span
                      className={`abs-party-status is-${statusClass(
                        booking.status
                      )}`}
                    >
                      {statusLabel(booking.status)}
                    </span>
                  </div>

                  <div className="abs-party-booking-facts">
                    <div>
                      <small>Event date</small>
                      <strong>{formatDate(booking.eventDate)}</strong>
                    </div>

                    <div>
                      <small>Quotation</small>
                      <strong>
                        {quotation > 0
                          ? money(quotation)
                          : "Awaiting quotation"}
                      </strong>
                    </div>

                    <div>
                      <small>Amount paid</small>
                      <strong>{money(paid)}</strong>
                    </div>

                    <div>
                      <small>Outstanding</small>
                      <strong>
                        {quotation > 0 ? money(balance) : "—"}
                      </strong>
                    </div>
                  </div>

                  {quotation > 0 && (
                    <div className="abs-party-booking-progress">
                      <div>
                        <span>Payment progress</span>
                        <strong>
                          {Math.round(progress)}%
                        </strong>
                      </div>

                      <div className="abs-party-progress-track">
                        <span
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="abs-party-booking-card-bottom">
                    <span>
                      Payment: {statusLabel(booking.paymentStatus)}
                    </span>

                    <Link
                      to={`/my-party-bookings/${booking._id}`}
                      className="abs-feature-button"
                    >
                      View booking details
                    </Link>
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
