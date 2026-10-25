import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useCart, useAuth } from "../context/AppContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCartShopping,
  faBars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import "./Navbar.css";

function Navbar() {
  const { totalItems } = useCart();
  const { isAuthenticated, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `abs-navbar-link${isActive ? " active" : ""}`;

  return (
    <nav className="abs-navbar" aria-label="Main navigation">
      <NavLink
        to="/"
        className="abs-navbar-logo"
        aria-label="ABS CUT home"
        onClick={closeMenu}
      >
        <svg
  className="abs-logo-svg"
  viewBox="0 0 64 64"
  role="img"
  aria-label="ABS CUT logo"
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <linearGradient id="absLogoGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#f4df91" />
      <stop offset="50%" stopColor="#c9a227" />
      <stop offset="100%" stopColor="#8c6b13" />
    </linearGradient>

    <linearGradient id="absLogoGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#145640" />
      <stop offset="100%" stopColor="#0b2d23" />
    </linearGradient>
  </defs>

  <circle
    className="abs-logo-ring"
    cx="32"
    cy="32"
    r="28"
    fill="none"
    stroke="url(#absLogoGold)"
    strokeWidth="1.5"
  />


  <g className="abs-logo-orbit">
    <circle
      cx="32"
      cy="32"
      r="24"
      fill="none"
      stroke="#c9a227"
      strokeWidth="1.6"
      strokeDasharray="5 7 18 6"
      strokeLinecap="round"
    />

    <circle cx="32" cy="8" r="2.8" fill="#f4df91" />
  </g>

  
  <path
    d="M14 48 L31 14 L48 48"
    fill="none"
    stroke="url(#absLogoGreen)"
    strokeWidth="5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />

  
  <path
    d="M22 36 H40"
    fill="none"
    stroke="#0b3d2e"
    strokeWidth="3.5"
    strokeLinecap="round"
  />


  <path
    className="abs-logo-flourish"
    d="M17 45 Q30 30 47 40"
    fill="none"
    stroke="url(#absLogoGold)"
    strokeWidth="2.4"
    strokeLinecap="round"
  />


  <circle
    className="abs-logo-spark"
    cx="48"
    cy="40"
    r="2.2"
    fill="#c9a227"
  />
</svg>
        {/* <img
          src="/images/abs-logo.png"
          alt="ABS CUT Logo"
          height="50"
          width="50"
        /> */}
      </NavLink>

      <button
        type="button"
        className="abs-navbar-toggle"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="abs-navbar-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
      </button>

      <div
        id="abs-navbar-menu"
        className={`abs-navbar-menu${menuOpen ? " is-open" : ""}`}
      >
        <div className="abs-navbar-links">
          <NavLink to="/" className={linkClass} onClick={closeMenu}>
            Home
          </NavLink>

          <NavLink to="/shop" className={linkClass} onClick={closeMenu}>
            Shop
          </NavLink>

          {isAuthenticated && (
            <NavLink to="/my-orders" className={linkClass} onClick={closeMenu}>
              My Orders
            </NavLink>
          )}

          {isAuthenticated && (
            <NavLink to="/account" className={linkClass} onClick={closeMenu}>
              Account
            </NavLink>
          )}

          <NavLink to="/custom-order" className={linkClass} onClick={closeMenu}>
            Custom Order
          </NavLink>

          <NavLink to="/about" className={linkClass} onClick={closeMenu}>
            About
          </NavLink>

          <NavLink to="/contact" className={linkClass} onClick={closeMenu}>
            Contact
          </NavLink>

          {/* <NavLink to="/admin" className={linkClass} onClick={closeMenu}>
            Admin
          </NavLink> */}
          {isAuthenticated && currentUser?.role === "admin" && (
            <NavLink to="/admin" className={linkClass} onClick={closeMenu}>
              Admin
            </NavLink>
          )}
        </div>

        <div className="abs-navbar-actions">
          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `abs-navbar-cart${isActive ? " active" : ""}`
            }
            aria-label={`Shopping cart${
              totalItems > 0 ? `, ${totalItems} items` : ""
            }`}
            onClick={closeMenu}
          >
            <FontAwesomeIcon icon={faCartShopping} />
            {totalItems > 0 && (
              <span className="navbar-cart-badge">{totalItems}</span>
            )}
            {/* <span className="abs-navbar-cart-label">Cart</span> */}
          </NavLink>

          {isAuthenticated ? (
            <div className="abs-navbar-auth">
              <span className="abs-navbar-greeting">
                Hi, {currentUser?.firstName || "there"}
              </span>

              <button
                type="button"
                className="navbar-logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="abs-navbar-auth abs-navbar-guest">
              <NavLink
                to="/login"
                className="abs-navbar-login"
                onClick={closeMenu}
              >
                Login
              </NavLink>

              <NavLink
                to="/register"
                className="abs-navbar-register"
                onClick={closeMenu}
              >
                Register
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
