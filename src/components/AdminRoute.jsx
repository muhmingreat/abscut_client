
import { Navigate, Outlet } from "react-router-dom";

import { useApp } from "../context/AppContext";


function AdminRoute() {
  const {
    currentUser,
    isAuthenticated,
    authLoading,
  } = useApp();

  // =========================================================
  // WAIT FOR AUTHENTICATION
  // =========================================================

  if (authLoading) {
    return (
      <main className="auth-loading-page">
        <div className="auth-loading-card">
          <div className="auth-loading-spinner"></div>

          <p>
            Loading your ABS CUT admin panel...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // NOT LOGGED IN
  // =========================================================

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // =========================================================
  // LOGGED IN BUT NOT ADMIN
  // =========================================================

  if (currentUser?.role !== "admin") {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // =========================================================
  // ADMIN
  // =========================================================

  return <Outlet />;
}

export default AdminRoute;

