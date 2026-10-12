import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../app/AuthProvider";
import Feedback from "../../components/Feedback";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminStatsGrid from "../../components/admin/AdminStatsGrid";
import AdminUserTable, { type AdminUserRow } from "../../components/admin/AdminUserTable";
import { adminApi } from "../../services/adminApi";
import { ownerApi } from "../../services/ownerApi";
import type { AdminStats } from "../../types/admin";
import type { OwnerApplication } from "../../types/owner";

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [ownerApplications, setOwnerApplications] = useState<OwnerApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "owner-apps">("users");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const [data, appsData] = await Promise.all([
        adminApi.getOverview(token),
        ownerApi.adminListOwnerApplications(token).catch(() => ({ applications: [] })),
      ]);
      setStats(data.stats);
      setUsers(data.users);
      setOwnerApplications(appsData.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu quản trị.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReviewApplication(appId: string, action: "approve" | "reject") {
    if (!token) return;
    const note = prompt(
      action === "approve"
        ? "Ghi chú phê duyệt (tùy chọn):"
        : "Lý do từ chối hồ sơ đăng ký (bắt buộc):",
      action === "approve" ? "Hồ sơ hợp lệ, đã duyệt." : "Không đủ thông tin xác thực."
    );

    if (action === "reject" && !note) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }

    setError("");
    setSuccess("");
    try {
      await ownerApi.adminReviewOwnerApplication(token, appId, action, note || undefined);
      setSuccess(action === "approve" ? "Đã phê duyệt quyền Owner cho tài khoản." : "Đã từ chối hồ sơ đăng ký.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác xét duyệt thất bại.");
    }
  }

  async function handleToggleRole(targetUser: AdminUserRow) {
    if (!token) return;
    const isCurrentAdmin = (targetUser.role || "").toLowerCase() === "systemadmin";
    const nextRole = isCurrentAdmin ? "user" : "Systemadmin";

    if (!confirm(`Bạn có chắc muốn đổi quyền của "${targetUser.name}" thành "${nextRole}"?`)) {
      return;
    }

    setUpdatingId(targetUser._id);
    setError("");
    setSuccess("");
    try {
      await adminApi.updateUserRole(token, targetUser._id, nextRole);
      setSuccess(`Đã cập nhật quyền của ${targetUser.email} thành "${nextRole}".`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật quyền thất bại.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleStatus(targetUser: AdminUserRow) {
    if (!token) return;
    if (targetUser.email === user?.email) {
      setError("Bạn không thể thay đổi trạng thái tài khoản của chính mình.");
      return;
    }

    const nextStatus = targetUser.status === "active" ? "blocked" : "active";
    if (
      !confirm(
        `Bạn có chắc muốn chuyển trạng thái tài khoản "${targetUser.name}" sang "${nextStatus}"?`
      )
    ) {
      return;
    }

    setUpdatingId(targetUser._id);
    setError("");
    setSuccess("");
    try {
      await adminApi.updateUserStatus(token, targetUser._id, nextStatus);
      setSuccess(`Đã chuyển trạng thái của ${targetUser.email} thành "${nextStatus}".`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.User_Id && u.User_Id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole =
        roleFilter === "all" ||
        (u.role || "").toLowerCase() === roleFilter.toLowerCase();

      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="admin-layout">
      {/* Admin Sidebar Navigation */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Admin Area */}
      <main className="admin-main">
        {/* Top Navbar */}
        <header className="admin-topbar">
          <div>
            <span className="form-kicker">KHÔNG GIAN QUẢN TRỊ VIÊN</span>
            <h1 className="admin-page-title">Bảng điều khiển System Admin</h1>
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-status-pill">
              <span className="status-dot"></span>
              <span>Hệ thống Online</span>
            </div>
            <button
              className="button button-secondary button-compact"
              onClick={loadData}
              disabled={isLoading}
            >
              {isLoading ? "Đang tải..." : "Làm mới dữ liệu ⟳"}
            </button>
          </div>
        </header>

        {/* Feedback Messages */}
        <div className="admin-feedbacks">
          <Feedback message={error} />
          <Feedback message={success} type="success" />
        </div>

        {/* System KPI Metrics Grid */}
        {activeTab === "overview" && <AdminStatsGrid stats={stats} />}

        {/* System Users Table */}
        {activeTab === "users" && (
          <AdminUserTable
            users={filteredUsers}
            currentAdminEmail={user?.email}
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            updatingId={updatingId}
            onToggleRole={handleToggleRole}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {/* Owner Applications Review (UC_O02) */}
        {activeTab === "owner-apps" && (
          <div className="admin-table-container" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.15rem" }}>
                📋 Hồ sơ đăng ký Người cho thuê (Owner Applications - UC_O02)
              </h3>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Tổng cộng: {ownerApplications.length} hồ sơ
              </span>
            </div>

            {ownerApplications.length === 0 ? (
              <div className="owner-empty-state" style={{ padding: "40px", textAlign: "center" }}>
                <p style={{ color: "var(--muted)" }}>Hiện tại chưa có hồ sơ đăng ký Owner nào.</p>
              </div>
            ) : (
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>Người đăng ký</th>
                    <th>Thông tin liên hệ</th>
                    <th>CCCD / Địa chỉ</th>
                    <th>Tài khoản giải ngân</th>
                    <th>Trạng thái</th>
                    <th>Thao tác duyệt (UC_O02)</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerApplications.map((app) => (
                    <tr key={app._id}>
                      <td>
                        <strong style={{ color: "#fff" }}>{app.applicant_name}</strong>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{app.applicant_email}</div>
                        {app.shop_name && (
                          <div style={{ fontSize: "0.75rem", color: "var(--orange)" }}>
                            Studio: {app.shop_name}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>📞 {app.phone}</div>
                      </td>
                      <td>
                        <div>CCCD: <strong>{app.identity_card}</strong></div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{app.address}</div>
                        {app.identity_card_front && (
                          <a
                            href={app.identity_card_front}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.75rem", marginRight: "6px" }}
                          >
                            [Ảnh CCCD trước]
                          </a>
                        )}
                        {app.identity_card_back && (
                          <a
                            href={app.identity_card_back}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.75rem" }}
                          >
                            [Ảnh CCCD sau]
                          </a>
                        )}
                      </td>
                      <td>
                        <div style={{ color: "#fff" }}>{app.bank_name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          STK: {app.bank_account_number}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          Chủ TK: {app.bank_account_holder}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-${app.status}`}>
                          {app.status === "pending"
                            ? "⏳ Chờ duyệt"
                            : app.status === "approved"
                            ? "✅ Đã duyệt (Owner)"
                            : "❌ Đã từ chối"}
                        </span>
                        {app.admin_note && (
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "4px" }}>
                            {app.admin_note}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {app.status === "pending" && (
                            <>
                              <button
                                className="button button-primary button-compact"
                                style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                                onClick={() => handleReviewApplication(app._id, "approve")}
                              >
                                ✓ Phê duyệt
                              </button>
                              <button
                                className="button button-quiet button-compact"
                                style={{ fontSize: "0.75rem", padding: "4px 8px", color: "#ef4444" }}
                                onClick={() => handleReviewApplication(app._id, "reject")}
                              >
                                ✕ Từ chối
                              </button>
                            </>
                          )}
                          {app.status === "approved" && (
                            <span style={{ fontSize: "0.78rem", color: "#10b981" }}>
                              Đã cấp vai trò Owner
                            </span>
                          )}
                          {app.status === "rejected" && (
                            <button
                              className="button button-secondary button-compact"
                              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                              onClick={() => handleReviewApplication(app._id, "approve")}
                            >
                              Duyệt lại
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
