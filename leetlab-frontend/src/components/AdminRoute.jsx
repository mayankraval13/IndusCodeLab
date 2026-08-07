import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";
import PageLoader from "./ui/PageLoader.jsx";

export default function AdminRoute() {
  const { authUser, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return <PageLoader message="Verifying access..." />;
  }

  if (!authUser || authUser.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
