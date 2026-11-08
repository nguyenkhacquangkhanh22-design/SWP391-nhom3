import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./app/AuthProvider";
import { ToastProvider } from "./context/ToastContext";
import AuthLayout from "./layouts/AuthLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import EquipmentListPage from "./pages/EquipmentListPage";
import EquipmentDetailPage from "./pages/EquipmentDetailPage";
import RentalHistoryPage from "./pages/RentalHistoryPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import AdminRoute from "./routes/AdminRoute";
import OwnerRoute from "./routes/OwnerRoute";
import OwnerPortal from "./pages/owner/OwnerPortal";
import RegisterOwnerPage from "./pages/RegisterOwnerPage";
import ModeratorPortal from "./pages/moderator/ModeratorPortal";
import ModeratorRoute from "./routes/ModeratorRoute";

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="app-loading">Đang tải tài khoản...</div>;
  }
  if (!user) {
    return <HomePage />;
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
  return <HomePage />;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Guest & Public routes */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/equipment" element={<EquipmentListPage />} />
          <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
          <Route path="/equipments" element={<EquipmentListPage />} />
          <Route path="/equipments/:id" element={<EquipmentDetailPage />} />
          <Route path="/register-owner" element={<RegisterOwnerPage />} />

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Renter & User routes */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/rentals/history" element={<RentalHistoryPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/cancel" element={<PaymentCancelPage />} />

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

          {/* Fallback */}
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
