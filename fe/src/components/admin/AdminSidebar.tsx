import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../Brand";

interface AdminSidebarProps {
  activeTab: "overview" | "users" | "owner-apps" | "support" | "equipments";
  setActiveTab: (tab: "overview" | "users" | "owner-apps" | "support" | "equipments") => void;
  supportOpenCount?: number;
  equipmentPendingCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  supportOpenCount,
  equipmentPendingCount,
  isOpenMobile,
  onCloseMobile,
}: AdminSidebarProps) {
  const { user, signOut } = useAuth();

  const handleSelectTab = (tab: "overview" | "users" | "owner-apps" | "support" | "equipments") => {
    setActiveTab(tab);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {isOpenMobile && (
        <div
          className="admin-sidebar-overlay"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${isOpenMobile ? "is-mobile-open" : ""}`}>
        <div className="admin-sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Brand compact />
            <span className="admin-badge-portal">SYSTEM ADMIN</span>
          </div>
          {/* Close button on mobile */}
          <button
            type="button"
            className="admin-sidebar-close-btn"
            onClick={onCloseMobile}
            aria-label="Đóng menu"
          >
            ✕
          </button>
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
            onClick={() => handleSelectTab("users")}
          >
            <span className="admin-nav-icon">👥</span>
            <span>Quản lý người dùng</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "owner-apps" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("owner-apps")}
          >
            <span className="admin-nav-icon">📋</span>
            <span>Duyệt đơn Owner (UC_O02)</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "equipments" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("equipments")}
          >
            <span className="admin-nav-icon">📹</span>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span>Duyệt bài đăng (UC_A11, A12)</span>
              {equipmentPendingCount !== undefined && equipmentPendingCount > 0 && (
                <span className="status-badge status-pending" style={{ padding: "1px 6px", fontSize: "0.7rem", marginLeft: "6px" }}>
                  {equipmentPendingCount}
                </span>
              )}
            </span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "support" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("support")}
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
            onClick={() => handleSelectTab("overview")}
          >
            <span className="admin-nav-icon">📊</span>
            <span>Chỉ số hệ thống</span>
          </button>
          <Link to="/owner" className="admin-nav-item" onClick={onCloseMobile}>
            <span className="admin-nav-icon">💼</span>
            <span>Cổng Owner</span>
          </Link>
          <Link to="/profile" className="admin-nav-item" onClick={onCloseMobile}>
            <span className="admin-nav-icon">👤</span>
            <span>Hồ sơ cá nhân</span>
          </Link>
        </nav>

        <div className="admin-sidebar-footer">
          <button
            className="button button-quiet admin-logout-btn"
            onClick={() => {
              onCloseMobile?.();
              void signOut();
            }}
          >
            Đăng xuất <span>↗</span>
          </button>
        </div>
      </aside>
    </>
  );
}
