import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../Brand";

interface AdminSidebarProps {
  activeTab: "overview" | "users";
  setActiveTab: (tab: "overview" | "users") => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
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
          className={`admin-nav-item ${activeTab === "overview" ? "is-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <span className="admin-nav-icon">📊</span>
          <span>Chỉ số hệ thống</span>
        </button>
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
