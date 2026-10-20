import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useAuth } from "../../app/AuthProvider";
import Feedback from "../../components/Feedback";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminStatsGrid from "../../components/admin/AdminStatsGrid";
import AdminUserTable, { type AdminUserRow } from "../../components/admin/AdminUserTable";
import Brand from "../../components/Brand";
import { adminApi } from "../../services/adminApi";
import { ownerApi } from "../../services/ownerApi";
import { getSocket } from "../../services/socket";
import type {
  AdminStats,
  AdminSupportTicket,
  TicketStats,
  AdminEquipment,
  AdminEquipmentStats,
} from "../../types/admin";
import type { OwnerApplication } from "../../types/owner";

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [ownerApplications, setOwnerApplications] = useState<OwnerApplication[]>([]);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [equipments, setEquipments] = useState<AdminEquipment[]>([]);
  const [equipmentStats, setEquipmentStats] = useState<AdminEquipmentStats | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "owner-apps" | "support" | "equipments">("users");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Equipment filters & Modals (UC_A11 & UC_A12)
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentApprovalFilter, setEquipmentApprovalFilter] = useState("all");
  const [equipmentVisibilityFilter, setEquipmentVisibilityFilter] = useState("all");
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState<AdminEquipment | null>(null);
  const [approvalModal, setApprovalModal] = useState<{
    equipment: AdminEquipment;
    targetStatus: "approved" | "rejected";
    reason: string;
  } | null>(null);
  const [visibilityModal, setVisibilityModal] = useState<{
    equipment: AdminEquipment;
    targetVisibility: "published" | "hidden";
    reason: string;
  } | null>(null);
  const [isSubmittingEquipmentAction, setIsSubmittingEquipmentAction] = useState(false);

  // Ticket Modal & Form state (UC_A17)
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyNextStatus, setReplyNextStatus] = useState("in_progress");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Custom Status Modal state (replacing browser prompt)
  const [statusModal, setStatusModal] = useState<{
    ticketId: string;
    ticketCode: string;
    targetStatus: string;
    note: string;
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  // Realtime Socket.IO Listeners
  useEffect(() => {
    const socket = getSocket();

    const handleTicketCreated = (data: { ticket: AdminSupportTicket; message?: string }) => {
      if (!data?.ticket) return;
      setSupportTickets((prev) => {
        if (prev.some((t) => t._id === data.ticket._id)) return prev;
        return [data.ticket, ...prev];
      });
      setTicketStats((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          total: prev.total + 1,
          open: prev.open + 1,
        };
      });
      setSuccess(data.message || `🔔 Yêu cầu hỗ trợ mới #${data.ticket.ticket_code} vừa được gửi lên!`);
    };

    const handleTicketReplied = (data: { ticketId: string; ticket: AdminSupportTicket }) => {
      if (!data?.ticket) return;
      setSupportTickets((prev) =>
        prev.map((t) => (t._id === data.ticket._id ? data.ticket : t))
      );
      setSelectedTicket((cur) => (cur && cur._id === data.ticket._id ? data.ticket : cur));
    };

    const handleTicketStatusUpdated = (data: { ticketId: string; status: string; ticket: AdminSupportTicket }) => {
      if (!data?.ticket) return;
      setSupportTickets((prev) =>
        prev.map((t) => (t._id === data.ticket._id ? data.ticket : t))
      );
      setSelectedTicket((cur) => (cur && cur._id === data.ticket._id ? data.ticket : cur));
      if (token) {
        adminApi.listSupportTickets(token).then((res) => {
          if (res.stats) setTicketStats(res.stats);
        }).catch(() => {});
      }
    };

    const handleEquipmentCreated = (data: { equipment: AdminEquipment; message?: string }) => {
      if (!data?.equipment) return;
      setEquipments((prev) => {
        if (prev.some((e) => e._id === data.equipment._id)) return prev;
        return [data.equipment, ...prev];
      });
      setEquipmentStats((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          total: prev.total + 1,
          pending: prev.pending + 1,
        };
      });
      setSuccess(data.message || `🔔 Bài đăng thiết bị mới "${data.equipment.title}" vừa được gửi lên chờ duyệt!`);
    };

    const handleEquipmentModerated = (data: { equipment: AdminEquipment; action: string }) => {
      if (!data?.equipment) return;
      setEquipments((prev) =>
        prev.map((e) => (e._id === data.equipment._id ? data.equipment : e))
      );
      setSelectedEquipment((cur) => (cur && cur._id === data.equipment._id ? data.equipment : cur));
      if (token) {
        adminApi.listEquipments(token).then((res) => {
          if (res.stats) setEquipmentStats(res.stats);
        }).catch(() => {});
      }
    };

    const handleEquipmentVisibilityChanged = (data: { equipment: AdminEquipment; visibility: string }) => {
      if (!data?.equipment) return;
      setEquipments((prev) =>
        prev.map((e) => (e._id === data.equipment._id ? data.equipment : e))
      );
      setSelectedEquipment((cur) => (cur && cur._id === data.equipment._id ? data.equipment : cur));
      if (token) {
        adminApi.listEquipments(token).then((res) => {
          if (res.stats) setEquipmentStats(res.stats);
        }).catch(() => {});
      }
    };

    socket.on("ticket:created", handleTicketCreated);
    socket.on("ticket:replied", handleTicketReplied);
    socket.on("ticket:status_updated", handleTicketStatusUpdated);
    socket.on("equipment:created", handleEquipmentCreated);
    socket.on("equipment:moderated", handleEquipmentModerated);
    socket.on("equipment:visibility_changed", handleEquipmentVisibilityChanged);

    return () => {
      socket.off("ticket:created", handleTicketCreated);
      socket.off("ticket:replied", handleTicketReplied);
      socket.off("ticket:status_updated", handleTicketStatusUpdated);
      socket.off("equipment:created", handleEquipmentCreated);
      socket.off("equipment:moderated", handleEquipmentModerated);
      socket.off("equipment:visibility_changed", handleEquipmentVisibilityChanged);
    };
  }, [token]);

  async function loadData() {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const [data, appsData, ticketsData, eqData] = await Promise.all([
        adminApi.getOverview(token),
        ownerApi.adminListOwnerApplications(token).catch(() => ({ applications: [] })),
        adminApi.listSupportTickets(token).catch(() => ({
          tickets: [],
          stats: { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 },
        })),
        adminApi.listEquipments(token).catch(() => ({
          equipments: [],
          stats: { total: 0, pending: 0, approved: 0, rejected: 0, hidden: 0 },
        })),
      ]);
      setStats(data.stats);
      setUsers(data.users);
      setOwnerApplications(appsData.applications || []);
      setSupportTickets(ticketsData.tickets || []);
      setTicketStats(ticketsData.stats || null);
      setEquipments(eqData.equipments || []);
      setEquipmentStats(eqData.stats || null);
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

  // UC_A17: Open custom status update modal (replacing browser prompt)
  function handleOpenStatusModal(ticketId: string, ticketCode: string, targetStatus: string) {
    const defaultNote =
      targetStatus === "resolved"
        ? "Đã chuyển trạng thái sang resolved"
        : `Đã chuyển trạng thái sang ${targetStatus}`;
    setStatusModal({
      ticketId,
      ticketCode,
      targetStatus,
      note: defaultNote,
    });
  }

  // UC_A17: Confirm status update from custom modal
  async function handleConfirmStatusUpdate() {
    if (!token || !statusModal) return;
    setIsUpdatingStatus(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminApi.updateSupportTicketStatus(token, statusModal.ticketId, {
        status: statusModal.targetStatus,
        note: statusModal.note.trim() || undefined,
      });
      setSuccess(`Đã chuyển trạng thái yêu cầu #${statusModal.ticketCode} sang "${statusModal.targetStatus}".`);
      if (selectedTicket && selectedTicket._id === statusModal.ticketId) {
        setSelectedTicket(res.ticket);
      }
      const freshTickets = await adminApi.listSupportTickets(token);
      setSupportTickets(freshTickets.tickets || []);
      setTicketStats(freshTickets.stats || null);
      setStatusModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    } finally {
      setIsUpdatingStatus(false);
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

  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      const matchSearch =
        !equipmentSearch.trim() ||
        eq.title.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        (eq.brand && eq.brand.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
        (eq.category && eq.category.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
        (eq.owner_id?.name && eq.owner_id.name.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
        (eq.owner_id?.email && eq.owner_id.email.toLowerCase().includes(equipmentSearch.toLowerCase()));

      const matchApproval =
        equipmentApprovalFilter === "all" ||
        (equipmentApprovalFilter === "approved"
          ? eq.approval_status === "approved" || !eq.approval_status
          : eq.approval_status === equipmentApprovalFilter);

      const matchVisibility =
        equipmentVisibilityFilter === "all" || eq.visibility === equipmentVisibilityFilter;

      const matchCategory =
        equipmentCategoryFilter === "all" ||
        (eq.category && eq.category.toLowerCase() === equipmentCategoryFilter.toLowerCase());

      return matchSearch && matchApproval && matchVisibility && matchCategory;
    });
  }, [equipments, equipmentSearch, equipmentApprovalFilter, equipmentVisibilityFilter, equipmentCategoryFilter]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    equipments.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [equipments]);

  async function handleConfirmEquipmentApproval() {
    if (!token || !approvalModal) return;
    setIsSubmittingEquipmentAction(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminApi.reviewEquipmentApproval(
        token,
        approvalModal.equipment._id,
        {
          approval_status: approvalModal.targetStatus,
          rejection_reason: approvalModal.reason,
        }
      );
      setSuccess(res.message);
      setEquipments((prev) =>
        prev.map((e) => (e._id === res.equipment._id ? res.equipment : e))
      );
      if (selectedEquipment && selectedEquipment._id === res.equipment._id) {
        setSelectedEquipment(res.equipment);
      }
      setApprovalModal(null);
      const statsRes = await adminApi.listEquipments(token);
      if (statsRes.stats) setEquipmentStats(statsRes.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác phê duyệt thất bại.");
    } finally {
      setIsSubmittingEquipmentAction(false);
    }
  }

  async function handleConfirmEquipmentVisibility() {
    if (!token || !visibilityModal) return;
    setIsSubmittingEquipmentAction(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminApi.updateEquipmentVisibility(
        token,
        visibilityModal.equipment._id,
        {
          visibility: visibilityModal.targetVisibility,
          reason: visibilityModal.reason,
        }
      );
      setSuccess(res.message);
      setEquipments((prev) =>
        prev.map((e) => (e._id === res.equipment._id ? res.equipment : e))
      );
      if (selectedEquipment && selectedEquipment._id === res.equipment._id) {
        setSelectedEquipment(res.equipment);
      }
      setVisibilityModal(null);
      const statsRes = await adminApi.listEquipments(token);
      if (statsRes.stats) setEquipmentStats(statsRes.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác cập nhật hiển thị thất bại.");
    } finally {
      setIsSubmittingEquipmentAction(false);
    }
  }

  return (
    <div className="admin-layout">
      {/* Admin Sidebar Navigation */}
      {/* Top Mobile Header Bar (Only visible on Mobile/Tablet) */}
      <div className="admin-mobile-header">
        <button
          type="button"
          className="admin-hamburger-btn"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Mở menu quản trị"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        <div className="admin-mobile-brand">
          <Brand compact />
          <span className="admin-badge-portal">ADMIN</span>
        </div>

        <div
          className="admin-user-avatar"
          style={{ width: "34px", height: "34px", fontSize: "0.85rem" }}
          title={user?.name || "Admin"}
        >
          {(user?.name || "A").slice(0, 2).toUpperCase()}
        </div>
      </div>

      {/* Admin Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        supportOpenCount={ticketStats?.open || 0}
        equipmentPendingCount={equipmentStats?.pending || 0}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
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
                : activeTab === "equipments"
                ? "Kiểm duyệt & Quản lý bài đăng thiết bị (UC_A11, UC_A12)"
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
              style={{ width: "auto", minHeight: "unset" }}
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
          <section className="admin-card" style={{ marginTop: "20px" }}>
            <div className="admin-card-header" style={{ padding: "16px 20px" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", margin: 0, color: "#fff" }}>
                  📋 Hồ sơ đăng ký Người cho thuê (UC_O02)
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                  Tổng cộng: {ownerApplications.length} hồ sơ yêu cầu nâng cấp quyền.
                </p>
              </div>
            </div>

            <div className="admin-table-wrap">
              {ownerApplications.length === 0 ? (
                <div style={{ padding: "50px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>📭</div>
                  <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
                    Hiện tại chưa có hồ sơ đăng ký Owner nào cần xét duyệt.
                  </p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "200px" }}>Người đăng ký</th>
                      <th style={{ width: "130px" }}>Số điện thoại</th>
                      <th style={{ width: "220px" }}>CCCD / Địa chỉ</th>
                      <th style={{ width: "220px" }}>Tài khoản giải ngân</th>
                      <th style={{ width: "130px", textAlign: "center" }}>Trạng thái</th>
                      <th style={{ width: "170px", textAlign: "right" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerApplications.map((app) => (
                      <tr key={app._id}>
                        <td>
                          <strong style={{ color: "#fff" }}>{app.applicant_name}</strong>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{app.applicant_email}</div>
                          {app.shop_name && (
                            <div style={{ fontSize: "0.75rem", color: "var(--orange)", marginTop: "2px" }}>
                              Studio: {app.shop_name}
                            </div>
                          )}
                        </td>
                        <td>
                          <div>📞 {app.phone}</div>
                        </td>
                        <td>
                          <div>CCCD: <strong style={{ color: "#fff" }}>{app.identity_card}</strong></div>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>{app.address}</div>
                          <div style={{ marginTop: "4px", display: "flex", gap: "6px" }}>
                            {app.identity_card_front && (
                              <a
                                href={app.identity_card_front}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: "0.75rem", color: "var(--orange)" }}
                              >
                                [Ảnh CCCD trước]
                              </a>
                            )}
                            {app.identity_card_back && (
                              <a
                                href={app.identity_card_back}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: "0.75rem", color: "var(--orange)" }}
                              >
                                [Ảnh CCCD sau]
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: "#fff", fontWeight: 600 }}>{app.bank_name}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                            STK: <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>{app.bank_account_number}</span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                            Chủ TK: {app.bank_account_holder}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`status-badge status-${app.status}`}>
                            {app.status === "pending"
                              ? "⏳ Chờ duyệt"
                              : app.status === "approved"
                              ? "✅ Đã duyệt"
                              : "❌ Từ chối"}
                          </span>
                          {app.admin_note && (
                            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "4px" }}>
                              {app.admin_note}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            {app.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  className="button button-primary"
                                  style={{ fontSize: "0.78rem", padding: "5px 10px", width: "auto", minHeight: "unset", borderRadius: "6px" }}
                                  onClick={() => handleReviewApplication(app._id, "approve")}
                                >
                                  ✓ Duyệt
                                </button>
                                <button
                                  type="button"
                                  className="button button-quiet"
                                  style={{ fontSize: "0.78rem", padding: "5px 10px", color: "#ef4444", width: "auto", minHeight: "unset", borderRadius: "6px" }}
                                  onClick={() => handleReviewApplication(app._id, "reject")}
                                >
                                  ✕ Từ chối
                                </button>
                              </>
                            )}
                            {app.status === "approved" && (
                              <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600 }}>
                                Đã cấp quyền
                              </span>
                            )}
                            {app.status === "rejected" && (
                              <button
                                type="button"
                                className="button button-secondary"
                                style={{ fontSize: "0.78rem", padding: "5px 10px", width: "auto", minHeight: "unset", borderRadius: "6px" }}
                                onClick={() => handleReviewApplication(app._id, "approve")}
                              >
                                Xem xét lại
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
          </section>
        )}

        {/* Equipment Listings Moderation & Visibility Section (UC_A11 & UC_A12) */}
        {activeTab === "equipments" && (
          <div style={{ marginTop: "20px" }}>
            {/* KPI Badges with Click-to-Filter */}
            <div className="ticket-kpi-grid">
              <div
                className={`ticket-kpi-card ${equipmentApprovalFilter === "all" && equipmentVisibilityFilter === "all" ? "is-active" : ""}`}
                onClick={() => {
                  setEquipmentApprovalFilter("all");
                  setEquipmentVisibilityFilter("all");
                }}
                title="Bấm để xem tất cả bài đăng"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Tổng số bài đăng</span>
                  <span className="ticket-kpi-badge badge-all">TẤT CẢ</span>
                </div>
                <div className="ticket-kpi-value">{equipmentStats?.total ?? equipments.length}</div>
                <div className="ticket-kpi-sub">Toàn bộ thiết bị trên hệ thống</div>
              </div>

              <div
                className={`ticket-kpi-card ${equipmentApprovalFilter === "pending" ? "is-active" : ""}`}
                onClick={() => {
                  setEquipmentApprovalFilter("pending");
                  setEquipmentVisibilityFilter("all");
                }}
                title="Bấm để lọc bài đăng chờ duyệt"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Chờ xét duyệt (UC_A11)</span>
                  <span className="ticket-kpi-badge badge-open">CHỜ DUYỆT</span>
                </div>
                <div className="ticket-kpi-value" style={{ color: "#f97316" }}>
                  {equipmentStats?.pending ?? 0}
                </div>
                <div className="ticket-kpi-sub">Cần quản trị viên kiểm tra</div>
              </div>

              <div
                className={`ticket-kpi-card ${equipmentApprovalFilter === "approved" ? "is-active" : ""}`}
                onClick={() => {
                  setEquipmentApprovalFilter("approved");
                  setEquipmentVisibilityFilter("all");
                }}
                title="Bấm để lọc bài đăng đã phê duyệt"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Đã phê duyệt</span>
                  <span className="ticket-kpi-badge badge-resolved">ĐÃ DUYỆT</span>
                </div>
                <div className="ticket-kpi-value" style={{ color: "#10b981" }}>
                  {equipmentStats?.approved ?? 0}
                </div>
                <div className="ticket-kpi-sub">Đạt chuẩn hiển thị trên sàn</div>
              </div>

              <div
                className={`ticket-kpi-card ${equipmentApprovalFilter === "rejected" ? "is-active" : ""}`}
                onClick={() => {
                  setEquipmentApprovalFilter("rejected");
                  setEquipmentVisibilityFilter("all");
                }}
                title="Bấm để lọc bài đăng bị từ chối"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Bị từ chối</span>
                  <span className="ticket-kpi-badge badge-closed">TỪ CHỐI</span>
                </div>
                <div className="ticket-kpi-value" style={{ color: "#ef4444" }}>
                  {equipmentStats?.rejected ?? 0}
                </div>
                <div className="ticket-kpi-sub">Chưa đạt yêu cầu đăng tin</div>
              </div>

              <div
                className={`ticket-kpi-card ${equipmentVisibilityFilter === "hidden" ? "is-active" : ""}`}
                onClick={() => {
                  setEquipmentVisibilityFilter("hidden");
                  setEquipmentApprovalFilter("all");
                }}
                title="Bấm để lọc bài đăng đang bị ẩn"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Đang bị ẩn (UC_A12)</span>
                  <span className="ticket-kpi-badge" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}>ĐÃ ẨN</span>
                </div>
                <div className="ticket-kpi-value" style={{ color: "#f87171" }}>
                  {equipmentStats?.hidden ?? 0}
                </div>
                <div className="ticket-kpi-sub">Tạm ẩn do vi phạm sàn</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="admin-card" style={{ marginTop: "16px", padding: "16px 20px" }}>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1, minWidth: "280px" }}>
                  {/* Search box */}
                  <div className="ticket-search-box" style={{ minWidth: "240px", flex: 1 }}>
                    <span className="ticket-search-icon">🔍</span>
                    <input
                      type="text"
                      className="ticket-search-input"
                      placeholder="Tìm theo tên máy, hãng, người đăng, danh mục..."
                      value={equipmentSearch}
                      onChange={(e) => setEquipmentSearch(e.target.value)}
                    />
                    {equipmentSearch && (
                      <button
                        type="button"
                        className="ticket-search-clear"
                        onClick={() => setEquipmentSearch("")}
                        aria-label="Xóa tìm kiếm"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Approval Filter */}
                  <select
                    className="input-field"
                    style={{ width: "auto", minWidth: "150px", padding: "8px 12px", fontSize: "0.84rem" }}
                    value={equipmentApprovalFilter}
                    onChange={(e) => setEquipmentApprovalFilter(e.target.value)}
                  >
                    <option value="all">Tất cả duyệt</option>
                    <option value="pending">⏳ Chờ duyệt (Pending)</option>
                    <option value="approved">✓ Đã duyệt (Approved)</option>
                    <option value="rejected">✕ Bị từ chối (Rejected)</option>
                  </select>

                  {/* Visibility Filter */}
                  <select
                    className="input-field"
                    style={{ width: "auto", minWidth: "150px", padding: "8px 12px", fontSize: "0.84rem" }}
                    value={equipmentVisibilityFilter}
                    onChange={(e) => setEquipmentVisibilityFilter(e.target.value)}
                  >
                    <option value="all">Tất cả hiển thị</option>
                    <option value="published">👁️ Đang công khai</option>
                    <option value="hidden">🚫 Đang bị ẩn (Vi phạm)</option>
                  </select>

                  {/* Category Filter */}
                  {uniqueCategories.length > 0 && (
                    <select
                      className="input-field"
                      style={{ width: "auto", minWidth: "140px", padding: "8px 12px", fontSize: "0.84rem" }}
                      value={equipmentCategoryFilter}
                      onChange={(e) => setEquipmentCategoryFilter(e.target.value)}
                    >
                      <option value="all">Tất cả danh mục</option>
                      {uniqueCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ fontSize: "0.84rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                  Hiển thị: <strong style={{ color: "#fff" }}>{filteredEquipments.length}</strong> / {equipments.length} bài đăng
                </div>
              </div>
            </div>

            {/* Equipment Table */}
            <div className="admin-card" style={{ marginTop: "16px" }}>
              <div className="admin-card-header" style={{ padding: "16px 20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.05rem", margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📹 Danh sách bài đăng thiết bị toàn sàn</span>
                    {equipmentStats && equipmentStats.pending > 0 && (
                      <span className="status-badge status-pending" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                        {equipmentStats.pending} bài chờ duyệt
                      </span>
                    )}
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                    Quản lý quy trình kiểm duyệt bài đăng (UC_A11) và kiểm soát ẩn/khôi phục hiển thị vi phạm (UC_A12).
                  </p>
                </div>
              </div>

              <div className="admin-table-wrap">
                {filteredEquipments.length === 0 ? (
                  <div style={{ padding: "60px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "2.4rem", marginBottom: "8px" }}>📹</div>
                    <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.92rem" }}>
                      Không tìm thấy bài đăng thiết bị nào phù hợp với bộ lọc hiện tại.
                    </p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: "260px" }}>Thiết bị</th>
                        <th style={{ width: "180px" }}>Chủ sở hữu (Owner)</th>
                        <th style={{ width: "160px" }}>Giá thuê & Cọc</th>
                        <th style={{ width: "140px", textAlign: "center" }}>Trạng thái duyệt (UC_A11)</th>
                        <th style={{ width: "130px", textAlign: "center" }}>Hiển thị (UC_A12)</th>
                        <th style={{ width: "190px", textAlign: "right" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEquipments.map((eq) => {
                        const isPending = eq.approval_status === "pending";
                        const isApproved = eq.approval_status === "approved" || !eq.approval_status;
                        const isRejected = eq.approval_status === "rejected";
                        const isHidden = eq.visibility === "hidden";
                        const primaryImg = eq.images && eq.images.length > 0 ? eq.images[0] : "";

                        return (
                          <tr key={eq._id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                {primaryImg ? (
                                  <img
                                    src={primaryImg}
                                    alt={eq.title}
                                    style={{
                                      width: "48px",
                                      height: "48px",
                                      borderRadius: "8px",
                                      objectFit: "cover",
                                      border: "1px solid #293348",
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "48px",
                                      height: "48px",
                                      borderRadius: "8px",
                                      background: "#1e293b",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "1.2rem",
                                      flexShrink: 0,
                                    }}
                                  >
                                    📷
                                  </div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      color: "#fff",
                                      fontWeight: 600,
                                      fontSize: "0.88rem",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: "180px",
                                    }}
                                    title={eq.title}
                                  >
                                    {eq.title}
                                  </div>
                                  <div style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: "2px" }}>
                                    {eq.brand ? `${eq.brand} ` : ""}{eq.model_name ? `• ${eq.model_name}` : ""}
                                  </div>
                                  <div style={{ marginTop: "3px" }}>
                                    <span
                                      style={{
                                        display: "inline-block",
                                        background: "rgba(59, 130, 246, 0.15)",
                                        color: "#60a5fa",
                                        fontSize: "0.72rem",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {eq.category || "Khác"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.86rem" }}>
                                {eq.owner_id?.name || "Chủ máy"}
                              </div>
                              <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                                {eq.owner_id?.email || "—"}
                              </div>
                              {eq.owner_id?.phone && (
                                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                                  📞 {eq.owner_id.phone}
                                </div>
                              )}
                            </td>

                            <td>
                              <div style={{ color: "var(--orange)", fontWeight: 700, fontSize: "0.88rem" }}>
                                {new Intl.NumberFormat("vi-VN").format(eq.pricing?.price_per_day || 0)} đ/ngày
                              </div>
                              <div style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: "2px" }}>
                                Cọc: {new Intl.NumberFormat("vi-VN").format(eq.pricing?.deposit_amount || 0)} đ
                              </div>
                            </td>

                            <td style={{ textAlign: "center" }}>
                              {isPending && (
                                <span
                                  className="status-badge"
                                  style={{
                                    background: "rgba(249, 115, 22, 0.15)",
                                    color: "#f97316",
                                    border: "1px solid rgba(249, 115, 22, 0.3)",
                                    padding: "3px 8px",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  ⏳ Chờ duyệt
                                </span>
                              )}
                              {isApproved && (
                                <span
                                  className="status-badge"
                                  style={{
                                    background: "rgba(16, 185, 129, 0.15)",
                                    color: "#10b981",
                                    border: "1px solid rgba(16, 185, 129, 0.3)",
                                    padding: "3px 8px",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  ✓ Đã duyệt
                                </span>
                              )}
                              {isRejected && (
                                <div>
                                  <span
                                    className="status-badge"
                                    style={{
                                      background: "rgba(239, 68, 68, 0.15)",
                                      color: "#ef4444",
                                      border: "1px solid rgba(239, 68, 68, 0.3)",
                                      padding: "3px 8px",
                                      fontSize: "0.76rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    ✕ Bị từ chối
                                  </span>
                                  {eq.rejection_reason && (
                                    <div
                                      style={{
                                        fontSize: "0.72rem",
                                        color: "#f87171",
                                        marginTop: "4px",
                                        maxWidth: "140px",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                      title={eq.rejection_reason}
                                    >
                                      {eq.rejection_reason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            <td style={{ textAlign: "center" }}>
                              {isHidden ? (
                                <span
                                  className="status-badge"
                                  style={{
                                    background: "rgba(239, 68, 68, 0.15)",
                                    color: "#f87171",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    padding: "3px 8px",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                  }}
                                  title={eq.hidden_reason ? `Lý do ẩn: ${eq.hidden_reason}` : "Đang bị ẩn khỏi sàn"}
                                >
                                  🚫 Đã ẩn
                                </span>
                              ) : (
                                <span
                                  className="status-badge"
                                  style={{
                                    background: "rgba(59, 130, 246, 0.15)",
                                    color: "#60a5fa",
                                    border: "1px solid rgba(59, 130, 246, 0.3)",
                                    padding: "3px 8px",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  👁️ Công khai
                                </span>
                              )}
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                {/* Detail Button */}
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  style={{
                                    fontSize: "0.78rem",
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    width: "auto",
                                    minHeight: "unset",
                                  }}
                                  onClick={() => setSelectedEquipment(eq)}
                                  title="Xem chi tiết bài đăng"
                                >
                                  👁️ Chi tiết
                                </button>

                                {/* UC_A11: Quick Approve / Reject buttons for pending */}
                                {isPending && (
                                  <>
                                    <button
                                      type="button"
                                      className="button"
                                      style={{
                                        fontSize: "0.78rem",
                                        padding: "5px 10px",
                                        background: "#10b981",
                                        color: "#fff",
                                        borderRadius: "6px",
                                        width: "auto",
                                        minHeight: "unset",
                                      }}
                                      onClick={() =>
                                        setApprovalModal({
                                          equipment: eq,
                                          targetStatus: "approved",
                                          reason: "",
                                        })
                                      }
                                    >
                                      ✓ Duyệt
                                    </button>
                                    <button
                                      type="button"
                                      className="button button-quiet"
                                      style={{
                                        fontSize: "0.78rem",
                                        padding: "5px 10px",
                                        color: "#ef4444",
                                        borderRadius: "6px",
                                        width: "auto",
                                        minHeight: "unset",
                                      }}
                                      onClick={() =>
                                        setApprovalModal({
                                          equipment: eq,
                                          targetStatus: "rejected",
                                          reason: "",
                                        })
                                      }
                                    >
                                      ✕ Từ chối
                                    </button>
                                  </>
                                )}

                                {/* UC_A12: Hide / Restore buttons */}
                                {!isPending && (
                                  <>
                                    {!isHidden ? (
                                      <button
                                        type="button"
                                        className="button button-quiet"
                                        style={{
                                          fontSize: "0.78rem",
                                          padding: "5px 10px",
                                          color: "#f87171",
                                          borderRadius: "6px",
                                          width: "auto",
                                          minHeight: "unset",
                                        }}
                                        onClick={() =>
                                          setVisibilityModal({
                                            equipment: eq,
                                            targetVisibility: "hidden",
                                            reason: "",
                                          })
                                        }
                                        title="Ẩn bài đăng vi phạm khỏi sàn"
                                      >
                                        🚫 Ẩn bài
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="button button-secondary"
                                        style={{
                                          fontSize: "0.78rem",
                                          padding: "5px 10px",
                                          color: "#60a5fa",
                                          borderColor: "#3b82f6",
                                          borderRadius: "6px",
                                          width: "auto",
                                          minHeight: "unset",
                                        }}
                                        onClick={() =>
                                          setVisibilityModal({
                                            equipment: eq,
                                            targetVisibility: "published",
                                            reason: "",
                                          })
                                        }
                                        title="Khôi phục hiển thị công khai trên sàn"
                                      >
                                        ↩ Khôi phục
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Support Tickets Management Section (UC_A17) */}
        {activeTab === "support" && (
          <div style={{ marginTop: "20px" }}>
            {/* KPI Badges with Click-to-Filter */}
            <div className="ticket-kpi-grid">
              <div
                className={`ticket-kpi-card ${ticketStatusFilter === "all" ? "is-active" : ""}`}
                onClick={() => setTicketStatusFilter("all")}
                title="Bấm để xem tất cả ticket"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Tổng số Ticket</span>
                  <span style={{ fontSize: "1.1rem" }}>📋</span>
                </div>
                <div className="ticket-kpi-value" style={{ color: "#fff" }}>{ticketStats?.total || 0}</div>
              </div>

              <div
                className={`ticket-kpi-card ${ticketStatusFilter === "open" ? "is-active" : ""}`}
                style={{ borderColor: ticketStatusFilter === "open" ? "#fbbf24" : "rgba(245, 158, 11, 0.3)" }}
                onClick={() => setTicketStatusFilter("open")}
                title="Bấm để lọc ticket chờ xử lý"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "#fbbf24" }}>Chờ xử lý</span>
                  <span style={{ fontSize: "1.1rem" }}>⏳</span>
                </div>
                <div className="ticket-kpi-value" style={{ color: "#fbbf24" }}>{ticketStats?.open || 0}</div>
              </div>

              <div
                className={`ticket-kpi-card ${ticketStatusFilter === "in_progress" ? "is-active" : ""}`}
                style={{ borderColor: ticketStatusFilter === "in_progress" ? "#38bdf8" : "rgba(56, 189, 248, 0.3)" }}
                onClick={() => setTicketStatusFilter("in_progress")}
                title="Bấm để lọc ticket đang xử lý"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "#38bdf8" }}>Đang xử lý</span>
                  <span style={{ fontSize: "1.1rem" }}>🔄</span>
                </div>
                <div className="ticket-kpi-value" style={{ color: "#38bdf8" }}>{ticketStats?.in_progress || 0}</div>
              </div>

              <div
                className={`ticket-kpi-card ${ticketStatusFilter === "resolved" ? "is-active" : ""}`}
                style={{ borderColor: ticketStatusFilter === "resolved" ? "#34d399" : "rgba(16, 185, 129, 0.3)" }}
                onClick={() => setTicketStatusFilter("resolved")}
                title="Bấm để lọc ticket đã giải quyết"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "#34d399" }}>Đã giải quyết</span>
                  <span style={{ fontSize: "1.1rem" }}>✅</span>
                </div>
                <div className="ticket-kpi-value" style={{ color: "#34d399" }}>{ticketStats?.resolved || 0}</div>
              </div>

              <div
                className={`ticket-kpi-card ${ticketStatusFilter === "closed" ? "is-active" : ""}`}
                style={{ borderColor: ticketStatusFilter === "closed" ? "var(--muted)" : "rgba(148, 163, 184, 0.2)" }}
                onClick={() => setTicketStatusFilter("closed")}
                title="Bấm để lọc ticket đã đóng"
              >
                <div className="ticket-kpi-header">
                  <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Đã đóng</span>
                  <span style={{ fontSize: "1.1rem" }}>🔒</span>
                </div>
                <div className="ticket-kpi-value" style={{ color: "var(--muted)" }}>{ticketStats?.closed || 0}</div>
              </div>
            </div>

            {/* Filter Bar & Search Toolbar */}
            <div className="ticket-toolbar">
              <div className="ticket-filter-tabs">
                <button
                  type="button"
                  className={`ticket-tab-btn ${ticketStatusFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setTicketStatusFilter("all")}
                >
                  Tất cả
                  <span className="ticket-count-badge">{ticketStats?.total || 0}</span>
                </button>
                <button
                  type="button"
                  className={`ticket-tab-btn ${ticketStatusFilter === "open" ? "is-active" : ""}`}
                  onClick={() => setTicketStatusFilter("open")}
                >
                  ⏳ Chờ xử lý
                  <span className="ticket-count-badge">{ticketStats?.open || 0}</span>
                </button>
                <button
                  type="button"
                  className={`ticket-tab-btn ${ticketStatusFilter === "in_progress" ? "is-active" : ""}`}
                  onClick={() => setTicketStatusFilter("in_progress")}
                >
                  🔄 Đang xử lý
                  <span className="ticket-count-badge">{ticketStats?.in_progress || 0}</span>
                </button>
                <button
                  type="button"
                  className={`ticket-tab-btn ${ticketStatusFilter === "resolved" ? "is-active" : ""}`}
                  onClick={() => setTicketStatusFilter("resolved")}
                >
                  ✅ Đã giải quyết
                  <span className="ticket-count-badge">{ticketStats?.resolved || 0}</span>
                </button>
                <button
                  type="button"
                  className={`ticket-tab-btn ${ticketStatusFilter === "closed" ? "is-active" : ""}`}
                  onClick={() => setTicketStatusFilter("closed")}
                >
                  🔒 Đã đóng
                  <span className="ticket-count-badge">{ticketStats?.closed || 0}</span>
                </button>
              </div>

              <div className="ticket-search-box">
                <span className="ticket-search-icon">🔍</span>
                <input
                  type="text"
                  className="ticket-search-input"
                  placeholder="Tìm mã ticket, tiêu đề, người gửi..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                />
                {ticketSearch && (
                  <button
                    type="button"
                    className="ticket-search-clear"
                    onClick={() => setTicketSearch("")}
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Tickets Table Card */}
            <section className="admin-card" style={{ marginTop: 0 }}>
              <div className="admin-card-header" style={{ padding: "16px 20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", margin: 0, color: "#fff" }}>
                    Danh sách yêu cầu hỗ trợ ({filteredTickets.length})
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                    Quản trị viên tiếp nhận phản hồi, tư vấn và xử lý khiếu nại của khách hàng.
                  </p>
                </div>
              </div>

              <div className="admin-table-wrap">
                {filteredTickets.length === 0 ? (
                  <div style={{ padding: "50px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>📭</div>
                    <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
                      Không tìm thấy yêu cầu hỗ trợ nào phù hợp với bộ lọc hiện tại.
                    </p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: "120px" }}>Mã Ticket</th>
                        <th style={{ width: "220px" }}>Người gửi & Vai trò</th>
                        <th style={{ width: "140px" }}>Phân loại</th>
                        <th>Tiêu đề yêu cầu</th>
                        <th style={{ width: "100px", textAlign: "center" }}>Ưu tiên</th>
                        <th style={{ width: "140px", textAlign: "center" }}>Trạng thái</th>
                        <th style={{ width: "110px" }}>Thời gian</th>
                        <th style={{ width: "170px", textAlign: "right" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((t) => (
                        <tr key={t._id}>
                          <td>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                color: "var(--orange)",
                                background: "rgba(249, 115, 22, 0.1)",
                                border: "1px solid rgba(249, 115, 22, 0.25)",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                display: "inline-block",
                                fontSize: "0.82rem",
                              }}
                            >
                              {t.ticket_code}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <strong style={{ color: "#fff", fontSize: "0.88rem" }}>{t.user_id?.name || "Người dùng"}</strong>
                              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{t.user_id?.email || "—"}</span>
                              <span
                                className="role-tag"
                                style={{
                                  fontSize: "0.7rem",
                                  marginTop: "4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  width: "fit-content",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background:
                                    t.user_role === "rentalmoderator"
                                      ? "rgba(56, 189, 248, 0.15)"
                                      : t.user_role === "owner"
                                      ? "rgba(249, 115, 22, 0.15)"
                                      : "rgba(148, 163, 184, 0.15)",
                                  color:
                                    t.user_role === "rentalmoderator"
                                      ? "#38bdf8"
                                      : t.user_role === "owner"
                                      ? "var(--orange)"
                                      : "#94a3b8",
                                }}
                              >
                                {t.user_role === "rentalmoderator"
                                  ? "🛡️ Moderator"
                                  : t.user_role === "owner"
                                  ? "💼 Owner"
                                  : "👤 User"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "#cbd5e1",
                                background: "#1e293b",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                padding: "4px 9px",
                                borderRadius: "6px",
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t.category}
                            </span>
                          </td>
                          <td>
                            <div style={{ maxWidth: "280px" }}>
                              <div
                                style={{ fontWeight: 600, color: "#fff", fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                title={t.subject}
                              >
                                {t.subject}
                              </div>
                              <div
                                style={{ fontSize: "0.78rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "3px" }}
                                title={t.message}
                              >
                                {t.message}
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`priority-badge priority-${t.priority}`}>
                              {t.priority === "high" ? "🔥 Cao" : t.priority === "medium" ? "⚡ Vừa" : "Thấp"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`status-badge status-${t.status}`}>
                              {t.status === "open"
                                ? "⏳ Chờ xử lý"
                                : t.status === "in_progress"
                                ? "🔄 Đang xử lý"
                                : t.status === "resolved"
                                ? "✅ Đã giải quyết"
                                : "🔒 Đã đóng"}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                              <div style={{ color: "#cbd5e1" }}>
                                {new Date(t.createdAt).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </div>
                              <div style={{ fontSize: "0.74rem", marginTop: "2px" }}>
                                {new Date(t.createdAt).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="button button-primary"
                              style={{
                                fontSize: "0.8rem",
                                padding: "6px 14px",
                                minHeight: "unset",
                                width: "auto",
                                borderRadius: "8px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                              onClick={() => {
                                setSelectedTicket(t);
                                setReplyNextStatus(t.status === "open" ? "in_progress" : t.status);
                              }}
                            >
                              <span>💬 Xử lý & Phản hồi</span>
                              {t.replies && t.replies.length > 0 && (
                                <span
                                  style={{
                                    background: "rgba(0, 0, 0, 0.3)",
                                    padding: "1px 6px",
                                    borderRadius: "10px",
                                    fontSize: "0.72rem",
                                  }}
                                >
                                  {t.replies.length}
                                </span>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Modal: View & Reply Support Ticket (UC_A17) */}
        {selectedTicket && (
          <div className="owner-modal-overlay" onClick={() => setSelectedTicket(null)}>
            <div className="owner-modal-card" style={{ maxWidth: "740px" }} onClick={(e) => e.stopPropagation()}>
              <div className="owner-modal-header">
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: "var(--orange)",
                        fontWeight: 700,
                        background: "rgba(249, 115, 22, 0.1)",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      #{selectedTicket.ticket_code}
                    </span>
                    <span className={`status-badge status-${selectedTicket.status}`}>
                      {selectedTicket.status === "open"
                        ? "⏳ Chờ xử lý"
                        : selectedTicket.status === "in_progress"
                        ? "🔄 Đang xử lý"
                        : selectedTicket.status === "resolved"
                        ? "✅ Đã giải quyết"
                        : "🔒 Đã đóng"}
                    </span>
                    <span className={`priority-badge priority-${selectedTicket.priority}`}>
                      Ưu tiên {selectedTicket.priority === "high" ? "Cao" : selectedTicket.priority === "medium" ? "Vừa" : "Thấp"}
                    </span>
                  </div>
                  <h3 style={{ margin: "8px 0 0 0", color: "#fff", fontSize: "1.2rem" }}>
                    {selectedTicket.subject}
                  </h3>
                </div>
                <button className="close-modal-btn" onClick={() => setSelectedTicket(null)}>✕</button>
              </div>

              {/* Ticket Meta Info */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "10px",
                  background: "#111827",
                  border: "1px solid #1f293d",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  fontSize: "0.84rem",
                }}
              >
                <div>
                  <span style={{ color: "var(--muted)" }}>Người gửi: </span>
                  <strong style={{ color: "#fff" }}>{selectedTicket.user_id?.name || "Người dùng"}</strong>
                  <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}> ({selectedTicket.user_id?.email})</span>
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
                  <label className="field-label" style={{ fontWeight: 600, color: "#fff", marginBottom: "6px", display: "block" }}>
                    Phản hồi của Quản trị viên (UC_A17)
                  </label>
                  <textarea
                    className="input-field"
                    rows={4}
                    placeholder="Nhập nội dung giải đáp, hướng dẫn hoặc kết quả xử lý cho người dùng..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", fontSize: "0.88rem" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Sau khi gửi, cập nhật trạng thái:</label>
                    <select
                      className="input-field"
                      style={{ padding: "6px 12px", fontSize: "0.82rem", background: "#0f1623", border: "1px solid #293348", color: "#e8edf5", borderRadius: "8px" }}
                      value={replyNextStatus}
                      onChange={(e) => setReplyNextStatus(e.target.value)}
                    >
                      <option value="in_progress">🔄 Đang xử lý (In Progress)</option>
                      <option value="resolved">✅ Đã giải quyết (Resolved)</option>
                      <option value="closed">🔒 Đóng yêu cầu (Closed)</option>
                      <option value="open">⏳ Giữ nguyên Mở (Open)</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {selectedTicket.status !== "resolved" && (
                      <button
                        type="button"
                        className="button"
                        style={{
                          fontSize: "0.82rem",
                          color: "#34d399",
                          border: "1px solid rgba(52, 211, 153, 0.4)",
                          background: "rgba(52, 211, 153, 0.1)",
                          width: "auto",
                          minHeight: "unset",
                          padding: "7px 14px",
                          borderRadius: "8px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        onClick={() => handleOpenStatusModal(selectedTicket._id, selectedTicket.ticket_code, "resolved")}
                      >
                        ✓ Đánh dấu giải quyết
                      </button>
                    )}
                    <button
                      type="submit"
                      className="button button-primary"
                      style={{
                        fontSize: "0.82rem",
                        padding: "7px 18px",
                        width: "auto",
                        minHeight: "unset",
                        borderRadius: "8px",
                      }}
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

        {/* Custom Status Modal (Replaces browser prompt dialog) */}
        {statusModal && (
          <div
            className="owner-modal-overlay"
            style={{ zIndex: 120 }}
            onClick={() => !isUpdatingStatus && setStatusModal(null)}
          >
            <div
              className="owner-modal-card"
              style={{
                maxWidth: "500px",
                border:
                  statusModal.targetStatus === "resolved"
                    ? "1px solid rgba(52, 211, 153, 0.4)"
                    : "1px solid #354158",
                background: "#162032",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="owner-modal-header" style={{ marginBottom: "16px", paddingBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.3rem" }}>
                    {statusModal.targetStatus === "resolved" ? "✅" : "🔄"}
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#fff" }}>
                      {statusModal.targetStatus === "resolved"
                        ? "Xác nhận giải quyết yêu cầu"
                        : "Cập nhật trạng thái yêu cầu"}
                    </h3>
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "monospace" }}>
                      #{statusModal.ticketCode}
                    </span>
                  </div>
                </div>
                <button
                  className="close-modal-btn"
                  disabled={isUpdatingStatus}
                  onClick={() => setStatusModal(null)}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: "16px", fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                Bạn đang chuyển trạng thái ticket sang{" "}
                <strong
                  style={{
                    color:
                      statusModal.targetStatus === "resolved"
                        ? "#34d399"
                        : statusModal.targetStatus === "in_progress"
                        ? "#38bdf8"
                        : "var(--orange)",
                  }}
                >
                  {statusModal.targetStatus === "resolved"
                    ? "ĐÃ GIẢI QUYẾT (RESOLVED)"
                    : statusModal.targetStatus.toUpperCase()}
                </strong>.
                Người gửi sẽ nhận được thông báo cập nhật này.
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  className="field-label"
                  style={{ fontWeight: 600, color: "#fff", marginBottom: "8px", display: "block" }}
                >
                  Ghi chú cập nhật trạng thái (tùy chọn):
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={statusModal.note}
                  onChange={(e) => setStatusModal({ ...statusModal, note: e.target.value })}
                  placeholder="Nhập ghi chú cho người dùng hoặc lưu ý nội bộ..."
                  style={{ width: "100%", padding: "10px 12px", fontSize: "0.86rem", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{
                    width: "auto",
                    minHeight: "unset",
                    padding: "8px 16px",
                    fontSize: "0.84rem",
                    borderRadius: "8px",
                  }}
                  disabled={isUpdatingStatus}
                  onClick={() => setStatusModal(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="button"
                  style={{
                    width: "auto",
                    minHeight: "unset",
                    padding: "8px 20px",
                    fontSize: "0.84rem",
                    background: statusModal.targetStatus === "resolved" ? "#10b981" : "#f97316",
                    color: "#fff",
                    fontWeight: 600,
                    borderRadius: "8px",
                  }}
                  disabled={isUpdatingStatus}
                  onClick={handleConfirmStatusUpdate}
                >
                  {isUpdatingStatus ? "Đang lưu..." : "✓ Xác nhận cập nhật"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Detail Modal (UC_A11 & UC_A12) */}
        {selectedEquipment && (
          <div className="ticket-modal-backdrop" onClick={() => setSelectedEquipment(null)}>
            <div
              className="ticket-modal"
              style={{ maxWidth: "780px" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="ticket-modal-header" style={{ padding: "18px 24px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        background: "rgba(59, 130, 246, 0.2)",
                        color: "#60a5fa",
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: 600,
                      }}
                    >
                      {selectedEquipment.category || "Thiết bị"}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      Mã ID: #{selectedEquipment._id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <h3 style={{ margin: "6px 0 0", color: "#fff", fontSize: "1.2rem", fontWeight: 700 }}>
                    {selectedEquipment.title}
                  </h3>
                </div>
                <button
                  type="button"
                  className="ticket-modal-close"
                  onClick={() => setSelectedEquipment(null)}
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="ticket-modal-body" style={{ maxHeight: "calc(85vh - 140px)", overflowY: "auto", padding: "20px 24px" }}>
                {/* Images Carousel / Grid */}
                {selectedEquipment.images && selectedEquipment.images.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        overflowX: "auto",
                        paddingBottom: "8px",
                      }}
                    >
                      {selectedEquipment.images.map((img, idx) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noreferrer"
                          style={{ flexShrink: 0 }}
                        >
                          <img
                            src={img}
                            alt={`Ảnh ${idx + 1}`}
                            style={{
                              width: "160px",
                              height: "110px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              border: "1px solid #293348",
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Moderation Alerts if any */}
                {selectedEquipment.approval_status === "rejected" && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.86rem", marginBottom: "4px" }}>
                      ✕ Bài đăng này đã bị từ chối phê duyệt
                    </div>
                    <div style={{ color: "#fca5a5", fontSize: "0.82rem" }}>
                      Lý do từ chối: {selectedEquipment.rejection_reason || "Không đạt tiêu chuẩn kiểm duyệt."}
                    </div>
                  </div>
                )}

                {selectedEquipment.visibility === "hidden" && (
                  <div
                    style={{
                      background: "rgba(249, 115, 22, 0.12)",
                      border: "1px solid rgba(249, 115, 22, 0.3)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ color: "#f97316", fontWeight: 700, fontSize: "0.86rem", marginBottom: "4px" }}>
                      🚫 Bài đăng này đang bị tạm ẩn khỏi Marketplace (UC_A12)
                    </div>
                    <div style={{ color: "#fed7aa", fontSize: "0.82rem" }}>
                      Lý do ẩn vi phạm: {selectedEquipment.hidden_reason || "Tạm ẩn để điều chỉnh nội dung."}
                    </div>
                  </div>
                )}

                {/* Price and Deposit Stats Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ background: "#0f1623", border: "1px solid #293348", borderRadius: "8px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "0.74rem", color: "var(--muted)", textTransform: "uppercase" }}>Giá thuê ngày</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--orange)", marginTop: "4px" }}>
                      {new Intl.NumberFormat("vi-VN").format(selectedEquipment.pricing?.price_per_day || 0)} đ/ngày
                    </div>
                  </div>
                  <div style={{ background: "#0f1623", border: "1px solid #293348", borderRadius: "8px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "0.74rem", color: "var(--muted)", textTransform: "uppercase" }}>Tiền cọc thiết bị</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>
                      {new Intl.NumberFormat("vi-VN").format(selectedEquipment.pricing?.deposit_amount || 0)} đ
                    </div>
                  </div>
                  <div style={{ background: "#0f1623", border: "1px solid #293348", borderRadius: "8px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "0.74rem", color: "var(--muted)", textTransform: "uppercase" }}>Tình trạng ngoại quan</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff", marginTop: "4px" }}>
                      {selectedEquipment.condition || "Tốt (95%)"}
                    </div>
                  </div>
                  <div style={{ background: "#0f1623", border: "1px solid #293348", borderRadius: "8px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "0.74rem", color: "var(--muted)", textTransform: "uppercase" }}>Chủ sở hữu (Owner)</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff", marginTop: "4px" }}>
                      {selectedEquipment.owner_id?.name || "Chủ máy"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {selectedEquipment.owner_id?.email || ""}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedEquipment.description && (
                  <div style={{ marginBottom: "16px" }}>
                    <h4 style={{ color: "#fff", fontSize: "0.9rem", margin: "0 0 6px" }}>Mô tả chi tiết</h4>
                    <p style={{ color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                      {selectedEquipment.description}
                    </p>
                  </div>
                )}

                {/* Specifications */}
                {selectedEquipment.specifications && selectedEquipment.specifications.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <h4 style={{ color: "#fff", fontSize: "0.9rem", margin: "0 0 8px" }}>Thông số kỹ thuật</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                      {selectedEquipment.specifications.map((spec, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "#0f1623",
                            border: "1px solid #243048",
                            borderRadius: "6px",
                            padding: "6px 10px",
                            fontSize: "0.8rem",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ color: "var(--muted)" }}>{spec.key}:</span>
                          <strong style={{ color: "#fff" }}>{spec.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terms and Policy */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ background: "#0f1623", border: "1px solid #293348", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600, marginBottom: "4px" }}>
                      📜 ĐIỀU KHOẢN THUÊ
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                      {selectedEquipment.rental_terms || "Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị."}
                    </div>
                  </div>
                  <div style={{ background: "#0f1623", border: "1px solid #293348", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600, marginBottom: "4px" }}>
                      ⏱️ CHÍNH SÁCH HỦY ĐƠN
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                      {selectedEquipment.cancellation_policy || "Miễn phí hủy trước 24 giờ."}
                    </div>
                  </div>
                </div>

                {/* Action Buttons in Detail Modal */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    paddingTop: "14px",
                    borderTop: "1px solid #293348",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px" }}>
                    {/* UC_A11: Quick actions */}
                    {selectedEquipment.approval_status !== "approved" && (
                      <button
                        type="button"
                        className="button"
                        style={{
                          background: "#10b981",
                          color: "#fff",
                          width: "auto",
                          minHeight: "unset",
                          padding: "8px 16px",
                          fontSize: "0.82rem",
                          borderRadius: "6px",
                        }}
                        onClick={() => {
                          setApprovalModal({
                            equipment: selectedEquipment,
                            targetStatus: "approved",
                            reason: "",
                          });
                        }}
                      >
                        ✓ Phê duyệt bài đăng (UC_A11)
                      </button>
                    )}
                    {selectedEquipment.approval_status !== "rejected" && (
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{
                          color: "#ef4444",
                          width: "auto",
                          minHeight: "unset",
                          padding: "8px 16px",
                          fontSize: "0.82rem",
                          borderRadius: "6px",
                        }}
                        onClick={() => {
                          setApprovalModal({
                            equipment: selectedEquipment,
                            targetStatus: "rejected",
                            reason: "",
                          });
                        }}
                      >
                        ✕ Từ chối bài đăng
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {/* UC_A12: Hide / Restore */}
                    {selectedEquipment.visibility !== "hidden" ? (
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{
                          color: "#f87171",
                          width: "auto",
                          minHeight: "unset",
                          padding: "8px 16px",
                          fontSize: "0.82rem",
                          borderRadius: "6px",
                        }}
                        onClick={() => {
                          setVisibilityModal({
                            equipment: selectedEquipment,
                            targetVisibility: "hidden",
                            reason: "",
                          });
                        }}
                      >
                        🚫 Ẩn bài đăng vi phạm (UC_A12)
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{
                          color: "#60a5fa",
                          borderColor: "#3b82f6",
                          width: "auto",
                          minHeight: "unset",
                          padding: "8px 16px",
                          fontSize: "0.82rem",
                          borderRadius: "6px",
                        }}
                        onClick={() => {
                          setVisibilityModal({
                            equipment: selectedEquipment,
                            targetVisibility: "published",
                            reason: "",
                          });
                        }}
                      >
                        ↩ Khôi phục hiển thị
                      </button>
                    )}

                    <button
                      type="button"
                      className="button button-secondary"
                      style={{
                        width: "auto",
                        minHeight: "unset",
                        padding: "8px 16px",
                        fontSize: "0.82rem",
                        borderRadius: "6px",
                      }}
                      onClick={() => setSelectedEquipment(null)}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal (UC_A11) */}
        {approvalModal && (
          <div className="ticket-modal-backdrop" onClick={() => !isSubmittingEquipmentAction && setApprovalModal(null)}>
            <div
              className="ticket-modal"
              style={{ maxWidth: "520px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ticket-modal-header" style={{ padding: "16px 20px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#fff", fontSize: "1.05rem", fontWeight: 700 }}>
                    {approvalModal.targetStatus === "approved"
                      ? "✓ Phê duyệt bài đăng thiết bị (UC_A11)"
                      : "✕ Từ chối bài đăng thiết bị (UC_A11)"}
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
                    Thiết bị: <strong style={{ color: "#fff" }}>{approvalModal.equipment.title}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="ticket-modal-close"
                  onClick={() => !isSubmittingEquipmentAction && setApprovalModal(null)}
                  disabled={isSubmittingEquipmentAction}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "20px" }}>
                {approvalModal.targetStatus === "approved" ? (
                  <p style={{ color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 16px" }}>
                    Bạn có chắc chắn muốn <strong style={{ color: "#10b981" }}>phê duyệt</strong> bài đăng này? Sau khi duyệt, thiết bị sẽ lập tức hiển thị công khai trên Marketplace để khách thuê có thể tìm kiếm và đặt hàng.
                  </p>
                ) : (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", color: "#fff", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                      Lý do từ chối bài đăng (Bắt buộc):
                    </label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="Ví dụ: Hình ảnh mờ không rõ nét, mô tả thiếu thông số kỹ thuật, giá cọc không đúng quy định..."
                      value={approvalModal.reason}
                      onChange={(e) => setApprovalModal({ ...approvalModal, reason: e.target.value })}
                      style={{ width: "100%", padding: "10px", fontSize: "0.85rem" }}
                      autoFocus
                    />
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ width: "auto", minHeight: "unset", padding: "8px 16px", fontSize: "0.84rem", borderRadius: "6px" }}
                    onClick={() => setApprovalModal(null)}
                    disabled={isSubmittingEquipmentAction}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="button"
                    style={{
                      width: "auto",
                      minHeight: "unset",
                      padding: "8px 20px",
                      fontSize: "0.84rem",
                      borderRadius: "6px",
                      background: approvalModal.targetStatus === "approved" ? "#10b981" : "#ef4444",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                    onClick={handleConfirmEquipmentApproval}
                    disabled={
                      isSubmittingEquipmentAction ||
                      (approvalModal.targetStatus === "rejected" && !approvalModal.reason.trim())
                    }
                  >
                    {isSubmittingEquipmentAction ? "Đang xử lý..." : approvalModal.targetStatus === "approved" ? "✓ Xác nhận phê duyệt" : "✕ Xác nhận từ chối"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visibility Modal (UC_A12) */}
        {visibilityModal && (
          <div className="ticket-modal-backdrop" onClick={() => !isSubmittingEquipmentAction && setVisibilityModal(null)}>
            <div
              className="ticket-modal"
              style={{ maxWidth: "520px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ticket-modal-header" style={{ padding: "16px 20px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#fff", fontSize: "1.05rem", fontWeight: 700 }}>
                    {visibilityModal.targetVisibility === "hidden"
                      ? "🚫 Tạm ẩn bài đăng vi phạm (UC_A12)"
                      : "↩ Khôi phục hiển thị bài đăng (UC_A12)"}
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
                    Thiết bị: <strong style={{ color: "#fff" }}>{visibilityModal.equipment.title}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="ticket-modal-close"
                  onClick={() => !isSubmittingEquipmentAction && setVisibilityModal(null)}
                  disabled={isSubmittingEquipmentAction}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "20px" }}>
                {visibilityModal.targetVisibility === "hidden" ? (
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.5, margin: "0 0 10px" }}>
                      Khi bài đăng bị ẩn, thiết bị sẽ lập tức <strong style={{ color: "#f87171" }}>biến mất khỏi sàn Marketplace</strong> và khách thuê không thể xem hoặc đặt thuê.
                    </p>
                    <label style={{ display: "block", color: "#fff", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                      Lý do tạm ẩn bài đăng (Gửi thông báo tới chủ máy):
                    </label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="Ví dụ: Bị báo cáo đăng tin giá ảo, hàng nhái, hoặc thông tin chưa chính xác..."
                      value={visibilityModal.reason}
                      onChange={(e) => setVisibilityModal({ ...visibilityModal, reason: e.target.value })}
                      style={{ width: "100%", padding: "10px", fontSize: "0.85rem" }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <p style={{ color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 16px" }}>
                    Bạn có chắc chắn muốn <strong style={{ color: "#60a5fa" }}>khôi phục hiển thị</strong> bài đăng này? Bài đăng sẽ lại xuất hiện công khai trên Marketplace.
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ width: "auto", minHeight: "unset", padding: "8px 16px", fontSize: "0.84rem", borderRadius: "6px" }}
                    onClick={() => setVisibilityModal(null)}
                    disabled={isSubmittingEquipmentAction}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="button"
                    style={{
                      width: "auto",
                      minHeight: "unset",
                      padding: "8px 20px",
                      fontSize: "0.84rem",
                      borderRadius: "6px",
                      background: visibilityModal.targetVisibility === "hidden" ? "#ef4444" : "#3b82f6",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                    onClick={handleConfirmEquipmentVisibility}
                    disabled={isSubmittingEquipmentAction}
                  >
                    {isSubmittingEquipmentAction ? "Đang xử lý..." : visibilityModal.targetVisibility === "hidden" ? "🚫 Xác nhận ẩn bài" : "↩ Xác nhận khôi phục"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
