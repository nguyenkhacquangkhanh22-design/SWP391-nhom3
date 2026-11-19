import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type { AdminMembership } from "../../types/admin";
import type { AdminUserRow } from "./AdminUserTable";

interface AdminMembershipTabProps {
  token: string;
  users: AdminUserRow[];
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminMembershipTab({
  token,
  users,
  onError,
  onSuccess,
}: AdminMembershipTabProps) {
  const [memberships, setMemberships] = useState<AdminMembership[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    expired: number;
    pending: number;
    totalRevenue: number;
  }>({ total: 0, active: 0, expired: 0, pending: 0, totalRevenue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Grant Modal state
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [grantPlan, setGrantPlan] = useState("month_1");
  const [grantMonths, setGrantMonths] = useState(1);
  const [grantNote, setGrantNote] = useState("Kích hoạt đặc cách đối tác cho thuê máy uy tín");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMemberships = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listMemberships(token, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        plan: planFilter !== "all" ? planFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setMemberships(res.memberships || []);
      setStats(res.stats || { total: 0, active: 0, expired: 0, pending: 0, totalRevenue: 0 });
    } catch (err: any) {
      onError(err.message || "Không thể tải danh sách gói hội viên chủ máy.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, [token, statusFilter, planFilter]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwnerId) {
      onError("Vui lòng chọn một Chủ máy để cấp gói hội viên.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await adminApi.grantOwnerMembership(token, {
        owner_id: selectedOwnerId,
        plan: grantPlan,
        duration_months: Number(grantMonths),
        note: grantNote.trim(),
      });
      onSuccess(res.message);
      setIsGrantModalOpen(false);
      setSelectedOwnerId("");
      fetchMemberships();
    } catch (err: any) {
      onError(err.message || "Lỗi khi cấp gói hội viên.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="admin-status-badge is-active">Đang Hiệu Lực</span>;
      case "extended":
        return <span className="admin-status-badge is-active" style={{ background: "rgba(0, 168, 255, 0.15)", color: "#00a8ff" }}>Đã Gia Hạn</span>;
      case "expired":
        return <span className="admin-status-badge is-suspended">Hết Hạn (Tự ẩn bài)</span>;
      case "pending_payment":
        return <span className="admin-status-badge is-pending">Chờ Thanh Toán</span>;
      default:
        return <span className="admin-status-badge">{status}</span>;
    }
  };

  const getPlanLabel = (plan: string, isTrial?: boolean) => {
    if (isTrial || plan === "trial_7d") return "Dùng Thử 7 Ngày (Miễn phí)";
    if (plan === "month_1") return "Gói 1 Tháng";
    if (plan === "month_2") return "Gói 2 Tháng";
    if (plan === "month_3") return "Gói 3 Tháng (Tiết kiệm)";
    return plan;
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 className="admin-card-title">Quản Trị Gói Hội Viên Chủ Máy (UC_A28)</h2>
          <p className="admin-card-desc">
            Theo dõi trạng thái thanh toán, thời hạn gói hội viên của Chủ máy và cơ chế tự động mở khóa / ẩn bài đăng thiết bị.
          </p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => setIsGrantModalOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>⭐</span> Cấp / Gia Hạn Gói Đặc Cách
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Tổng Đăng Ký</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", marginTop: "4px" }}>{stats.total}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(46, 213, 115, 0.08)", border: "1px solid rgba(46, 213, 115, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#2ed573" }}>Hội Viên Hoạt Động</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2ed573", marginTop: "4px" }}>{stats.active}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ff4757" }}>Đã Hết Hạn</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ff4757", marginTop: "4px" }}>{stats.expired}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(0, 168, 255, 0.08)", border: "1px solid rgba(0, 168, 255, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#00a8ff" }}>Doanh Thu Gói Hội Viên</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#00a8ff", marginTop: "4px" }}>{formatCurrency(stats.totalRevenue)}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="admin-input"
          placeholder="Tìm theo tên chủ máy, email, mã tham chiếu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: "240px" }}
        />

        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "170px" }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="extended">Đã gia hạn</option>
          <option value="expired">Đã hết hạn</option>
          <option value="pending_payment">Chờ thanh toán</option>
        </select>

        <select
          className="admin-select"
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          style={{ width: "180px" }}
        >
          <option value="all">Tất cả gói</option>
          <option value="trial_7d">Dùng thử 7 ngày</option>
          <option value="month_1">Gói 1 tháng</option>
          <option value="month_2">Gói 2 tháng</option>
          <option value="month_3">Gói 3 tháng</option>
        </select>
      </div>

      {/* Memberships Table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Đang tải dữ liệu hội viên...
        </div>
      ) : memberships.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Không có bản ghi gói hội viên nào.
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Chủ Máy (Owner)</th>
                <th>Gói Đăng Ký</th>
                <th>Phí Hội Viên</th>
                <th>Trạng Thái</th>
                <th>Ngày Bắt Đầu</th>
                <th>Ngày Hết Hạn</th>
                <th>Ghi Chú / Mã Tham Chiếu</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.owner_id?.name || "Chủ máy"}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{m.owner_id?.email || "-"}</div>
                  </td>
                  <td>{getPlanLabel(m.plan, m.is_trial)}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: m.amount > 0 ? "var(--color-primary-light, #38bdf8)" : "var(--color-text-muted)" }}>
                      {m.amount > 0 ? formatCurrency(m.amount) : "Miễn phí (Trial/Grant)"}
                    </span>
                  </td>
                  <td>{getStatusBadge(m.status)}</td>
                  <td>{m.started_at ? new Date(m.started_at).toLocaleDateString("vi-VN") : "-"}</td>
                  <td>
                    {m.expires_at ? (
                      <span style={{ fontWeight: 500, color: new Date(m.expires_at) < new Date() ? "#ff4757" : "inherit" }}>
                        {new Date(m.expires_at).toLocaleDateString("vi-VN")}
                      </span>
                    ) : "-"}
                  </td>
                  <td>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.payment_reference || (m.order_code ? `Order #${m.order_code}` : "-")}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grant Membership Modal */}
      {isGrantModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsGrantModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Cấp / Gia Hạn Gói Hội Viên Cho Chủ Máy</h3>
              <button
                className="admin-modal-close"
                onClick={() => setIsGrantModalOpen(false)}
                style={{ background: "none", border: "none", color: "inherit", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGrant}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                  Chọn Chủ Máy (Owner) *
                </label>
                <select
                  className="admin-select"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  style={{ width: "100%" }}
                  required
                >
                  <option value="">-- Chọn Chủ máy từ danh sách người dùng --</option>
                  {users
                    .filter((u) => u.role === "owner" || u.role === "Owner")
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Gói Hội Viên</label>
                  <select
                    className="admin-select"
                    value={grantPlan}
                    onChange={(e) => setGrantPlan(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="month_1">Gói 1 Tháng</option>
                    <option value="month_2">Gói 2 Tháng</option>
                    <option value="month_3">Gói 3 Tháng</option>
                    <option value="trial_7d">Dùng Thử 7 Ngày</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Thời Gian (Tháng)</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={1}
                    max={12}
                    value={grantMonths}
                    onChange={(e) => setGrantMonths(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Lý Do Cấp / Ghi Chú Đặc Cách</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsGrantModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xử lý..." : "Xác Nhận Kích Hoạt Gói"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
