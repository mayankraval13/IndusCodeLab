import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";
import PageLoader from "./ui/PageLoader.jsx";

/**
 * Cosmetic guard only — it hides pages the user has no business seeing. Every
 * endpoint behind these pages enforces the same roles server-side.
 */
export default function RoleRoute({ roles }) {
  const { authUser, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return <PageLoader message="Verifying access..." />;
  }

  if (!authUser || !roles.includes(authUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
