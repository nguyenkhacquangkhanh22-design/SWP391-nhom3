import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type { AdminFlaggedUser } from "../../types/admin";

interface AdminRiskMonitorTabProps {
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminRiskMonitorTab({
  token,
  onError,
  onSuccess,
}: AdminRiskMonitorTabProps) {
  const [flaggedUsers, setFlaggedUsers] = useState<AdminFlaggedUser[]>([]);
  const [stats, setStats] = useState<{
    totalFlagged: number;
    highRiskCount: number;
    mediumRiskCount: number;
    activeDisputesCount: number;
    safetyIndex: number;
  }>({
    totalFlagged: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    activeDisputesCount: 0,
    safetyIndex: 100,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRiskData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.getRiskMonitor(token);
      setFlaggedUsers(res.flaggedUsers || []);
      setStats(res.stats || {
        totalFlagged: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        activeDisputesCount: 0,
        safetyIndex: 100,
      });
    } catch (err: any) {
      onError(err.message || "Không thể tải dữ liệu giám sát rủi ro gian lận.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, [token]);

  const handleToggleFreeze = async (userId: string, currentStatus: string) => {
    const isFrozen = currentStatus === "suspended";
    const action = isFrozen ? "unfreeze" : "freeze";
    const confirmMsg = isFrozen
      ? "Bạn có chắc muốn MỞ KHÓA tài khoản này sau khi kiểm tra an toàn?"
      : "Bạn có chắc muốn ĐÓNG BĂNG tài khoản này để phòng ngừa rủi ro mất máy/gian lận?";

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsSubmitting(true);
      const res = await adminApi.freezeRiskUser(token, userId, {
        action,
        reason: isFrozen ? "Mở khóa sau đối soát hồ sơ" : "Đóng băng tài khoản phòng ngừa rủi ro thiết bị",
      });
      onSuccess(res.message);
      fetchRiskData();
    } catch (err: any) {
      onError(err.message || "Lỗi khi cập nhật trạng thái tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = flaggedUsers.filter((item) => {
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (item.user.name || "").toLowerCase();
      const email = (item.user.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    }
    return true;
  });

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Giám Sát Rủi Ro & Phòng Chống Gian Lận Thuê Máy (UC_A31)</h2>
          <p className="admin-card-desc">
            Tự động phát hiện các tài khoản có tỷ lệ tranh chấp cao, nợ tiền bồi thường hư hỏng hoặc chưa định danh CCCD nhằm bảo vệ an toàn tài sản thiết bị.
          </p>
        </div>
      </div>

      {/* Safety Score & KPI Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(46, 213, 115, 0.08)", border: "1px solid rgba(46, 213, 115, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#2ed573" }}>Chỉ Số An Toàn Toàn Sàn</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2ed573", marginTop: "4px" }}>
            {stats.safetyIndex} / 100
          </div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ff4757" }}>Tài Khoản Rủi Ro Cao (Cần xử lý)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ff4757", marginTop: "4px" }}>
            {stats.highRiskCount}
          </div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 171, 0, 0.08)", border: "1px solid rgba(255, 171, 0, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ffab00" }}>Cảnh Báo Mức Trung Bình</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ffab00", marginTop: "4px" }}>
            {stats.mediumRiskCount}
          </div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(0, 168, 255, 0.08)", border: "1px solid rgba(0, 168, 255, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#00a8ff" }}>Tranh Chấp Đang Điều Tra</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#00a8ff", marginTop: "4px" }}>
            {stats.activeDisputesCount}
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="admin-input"
          placeholder="Tìm theo tên người dùng, email khả nghi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: "250px" }}
        />

        <select
          className="admin-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ width: "200px" }}
        >
          <option value="all">Tất cả mức độ rủi ro</option>
          <option value="high">Mức độ Nguy Hiểm (High)</option>
          <option value="medium">Mức độ Cảnh Báo (Medium)</option>
        </select>
      </div>

      {/* Flagged Users Table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Đang quét dữ liệu rủi ro gian lận...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Không có tài khoản nào nằm trong danh sách rủi ro. Hệ thống an toàn!
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Người Dùng</th>
                <th>Điểm Rủi Ro (Score)</th>
                <th>Mức Độ</th>
                <th>Nguyên Nhân Gắn Cờ Cảnh Báo</th>
                <th>Trạng Thái Tài Khoản</th>
                <th style={{ textAlign: "right" }}>Biện Pháp Chế Tài</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item) => (
                <tr key={item.user._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.user.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{item.user.email}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Vai trò: {item.user.role}</div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "bold", fontSize: "16px", color: item.severity === "high" ? "#ff4757" : "#ffab00" }}>
                        {item.riskScore}
                      </span>
                    </div>
                  </td>
                  <td>
                    {item.severity === "high" ? (
                      <span className="admin-status-badge is-suspended" style={{ background: "rgba(255, 71, 87, 0.2)", color: "#ff4757", fontWeight: "bold" }}>
                        🚨 NGUY HIỂM CAO
                      </span>
                    ) : (
                      <span className="admin-status-badge is-pending" style={{ background: "rgba(255, 171, 0, 0.2)", color: "#ffab00", fontWeight: "bold" }}>
                        ⚠️ CẢNH BÁO
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {item.reasons.map((r, idx) => (
                        <span key={idx} style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                          • {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {item.user.status === "suspended" ? (
                      <span className="admin-status-badge is-suspended">Đang Đóng Băng</span>
                    ) : (
                      <span className="admin-status-badge is-active">Đang Hoạt Động</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className={`admin-btn admin-btn-sm ${item.user.status === "suspended" ? "admin-btn-secondary" : "admin-btn-danger"}`}
                      disabled={isSubmitting}
                      onClick={() => handleToggleFreeze(item.user._id, item.user.status)}
                    >
                      {item.user.status === "suspended" ? "Mở Khóa" : "Đóng Băng TK"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
