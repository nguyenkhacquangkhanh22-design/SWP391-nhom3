import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./app/AuthProvider";
import AuthLayout from "./layouts/AuthLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminRoute from "./routes/AdminRoute";
import OwnerRoute from "./routes/OwnerRoute";
import OwnerPortal from "./pages/owner/OwnerPortal";
import RegisterOwnerPage from "./pages/RegisterOwnerPage";
import EquipmentMarketplacePage from "./pages/marketplace/EquipmentMarketplacePage";
import EquipmentDetailPage from "./pages/marketplace/EquipmentDetailPage";
import ModeratorPortal from "./pages/moderator/ModeratorPortal";
import ModeratorRoute from "./routes/ModeratorRoute";

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="app-loading">Đang tải tài khoản...</div>;
  }
  if (!user) {
    return <Navigate to="/equipments" replace />;
  }
  const role = (user.role || "").toLowerCase();
  if (role === "systemadmin") {
    return <Navigate to="/admin" replace />;
  }
  if (role === "owner") {
    return <Navigate to="/owner" replace />;
  }
  if (role.replace(/[\s_-]/g, "") === "rentalmoderator") {
    return <Navigate to="/moderator" replace />;
  }
  return <Navigate to="/profile" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Public marketplace routes */}
        <Route path="/equipments" element={<EquipmentMarketplacePage />} />
        <Route path="/equipments/:id" element={<EquipmentDetailPage />} />
        <Route path="/register-owner" element={<RegisterOwnerPage />} />

        {/* Owner portal protected routes */}
        <Route element={<OwnerRoute />}>
          <Route path="/owner" element={<OwnerPortal />} />
        </Route>

        {/* Rental Moderator protected routes */}
        <Route element={<ModeratorRoute />}>
          <Route path="/moderator" element={<ModeratorPortal />} />
        </Route>

        {/* System Admin protected routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
