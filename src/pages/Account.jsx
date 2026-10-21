
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useApp } from "../context/AppContext";
import "./Account.css"

function Account() {
    const navigate = useNavigate();

  const {
    currentUser,
    logout,
    updateCurrentUser
  } = useApp();

  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  
  useEffect(() => {
  if (!currentUser) return;

  setCustomer({
    firstName: currentUser.firstName || "",
    lastName: currentUser.lastName || "",
    phone: currentUser.phone || "",
    email: currentUser.email || "",
  });
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
  
  //   const updatedCustomer = {
  //     firstName,
  //     lastName,
  //     phone,
  //     email,
  //   };

  //   localStorage.setItem(
  //     "absCutCustomer",
  //     JSON.stringify(updatedCustomer)
  //   );

  //   setCustomer(updatedCustomer);
  //   setSaved(true);
  //   setError("");

  //   setTimeout(() => {
  //     setSaved(false);
  //   }, 3000);
  // };

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
  }

  const handleLogout = () => {
  logout();
  navigate("/login");
};

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
            {getInitials()}
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


        {/* =====================================
            ACCOUNT SIDEBAR
        ===================================== */}

        <aside className="account-sidebar">

          <div className="account-sidebar-header">

            <p>MY ABS CUT</p>

            <h2>Quick Access</h2>

          </div>


          <Link
            to="/my-orders"
            className="account-menu-item"
          >
            <div>
              <span className="account-menu-icon">
                📦
              </span>

              <span>
                <strong>My Orders</strong>
                <small>
                  View and track your orders
                </small>
              </span>
            </div>

            <strong className="account-menu-arrow">
              →
            </strong>
          </Link>


          <Link
            to="/my-custom-orders"
            className="account-menu-item"
          >
            <div>
              <span className="account-menu-icon">
                ✦
              </span>

              <span>
                <strong>My Custom Orders</strong>
                <small>
                  View your custom requests
                </small>
              </span>
            </div>

            <strong className="account-menu-arrow">
              →
            </strong>
          </Link>


          <Link
            to="/custom-order"
            className="account-menu-item"
          >
            <div>
              <span className="account-menu-icon">
                ✂
              </span>

              <span>
                <strong>Custom Order</strong>
                <small>
                  Request a personalized outfit
                </small>
              </span>
            </div>

            <strong className="account-menu-arrow">
              →
            </strong>
          </Link>


          <Link
            to="/shop"
            className="account-menu-item"
          >
            <div>
              <span className="account-menu-icon">
                ◆
              </span>

              <span>
                <strong>Shop Collection</strong>
                <small>
                  Explore ABS CUT styles
                </small>
              </span>
            </div>

            <strong className="account-menu-arrow">
              →
            </strong>
          </Link>


          <Link
            to="/contact"
            className="account-menu-item"
          >
            <div>
              <span className="account-menu-icon">
                ◇
              </span>

              <span>
                <strong>Contact ABS CUT</strong>
                <small>
                  Get in touch with us
                </small>
              </span>
            </div>

            <strong className="account-menu-arrow">
              →
            </strong>
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



