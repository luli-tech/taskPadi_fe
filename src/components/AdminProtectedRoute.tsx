import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check if user is admin by decoding token
  const token = localStorage.getItem("authToken");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role === "admin") {
        return <>{children}</>;
      }
    } catch {
      // If token can't be decoded, redirect to login
      return <Navigate to="/admin/login" replace />;
    }
  }

  // Not an admin, redirect to admin login
  return <Navigate to="/admin/login" replace />;
}
