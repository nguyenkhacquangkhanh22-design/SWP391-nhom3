import { Navigate, Outlet, Link } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

export default function OwnerRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="app-loading">Đang tải quyền Người cho thuê...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = (user.role || "").toLowerCase();
  const isOwner = role === "owner" || role === "systemadmin";

  if (!isOwner) {
    return (
      <main className="auth-layout" style={{ alignItems: "center", padding: "40px 20px" }}>
        <div
          className="admin-container"
          style={{
            maxWidth: "600px",
            background: "var(--panel)",
            padding: "36px",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ fontSize: "1.6rem", marginBottom: "12px", color: "#fff" }}>
            Khu vực dành cho Người cho thuê (Owner)
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: "24px" }}>
            Tài khoản của bạn hiện có vai trò: <strong style={{ color: "var(--orange)" }}>{user.role}</strong>.
            Để bắt đầu đăng bài thiết bị và quản lý cho thuê, bạn cần đăng ký hồ sơ Owner và được System Admin phê duyệt.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link to="/register-owner" className="button button-primary">
              Đăng ký trở thành Owner ngay 🚀
            </Link>
            <Link to="/profile" className="button button-secondary">
              Về hồ sơ cá nhân
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <Outlet />;
}
