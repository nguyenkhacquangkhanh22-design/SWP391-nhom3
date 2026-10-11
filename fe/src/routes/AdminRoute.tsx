import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

export default function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="app-loading">Đang tải quyền quản trị...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = (user.role || "").toLowerCase() === "systemadmin";
  if (!isAdmin) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}
