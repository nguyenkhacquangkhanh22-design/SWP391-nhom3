import type { OwnerStats, RentalRequest } from "../../types/owner";

interface Props {
  stats: OwnerStats | null;
  recentRequests: RentalRequest[];
  onNavigateTab: (tab: string) => void;
  onSelectRequest: (req: RentalRequest) => void;
}

export default function OwnerOverviewTab({
  stats,
  recentRequests,
  onNavigateTab,
  onSelectRequest,
}: Props) {
  return (
    <div className="owner-tab-content">
      {/* Stats Cards */}
      <div className="owner-stats-grid">
        <div className="owner-stat-card">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Thiết bị đang cho thuê</span>
            <span className="owner-stat-icon">📦</span>
          </div>
          <div className="owner-stat-value">
            {stats?.activeEquipments || 0}
            <span className="owner-stat-sub"> / {stats?.totalEquipments || 0} tổng thiết bị</span>
          </div>
          <button
            className="owner-stat-link"
            onClick={() => onNavigateTab("equipments")}
          >
            Quản lý thiết bị & đăng mới →
          </button>
        </div>

        <div className="owner-stat-card">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Yêu cầu thuê chờ duyệt</span>
            <span className="owner-stat-icon">📬</span>
          </div>
          <div className="owner-stat-value" style={{ color: "var(--orange)" }}>
            {stats?.pendingRequests || 0}
            <span className="owner-stat-sub"> yêu cầu mới</span>
          </div>
          <button
            className="owner-stat-link"
            onClick={() => onNavigateTab("requests")}
          >
            Xem và phê duyệt ngay →
          </button>
        </div>

        <div className="owner-stat-card">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Hợp đồng đang thực hiện</span>
            <span className="owner-stat-icon">📝</span>
          </div>
          <div className="owner-stat-value">
            {stats?.activeContracts || 0}
            <span className="owner-stat-sub"> hợp đồng hiệu lực</span>
          </div>
          <button
            className="owner-stat-link"
            onClick={() => onNavigateTab("contracts")}
          >
            Xem hợp đồng & ký số →
          </button>
        </div>

        <div className="owner-stat-card highlight">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Tổng doanh thu thực nhận</span>
            <span className="owner-stat-icon">💰</span>
          </div>
          <div className="owner-stat-value" style={{ color: "#10b981" }}>
            {(stats?.totalRevenue || 0).toLocaleString("vi-VN")} đ
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "4px" }}>
            Đang chờ giải ngân: {(stats?.pendingPayout || 0).toLocaleString("vi-VN")} đ
          </div>
          <button
            className="owner-stat-link"
            onClick={() => onNavigateTab("settlement")}
          >
            Xem quyết toán & lịch sử →
          </button>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="owner-quick-actions">
        <h3 style={{ margin: "0 0 14px", fontSize: "1.05rem", color: "#fff" }}>
          ⚡ Thao tác nhanh cho Người cho thuê
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <button
            className="button button-primary"
            onClick={() => onNavigateTab("equipments")}
          >
            + Đăng thiết bị mới (UC_O03)
          </button>
          <button
            className="button button-secondary"
            onClick={() => onNavigateTab("requests")}
          >
            Duyệt yêu cầu thuê (UC_O07)
          </button>
          <button
            className="button button-secondary"
            onClick={() => onNavigateTab("contracts")}
          >
            Lập hợp đồng thuê (UC_O12)
          </button>
          <button
            className="button button-secondary"
            onClick={() => onNavigateTab("handover")}
          >
            Biên bản bàn giao thiết bị (UC_O08)
          </button>
          <button
            className="button button-secondary"
            onClick={() => onNavigateTab("settlement")}
          >
            Xác nhận quyết toán & giải ngân (UC_O10)
          </button>
          <button
            className="button button-quiet"
            onClick={() => onNavigateTab("disputes")}
          >
            Gửi khiếu nại (UC_O17)
          </button>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="owner-section-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff" }}>
            📬 Yêu cầu thuê gần đây cần xử lý
          </h3>
          <button
            className="button button-quiet"
            style={{ fontSize: "0.85rem" }}
            onClick={() => onNavigateTab("requests")}
          >
            Xem tất cả yêu cầu ({stats?.pendingRequests || 0}) →
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="owner-empty-state">
            <span style={{ fontSize: "2rem" }}>📭</span>
            <p>Hiện tại chưa có yêu cầu thuê nào mới.</p>
          </div>
        ) : (
          <div className="owner-table-wrapper">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  <th>Thiết bị</th>
                  <th>Người thuê</th>
                  <th>Thời gian thuê</th>
                  <th>Tiền thuê dự kiến</th>
                  <th>Tiền cọc</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((req) => (
                  <tr key={req._id}>
                    <td>
                      <strong>{req.request_code}</strong>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img
                          src={
                            req.equipment_id?.images?.[0] ||
                            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
                          }
                          alt=""
                          style={{ width: "38px", height: "38px", borderRadius: "6px", objectFit: "cover" }}
                        />
                        <span style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {req.equipment_id?.title || "Thiết bị"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>{req.renter_name}</div>
                      <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{req.renter_phone}</span>
                    </td>
                    <td>
                      {new Date(req.start_date).toLocaleDateString("vi-VN")} -{" "}
                      {new Date(req.end_date).toLocaleDateString("vi-VN")}
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                        ({req.duration_days} ngày)
                      </div>
                    </td>
                    <td style={{ color: "var(--orange)", fontWeight: 600 }}>
                      {req.rental_fee.toLocaleString("vi-VN")} đ
                    </td>
                    <td>{req.deposit_amount.toLocaleString("vi-VN")} đ</td>
                    <td>
                      <span className={`status-badge status-${req.status}`}>
                        {req.status === "pending"
                          ? "Chờ duyệt"
                          : req.status === "approved"
                          ? "Đã chấp nhận"
                          : req.status === "contract_created"
                          ? "Đã tạo HĐ"
                          : req.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button button-secondary"
                        style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                        onClick={() => {
                          onSelectRequest(req);
                          onNavigateTab("requests");
                        }}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
