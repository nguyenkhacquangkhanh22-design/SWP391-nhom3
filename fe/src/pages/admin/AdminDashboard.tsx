import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../app/AuthProvider";
import Feedback from "../../components/Feedback";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminStatsGrid from "../../components/admin/AdminStatsGrid";
import AdminUserTable, { type AdminUserRow } from "../../components/admin/AdminUserTable";
import { adminApi } from "../../services/adminApi";
import type { AdminStats } from "../../types/admin";

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "users">("users");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await adminApi.getOverview(token);
      setStats(data.stats);
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu quản trị.");
    } finally {
      setIsLoading(false);
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
        <AdminStatsGrid stats={stats} />

        {/* System Users Table */}
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
      </main>
    </div>
  );
}
