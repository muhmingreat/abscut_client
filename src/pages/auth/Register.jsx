
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  apiRequest,
  uploadRequest,
} from "../../services/api";
import GoogleLoginButton from "../../components/GoogleLoginButton";
import { useApp } from "../../context/AppContext";
import LoadingScreen from "../LoadingScreen";
import "./Register.css";

// =========================================================
// GENERATE USERNAME SUGGESTION
// =========================================================

function generateUsername(firstName, lastName) {
  const combinedName = `${firstName}${lastName}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!combinedName) return "";

  return combinedName.slice(0, 30);
}

function Register() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [googleLoading, setGoogleLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [usernameManuallyEdited, setUsernameManuallyEdited] =
    useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // =========================================================
  // CLEAN UP AVATAR PREVIEW URL
  // =========================================================

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => {
      const updatedData = {
        ...currentData,
        [name]: value,
      };

      if (
        !usernameManuallyEdited &&
        (name === "firstName" || name === "lastName")
      ) {
        updatedData.username = generateUsername(
          updatedData.firstName,
          updatedData.lastName,
        );
      }

      return updatedData;
    });

    if (name === "username") {
      setUsernameManuallyEdited(true);
    }

    setError("");
  };

  // =========================================================
  // HANDLE AVATAR SELECTION
  // =========================================================

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WebP profile image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Your profile image must not exceed 2MB.");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  };

  // =========================================================
  // REMOVE SELECTED AVATAR
  // =========================================================

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    setError("");

    const avatarInput = document.getElementById("avatar");

    if (avatarInput) {
      avatarInput.value = "";
    }
  };

  // =========================================================
  // HANDLE REGISTER
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const phone = formData.phone.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

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

    const phoneDigits = phone.replace(/\D/g, "");

    if (phoneDigits.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== formData.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (!agreeToTerms) {
      setError("Please agree to the ABS CUT terms before continuing.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      // =====================================================
      // UPLOAD AVATAR IF ONE WAS SELECTED
      // =====================================================

      let avatarUrl = "";

      if (avatarFile) {
        const avatarFormData = new FormData();

        avatarFormData.append("avatar", avatarFile);

        const uploadData = await uploadRequest(
          "/uploads/registration-avatar",
          avatarFormData,
        );

        avatarUrl = uploadData?.avatar?.url || "";

        if (!avatarUrl) {
          throw new Error(
            "Your profile image could not be uploaded. Please try again.",
          );
        }
      }

      // =====================================================
      // REGISTER USER
      // =====================================================

      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          username: formData.username.trim().toLowerCase(),
          avatar: avatarUrl,
          phone,
          email,
          password,
        }),
      });

      // =====================================================
      // EMAIL VERIFICATION
      // =====================================================

      if (data.requiresEmailVerification) {
        navigate("/verify-email", {
          state: {
            email: data.email || email,
          },
        });

        return;
      }

      // =====================================================
      // UNEXPECTED SUCCESS RESPONSE
      // =====================================================

      setSuccess(true);

      navigate("/login", {
        replace: true,
        state: {
          message:
            data.message ||
            "Registration successful. Please log in.",
        },
      });
    } catch (error) {
      console.error("ABS CUT registration error:", error);

      setError(
        error.message ||
          "Unable to create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // GOOGLE SIGNUP
  // =========================================================

  const handleGoogleSuccess = (data) => {
    setGoogleLoading(false);
    setError("");

    if (data?.requiresEmailVerification) {
      navigate("/verify-email", {
        state: {
          email: data.email || "",
        },
      });

      return;
    }

    if (!data?.user || !data?.token) {
      setError("Google signup could not complete your account setup.");
      return;
    }

    login(data.user, data.token);
    navigate("/account", { replace: true });
  };

  const handleGoogleError = (message) => {
    setGoogleLoading(false);

    setError(
      message || "Unable to sign up with Google. Please try again.",
    );
  };

  const handleGoogleLoading = (isLoading) => {
    setGoogleLoading(isLoading);
  };

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <LoadingScreen message="Creating your ABS CUT account..." />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="register-page">
      <section className="register-intro">
        <div className="register-brand">
          <span>ABS</span>
          <strong>CUT</strong>
        </div>

        <p className="register-label">ABS CUT CUSTOMER ACCOUNT</p>

        <h1>
          Create Your
          <br />
          <span>Account.</span>
        </h1>

        <p className="register-intro-text">
          Join ABS CUT and make your shopping and custom tailoring
          experience easier.
        </p>

        <div className="register-intro-feature">
          <div className="register-feature-number">01</div>
          <div>
            <strong>Shop With Ease</strong>
            <span>Keep your customer details ready for checkout.</span>
          </div>
        </div>

        <div className="register-intro-feature">
          <div className="register-feature-number">02</div>
          <div>
            <strong>Track Your Orders</strong>
            <span>Follow your ready-to-wear and custom requests.</span>
          </div>
        </div>

        <div className="register-intro-feature">
          <div className="register-feature-number">03</div>
          <div>
            <strong>Custom Fashion</strong>
            <span>Submit your personal tailoring requirements.</span>
          </div>
        </div>
      </section>

      <section className="register-card">
        <div className="register-card-header">
          <p>WELCOME TO ABS CUT</p>
          <h2>Create Your Account</h2>
          <span>Enter your details below to get started.</span>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          {/* FIRST + LAST NAME */}

          <div className="register-form-row">
            <div className="register-form-group">
              <label htmlFor="firstName">First Name</label>
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
              <label htmlFor="lastName">Last Name</label>
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

          {/* USERNAME */}

          <div className="register-form-group register-username-group">
            <label htmlFor="username">
              Username <span>(Optional)</span>
            </label>

            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="Your suggested username"
              autoComplete="username"
              maxLength={30}
            />

            <small>
              We've suggested a username using your names. You can
              change it or leave it blank.
            </small>
          </div>

          {/* PROFILE IMAGE */}

          <div className="register-form-group register-avatar-group">
            <label htmlFor="avatar">
              Profile Image <span>(Optional)</span>
            </label>

            <div className="register-avatar-upload">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Selected profile preview"
                  className="register-avatar-preview"
                />
              ) : (
                <div className="register-avatar-placeholder">
                  <span>+</span>
                </div>
              )}

              <div className="register-avatar-actions">
                <label
                  htmlFor="avatar"
                  className="register-avatar-select"
                >
                  {avatarFile ? "Change Image" : "Choose Image"}
                </label>

                {avatarFile && (
                  <button
                    type="button"
                    className="register-avatar-remove"
                    onClick={handleRemoveAvatar}
                  >
                    Remove
                  </button>
                )}

                <small>JPG, PNG or WebP. Maximum size: 2MB.</small>
              </div>
            </div>

            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              hidden
            />
          </div>

          {/* PHONE */}

          <div className="register-form-group">
            <label htmlFor="phone">Phone Number</label>
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
            <label htmlFor="email">Email Address</label>
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
            <label htmlFor="password">Password</label>

            <div className="register-password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <small>Password must contain at least 8 characters.</small>
          </div>

          {/* CONFIRM PASSWORD */}

          <div className="register-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>

            <div className="register-password-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowConfirmPassword((current) => !current)
                }
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* TERMS */}

          <label className="register-terms">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(event) =>
                setAgreeToTerms(event.target.checked)
              }
            />

            <span>
              I agree to the ABS CUT terms and understand that my account
              information will be used to provide the requested services.
            </span>
          </label>

          {/* ERROR */}

          {error && (
            <div className="register-error">
              <strong>!</strong>
              <p>{error}</p>
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="register-success">
              <strong>✓</strong>
              <p>
                Registration successful. Preparing your email verification...
              </p>
            </div>
          )}

          {/* CREATE ACCOUNT */}

          <button
            type="submit"
            className="register-submit-button"
            disabled={success || googleLoading}
          >
            <span>{success ? "ACCOUNT CREATED" : "CREATE ACCOUNT"}</span>
            <strong>{success ? "✓" : "→"}</strong>
          </button>
        </form>

        {/* GOOGLE SIGNUP */}

        <div className="register-social-divider">
          <span />
          <span />
        </div>

        <GoogleLoginButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          onLoading={handleGoogleLoading}
          onVerificationRequired={(data) => {
            const email = data.email || data.user?.email || "";

            if (!email) {
              setError(
                "We sent a verification code, but could not identify the email address. Please check your inbox.",
              );
              return;
            }

            navigate("/verify-email", {
              state: {
                email,
                message:
                  data.message ||
                  "We sent a verification code to your email.",
                source: "google",
              },
            });
          }}
        />

        {/* LOGIN LINK */}

        <div className="register-login">
          <span>Already have an account?</span>
          <Link to="/login">Login</Link>
        </div>
      </section>
    </main>
  );
}

export default Register;
;
