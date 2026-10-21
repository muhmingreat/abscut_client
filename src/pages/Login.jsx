import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import LoadingScreen from "./LoadingScreen";
import GoogleLoginButton from "../components/GoogleLoginButton";
import FacebookLoginButton from "../components/FacebookLoginButton";

import { useApp } from "../context/AppContext";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const { login } = useApp();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] =
  useState(false);

const [facebookLoading, setFacebookLoading] =
  useState(false);

const [facebookNeedsEmail, setFacebookNeedsEmail] =
  useState(false);

const [facebookContactEmail, setFacebookContactEmail] =
  useState("");

const [facebookAccessToken, setFacebookAccessToken] =
  useState("");
  // const [googleLoading, setGoogleLoading] = useState(false);
  // const [facebookLoading, setFacebookLoading] = useState(false);

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

 

  const handleSubmit = async (event) => {
    event.preventDefault();

    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    // =======================================================
    // VALIDATION
    // =======================================================

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    // =======================================================
    // LOGIN THROUGH BACKEND
    // =======================================================

    try {
      setLoading(true);
      setError("");
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      // =====================================================
      // SAVE USER + JWT THROUGH APPCONTEXT
      // =====================================================

      login(data.user, data.token);

      // =====================================================
      // SUCCESS
      // =====================================================
      setLoading(false);
      setError("");
      setSuccess(true);

      // =====================================================
      // REDIRECT
      // =====================================================

      setTimeout(() => {
        navigate("/account");
      }, 1000);
    } catch (error) {
      console.error("ABS CUT login error:", error);
      setLoading(false);
      setError(error.message || "Unable to log in. Please try again.");
    }
  };

 
  // =========================================================
// GOOGLE LOGIN SUCCESS
// =========================================================

const handleGoogleSuccess = (data) => {
  try {
    if (!data?.user || !data?.token) {
      throw new Error(
        "Google login did not return a valid ABS CUT session."
      );
    }

    // Save the customer and JWT.
    login(data.user, data.token);

    setError("");
    setSuccess(true);
    setGoogleLoading(false);

    // Navigate after saving the authenticated session.
    navigate("/account", {
      replace: true,
    });
  } catch (error) {
    console.error(
      "ABS CUT Google session error:",
      error
    );

    setGoogleLoading(false);

    setError(
      error.message ||
        "Unable to complete Google login."
    );
  }
};

const handleGoogleError = (message) => {
  setGoogleLoading(false);
  setError(message || "");
};

const handleGoogleLoading = (isLoading) => {
  setGoogleLoading(isLoading);
};

  if (loading) {
    return <LoadingScreen message="Signing you into your ABS CUT account..." />;
  }

  return (
    <main className="login-page">
      {/* =====================================================
          LOGIN INTRO
      ===================================================== */}

      <section className="login-intro">
        <div className="login-brand">
          <span>ABS</span>
          <strong>CUT</strong>
        </div>

        <p className="login-label">ABS CUT CUSTOMER ACCOUNT</p>

        <h1>
          Welcome
          <br />
          <span>Back.</span>
        </h1>

        <p className="login-intro-text">
          Sign in to continue your ABS CUT shopping and custom tailoring
          experience.
        </p>

        {/* FEATURE 01 */}

        <div className="login-intro-feature">
          <div className="login-feature-number">01</div>

          <div>
            <strong>Your Orders</strong>

            <span>
              View and keep track of your ready-to-wear and custom orders.
            </span>
          </div>
        </div>

        {/* FEATURE 02 */}

        <div className="login-intro-feature">
          <div className="login-feature-number">02</div>

          <div>
            <strong>Your Account</strong>

            <span>
              Keep your customer information ready for a smoother checkout
              experience.
            </span>
          </div>
        </div>

        {/* FEATURE 03 */}

        <div className="login-intro-feature">
          <div className="login-feature-number">03</div>

          <div>
            <strong>Your Style</strong>

            <span>
              Continue your custom clothing and tailoring journey with ABS CUT.
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          LOGIN CARD
      ===================================================== */}

      <section className="login-card">
        <div className="login-card-header">
          <p>WELCOME BACK</p>

          <h2>Login To Your Account</h2>

          <span>Enter your account details below to continue.</span>
        </div>

        {/* ===================================================
            LOGIN FORM
        =================================================== */}

        <form className="login-form" onSubmit={handleSubmit}>
          {/* EMAIL */}

          <div className="login-form-group">
            <label htmlFor="login-email">Email Address</label>

            <input
              id="login-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. you@example.com"
              autoComplete="email"
            />
          </div>

          {/* PASSWORD */}

          <div className="login-form-group">
            <div className="login-password-heading">
              <label htmlFor="login-password">Password</label>

              <Link to="/forgot-password" className="login-forgot-link">
                Forgot Password?
              </Link>
            </div>

            <div className="login-password-wrapper">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="login-error">
              <strong>!</strong>

              <p>{error}</p>
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="login-success">
              <strong>✓</strong>

              <p>Login successful. Redirecting you to your account...</p>
            </div>
          )}

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            className="login-submit-button"
            disabled={success}
          >
            <span>{success ? "LOGIN SUCCESSFUL" : "LOGIN TO ACCOUNT"}</span>

            <strong>{success ? "✓" : "→"}</strong>
          </button>
        </form>

{/* ===================================================
    SOCIAL LOGIN
=================================================== */}

<div className="login-social-divider">

  <span />

  <p>
    OR CONTINUE WITH
  </p>

  <span />

</div>


{/* ```jsx
{/* =====================================================
    SOCIAL LOGIN
===================================================== */}

<GoogleLoginButton
  onSuccess={handleGoogleSuccess}
  onError={handleGoogleError}
  onLoading={handleGoogleLoading}
/>




        {/* ===================================================
            REGISTER LINK
        =================================================== */}

        <div className="login-register">
          <span>Don't have an account?</span>

          <Link to="/register">Create Account</Link>
        </div>
      </section>
    </main>
  );
}

export default Login;
