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
        <img
          src="/images/abs-logo.png"
          alt="ABS CUT Logo"
          height="50"
          width="50"
        />
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
