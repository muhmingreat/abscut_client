import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useApp } from "../context/AppContext";


function ProtectedRoute() {
  const {
    isAuthenticated,
    authLoading,
  } = useApp();

  const location = useLocation();


  // =========================================================
  // WAIT FOR AUTHENTICATION TO LOAD
  // =========================================================

  if (authLoading) {
    return (
      <main className="auth-loading-page">
        <div className="auth-loading-card">
          <div className="auth-loading-spinner"></div>

          <p>
            Loading your ABS CUT account...
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
        state={{
          from: location.pathname,
        }}
      />
    );
  }


  // =========================================================
  // LOGGED IN
  // =========================================================

  return <Outlet />;
}

export default ProtectedRoute;