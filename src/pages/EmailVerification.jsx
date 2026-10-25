
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./EmailVerification.css";

function EmailVerification() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    location.state?.email || ""
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const code = otp.trim();

    setError("");
    setMessage("");

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    // if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
       
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      await apiRequest("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          otp: code,
        }),
      });

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Your email has been verified successfully. You can now log in.",
          email: normalizedEmail,
        },
      });
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to verify your email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    setError("");
    setMessage("");

    if (!normalizedEmail) {
      setError("Enter your email address before requesting a code.");
      return;
    }

    try {
      setResending(true);

      const data = await apiRequest("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      setOtp("");
      setMessage(
        data.message ||
          "If your account needs verification, a new code will be sent."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to resend the code. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="email-verification-page">
      <section className="email-verification-intro">
        <div className="email-verification-brand">
          <span>ABS</span>
          <strong>CUT</strong>
        </div>

        <p className="email-verification-label">
          ABS CUT ACCOUNT SECURITY
        </p>

        <h1>
          One More
          <br />
          <span>Step.</span>
        </h1>

        <p className="email-verification-intro-text">
          Verify your email address to protect your account
          and access your ABS CUT customer experience.
        </p>

        <div className="email-verification-feature">
          <span>01</span>
          <div>
            <strong>Check Your Inbox</strong>
            <p>Look for your six-digit ABS CUT verification code.</p>
          </div>
        </div>

        <div className="email-verification-feature">
          <span>02</span>
          <div>
            <strong>Enter Your Code</strong>
            <p>Use the code sent to your email address.</p>
          </div>
        </div>
      </section>

      <section className="email-verification-card">
        <div className="email-verification-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M4 7L12 13L20 7"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="email-verification-card-header">
          <p>EMAIL VERIFICATION</p>
          <h2>Verify Your Email</h2>
          <span>
            Enter the code sent to your email. The code expires
            after 10 minutes.
          </span>
        </div>

        <form
          className="email-verification-form"
          onSubmit={handleVerify}
        >
          <div className="email-verification-field">
            <label htmlFor="verification-email">
              Email Address
            </label>
            <input
              id="verification-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                setMessage("");
              }}
              required
            />
          </div>

          <div className="email-verification-field">
            <label htmlFor="verification-otp">
              Six-Digit Code
            </label>
            <input
              id="verification-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={otp}
              onChange={(event) => {
                const digits = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6);

                setOtp(digits);
                setError("");
                setMessage("");
              }}
              maxLength={6}
              required
              aria-describedby="verification-code-help"
            />
            <small id="verification-code-help">
              Enter the six digits from your verification email.
            </small>
          </div>

          {error && (
            <div className="email-verification-error" role="alert">
              <strong>!</strong>
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div className="email-verification-success" role="status">
              <strong>✓</strong>
              <p>{message}</p>
            </div>
          )}

          <button
            className="email-verification-submit"
            type="submit"
            disabled={loading || resending}
          >
            <span>
              {loading ? "VERIFYING..." : "VERIFY EMAIL"}
            </span>
            <strong>{loading ? "…" : "→"}</strong>
          </button>
        </form>

        <div className="email-verification-resend">
          <p>Didn't receive the code?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resending}
          >
            {resending ? "Sending..." : "Resend verification code"}
          </button>
        </div>

        <div className="email-verification-back">
          <Link to="/login">← Back to Login</Link>
        </div>
      </section>
    </main>
  );
}

export default EmailVerification;
