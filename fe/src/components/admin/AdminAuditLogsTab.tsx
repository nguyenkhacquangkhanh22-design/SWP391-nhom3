import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type {
  AdminAuditLog,
} from "../../types/admin";

interface AdminAuditLogsTabProps {
  token: string;
  onError: (msg: string) => void;
}

export default function AdminAuditLogsTab({
  token,
  onError,
}: AdminAuditLogsTabProps) {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [stats, setStats] = useState<{ total: number; today: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Detail Modal state
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const fetchLogs = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listAuditLogs(token, {
        action: actionFilter !== "all" ? actionFilter : undefined,
        targetType: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
        search: searchQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 50,
      });
      setLogs(res.logs || []);
      setStats(res.stats);
    } catch (err: any) {
      onError(err.message || "Không thể tải nhật ký hoạt động hệ thống");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, actionFilter, targetTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    let background = "#f3f4f6";
    let color = "#374151";
    let border = "#e5e7eb";

    if (action.includes("APPROVED") || action.includes("VERIFIED") || action.includes("RESTORED")) {
      background = "#ecfdf5";
      color = "#047857";
      border = "#a7f3d0";
    } else if (action.includes("REJECTED") || action.includes("HIDDEN") || action.includes("DISMISSED")) {
      background = "#fef2f2";
      color = "#b91c1c";
      border = "#fecaca";
    } else if (action.includes("RESOLVED")) {
      background = "#eff6ff";
      color = "#1d4ed8";
      border = "#bfdbfe";
    } else if (action.includes("ROLE") || action.includes("STATUS")) {
      background = "#fffbeb";
      color = "#b45309";
      border = "#fde68a";
    }

    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: 700,
          background,
          color,
          border: `1px solid ${border}`,
          fontFamily: "monospace",
        }}
      >
        {action}
      </span>
    );
  };

  const renderDetailsSummary = (log: AdminAuditLog) => {
    if (!log.details) return "—";
    const d = log.details;
    if (log.action.includes("EQUIPMENT_APPROVED")) {
      return "Phê duyệt bài đăng công khai trên sàn";
    }
    if (log.action.includes("EQUIPMENT_REJECTED")) {
      return `Từ chối duyệt: ${d.rejection_reason || "Không đạt tiêu chuẩn"}`;
    }
    if (log.action.includes("EQUIPMENT_HIDDEN")) {
      return `Ẩn bài vi phạm: ${d.reason || "Vi phạm quy định"}`;
    }
    if (log.action.includes("EQUIPMENT_RESTORED")) {
      return "Khôi phục hiển thị công khai trên sàn";
    }
    if (log.action.includes("DISPUTE_RESOLVED")) {
      return `Chấp thuận bồi thường: ${(d.compensation_approved || 0).toLocaleString("vi-VN")} đ`;
    }
    if (log.action.includes("DISPUTE_DISMISSED")) {
      return "Bác bỏ khiếu nại (Hoàn cọc nguyên vẹn)";
    }
    if (log.action.includes("KYC_VERIFIED")) {
      return `Duyệt CCCD (${d.idNumber || ""}), cộng +${d.trustScoreBonus || 20} điểm`;
    }
    if (log.action.includes("KYC_REJECTED")) {
      return `Từ chối KYC: ${d.rejectionReason || "Không hợp lệ"}`;
    }
    if (log.action.includes("USER_ROLE")) {
      return `Đổi vai trò: ${d.oldRole} ➔ ${d.newRole}`;
    }
    if (log.action.includes("USER_STATUS")) {
      return `Đổi trạng thái tài khoản: ${d.oldStatus} ➔ ${d.newStatus}`;
    }
    if (log.action.includes("SUPPORT_TICKET")) {
      return `Phản hồi: "${d.messagePreview || ""}"`;
    }
    return JSON.stringify(d).slice(0, 50);
  };

  return (
    <div style={{ marginTop: "20px" }}>
      {/* KPI Badges */}
      <div className="ticket-kpi-grid">
        <div
          className={`ticket-kpi-card ${actionFilter === "all" ? "is-active" : ""}`}
          onClick={() => {
            setActionFilter("all");
            setTargetTypeFilter("all");
          }}
          title="Bấm để xem tất cả nhật ký"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Tổng nhật ký</span>
            <span className="ticket-kpi-badge badge-all">TẤT CẢ</span>
          </div>
          <div className="ticket-kpi-value">{stats?.total ?? logs.length}</div>
          <div className="ticket-kpi-sub">Toàn bộ thao tác quản trị được lưu vết</div>
        </div>

        <div
          className="ticket-kpi-card"
          onClick={() => {
            const today = new Date().toISOString().slice(0, 10);
            setStartDate(today);
            setEndDate(today);
            fetchLogs();
          }}
          title="Bấm để lọc thao tác trong ngày hôm nay"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Hôm nay (UC_A21)</span>
            <span className="ticket-kpi-badge badge-open">HÔM NAY</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#3b82f6" }}>
            {stats?.today ?? 0}
          </div>
          <div className="ticket-kpi-sub">Hành động thực hiện trong 24 giờ qua</div>
        </div>

        <div
          className={`ticket-kpi-card ${targetTypeFilter === "Equipment" ? "is-active" : ""}`}
          onClick={() => setTargetTypeFilter("Equipment")}
          title="Bấm để lọc nhật ký kiểm duyệt thiết bị"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Kiểm duyệt bài đăng</span>
            <span className="ticket-kpi-badge badge-resolved">THIẾT BỊ</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#10b981" }}>
            {logs.filter((l) => l.target_type === "Equipment").length}
          </div>
          <div className="ticket-kpi-sub">Duyệt bài, ẩn bài, khôi phục bài</div>
        </div>

        <div
          className={`ticket-kpi-card ${targetTypeFilter === "Dispute" ? "is-active" : ""}`}
          onClick={() => setTargetTypeFilter("Dispute")}
          title="Bấm để lọc nhật ký phân xử tranh chấp"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Phân xử tranh chấp</span>
            <span className="ticket-kpi-badge badge-in-progress">TRANH CHẤP</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#f97316" }}>
            {logs.filter((l) => l.target_type === "Dispute").length}
          </div>
          <div className="ticket-kpi-sub">Phán quyết bồi thường & trừ tiền cọc</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="ticket-filter-bar" style={{ marginTop: "20px", flexWrap: "wrap", gap: "10px" }}>
        <form onSubmit={handleSearchSubmit} className="ticket-search-form" style={{ flex: "1 1 250px" }}>
          <input
            type="text"
            className="input ticket-search-input"
            placeholder="🔍 Tìm theo Admin, đối tượng, từ khóa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="button button-secondary">
            Tìm
          </button>
        </form>

        <div className="ticket-filter-group" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            className="input"
            style={{ width: "auto" }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">Tất cả hành động</option>
            <option value="EQUIPMENT_APPROVED">EQUIPMENT_APPROVED</option>
            <option value="EQUIPMENT_REJECTED">EQUIPMENT_REJECTED</option>
            <option value="EQUIPMENT_HIDDEN">EQUIPMENT_HIDDEN</option>
            <option value="EQUIPMENT_RESTORED">EQUIPMENT_RESTORED</option>
            <option value="DISPUTE_RESOLVED">DISPUTE_RESOLVED</option>
            <option value="DISPUTE_DISMISSED">DISPUTE_DISMISSED</option>
            <option value="KYC_VERIFIED">KYC_VERIFIED</option>
            <option value="KYC_REJECTED">KYC_REJECTED</option>
            <option value="USER_ROLE_UPDATED">USER_ROLE_UPDATED</option>
            <option value="USER_STATUS_UPDATED">USER_STATUS_UPDATED</option>
            <option value="SUPPORT_TICKET_REPLIED">SUPPORT_TICKET_REPLIED</option>
          </select>

          <select
            className="input"
            style={{ width: "auto" }}
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
          >
            <option value="all">Tất cả thực thể</option>
            <option value="Equipment">Thiết bị (Equipment)</option>
            <option value="Dispute">Tranh chấp (Dispute)</option>
            <option value="User">Người dùng (User)</option>
            <option value="SupportTicket">Hỗ trợ (SupportTicket)</option>
          </select>

          <input
            type="date"
            className="input"
            style={{ width: "auto" }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Từ ngày"
          />
          <input
            type="date"
            className="input"
            style={{ width: "auto" }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="Đến ngày"
          />

          <button
            type="button"
            className="button button-quiet"
            onClick={() => {
              setSearchQuery("");
              setActionFilter("all");
              setTargetTypeFilter("all");
              setStartDate("");
              setEndDate("");
              fetchLogs();
            }}
            title="Xóa bộ lọc"
          >
            ✕ Reset
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="admin-table-container" style={{ marginTop: "16px" }}>
        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            ⏳ Đang tải dữ liệu nhật ký hoạt động hệ thống...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            Không tìm thấy bản ghi nhật ký hoạt động nào phù hợp.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mốc thời gian</th>
                <th>Người thực hiện (Actor)</th>
                <th>Hành động (Action)</th>
                <th>Thực thể tác động</th>
                <th>Nội dung tóm tắt</th>
                <th>Địa chỉ IP</th>
                <th style={{ textAlign: "right" }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{log.actor_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {log.actor_email} <span className="admin-user-role-badge" style={{ marginLeft: "4px" }}>{log.actor_role}</span>
                    </div>
                  </td>
                  <td>{getActionBadge(log.action)}</td>
                  <td>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>
                      [{log.target_type}]
                    </span>{" "}
                    <span style={{ fontWeight: 500 }}>{log.target_label || log.target_id || "—"}</span>
                  </td>
                  <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {renderDetailsSummary(log)}
                  </td>
                  <td style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--muted)" }}>
                    {log.ip_address || "127.0.0.1"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="button button-quiet"
                      style={{ padding: "3px 8px", fontSize: "0.8rem" }}
                      onClick={() => setSelectedLog(log)}
                    >
                      🔍 Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="ticket-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div
            className="ticket-modal"
            style={{ maxWidth: "680px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
                  🛡️ Chi tiết bản ghi nhật ký kiểm toán #{selectedLog._id.slice(-8)}
                </h3>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                  Thời điểm ghi log: {formatDate(selectedLog.createdAt)}
                </p>
              </div>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </button>
            </div>

            <div className="ticket-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  padding: "12px",
                  background: "var(--card-bg, #f8fafc)",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  marginBottom: "16px",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <strong>Người thực hiện:</strong> {selectedLog.actor_name} ({selectedLog.actor_email})
                </div>
                <div>
                  <strong>Vai trò:</strong> {selectedLog.actor_role}
                </div>
                <div>
                  <strong>Hành động:</strong> {getActionBadge(selectedLog.action)}
                </div>
                <div>
                  <strong>Thực thể:</strong> [{selectedLog.target_type}] {selectedLog.target_label}
                </div>
                <div>
                  <strong>Địa chỉ IP:</strong> <code>{selectedLog.ip_address || "127.0.0.1"}</code>
                </div>
                <div>
                  <strong>User-Agent:</strong> <span style={{ color: "var(--muted)" }}>{selectedLog.user_agent?.slice(0, 45) || "Web Browser"}...</span>
                </div>
              </div>

              <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>
                Dữ liệu chi tiết hành động (Audit Details / Payload):
              </h4>
              <pre
                style={{
                  padding: "12px",
                  background: "#1e293b",
                  color: "#38bdf8",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  overflowX: "auto",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="ticket-modal-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelectedLog(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
