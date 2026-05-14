import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

export function AuthGuard() {
  const { isAuthenticated, initialized } = useAuth();

  if (!initialized) {
    return <div className="container">Validando sesión...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AdminGuard() {
  const { role } = useAuth();

  if (role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

