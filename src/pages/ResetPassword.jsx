
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./ResetPassword.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(
    searchParams.get("email") || ""
  );
  const [code, setCode] = useState(
    searchParams.get("code") || ""
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the six-digit recovery code sent to your email.");
      return;
    }

    if (password.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Your password must contain at least one letter and one number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          code: code.trim(),
          newPassword: password,
        }),
      });

      if (result?.success === false) {
        throw new Error(result.message || "Unable to reset your password.");
      }

      setSuccess(true);

      window.setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            message:
              "Your password has been set successfully. You can now log in with your email and password.",
          },
        });
      }, 1800);
    } catch (requestError) {
      console.error("ABS CUT password reset error:", requestError);

      setError(
        requestError.message ||
          "Unable to reset your password. Check your recovery code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-password-page">
      <section className="reset-password-layout">
        <aside className="reset-password-intro">
          <Link to="/" className="reset-password-brand">
            <span>ABS</span>
            <strong>CUT</strong>
          </Link>

          <p className="reset-password-eyebrow">
            ABS CUT ACCOUNT SECURITY
          </p>

          <h1>
            Secure Your
            <br />
            <span>Next Step.</span>
          </h1>

          <p className="reset-password-description">
            Create a new password to protect your account and
            continue enjoying your ABS CUT shopping and
            custom tailoring experience.
          </p>

          <div className="reset-password-benefit">
            <span className="reset-benefit-icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
              <strong>Your Account, Protected</strong>
              <p>
                Choose a strong password you do not use for
                other accounts.
              </p>
            </div>
          </div>

          <div className="reset-password-bottom-label">
            CRAFTED WITH CARE. MADE FOR YOUR STYLE.
          </div>
        </aside>

        <section className="reset-password-card">
          <div className="reset-password-card-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

          <p className="reset-password-card-label">
            PASSWORD RECOVERY
          </p>

          <h2>Create a New Password</h2>

          <p className="reset-password-card-description">
            Enter your email, the recovery code we sent you,
            and your new password.
          </p>

          {success ? (
            <div className="reset-password-success-panel" role="status">
              <span className="reset-password-success-icon">✓</span>
              <h3>Password Set Successfully</h3>
              <p>
                Your password has been saved. Redirecting you
                to login...
              </p>

              <Link to="/login" className="reset-password-submit">
                <span>CONTINUE TO LOGIN</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <form
              className="reset-password-form"
              onSubmit={handleSubmit}
            >
              <div className="reset-password-field">
                <label htmlFor="reset-email">Email Address</label>
                <div className="reset-password-input-wrap">
                  <input
                    id="reset-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    placeholder="Enter your account email"
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="reset-password-field">
                <label htmlFor="reset-code">Six-Digit Recovery Code</label>
                <div className="reset-password-input-wrap">
                  <input
                    id="reset-code"
                    type="text"
                    name="code"
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                      setError("");
                    }}
                    placeholder="Enter your recovery code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    disabled={loading}
                  />
                </div>
                <p className="reset-password-hint">
                  Your code expires 10 minutes after it is issued.
                </p>
              </div>

              <div className="reset-password-field">
                <label htmlFor="reset-new-password">
                  New Password
                </label>

                <div className="reset-password-input-wrap">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 10V7a4 4 0 0 1 8 0v3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    id="reset-new-password"
                    type={showPassword ? "text" : "password"}
                    name="newPassword"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="reset-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide new password" : "Show new password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <p className="reset-password-hint">
                  Use at least 8 characters, including a letter and a number.
                </p>
              </div>

              <div className="reset-password-field">
                <label htmlFor="reset-confirm-password">
                  Confirm New Password
                </label>

                <div className="reset-password-input-wrap">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 10V7a4 4 0 0 1 8 0v3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError("");
                    }}
                    placeholder="Enter your new password again"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="reset-password-toggle"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="reset-password-alert reset-password-alert-error"
                  role="alert"
                >
                  <span>!</span>
                  <p>{error}</p>
                </div>
              )}

              <button
                className="reset-password-submit"
                type="submit"
                disabled={loading}
              >
                <span>
                  {loading ? "RESETTING PASSWORD..." : "RESET MY PASSWORD"}
                </span>

                {loading ? (
                  <span className="reset-password-spinner" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">→</span>
                )}
              </button>
            </form>
          )}

          <div className="reset-password-divider">
            <span />
            <span>REMEMBER YOUR PASSWORD?</span>
            <span />
          </div>

          <Link to="/login" className="reset-password-back-link">
            <span aria-hidden="true">←</span>
            Back to Login
          </Link>

          <p className="reset-password-security-note">
            <span aria-hidden="true">◆</span>
            Your account security matters to us.
          </p>
        </section>
      </section>
    </main>
  );
}

export default ResetPassword;
