import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

import LoadingScreen from "./LoadingScreen";
import './Register.css';

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setError("");
  };

  // =========================================================
  // HANDLE REGISTER
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // =======================================================
    // CLEAN FORM VALUES
    // =======================================================

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const phone = formData.phone.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    // =======================================================
    // VALIDATION
    // =======================================================

    if (!firstName) {
      setError("Please enter your first name.");
      return;
    }

    if (!lastName) {
      setError("Please enter your last name.");
      return;
    }

    if (!phone) {
      setError("Please enter your phone number.");
      return;
    }

    // =======================================================
    // PHONE VALIDATION
    // =======================================================

    const phoneDigits = phone.replace(/\D/g, "");

    if (phoneDigits.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    // =======================================================
    // EMAIL VALIDATION
    // =======================================================

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    // =======================================================
    // PASSWORD VALIDATION
    // =======================================================

    if (password.length < 6) {
      setError(
        "Your password must contain at least 6 characters."
      );
      return;
    }

    if (password !== formData.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    // =======================================================
    // TERMS VALIDATION
    // =======================================================

    if (!agreeToTerms) {
      setError(
        "Please agree to the ABS CUT terms before continuing."
      );
      return;
    }

    // =======================================================
    // REGISTER THROUGH BACKEND
    // =======================================================

    try {
      // Start full-page loading
      setLoading(true);
      setError("");

      const data = await apiRequest("/auth/register", {
        method: "POST",

        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email,
          password,
        }),
      });

      // =====================================================
      // SUCCESS
      // =====================================================

      setSuccess(true);
      setLoading(false);

      // =====================================================
      // REDIRECT TO LOGIN
      // =====================================================

      setTimeout(() => {
        navigate("/login");
      }, 1000);

    } catch (error) {
      console.error(
        "ABS CUT registration error:",
        error
      );

      setLoading(false);

      setError(
        error.message ||
          "Unable to create your account. Please try again."
      );
    }
  };

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <LoadingScreen
        message="Creating your ABS CUT account..."
      />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="register-page">

      {/* =====================================================
          REGISTER INTRO
      ===================================================== */}

      <section className="register-intro">

        <div className="register-brand">
          <span>ABS</span>
          <strong>CUT</strong>
        </div>

        <p className="register-label">
          ABS CUT CUSTOMER ACCOUNT
        </p>

        <h1>
          Create Your
          <br />
          <span>Account.</span>
        </h1>

        <p className="register-intro-text">
          Join ABS CUT and make your shopping and
          custom tailoring experience easier.
        </p>

        {/* FEATURE 01 */}

        <div className="register-intro-feature">

          <div className="register-feature-number">
            01
          </div>

          <div>
            <strong>Shop With Ease</strong>

            <span>
              Keep your customer details ready for
              checkout.
            </span>
          </div>

        </div>

        {/* FEATURE 02 */}

        <div className="register-intro-feature">

          <div className="register-feature-number">
            02
          </div>

          <div>
            <strong>Track Your Orders</strong>

            <span>
              Follow your ready-to-wear and custom
              requests.
            </span>
          </div>

        </div>

        {/* FEATURE 03 */}

        <div className="register-intro-feature">

          <div className="register-feature-number">
            03
          </div>

          <div>
            <strong>Custom Fashion</strong>

            <span>
              Submit your personal tailoring
              requirements.
            </span>
          </div>

        </div>

      </section>

      {/* =====================================================
          REGISTER CARD
      ===================================================== */}

      <section className="register-card">

        <div className="register-card-header">

          <p>WELCOME TO ABS CUT</p>

          <h2>
            Create Your Account
          </h2>

          <span>
            Enter your details below to get started.
          </span>

        </div>

        {/* ===================================================
            REGISTER FORM
        =================================================== */}

        <form
          className="register-form"
          onSubmit={handleSubmit}
        >

          {/* FIRST + LAST NAME */}

          <div className="register-form-row">

            <div className="register-form-group">

              <label htmlFor="firstName">
                First Name
              </label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                autoComplete="given-name"
              />

            </div>

            <div className="register-form-group">

              <label htmlFor="lastName">
                Last Name
              </label>

              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                autoComplete="family-name"
              />

            </div>

          </div>

          {/* PHONE */}

          <div className="register-form-group">

            <label htmlFor="phone">
              Phone Number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 08140806540"
              autoComplete="tel"
            />

          </div>

          {/* EMAIL */}

          <div className="register-form-group">

            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. you@example.com"
              autoComplete="email"
            />

          </div>

          {/* PASSWORD */}

          <div className="register-form-group">

            <label htmlFor="password">
              Password
            </label>

            <div className="register-password-wrapper">

              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

            <small>
              Password must contain at least 6 characters.
            </small>

          </div>

          {/* CONFIRM PASSWORD */}

          <div className="register-form-group">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="register-password-wrapper">

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showConfirmPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

          </div>

          {/* TERMS */}

          <label className="register-terms">

            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(event) =>
                setAgreeToTerms(
                  event.target.checked
                )
              }
            />

            <span>
              I agree to the ABS CUT terms and
              understand that my account information
              will be used to provide the requested
              services.
            </span>

          </label>

          {/* ERROR */}

          {error && (
            <div className="register-error">

              <strong>!</strong>

              <p>
                {error}
              </p>

            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="register-success">

              <strong>✓</strong>

              <p>
                Account created successfully.
                Redirecting you to your account...
              </p>

            </div>
          )}

          {/* CREATE ACCOUNT */}

          <button
            type="submit"
            className="register-submit-button"
            disabled={success}
          >

            <span>
              {success
                ? "ACCOUNT CREATED"
                : "CREATE ACCOUNT"}
            </span>

            <strong>
              {success
                ? "✓"
                : "→"}
            </strong>

          </button>

        </form>

        {/* ===================================================
            LOGIN LINK
        =================================================== */}

        <div className="register-login">

          <span>
            Already have an account?
          </span>

          <Link to="/login">
            Login
          </Link>

        </div>

      </section>

    </main>
  );
}

export default Register;


