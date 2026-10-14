import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useAuth } from "../../app/AuthProvider";
import Feedback from "../../components/Feedback";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminStatsGrid from "../../components/admin/AdminStatsGrid";
import AdminUserTable, { type AdminUserRow } from "../../components/admin/AdminUserTable";
import { adminApi } from "../../services/adminApi";
import { ownerApi } from "../../services/ownerApi";
import type { AdminStats, AdminSupportTicket, TicketStats } from "../../types/admin";
import type { OwnerApplication } from "../../types/owner";

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [ownerApplications, setOwnerApplications] = useState<OwnerApplication[]>([]);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "owner-apps" | "support">("users");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Ticket Modal & Form state (UC_A17)
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyNextStatus, setReplyNextStatus] = useState("in_progress");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const [data, appsData, ticketsData] = await Promise.all([
        adminApi.getOverview(token),
        ownerApi.adminListOwnerApplications(token).catch(() => ({ applications: [] })),
        adminApi.listSupportTickets(token).catch(() => ({
          tickets: [],
          stats: { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 },
        })),
      ]);
      setStats(data.stats);
      setUsers(data.users);
      setOwnerApplications(appsData.applications || []);
      setSupportTickets(ticketsData.tickets || []);
      setTicketStats(ticketsData.stats || null);
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
      setSuccess(
        action === "approve"
          ? "Đã phê duyệt quyền Owner cho tài khoản."
          : "Đã từ chối hồ sơ đăng ký."
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác xét duyệt thất bại.");
    }
  }

  // UC_A17: Send reply to support ticket
  async function handleSendReply(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedTicket) return;
    if (!replyText.trim()) {
      setError("Vui lòng nhập nội dung câu trả lời.");
      return;
    }

    setIsSubmittingReply(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminApi.replySupportTicket(token, selectedTicket._id, {
        message: replyText.trim(),
        nextStatus: replyNextStatus,
      });

      setSuccess(`Đã phản hồi thành công yêu cầu #${selectedTicket.ticket_code}.`);
      setReplyText("");

      // Update selected ticket in view
      setSelectedTicket(res.ticket);

      // Refresh list
      const freshTickets = await adminApi.listSupportTickets(token);
      setSupportTickets(freshTickets.tickets || []);
      setTicketStats(freshTickets.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi phản hồi thất bại.");
    } finally {
      setIsSubmittingReply(false);
    }
  }

  // UC_A17: Quick status update for support ticket
  async function handleQuickStatusUpdate(ticketId: string, status: string) {
    if (!token) return;
    const note = prompt(
      `Ghi chú cập nhật trạng thái sang "${status.toUpperCase()}" (tùy chọn):`,
      `Đã chuyển trạng thái sang ${status}`
    );

    setError("");
    setSuccess("");
    try {
      const res = await adminApi.updateSupportTicketStatus(token, ticketId, {
        status,
        note: note || undefined,
      });
      setSuccess(`Đã chuyển trạng thái yêu cầu sang "${status}".`);
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket(res.ticket);
      }
      const freshTickets = await adminApi.listSupportTickets(token);
      setSupportTickets(freshTickets.tickets || []);
      setTicketStats(freshTickets.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
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

  const filteredTickets = useMemo(() => {
    return supportTickets.filter((t) => {
      const matchStatus =
        ticketStatusFilter === "all" || t.status === ticketStatusFilter;
      const matchSearch =
        !ticketSearch.trim() ||
        t.ticket_code.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        (t.user_id?.name && t.user_id.name.toLowerCase().includes(ticketSearch.toLowerCase())) ||
        (t.user_id?.email && t.user_id.email.toLowerCase().includes(ticketSearch.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [supportTickets, ticketStatusFilter, ticketSearch]);

  return (
    <div className="admin-layout">
      {/* Admin Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        supportOpenCount={ticketStats?.open || 0}
      />

      {/* Main Admin Area */}
      <main className="admin-main">
        {/* Top Navbar */}
        <header className="admin-topbar">
          <div>
            <span className="form-kicker">KHÔNG GIAN QUẢN TRỊ VIÊN</span>
            <h1 className="admin-page-title">
              {activeTab === "users"
                ? "Quản lý người dùng (UC_A03 - UC_A05)"
                : activeTab === "owner-apps"
                ? "Xét duyệt hồ sơ Owner (UC_O02, UC_A07)"
                : activeTab === "support"
                ? "Tiếp nhận & Xử lý yêu cầu hỗ trợ (UC_A17)"
                : "Chỉ số toàn hệ thống (UC_A02)"}
            </h1>
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

        {/* Owner Applications Review (UC_O02, UC_A07) */}
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

        {/* Support Tickets Management Section (UC_A17) */}
        {activeTab === "support" && (
          <div style={{ marginTop: "24px" }}>
            {/* KPI Badges */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              <div style={{ background: "#162032", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 18px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>Tổng số Ticket</span>
                <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: "#fff", marginTop: "4px" }}>{ticketStats?.total || 0}</div>
              </div>
              <div style={{ background: "#162032", border: "1px solid rgba(245, 158, 11, 0.4)", borderRadius: "10px", padding: "14px 18px" }}>
                <span style={{ fontSize: "0.75rem", color: "#fbbf24", textTransform: "uppercase" }}>⏳ Chờ xử lý (Open)</span>
                <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: "#fbbf24", marginTop: "4px" }}>{ticketStats?.open || 0}</div>
              </div>
              <div style={{ background: "#162032", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "10px", padding: "14px 18px" }}>
                <span style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "uppercase" }}>🔄 Đang xử lý</span>
                <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: "#38bdf8", marginTop: "4px" }}>{ticketStats?.in_progress || 0}</div>
              </div>
              <div style={{ background: "#162032", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "10px", padding: "14px 18px" }}>
                <span style={{ fontSize: "0.75rem", color: "#34d399", textTransform: "uppercase" }}>✅ Đã giải quyết</span>
                <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: "#34d399", marginTop: "4px" }}>{ticketStats?.resolved || 0}</div>
              </div>
              <div style={{ background: "#162032", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 18px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>🔒 Đã đóng</span>
                <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: "var(--muted)", marginTop: "4px" }}>{ticketStats?.closed || 0}</div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  className={`button button-compact ${ticketStatusFilter === "all" ? "button-primary" : "button-secondary"}`}
                  onClick={() => setTicketStatusFilter("all")}
                >
                  Tất cả ({ticketStats?.total || 0})
                </button>
                <button
                  className={`button button-compact ${ticketStatusFilter === "open" ? "button-primary" : "button-secondary"}`}
                  onClick={() => setTicketStatusFilter("open")}
                >
                  Chờ xử lý ({ticketStats?.open || 0})
                </button>
                <button
                  className={`button button-compact ${ticketStatusFilter === "in_progress" ? "button-primary" : "button-secondary"}`}
                  onClick={() => setTicketStatusFilter("in_progress")}
                >
                  Đang xử lý ({ticketStats?.in_progress || 0})
                </button>
                <button
                  className={`button button-compact ${ticketStatusFilter === "resolved" ? "button-primary" : "button-secondary"}`}
                  onClick={() => setTicketStatusFilter("resolved")}
                >
                  Đã giải quyết ({ticketStats?.resolved || 0})
                </button>
                <button
                  className={`button button-compact ${ticketStatusFilter === "closed" ? "button-primary" : "button-secondary"}`}
                  onClick={() => setTicketStatusFilter("closed")}
                >
                  Đã đóng ({ticketStats?.closed || 0})
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", minWidth: "280px" }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Tìm mã ticket, tiêu đề, người gửi..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  style={{ width: "100%", padding: "7px 12px", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Tickets Table */}
            <div className="admin-table-container">
              {filteredTickets.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <p style={{ color: "var(--muted)" }}>Không tìm thấy yêu cầu hỗ trợ nào phù hợp với bộ lọc.</p>
                </div>
              ) : (
                <table className="admin-user-table">
                  <thead>
                    <tr>
                      <th>Mã Ticket</th>
                      <th>Người gửi & Vai trò</th>
                      <th>Phân loại</th>
                      <th>Tiêu đề yêu cầu</th>
                      <th>Ưu tiên</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                      <th>Thao tác (UC_A17)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => (
                      <tr key={t._id}>
                        <td>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--orange)" }}>
                            {t.ticket_code}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "#fff" }}>{t.user_id?.name || "Người dùng"}</strong>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                            {t.user_id?.email || "—"}
                          </div>
                          <span
                            className="role-tag"
                            style={{
                              fontSize: "0.7rem",
                              marginTop: "4px",
                              display: "inline-block",
                              background: t.user_role === "rentalmoderator" ? "rgba(56, 189, 248, 0.15)" : "rgba(249, 115, 22, 0.15)",
                              color: t.user_role === "rentalmoderator" ? "#38bdf8" : "var(--orange)",
                            }}
                          >
                            {t.user_role === "rentalmoderator" ? "🛡️ Moderator" : t.user_role === "owner" ? "💼 Owner" : "👤 User"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>{t.category}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#fff", maxWidth: "260px", wordBreak: "break-word" }}>
                            {t.subject}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted)", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {t.message}
                          </div>
                        </td>
                        <td>
                          <span className={`priority-badge priority-${t.priority}`}>
                            {t.priority === "high" ? "🔥 Cao" : t.priority === "medium" ? "⚡ Vừa" : "Thấp"}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${t.status}`}>
                            {t.status === "open"
                              ? "⏳ Mở (Chờ xử lý)"
                              : t.status === "in_progress"
                              ? "🔄 Đang xử lý"
                              : t.status === "resolved"
                              ? "✅ Đã giải quyết"
                              : "🔒 Đã đóng"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                            {new Date(t.createdAt).toLocaleDateString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        </td>
                        <td>
                          <button
                            className="button button-primary button-compact"
                            style={{ fontSize: "0.78rem", padding: "5px 10px" }}
                            onClick={() => {
                              setSelectedTicket(t);
                              setReplyNextStatus(t.status === "open" ? "in_progress" : t.status);
                            }}
                          >
                            💬 Xử lý & Phản hồi
                            {t.replies && t.replies.length > 0 && (
                              <span style={{ marginLeft: "4px", opacity: 0.8 }}>({t.replies.length})</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Modal: View & Reply Support Ticket (UC_A17) */}
        {selectedTicket && (
          <div className="owner-modal-overlay" onClick={() => setSelectedTicket(null)}>
            <div className="owner-modal-card" style={{ maxWidth: "720px" }} onClick={(e) => e.stopPropagation()}>
              <div className="owner-modal-header">
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontFamily: "monospace", color: "var(--orange)", fontWeight: 700 }}>
                      #{selectedTicket.ticket_code}
                    </span>
                    <span className={`status-badge status-${selectedTicket.status}`}>
                      {selectedTicket.status === "open"
                        ? "Chờ xử lý"
                        : selectedTicket.status === "in_progress"
                        ? "Đang xử lý"
                        : selectedTicket.status === "resolved"
                        ? "Đã giải quyết"
                        : "Đã đóng"}
                    </span>
                    <span className={`priority-badge priority-${selectedTicket.priority}`}>
                      Ưu tiên {selectedTicket.priority}
                    </span>
                  </div>
                  <h3 style={{ margin: "6px 0 0 0", color: "#fff", fontSize: "1.2rem" }}>
                    {selectedTicket.subject}
                  </h3>
                </div>
                <button className="close-modal-btn" onClick={() => setSelectedTicket(null)}>✕</button>
              </div>

              {/* Ticket Meta Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#111827", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "var(--muted)" }}>Người gửi: </span>
                  <strong style={{ color: "#fff" }}>{selectedTicket.user_id?.name || "Người dùng"}</strong> ({selectedTicket.user_id?.email})
                </div>
                <div>
                  <span style={{ color: "var(--muted)" }}>Vai trò: </span>
                  <strong style={{ color: "var(--orange)" }}>{selectedTicket.user_role}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)" }}>Danh mục: </span>
                  <span style={{ color: "#fff" }}>{selectedTicket.category}</span>
                </div>
                <div>
                  <span style={{ color: "var(--muted)" }}>Thời gian tạo: </span>
                  <span style={{ color: "#fff" }}>{new Date(selectedTicket.createdAt).toLocaleString("vi-VN")}</span>
                </div>
              </div>

              {/* Thread Messages */}
              <div className="ticket-thread-container">
                {/* Original Message */}
                <div className="ticket-message-bubble is-original">
                  <div className="ticket-bubble-header">
                    <span className="ticket-sender-name">
                      👤 {selectedTicket.user_id?.name || "Người tạo yêu cầu"} ({selectedTicket.user_role})
                    </span>
                    <span className="ticket-bubble-time">
                      {new Date(selectedTicket.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <p className="ticket-bubble-text">{selectedTicket.message}</p>
                </div>

                {/* Follow-up Replies */}
                {selectedTicket.replies && selectedTicket.replies.map((reply, idx) => {
                  const isAdmin = (reply.sender_role || "").toLowerCase() === "systemadmin";
                  return (
                    <div
                      key={idx}
                      className={`ticket-message-bubble ${isAdmin ? "is-admin" : ""}`}
                    >
                      <div className="ticket-bubble-header">
                        <span className="ticket-sender-name">
                          {isAdmin ? "🛡️ Quản trị viên (Admin)" : `👤 ${reply.sender_name} (${reply.sender_role})`}
                        </span>
                        <span className="ticket-bubble-time">
                          {reply.created_at ? new Date(reply.created_at).toLocaleString("vi-VN") : "—"}
                        </span>
                      </div>
                      <p className="ticket-bubble-text">{reply.message}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply}>
                <div style={{ marginBottom: "14px" }}>
                  <label className="field-label" style={{ fontWeight: 600, color: "#fff" }}>
                    Phản hồi của Quản trị viên (UC_A17)
                  </label>
                  <textarea
                    className="input-field"
                    rows={4}
                    placeholder="Nhập nội dung giải đáp, hướng dẫn hoặc kết quả xử lý cho người dùng..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px", fontSize: "0.88rem" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Sau khi gửi, cập nhật trạng thái:</label>
                    <select
                      className="input-field"
                      style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                      value={replyNextStatus}
                      onChange={(e) => setReplyNextStatus(e.target.value)}
                    >
                      <option value="in_progress">🔄 Đang xử lý (In Progress)</option>
                      <option value="resolved">✅ Đã giải quyết (Resolved)</option>
                      <option value="closed">🔒 Đóng yêu cầu (Closed)</option>
                      <option value="open">⏳ Giữ nguyên Mở (Open)</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {selectedTicket.status !== "resolved" && (
                      <button
                        type="button"
                        className="button button-secondary button-compact"
                        style={{ fontSize: "0.8rem", color: "#34d399", borderColor: "rgba(52, 211, 153, 0.4)" }}
                        onClick={() => handleQuickStatusUpdate(selectedTicket._id, "resolved")}
                      >
                        ✓ Đánh dấu giải quyết
                      </button>
                    )}
                    <button
                      type="submit"
                      className="button button-primary button-compact"
                      style={{ fontSize: "0.82rem", padding: "6px 16px" }}
                      disabled={isSubmittingReply}
                    >
                      {isSubmittingReply ? "Đang gửi..." : "Gửi phản hồi 💬"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
