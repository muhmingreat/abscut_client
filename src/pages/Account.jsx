
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useApp } from "../context/AppContext";
import { apiRequest, uploadRequest } from "../services/api";
import "./Account.css";

function Account() {
  const navigate = useNavigate();

  const {
    currentUser,
    logout,
    updateCurrentUser,
  } = useApp();

  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [username, setUsername] = useState("");

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const [removingAvatar, setRemovingAvatar] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    setCustomer({
      firstName: currentUser.firstName || "",
      lastName: currentUser.lastName || "",
      phone: currentUser.phone || "",
      email: currentUser.email || "",
    });

    setUsername(currentUser.username || "");
  }, [currentUser]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setCustomer((currentCustomer) => ({
      ...currentCustomer,
      [name]: value,
    }));

    setSaved(false);
    setError("");
  };

  // =============================================
  // SAVE PERSONAL INFORMATION
  // =============================================

  const handleSubmit = (event) => {
    event.preventDefault();

    const firstName = customer.firstName.trim();
    const lastName = customer.lastName.trim();
    const phone = customer.phone.trim();
    const email = customer.email.trim();

    if (!firstName || !lastName) {
      setError("Please enter your first and last name.");
      return;
    }

    if (!phone) {
      setError("Please enter your phone number.");
      return;
    }

    if (email && !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    const updatedCustomer = {
      firstName,
      lastName,
      phone,
      email,
    };

    updateCurrentUser(updatedCustomer);

    setCustomer(updatedCustomer);
    setSaved(true);
    setError("");

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  // =============================================
  // UPDATE USERNAME
  // =============================================

  const handleUsernameSubmit = async (event) => {
    event.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();

    const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,29}$/;

    setUsernameError("");
    setUsernameMessage("");

    if (!usernamePattern.test(normalizedUsername)) {
      setUsernameError(
        "Username must be 3–30 characters and contain only letters, numbers, dots, underscores or hyphens."
      );
      return;
    }

    if (normalizedUsername === currentUser?.username) {
      setUsernameError("This is already your username.");
      return;
    }

    try {
      setUsernameLoading(true);

      const response = await apiRequest("/users/username", {
        method: "PATCH",
        body: JSON.stringify({
          username: normalizedUsername,
        }),
      });

      if (!response.success || !response.user) {
        throw new Error(response.message || "Unable to update username.");
      }

      updateCurrentUser(response.user);
      setUsername(response.user.username || normalizedUsername);

      setUsernameMessage("Username updated successfully.");
    } catch (err) {
      setUsernameError(
        err.message || "Unable to update your username."
      );
    } finally {
      setUsernameLoading(false);
    }
  };

  // =============================================
  // UPLOAD PROFILE AVATAR
  // =============================================

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setAvatarError("");
    setAvatarMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Please select a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Profile images cannot exceed 2MB.");
      event.target.value = "";
      return;
    }

    try {
      setAvatarLoading(true);

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await uploadRequest(
        "/uploads/account-avatar",
        formData
      );

      if (!response.success || !response.user) {
        throw new Error(response.message || "Unable to upload profile image.");
      }

      updateCurrentUser(response.user);

      setAvatarMessage("Profile image updated successfully.");
    } catch (err) {
      setAvatarError(
        err.message || "Unable to upload your profile image."
      );
    } finally {
      setAvatarLoading(false);
      event.target.value = "";
    }
  };

  // =============================================
  // REMOVE PROFILE AVATAR
  // =============================================

  const handleRemoveAvatar = async () => {
    if (!currentUser?.avatar || removingAvatar) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove your profile image?"
    );

    if (!confirmed) return;

    setAvatarError("");
    setAvatarMessage("");

    try {
      setRemovingAvatar(true);

      const response = await apiRequest("/users/avatar", {
        method: "DELETE",
      });

      if (!response.success || !response.user) {
        throw new Error(response.message || "Unable to remove profile image.");
      }

      updateCurrentUser(response.user);

      setAvatarMessage("Profile image removed successfully.");
    } catch (err) {
      setAvatarError(
        err.message || "Unable to remove your profile image."
      );
    } finally {
      setRemovingAvatar(false);
    }
  };

  // =============================================
  // LOGOUT
  // =============================================

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // =============================================
  // PROFILE DISPLAY
  // =============================================

  const getInitials = () => {
    const firstInitial = customer.firstName
      ? customer.firstName.charAt(0)
      : "";

    const lastInitial = customer.lastName
      ? customer.lastName.charAt(0)
      : "";

    const initials =
      `${firstInitial}${lastInitial}`.toUpperCase();

    return initials || "AC";
  };

  const displayName =
    customer.firstName || customer.lastName
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : "ABS CUT Customer";

  return (
    <main className="account-page">

      {/* =========================================
          ACCOUNT HERO
      ========================================= */}

      <section className="account-header">

        <div>
          <p className="account-label">
            ABS CUT CUSTOMER AREA
          </p>

          <h1>My Account</h1>

          <p className="account-intro">
            Manage your personal information, orders,
            and custom fashion requests.
          </p>
        </div>

        <div className="account-profile-mini">

          <div className="account-avatar">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Your profile"
              />
            ) : (
              getInitials()
            )}
          </div>

          <div>
            <strong>{displayName}</strong>

            <span>
              {customer.email ||
                customer.phone ||
                "Customer Profile"}
            </span>
          </div>

        </div>

      </section>


      {/* =========================================
          MAIN ACCOUNT CONTENT
      ========================================= */}

      <section className="account-content">

        <div className="account-main-column">

          {/* =====================================
              PROFILE SETTINGS
          ===================================== */}

          <div className="account-card">

            <div className="account-card-header">

              <div>
                <p>ACCOUNT SETTINGS</p>
                <h2>Profile Settings</h2>

                <span>
                  Personalize your ABS CUT account with
                  a username and profile image.
                </span>
              </div>

              <div className="account-card-icon">
                ✦
              </div>

            </div>

            {/* PROFILE IMAGE */}

            <div className="account-avatar-settings">

              <div className="account-avatar-preview">

                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt="Profile avatar"
                  />
                ) : (
                  <span>{getInitials()}</span>
                )}

              </div>

              <div className="account-avatar-controls">

                <h3>Profile Picture</h3>

                <p>
                  Upload a JPG, PNG or WebP image.
                  Maximum file size: 2MB.
                </p>

                <label
                  className="account-avatar-upload-button"
                  htmlFor="account-avatar-upload"
                >
                  {avatarLoading
                    ? "UPLOADING..."
                    : currentUser?.avatar
                      ? "CHANGE PHOTO"
                      : "UPLOAD PHOTO"}
                </label>

                <input
                  id="account-avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={avatarLoading || removingAvatar}
                  hidden
                />

                {currentUser?.avatar && (
                  <button
                    type="button"
                    className="account-avatar-remove-button"
                    onClick={handleRemoveAvatar}
                    disabled={avatarLoading || removingAvatar}
                  >
                    {removingAvatar
                      ? "REMOVING..."
                      : "REMOVE PHOTO"}
                  </button>
                )}

              </div>

            </div>

            {avatarError && (
              <div className="account-error-message">
                <span>!</span>
                <p>{avatarError}</p>
              </div>
            )}

            {avatarMessage && (
              <div className="account-saved-message">
                <span>✓</span>
                {avatarMessage}
              </div>
            )}

            <div className="account-settings-divider" />

            {/* USERNAME */}

            <form
              className="account-form"
              onSubmit={handleUsernameSubmit}
            >

              <div className="account-form-group">

                <label htmlFor="account-username">
                  Username
                </label>

                <input
                  id="account-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setUsernameError("");
                    setUsernameMessage("");
                  }}
                  placeholder="Choose your username"
                  autoComplete="username"
                  maxLength={30}
                  disabled={usernameLoading}
                />

                <small>
                  Your username must contain 3–30 characters.
                  Letters, numbers, dots, underscores and hyphens
                  are allowed.
                </small>

              </div>

              {usernameError && (
                <div className="account-error-message">
                  <span>!</span>
                  <p>{usernameError}</p>
                </div>
              )}

              {usernameMessage && (
                <div className="account-saved-message">
                  <span>✓</span>
                  {usernameMessage}
                </div>
              )}

              <div className="account-form-footer">

                <button
                  type="submit"
                  className="save-account-button"
                  disabled={usernameLoading}
                >
                  <span>
                    {usernameLoading
                      ? "SAVING..."
                      : "SAVE USERNAME"}
                  </span>

                  {!usernameLoading && <span>→</span>}
                </button>

              </div>

            </form>

          </div>


          {/* =====================================
              PERSONAL INFORMATION
          ===================================== */}

          <div className="account-card">

            <div className="account-card-header">

              <div>
                <p>PROFILE</p>
                <h2>Personal Information</h2>

                <span>
                  Keep your details updated for faster
                  checkout and order communication.
                </span>
              </div>

              <div className="account-card-icon">
                ◉
              </div>

            </div>

            <form
              className="account-form"
              onSubmit={handleSubmit}
            >

              <div className="account-form-row">

                <div className="account-form-group">

                  <label htmlFor="account-firstName">
                    First Name
                  </label>

                  <input
                    id="account-firstName"
                    name="firstName"
                    type="text"
                    value={customer.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    autoComplete="given-name"
                  />

                </div>

                <div className="account-form-group">

                  <label htmlFor="account-lastName">
                    Last Name
                  </label>

                  <input
                    id="account-lastName"
                    name="lastName"
                    type="text"
                    value={customer.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    autoComplete="family-name"
                  />

                </div>

              </div>

              <div className="account-form-group">

                <label htmlFor="account-phone">
                  Phone Number
                </label>

                <input
                  id="account-phone"
                  name="phone"
                  type="tel"
                  value={customer.phone}
                  onChange={handleChange}
                  placeholder="08012345678"
                  autoComplete="tel"
                />

                <small>
                  We may use this number to contact you
                  about your order.
                </small>

              </div>

              <div className="account-form-group">

                <label htmlFor="account-email">
                  Email Address
                </label>

                <input
                  id="account-email"
                  name="email"
                  type="email"
                  value={customer.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                />

                <small>
                  Email is optional but useful for order
                  communication.
                </small>

              </div>

              {error && (
                <div className="account-error-message">
                  <span>!</span>
                  <p>{error}</p>
                </div>
              )}

              <div className="account-form-footer">

                <button
                  type="submit"
                  className="save-account-button"
                >
                  <span>
                    {saved ? "✓" : "SAVE INFORMATION"}
                  </span>

                  {!saved && <span>→</span>}
                </button>

                {saved && (
                  <div className="account-saved-message">
                    <span>✓</span>
                    Your information has been saved.
                  </div>
                )}

              </div>

            </form>

          </div>

        </div>


        {/* =====================================
            ACCOUNT SIDEBAR
        ===================================== */}

        <aside className="account-sidebar">

          <div className="account-sidebar-header">

            <p>MY ABS CUT</p>

            <h2>Quick Access</h2>

          </div>

          <Link to="/my-orders" className="account-menu-item">
            <div>
              <span className="account-menu-icon">📦</span>
              <span>
                <strong>My Orders</strong>
                <small>View and track your orders</small>
              </span>
            </div>
            <strong className="account-menu-arrow">→</strong>
          </Link>

          <Link to="/my-custom-orders" className="account-menu-item">
            <div>
              <span className="account-menu-icon">✦</span>
              <span>
                <strong>My Custom Orders</strong>
                <small>View your custom requests</small>
              </span>
            </div>
            <strong className="account-menu-arrow">→</strong>
          </Link>

          <Link to="/custom-order" className="account-menu-item">
            <div>
              <span className="account-menu-icon">✂</span>
              <span>
                <strong>Custom Order</strong>
                <small>Request a personalized outfit</small>
              </span>
            </div>
            <strong className="account-menu-arrow">→</strong>
          </Link>

          <Link to="/ai-outfit" className="account-menu-item">
            <div>
              <span className="account-menu-icon">🤖</span>
              <span>
                <strong>AI Outfit Preview</strong>
                <small>Preview your custom outfit with AI</small>
              </span>
            </div>
            <strong className="account-menu-arrow">→</strong>
          </Link>

          <Link to="/my-party-bookings" className="account-menu-item">
            <div>
              <span className="account-menu-icon">🤖</span>
              <span>
                <strong>My Booking Material</strong>
                <small>Check Your Booking</small>
              </span>
            </div>
            <strong className="account-menu-arrow">→</strong>
          </Link>

          <Link to="/shop" className="account-menu-item">
            <div>
              <span className="account-menu-icon">◆</span>
              <span>
                <strong>Shop Collection</strong>
                <small>Explore ABS CUT styles</small>
              </span>
            </div>
            <strong className="account-menu-arrow">→</strong>
          </Link>

          <Link to="/contact" className="account-menu-item">
            <div>
              <span className="account-menu-icon">◇</span>
              <span>
                <strong>Contact ABS CUT</strong>
                <small>Get in touch with ABS CUT</small>
              </span>
            </div>
            <strong className="account-menu-arrow">→</strong>
          </Link>

          <Link to="/academy" className="account-menu-item">
            <div>
              <span className="account-menu-icon">◇</span>
              <span>
                <strong>ABS Course</strong>
                <small>Start Learning Today</small>
              </span>
            </div>
            <strong className="account-menu-arrow">→</strong>
          </Link>

          <div className="account-sidebar-footer">
            <span>ABS CUT</span>
            <p>
              Native fashion, tailoring, embroidery
              and custom designs.
            </p>
          </div>

        </aside>

      </section>

    </main>
  );
}

export default Account;





