import { NavLink, Link, useLocation } from "react-router-dom";
import "./AdminSidebar.css";

function AdminSidebar() {
  const location = useLocation();

  // Get the order ID from:
  // /admin/orders/:id
  const orderDetailsMatch = location.pathname.match(
    /^\/admin\/orders\/([^/]+)$/,
  );

  const orderId = orderDetailsMatch?.[1] || null;

  const navItems = [
    {
      path: "/admin",
      label: "Dashboard",
      icon: "▦",
      end: true,
    },

    {
      path: "/admin/orders",
      label: "All Orders",
      icon: "◈",
      end: true,
    },

    {
      path: "/admin/products",
      label: "Products",
      icon: "◇",
    },

    {
      path: "/admin/customers",
      label: "Customers",
      icon: "♙",
    },

    {
      path: "/admin/payments",
      label: "Payments",
      icon: "₦",
    },
    {
      path: "/admin/chat",
      label: "Chat",
      icon: "💬",
    },

    {
      path: "/admin/custom-orders",
      label: "Custom Orders",
      icon: "✂",
    },

    {
      path: "/admin/inventory",
      label: "Inventory",
      icon: "▣",
    },
    {
      path: "/admin/installment-settings",
      label: "Installment Settings",
      icon: "⚙",
    },

    {
      path: "/admin/reports",
      label: "Reports",
      icon: "⌁",
    },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-mark">A</div>

        <div>
          <strong>ABS CUT</strong>
          <span>ADMIN PANEL</span>
        </div>
      </div>

      <nav className="admin-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span>{item.icon}</span>

            {item.label}
          </NavLink>
        ))}

        {/* Single Order */}
        {orderId && (
          <NavLink
            to={`/admin/orders/${orderId}`}
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span>◈</span>
            Current Order
          </NavLink>
        )}
      </nav>

      <div className="admin-sidebar-footer">
        <Link to="/" className="admin-store-link">
          ← Back to Store
        </Link>
      </div>
    </aside>
  );
}

export default AdminSidebar;
