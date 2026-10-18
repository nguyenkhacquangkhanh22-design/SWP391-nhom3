import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

export default function ModeratorRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="app-loading">Đang kiểm tra quyền kiểm duyệt...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if ((user.role || "").toLowerCase().replace(/[\s_-]/g, "") !== "rentalmoderator") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
