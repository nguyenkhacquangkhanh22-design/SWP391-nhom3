import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../Brand";

export type AdminTab =
  | "overview"
  | "users"
  | "owner-apps"
  | "kyc"
  | "equipments"
  | "equipment-status"
  | "memberships"
  | "settlements"
  | "handover-records"
  | "disputes"
  | "support"
  | "finance"
  | "contract-templates"
  | "audit-logs";

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  supportOpenCount?: number;
  equipmentPendingCount?: number;
  disputePendingCount?: number;
  kycPendingCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  supportOpenCount,
  equipmentPendingCount,
  disputePendingCount,
  kycPendingCount,
  isOpenMobile,
  onCloseMobile,
}: AdminSidebarProps) {
  const { user, signOut } = useAuth();

  const handleSelectTab = (tab: AdminTab) => {
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
            className={`admin-nav-item ${activeTab === "kyc" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("kyc")}
          >
            <span className="admin-nav-icon">🆔</span>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span>Duyệt KYC Renter (UC_A06)</span>
              {kycPendingCount !== undefined && kycPendingCount > 0 && (
                <span className="status-badge status-pending" style={{ padding: "1px 6px", fontSize: "0.7rem", marginLeft: "6px" }}>
                  {kycPendingCount}
                </span>
              )}
            </span>
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
            className={`admin-nav-item ${activeTab === "equipment-status" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("equipment-status")}
          >
            <span className="admin-nav-icon">🛠️</span>
            <span>Duyệt Bảo Dưỡng (UC_A27)</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "memberships" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("memberships")}
          >
            <span className="admin-nav-icon">⭐</span>
            <span>Gói Hội Viên Owner (UC_A28)</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "settlements" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("settlements")}
          >
            <span className="admin-nav-icon">💵</span>
            <span>Đối Soát Quyết Toán (UC_A29)</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "handover-records" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("handover-records")}
          >
            <span className="admin-nav-icon">📋</span>
            <span>Biên Bản Bàn Giao (UC_A30)</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "disputes" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("disputes")}
          >
            <span className="admin-nav-icon">⚖️</span>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span>Tranh chấp & Cọc (A15, A16)</span>
              {disputePendingCount !== undefined && disputePendingCount > 0 && (
                <span className="status-badge status-pending" style={{ padding: "1px 6px", fontSize: "0.7rem", marginLeft: "6px" }}>
                  {disputePendingCount}
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
            className={`admin-nav-item ${activeTab === "finance" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("finance")}
          >
            <span className="admin-nav-icon">🏛️</span>
            <span>Duyệt Ngân Hàng & Rút Tiền</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "contract-templates" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("contract-templates")}
          >
            <span className="admin-nav-icon">📜</span>
            <span>Mẫu Hợp Đồng (UC_A26)</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "audit-logs" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("audit-logs")}
          >
            <span className="admin-nav-icon">🛡️</span>
            <span>Nhật ký hệ thống (UC_A21)</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "overview" ? "is-active" : ""}`}
            onClick={() => handleSelectTab("overview")}
          >
            <span className="admin-nav-icon">📊</span>
            <span>Chỉ số hệ thống</span>
          </button>
          <Link to="/moderator" className="admin-nav-item" onClick={onCloseMobile}>
            <span className="admin-nav-icon">⚖️</span>
            <span>Điều phối Thuê & Hợp đồng</span>
          </Link>
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
