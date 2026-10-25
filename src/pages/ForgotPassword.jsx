import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    // if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    // if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    //   {
    //   setError("Please enter a valid email address.");
    //
    //   return;
    // }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      setMessage(
        data?.message ||
          "If an account exists with that email, password reset instructions will be sent.",
      );
    } catch (requestError) {
      console.error("ABS CUT password recovery error:", requestError);

      setError(
        requestError.message ||
          "We couldn't process your request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="forgot-password-page">
      <section className="forgot-password-layout">
        {/* INTRODUCTION */}
        <aside className="forgot-password-intro">
          <Link to="/" className="forgot-password-brand">
            <span>ABS</span>
            <strong>CUT</strong>
          </Link>

          <p className="forgot-password-eyebrow">ABS CUT CUSTOMER CARE</p>

          <h1>
            A Fresh
            <br />
            <span>Start.</span>
          </h1>

          <p className="forgot-password-description">
            Forgot your password? Don't worry. We'll help you get back to your
            account so you can continue your shopping and custom tailoring
            experience.
          </p>

          <div className="forgot-password-benefit">
            <span className="forgot-benefit-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
                <path
                  d="M12 3 19 6V11C19 15.5 16 19 12 21C8 19 5 15.5 5 11V6L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <div>
              <strong>Secure Account Recovery</strong>
              <p>
                Use a private, time-limited reset link to create a new password.
              </p>
            </div>
          </div>

          <div className="forgot-password-bottom-label">
            CRAFTED WITH CARE. MADE FOR YOUR STYLE.
          </div>
        </aside>

        {/* FORM CARD */}
        <section className="forgot-password-card">
          <div className="forgot-password-card-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
              <rect
                x="4"
                y="10"
                width="16"
                height="11"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M8 10V7a4 4 0 0 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M12 14v3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="forgot-password-card-label">PASSWORD RECOVERY</p>

          <h2>Forgot Your Password?</h2>

          <p className="forgot-password-card-description">
            Enter the email address linked to your account. We'll send a
            six-digit recovery code if an eligible account matches it.
          </p>

          <form className="forgot-password-form" onSubmit={handleSubmit}>
            <div className="forgot-password-field">
              <label htmlFor="forgot-password-email">Email Address</label>

              <div className="forgot-password-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="m4 7 8 6 8-6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <input
                  id="forgot-password-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div
                className="forgot-password-alert forgot-password-alert-error"
                role="alert"
              >
                <span aria-hidden="true">!</span>
                <p>{error}</p>
              </div>
            )}

            {/* {message && (
              <div
                className="forgot-password-alert forgot-password-alert-success"
                role="status"
              >
                <span aria-hidden="true">✓</span>
                <p>{message}</p>
              </div>
            )} */}
            {message && (
              <>
                <div
                  className="forgot-password-alert forgot-password-alert-success"
                  role="status"
                >
                  <span aria-hidden="true">✓</span>
                  <p>{message}</p>
                </div>

                <Link
                  to={`/reset-password?email=${encodeURIComponent(
                    email.trim().toLowerCase(),
                  )}`}
                  className="forgot-password-back-link"
                >
                  Enter Recovery Code
                  <span aria-hidden="true"> →</span>
                </Link>
              </>
            )}

            <button
              className="forgot-password-submit"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? "SENDING INSTRUCTIONS..."
                  : "SEND RESET INSTRUCTIONS"}
              </span>

              {!loading && <span aria-hidden="true">→</span>}
              {loading && (
                <span className="forgot-password-spinner" aria-hidden="true" />
              )}
            </button>
          </form>

          <div className="forgot-password-divider">
            <span />
            <span>NEED ANOTHER OPTION?</span>
            <span />
          </div>

          <Link to="/login" className="forgot-password-back-link">
            <span aria-hidden="true">←</span>
            Back to Login
          </Link>

          <p className="forgot-password-security-note">
            <span aria-hidden="true">◆</span>
            Your account security matters to us.
          </p>
        </section>
      </section>
    </main>
  );
}

export default ForgotPassword;
