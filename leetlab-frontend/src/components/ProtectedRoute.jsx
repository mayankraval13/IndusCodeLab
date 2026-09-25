import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";
import PageLoader from "./ui/PageLoader.jsx";

/**
 * Requires a session for everything nested under it. Signed-out visitors are
 * sent to login with the route they wanted, so they land there after signing in
 * instead of on the dashboard.
 */
export default function ProtectedRoute() {
  const { authUser, isCheckingAuth } = useAuthStore();
  const location = useLocation();

  if (isCheckingAuth && !authUser) {
    return <PageLoader message="Verifying access..." />;
  }

  if (!authUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
