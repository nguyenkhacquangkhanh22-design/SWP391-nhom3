import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type {
  AdminDispute,
  AdminDisputeStats,
  DisputeDetailResponse,
} from "../../types/admin";

interface AdminDisputesTabProps {
  token: string;
  onStatsUpdate?: (stats: AdminDisputeStats) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminDisputesTab({
  token,
  onStatsUpdate,
  onError,
  onSuccess,
}: AdminDisputesTabProps) {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [stats, setStats] = useState<AdminDisputeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal state
  const [detailModalData, setDetailModalData] = useState<DisputeDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Resolve Modal state
  const [resolveModal, setResolveModal] = useState<{
    dispute: AdminDispute;
    targetStatus: "resolved" | "dismissed" | "investigating";
    approvedAmount: number;
    resolutionNote: string;
  } | null>(null);
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const fetchDisputes = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listDisputes(token, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      setDisputes(res.disputes || []);
      setStats(res.stats);
      if (onStatsUpdate && res.stats) {
        onStatsUpdate(res.stats);
      }
    } catch (err: any) {
      onError(err.message || "Không thể tải danh sách khiếu nại tranh chấp");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [token, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDisputes();
  };

  const handleOpenDetail = async (disputeId: string) => {
    if (!token) return;
    try {
      setIsLoadingDetail(true);
      const data = await adminApi.getDisputeDetail(token, disputeId);
      setDetailModalData(data);
    } catch (err: any) {
      onError(err.message || "Không thể tải chi tiết hồ sơ tranh chấp");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleOpenResolve = (dispute: AdminDispute) => {
    setResolveModal({
      dispute,
      targetStatus: "resolved",
      approvedAmount: dispute.claimed_compensation || 0,
      resolutionNote: "",
    });
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModal || !token) return;

    if (resolveModal.targetStatus === "resolved" && (!resolveModal.resolutionNote || !resolveModal.resolutionNote.trim())) {
      onError("Vui lòng nhập căn cứ phán quyết và giải trình bồi thường");
      return;
    }

    try {
      setIsSubmittingResolve(true);
      const res = await adminApi.resolveDispute(token, resolveModal.dispute._id, {
        status: resolveModal.targetStatus,
        compensation_approved: resolveModal.targetStatus === "resolved" ? resolveModal.approvedAmount : 0,
        resolution_note: resolveModal.resolutionNote.trim(),
      });

      onSuccess(res.message || "Đã cập nhật phán quyết tranh chấp thành công");
      setResolveModal(null);
      if (detailModalData && detailModalData.dispute._id === resolveModal.dispute._id) {
        setDetailModalData({
          ...detailModalData,
          dispute: res.dispute,
          settlement: res.settlement || detailModalData.settlement,
        });
      }
      fetchDisputes();
    } catch (err: any) {
      onError(err.message || "Lỗi xử lý phán quyết tranh chấp");
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const formatCurrency = (val?: number) => {
    return (val || 0).toLocaleString("vi-VN") + " đ";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <span className="status-badge status-pending">Chờ phân xử</span>;
      case "investigating":
        return <span className="status-badge" style={{ background: "#e0f2fe", color: "#0369a1", borderColor: "#7dd3fc" }}>Đang điều tra</span>;
      case "resolved":
        return <span className="status-badge status-approved">Đã giải quyết</span>;
      case "dismissed":
        return <span className="status-badge" style={{ background: "#f3f4f6", color: "#4b5563", borderColor: "#d1d5db" }}>Đã bác bỏ</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      {/* KPI Badges */}
      <div className="ticket-kpi-grid">
        <div
          className={`ticket-kpi-card ${statusFilter === "all" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("all")}
          title="Bấm để xem tất cả tranh chấp"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Tổng khiếu nại</span>
            <span className="ticket-kpi-badge badge-all">TẤT CẢ</span>
          </div>
          <div className="ticket-kpi-value">{stats?.total ?? disputes.length}</div>
          <div className="ticket-kpi-sub">Tranh chấp hợp đồng thuê</div>
        </div>

        <div
          className={`ticket-kpi-card ${statusFilter === "pending_review" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("pending_review")}
          title="Bấm để lọc khiếu nại chờ giải quyết"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Chờ phân xử (UC_A15)</span>
            <span className="ticket-kpi-badge badge-open">CHỜ XỬ LÝ</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#f97316" }}>
            {stats?.pending_review ?? 0}
          </div>
          <div className="ticket-kpi-sub">Cần Admin thẩm định bằng chứng</div>
        </div>

        <div
          className={`ticket-kpi-card ${statusFilter === "investigating" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("investigating")}
          title="Bấm để lọc khiếu nại đang điều tra"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Đang điều tra</span>
            <span className="ticket-kpi-badge badge-in-progress">ĐIỀU TRA</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#0284c7" }}>
            {stats?.investigating ?? 0}
          </div>
          <div className="ticket-kpi-sub">Đang liên hệ hai bên làm rõ</div>
        </div>

        <div
          className={`ticket-kpi-card ${statusFilter === "resolved" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("resolved")}
          title="Bấm để xem tranh chấp đã chấp thuận bồi thường"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Đã phân xử (UC_A16)</span>
            <span className="ticket-kpi-badge badge-resolved">ĐÃ BỒI THƯỜNG</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#10b981" }}>
            {stats?.resolved ?? 0}
          </div>
          <div className="ticket-kpi-sub">Đã khấu trừ cọc sang Settlement</div>
        </div>

        <div
          className={`ticket-kpi-card ${statusFilter === "dismissed" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("dismissed")}
          title="Bấm để xem các đơn khiếu nại bị bác bỏ"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Bác bỏ yêu cầu</span>
            <span className="ticket-kpi-badge badge-closed">BÁC BỎ</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#6b7280" }}>
            {stats?.dismissed ?? 0}
          </div>
          <div className="ticket-kpi-sub">Hoàn cọc nguyên vẹn cho Renter</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="ticket-filter-bar" style={{ marginTop: "20px" }}>
        <form onSubmit={handleSearchSubmit} className="ticket-search-form" style={{ flex: 1 }}>
          <input
            type="text"
            className="input ticket-search-input"
            placeholder="🔍 Tìm theo mã tranh chấp, tiêu đề, lý do..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="button button-secondary">
            Tìm kiếm
          </button>
        </form>

        <div className="ticket-filter-group">
          <select
            className="input"
            style={{ width: "auto" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending_review">Chờ phân xử</option>
            <option value="investigating">Đang điều tra</option>
            <option value="resolved">Đã giải quyết (Bồi thường)</option>
            <option value="dismissed">Bác bỏ khiếu nại</option>
          </select>

          <button
            type="button"
            className="button button-quiet"
            onClick={fetchDisputes}
            title="Làm mới danh sách"
          >
            🔄 Tải lại
          </button>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="admin-table-container" style={{ marginTop: "16px" }}>
        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            ⏳ Đang tải danh sách khiếu nại tranh chấp...
          </div>
        ) : disputes.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            Không có hồ sơ tranh chấp nào phù hợp với bộ lọc.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã tranh chấp</th>
                <th>Tiêu đề & Hợp đồng</th>
                <th>Bên thuê (Renter)</th>
                <th>Bên cho thuê (Owner)</th>
                <th>Yêu cầu bồi thường</th>
                <th>Duyệt bồi thường</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((item) => (
                <tr key={item._id}>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--primary)" }}>
                      {item.dispute_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      Lý do: {item.reason} | HĐ: {item.contract_id?.contract_code || "N/A"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.renter_id?.name || "Renter"}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {item.renter_id?.email}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.owner_id?.name || "Owner"}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {item.owner_id?.email}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#dc2626" }}>
                      {formatCurrency(item.claimed_compensation)}
                    </span>
                  </td>
                  <td>
                    {item.status === "resolved" ? (
                      <span style={{ fontWeight: 600, color: "#16a34a" }}>
                        {formatCurrency(item.compensation_approved)}
                      </span>
                    ) : item.status === "dismissed" ? (
                      <span style={{ color: "var(--muted)" }}>0 đ (Bác bỏ)</span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>Chờ duyệt</span>
                    )}
                  </td>
                  <td>{renderStatusBadge(item.status)}</td>
                  <td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {formatDate(item.createdAt)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => handleOpenDetail(item._id)}
                      >
                        👁️ Chi tiết
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => handleOpenResolve(item)}
                      >
                        ⚖️ Phán quyết
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {(detailModalData || isLoadingDetail) && (
        <div className="ticket-modal-overlay" onClick={() => !isLoadingDetail && setDetailModalData(null)}>
          <div
            className="ticket-modal"
            style={{ maxWidth: "850px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {isLoadingDetail ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                ⏳ Đang tải thông tin chi tiết và biên bản bàn giao...
              </div>
            ) : detailModalData && (
              <>
                <div className="ticket-modal-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                      ⚖️ Hồ sơ tranh chấp #{detailModalData.dispute.dispute_code}
                    </h3>
                    <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                      Hợp đồng: {detailModalData.dispute.contract_id?.contract_code} | Thiết bị:{" "}
                      {detailModalData.dispute.contract_id?.equipment_id?.title || "Không rõ"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => setDetailModalData(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="ticket-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "var(--card-bg, #f8fafc)",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Trạng thái hiện tại: </span>
                      {renderStatusBadge(detailModalData.dispute.status)}
                    </div>
                    <div>
                      <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Tiền yêu cầu: </span>
                      <strong style={{ color: "#dc2626" }}>
                        {formatCurrency(detailModalData.dispute.claimed_compensation)}
                      </strong>
                      {detailModalData.dispute.status === "resolved" && (
                        <span style={{ marginLeft: "12px" }}>
                          | Đã duyệt bồi thường:{" "}
                          <strong style={{ color: "#16a34a" }}>
                            {formatCurrency(detailModalData.dispute.compensation_approved)}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dispute Description & Reasons */}
                  <div style={{ marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: "0.95rem" }}>Nội dung khiếu nại:</h4>
                    <div
                      style={{
                        padding: "12px",
                        background: "rgba(0,0,0,0.02)",
                        borderRadius: "6px",
                        borderLeft: "3px solid #f97316",
                        fontSize: "0.9rem",
                        lineHeight: 1.5,
                      }}
                    >
                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Lý do:</strong> {detailModalData.dispute.reason}
                      </p>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                        {detailModalData.dispute.description}
                      </p>
                    </div>
                  </div>

                  {/* Evidence Images */}
                  {detailModalData.dispute.evidence_urls && detailModalData.dispute.evidence_urls.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>
                        📷 Hình ảnh / Bằng chứng khiếu nại ({detailModalData.dispute.evidence_urls.length}):
                      </h4>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {detailModalData.dispute.evidence_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Bằng chứng ${idx + 1}`}
                            onClick={() => setEnlargedImage(url)}
                            style={{
                              width: "100px",
                              height: "100px",
                              objectFit: "cover",
                              borderRadius: "6px",
                              border: "1px solid var(--border)",
                              cursor: "zoom-in",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parties Information */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase" }}>
                        👤 Bên cho thuê (Owner)
                      </span>
                      <div style={{ fontWeight: 600 }}>{detailModalData.dispute.owner_id?.name}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                        {detailModalData.dispute.owner_id?.email}
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        Điện thoại: {detailModalData.dispute.owner_id?.phone || "Chưa có"} | Uy tín:{" "}
                        {detailModalData.dispute.owner_id?.trust_score ?? 100}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase" }}>
                        👤 Bên thuê (Renter)
                      </span>
                      <div style={{ fontWeight: 600 }}>{detailModalData.dispute.renter_id?.name}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                        {detailModalData.dispute.renter_id?.email}
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        Điện thoại: {detailModalData.dispute.renter_id?.phone || "Chưa có"} | Uy tín:{" "}
                        {detailModalData.dispute.renter_id?.trust_score ?? 100}
                      </div>
                    </div>
                  </div>

                  {/* Contract & Handover details */}
                  <div style={{ marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>📋 Biên bản bàn giao & Trả máy đối chiếu:</h4>
                    {detailModalData.handovers && detailModalData.handovers.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {detailModalData.handovers.map((rec) => (
                          <div
                            key={rec._id}
                            style={{
                              padding: "10px 14px",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              background: rec.record_type === "return" ? "#fffbeb" : "#f0fdf4",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <strong>
                                {rec.record_type === "handover" ? "🤝 Biên bản giao máy lúc nhận" : "📦 Biên bản kiểm tra lúc trả"}
                              </strong>
                              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                                {formatDate(rec.record_date)}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.85rem" }}>
                              Tình trạng: {rec.physical_condition} | Hoạt động: {rec.working_status}
                            </div>
                            {rec.damage_detected && (
                              <div style={{ fontSize: "0.85rem", color: "#dc2626", marginTop: "2px" }}>
                                ⚠️ Hư hại phát hiện: {rec.damage_detected} (Ước tính: {formatCurrency(rec.estimated_damage_cost)})
                              </div>
                            )}
                            {rec.missing_items && rec.missing_items.length > 0 && (
                              <div style={{ fontSize: "0.85rem", color: "#b45309", marginTop: "2px" }}>
                                ⚠️ Phụ kiện thiếu: {rec.missing_items.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic" }}>
                        Chưa có biên bản bàn giao điện tử ghi nhận trong hệ thống.
                      </div>
                    )}
                  </div>

                  {/* Settlement status if exists */}
                  {detailModalData.settlement && (
                    <div
                      style={{
                        padding: "12px",
                        border: "1px solid #93c5fd",
                        borderRadius: "6px",
                        background: "#eff6ff",
                        marginBottom: "16px",
                      }}
                    >
                      <h4 style={{ margin: "0 0 6px", fontSize: "0.95rem", color: "#1e40af" }}>
                        💰 Quyết toán tiền cọc liên quan (#{detailModalData.settlement.settlement_code}):
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontSize: "0.85rem" }}>
                        <div>Tiền cọc ban đầu: <strong>{formatCurrency(detailModalData.settlement.deposit_paid)}</strong></div>
                        <div>Khấu trừ bồi thường: <strong style={{ color: "#dc2626" }}>{formatCurrency(detailModalData.settlement.damage_deduction)}</strong></div>
                        <div>Hoàn cọc cho Renter: <strong style={{ color: "#16a34a" }}>{formatCurrency(detailModalData.settlement.deposit_refund_to_renter)}</strong></div>
                      </div>
                    </div>
                  )}

                  {/* Resolution note if already resolved */}
                  {detailModalData.dispute.resolution_note && (
                    <div>
                      <h4 style={{ margin: "0 0 6px", fontSize: "0.95rem" }}>Phán quyết của Quản trị viên:</h4>
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "#f8fafc",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          fontSize: "0.9rem",
                        }}
                      >
                        {detailModalData.dispute.resolution_note}
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "6px" }}>
                          Giải quyết lúc: {formatDate(detailModalData.dispute.resolved_at)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ticket-modal-footer">
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => setDetailModalData(null)}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      const d = detailModalData.dispute;
                      setDetailModalData(null);
                      handleOpenResolve(d);
                    }}
                  >
                    ⚖️ Phán quyết tranh chấp
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="ticket-modal-overlay" onClick={() => !isSubmittingResolve && setResolveModal(null)}>
          <div
            className="ticket-modal"
            style={{ maxWidth: "600px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleResolveSubmit}>
              <div className="ticket-modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
                    ⚖️ Ra phán quyết tranh chấp #{resolveModal.dispute.dispute_code}
                  </h3>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                    Yêu cầu bồi thường: {formatCurrency(resolveModal.dispute.claimed_compensation)}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => !isSubmittingResolve && setResolveModal(null)}
                >
                  ✕
                </button>
              </div>

              <div className="ticket-modal-body">
                {/* Decision radio */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>
                    Hình thức giải quyết:
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="targetStatus"
                        value="resolved"
                        checked={resolveModal.targetStatus === "resolved"}
                        onChange={() =>
                          setResolveModal({
                            ...resolveModal,
                            targetStatus: "resolved",
                            approvedAmount: resolveModal.dispute.claimed_compensation || 0,
                          })
                        }
                      />
                      <span>
                        <strong>Chấp thuận bồi thường (Khấu trừ tiền cọc của Renter)</strong>
                      </span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="targetStatus"
                        value="dismissed"
                        checked={resolveModal.targetStatus === "dismissed"}
                        onChange={() =>
                          setResolveModal({
                            ...resolveModal,
                            targetStatus: "dismissed",
                            approvedAmount: 0,
                          })
                        }
                      />
                      <span>
                        <strong>Bác bỏ khiếu nại (Không phát sinh khấu trừ, hoàn cọc 100%)</strong>
                      </span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="targetStatus"
                        value="investigating"
                        checked={resolveModal.targetStatus === "investigating"}
                        onChange={() =>
                          setResolveModal({
                            ...resolveModal,
                            targetStatus: "investigating",
                            approvedAmount: 0,
                          })
                        }
                      />
                      <span>
                        <strong>Chuyển sang Đang điều tra (Yêu cầu bổ sung thêm chứng cứ)</strong>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Amount input if resolved */}
                {resolveModal.targetStatus === "resolved" && (
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "12px",
                      background: "#fef2f2",
                      borderRadius: "6px",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#991b1b" }}>
                      Số tiền bồi thường được duyệt (VNĐ):
                    </label>
                    <input
                      type="number"
                      className="input"
                      min={0}
                      max={resolveModal.dispute.contract_id?.deposit_amount || resolveModal.dispute.claimed_compensation * 2}
                      value={resolveModal.approvedAmount}
                      onChange={(e) =>
                        setResolveModal({
                          ...resolveModal,
                          approvedAmount: Number(e.target.value) || 0,
                        })
                      }
                      style={{ fontWeight: 600, fontSize: "1.05rem" }}
                    />
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                        onClick={() =>
                          setResolveModal({
                            ...resolveModal,
                            approvedAmount: resolveModal.dispute.claimed_compensation || 0,
                          })
                        }
                      >
                        100% Yêu cầu ({formatCurrency(resolveModal.dispute.claimed_compensation)})
                      </button>
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                        onClick={() =>
                          setResolveModal({
                            ...resolveModal,
                            approvedAmount: Math.round((resolveModal.dispute.claimed_compensation || 0) / 2),
                          })
                        }
                      >
                        50% Yêu cầu
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolution note */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                    Căn cứ phán quyết & Giải trình gửi hai bên (bắt buộc):
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Ghi rõ căn cứ (ví dụ: Đối chiếu ảnh kiểm tra trả máy thấy trầy xước thấu kính, chấp thuận trừ 500.000đ tiền cọc)..."
                    value={resolveModal.resolutionNote}
                    onChange={(e) =>
                      setResolveModal({ ...resolveModal, resolutionNote: e.target.value })
                    }
                    required={resolveModal.targetStatus !== "investigating"}
                  />
                </div>
              </div>

              <div className="ticket-modal-footer">
                <button
                  type="button"
                  className="button button-quiet"
                  disabled={isSubmittingResolve}
                  onClick={() => setResolveModal(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button button-secondary"
                  disabled={isSubmittingResolve}
                >
                  {isSubmittingResolve ? "Đang lưu..." : "Xác nhận phán quyết"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged image preview lightbox */}
      {enlargedImage && (
        <div
          className="ticket-modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setEnlargedImage(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={enlargedImage}
              alt="Ảnh phóng to"
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
              }}
            />
            <button
              type="button"
              className="button button-secondary"
              style={{
                position: "absolute",
                top: "-40px",
                right: "0",
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
              }}
              onClick={() => setEnlargedImage(null)}
            >
              ✕ Đóng ảnh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
