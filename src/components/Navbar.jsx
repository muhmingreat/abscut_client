
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useCart, useAuth } from "../context/AppContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import NotificationBell from "./notifications/NotificationBell";

import {
  faCartShopping,
  faBars,
  faXmark,
  faUser,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

import "./Navbar.css";

function Navbar() {
  const { totalItems } = useCart();
  const { isAuthenticated, currentUser, logout } = useAuth();

  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
    setActiveDropdown(null);
  };

  const toggleDropdown = (name) => {
    setActiveDropdown((current) =>
      current === name ? null : name
    );
  };

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `abs-navbar-link${isActive ? " active" : ""}`;

  const avatarUrl =
    typeof currentUser?.avatar === "string"
      ? currentUser.avatar
      : currentUser?.avatar?.url || "";

  const displayName =
    currentUser?.username ||
    [currentUser?.firstName, currentUser?.lastName]
      .filter(Boolean)
      .join(" ") ||
    "User";

  const isAdmin = currentUser?.role === "admin";

  const Dropdown = ({ name, label, children }) => (
    <div
      className={`abs-nav-dropdown ${
        activeDropdown === name ? "is-open" : ""
      }`}
    >
      <button
        type="button"
        className="abs-nav-dropdown-trigger"
        aria-expanded={activeDropdown === name}
        onClick={() => toggleDropdown(name)}
      >
        {label}

        <FontAwesomeIcon
          icon={faChevronDown}
          className="abs-nav-chevron"
        />
      </button>

      {activeDropdown === name && (
        <div className="abs-nav-dropdown-menu">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <nav className="abs-navbar" aria-label="Main navigation">

      {/* BRAND LOGO */}
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
            <linearGradient
              id="absLogoGold"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#f4df91" />
              <stop offset="50%" stopColor="#c9a227" />
              <stop offset="100%" stopColor="#8c6b13" />
            </linearGradient>

            <linearGradient
              id="absLogoGreen"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
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
      </NavLink>

      {/* MOBILE MENU BUTTON */}
      <button
        type="button"
        className="abs-navbar-toggle"
        aria-label={
          menuOpen
            ? "Close navigation menu"
            : "Open navigation menu"
        }
        aria-expanded={menuOpen}
        aria-controls="abs-navbar-menu"
        onClick={() => {
          setMenuOpen((open) => !open);
          setActiveDropdown(null);
        }}
      >
        <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
      </button>

      {/* NAVIGATION */}
      <div
        id="abs-navbar-menu"
        className={`abs-navbar-menu${menuOpen ? " is-open" : ""}`}
      >
        <div className="abs-navbar-links">

          {/* HOME */}
          <NavLink
            to="/"
            className={linkClass}
            onClick={closeMenu}
          >
            Home
          </NavLink>

          {/* SHOPPING */}
          <Dropdown name="shopping" label="Shopping">
            <NavLink
              to="/shop"
              className={linkClass}
              onClick={closeMenu}
            >
              Shop
            </NavLink>

            <NavLink
              to="/cart"
              className={linkClass}
              onClick={closeMenu}
            >
              Shopping Cart
            </NavLink>

            {isAuthenticated && (
              <NavLink
                to="/my-orders"
                className={linkClass}
                onClick={closeMenu}
              >
                My Orders
              </NavLink>
            )}
          </Dropdown>

          {/* TAILORING SERVICES */}
          <Dropdown
            name="services"
            label="Tailoring Services"
          >
            <NavLink
              to="/custom-order"
              className={linkClass}
              onClick={closeMenu}
            >
              Place Custom Order
            </NavLink>

            {isAuthenticated && (
              <NavLink
                to="/my-custom-orders"
                className={linkClass}
                onClick={closeMenu}
              >
                My Custom Orders
              </NavLink>
            )}

            <NavLink
              to="/ai-measurement"
              className={linkClass}
              onClick={closeMenu}
            >
              AI Measurement
            </NavLink>

            <NavLink
              to="/ai-outfit"
              className={linkClass}
              onClick={closeMenu}
            >
              AI Outfit Preview
            </NavLink>
          </Dropdown>

          {/* FASHION ACADEMY */}
          <Dropdown
            name="academy"
            label="Fashion Academy"
          >
            <NavLink
              to="/academy"
              className={linkClass}
              onClick={closeMenu}
            >
              Explore Courses
            </NavLink>

            {isAuthenticated && (
              <>
                <NavLink
                  to="/academy/my-courses"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  My Learning
                </NavLink>

                <NavLink
                  to="/academy/certificates"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  My Certificates
                </NavLink>
              </>
            )}
          </Dropdown>

          {/* PARTY AND EVENTS */}
          <Dropdown
            name="party"
            label="Party & Events"
          >
            <NavLink
              to="/party-materials"
              className={linkClass}
              onClick={closeMenu}
            >
              Party Materials
            </NavLink>

            {isAuthenticated && (
              <NavLink
                to="/my-party-bookings"
                className={linkClass}
                onClick={closeMenu}
              >
                My Party Bookings
              </NavLink>
            )}
          </Dropdown>

          {/* EXPLORE */}
          <Dropdown name="explore" label="Explore">
            <NavLink
              to="/about"
              className={linkClass}
              onClick={closeMenu}
            >
              About ABS CUT
            </NavLink>

            <NavLink
              to="/activities"
              className={linkClass}
              onClick={closeMenu}
            >
              Daily Activities
            </NavLink>

            <NavLink
              to="/play"
              className={linkClass}
              onClick={closeMenu}
            >
              Games & Play
            </NavLink>

            <NavLink
              to="/contact"
              className={linkClass}
              onClick={closeMenu}
            >
              Contact Us
            </NavLink>
          </Dropdown>

          {/* ADMINISTRATION */}
          {isAuthenticated && isAdmin && (
            <Dropdown
              name="admin"
              label="Administration"
            >
              <NavLink
                to="/admin"
                className={linkClass}
                onClick={closeMenu}
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/admin/orders"
                className={linkClass}
                onClick={closeMenu}
              >
                Manage Orders
              </NavLink>

              <NavLink
                to="/admin/products"
                className={linkClass}
                onClick={closeMenu}
              >
                Manage Products
              </NavLink>

              <NavLink
                to="/admin/customers"
                className={linkClass}
                onClick={closeMenu}
              >
                Customers
              </NavLink>

              <NavLink
                to="/admin/custom-orders"
                className={linkClass}
                onClick={closeMenu}
              >
                Custom Orders
              </NavLink>

              <NavLink
                to="/admin/payments"
                className={linkClass}
                onClick={closeMenu}
              >
                Payments
              </NavLink>

              <NavLink
                to="/admin/inventory"
                className={linkClass}
                onClick={closeMenu}
              >
                Inventory
              </NavLink>

              <NavLink
                to="/admin/reports"
                className={linkClass}
                onClick={closeMenu}
              >
                Reports
              </NavLink>

              <NavLink
                to="/admin/delivery-zones"
                className={linkClass}
                onClick={closeMenu}
              >
                Delivery Zones
              </NavLink>

              <NavLink
                to="/admin/party-bookings"
                className={linkClass}
                onClick={closeMenu}
              >
                Party Bookings
              </NavLink>

              <NavLink
                to="/admin/academy/courses"
                className={linkClass}
                onClick={closeMenu}
              >
                Academy Courses
              </NavLink>

              <NavLink
                to="/admin/academy/live-classes"
                className={linkClass}
                onClick={closeMenu}
              >
                Academy Live Classes
              </NavLink>

              <NavLink
                to="/admin/academy/assignments"
                className={linkClass}
                onClick={closeMenu}
              >
                Academy Assignments
              </NavLink>

              <NavLink
                to="/admin/activities"
                className={linkClass}
                onClick={closeMenu}
              >
                Manage Activities
              </NavLink>

              <NavLink
                to="/admin/notifications"
                className={linkClass}
                onClick={closeMenu}
              >
                Notifications
              </NavLink>

              <NavLink
                to="/admin/installment-settings"
                className={linkClass}
                onClick={closeMenu}
              >
                Installment Settings
              </NavLink>

              <NavLink
                to="/admin/chat"
                className={linkClass}
                onClick={closeMenu}
              >
                Customer Support
              </NavLink>
            </Dropdown>
          )}

        </div>

        {/* RIGHT SIDE ACTIONS */}
        <div className="abs-navbar-actions">

          {/* NOTIFICATIONS */}
          {isAuthenticated && <NotificationBell />}

          {/* CART ICON */}
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
              <span className="navbar-cart-badge">
                {totalItems}
              </span>
            )}
          </NavLink>

          {/* USER PROFILE */}
          {isAuthenticated ? (
            <div className="abs-navbar-auth">

              <Dropdown
                name="profile"
                label={
                  <>
                    {avatarUrl && !avatarFailed ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="abs-navbar-avatar"
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <span className="abs-navbar-avatar-fallback">
                        <FontAwesomeIcon icon={faUser} />
                      </span>
                    )}

                    <span className="abs-navbar-username">
                      Hi, {displayName}
                    </span>
                  </>
                }
              >
                <NavLink
                  to="/account"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  My Account
                </NavLink>

                <NavLink
                  to="/notifications"
                  className={linkClass}
                  onClick={closeMenu}
                >
                  My Notifications
                </NavLink>

                <button
                  type="button"
                  className="abs-nav-dropdown-action"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </Dropdown>

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
