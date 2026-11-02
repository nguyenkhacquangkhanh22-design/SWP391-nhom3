import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

export default function ModeratorRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="app-loading">Đang kiểm tra quyền Quản lý web...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const role = (user.role || "").toLowerCase().replace(/[\s_-]/g, "");
  if (role !== "rentalmoderator" && role !== "systemadmin" && role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
