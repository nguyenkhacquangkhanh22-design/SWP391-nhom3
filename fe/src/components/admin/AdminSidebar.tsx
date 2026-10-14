import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../Brand";

interface AdminSidebarProps {
  activeTab: "overview" | "users" | "owner-apps" | "support";
  setActiveTab: (tab: "overview" | "users" | "owner-apps" | "support") => void;
  supportOpenCount?: number;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  supportOpenCount,
}: AdminSidebarProps) {
  const { user, signOut } = useAuth();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <Brand compact />
        <span className="admin-badge-portal">SYSTEM ADMIN</span>
      </div>

      <div className="admin-current-user">
        <div className="admin-user-avatar">
          {(user?.name || "A").slice(0, 2).toUpperCase()}
        </div>
        <div className="admin-user-info">
          <span className="admin-user-name">{user?.name}</span>
          <span className="admin-user-email">{user?.email}</span>
          <span className="admin-user-role-badge">{user?.role}</span>
        </div>
      </div>

      <nav className="admin-nav">
        <button
          className={`admin-nav-item ${activeTab === "users" ? "is-active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <span className="admin-nav-icon">👥</span>
          <span>Quản lý người dùng</span>
        </button>
        <button
          className={`admin-nav-item ${activeTab === "owner-apps" ? "is-active" : ""}`}
          onClick={() => setActiveTab("owner-apps")}
        >
          <span className="admin-nav-icon">📋</span>
          <span>Duyệt đơn Owner (UC_O02)</span>
        </button>
        <button
          className={`admin-nav-item ${activeTab === "support" ? "is-active" : ""}`}
          onClick={() => setActiveTab("support")}
        >
          <span className="admin-nav-icon">🎫</span>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <span>Hỗ trợ (UC_A17)</span>
            {supportOpenCount !== undefined && supportOpenCount > 0 && (
              <span className="status-badge status-pending" style={{ padding: "1px 6px", fontSize: "0.7rem", marginLeft: "6px" }}>
                {supportOpenCount}
              </span>
            )}
          </span>
        </button>
        <button
          className={`admin-nav-item ${activeTab === "overview" ? "is-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <span className="admin-nav-icon">📊</span>
          <span>Chỉ số hệ thống</span>
        </button>
        <Link to="/owner" className="admin-nav-item">
          <span className="admin-nav-icon">💼</span>
          <span>Cổng Owner</span>
        </Link>
        <Link to="/profile" className="admin-nav-item">
          <span className="admin-nav-icon">👤</span>
          <span>Hồ sơ cá nhân</span>
        </Link>
      </nav>

      <div className="admin-sidebar-footer">
        <button
          className="button button-quiet admin-logout-btn"
          onClick={() => void signOut()}
        >
          Đăng xuất <span>↗</span>
        </button>
      </div>
    </aside>
  );
}
