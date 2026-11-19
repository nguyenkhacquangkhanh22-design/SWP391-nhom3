import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type { AdminEquipmentStatusRequest } from "../../types/admin";

interface AdminEquipmentStatusRequestTabProps {
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminEquipmentStatusRequestTab({
  token,
  onError,
  onSuccess,
}: AdminEquipmentStatusRequestTabProps) {
  const [requests, setRequests] = useState<AdminEquipmentStatusRequest[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [targetStatusFilter, setTargetStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review & Inspection Modal state
  const [selectedRequest, setSelectedRequest] = useState<AdminEquipmentStatusRequest | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listEquipmentStatusRequests(token, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        target_status: targetStatusFilter !== "all" ? targetStatusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setRequests(res.requests || []);
      setStats(res.stats || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (err: any) {
      onError(err.message || "Không thể tải danh sách yêu cầu đổi trạng thái thiết bị.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token, statusFilter, targetStatusFilter]);

  const handleReview = async (id: string, decision: "approved" | "rejected", note?: string) => {
    try {
      setIsSubmitting(true);
      const res = await adminApi.reviewEquipmentStatusRequest(token, id, {
        status: decision,
        moderator_note: note,
      });
      onSuccess(res.message);
      setIsRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionNote("");
      fetchRequests();
    } catch (err: any) {
      onError(err.message || "Lỗi khi xử lý thẩm định yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="admin-status-badge is-active">Đã Chấp Thuận</span>;
      case "rejected":
        return <span className="admin-status-badge is-suspended">Bị Từ Chối</span>;
      case "pending":
      default:
        return <span className="admin-status-badge is-pending">Chờ Thẩm Định</span>;
    }
  };

  const getTargetStatusLabel = (target: string) => {
    switch (target) {
      case "maintenance":
        return <span style={{ color: "#ffab00", fontWeight: 600 }}>🛠️ Bảo Dưỡng (Lau mốc / Thay Shutter)</span>;
      case "damaged":
        return <span style={{ color: "#ff4757", fontWeight: 600 }}>⚠️ Hư Hỏng Sau Thuê</span>;
      case "retired":
        return <span style={{ color: "#a4b0be", fontWeight: 600 }}>📦 Giải Nghệ / Thanh Lý</span>;
      case "hidden":
        return <span style={{ color: "#747d8c", fontWeight: 600 }}>👁️ Tạm Ẩn Khỏi Sàn</span>;
      case "available":
        return <span style={{ color: "#2ed573", fontWeight: 600 }}>✅ Khôi Phục Sẵn Sàng Cho Thuê</span>;
      default:
        return target;
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Thẩm Định Bảo Dưỡng & Trạng Thái Máy Ảnh (UC_A27)</h2>
          <p className="admin-card-desc">
            Xem xét các yêu cầu xin chuyển máy sang trạng thái Bảo trì, Báo hỏng hoặc Tạm ẩn của Chủ máy kèm hình ảnh kiểm chứng.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Tổng Yêu Cầu</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", marginTop: "4px" }}>{stats.total}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 171, 0, 0.08)", border: "1px solid rgba(255, 171, 0, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ffab00" }}>Chờ Thẩm Định (Cần xử lý)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ffab00", marginTop: "4px" }}>{stats.pending}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(46, 213, 115, 0.08)", border: "1px solid rgba(46, 213, 115, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#2ed573" }}>Đã Phê Duyệt</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2ed573", marginTop: "4px" }}>{stats.approved}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ff4757" }}>Đã Từ Chối</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ff4757", marginTop: "4px" }}>{stats.rejected}</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="admin-input"
          placeholder="Tìm theo tên máy ảnh, chủ máy, email..."
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
          <option value="all">Tất cả thẩm định</option>
          <option value="pending">Chờ thẩm định</option>
          <option value="approved">Đã phê duyệt</option>
          <option value="rejected">Bị từ chối</option>
        </select>

        <select
          className="admin-select"
          value={targetStatusFilter}
          onChange={(e) => setTargetStatusFilter(e.target.value)}
          style={{ width: "200px" }}
        >
          <option value="all">Mọi loại trạng thái</option>
          <option value="maintenance">Bảo dưỡng</option>
          <option value="damaged">Hư hỏng</option>
          <option value="hidden">Tạm ẩn</option>
          <option value="available">Sẵn sàng</option>
        </select>
      </div>

      {/* Requests table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Đang tải yêu cầu đổi trạng thái...
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Không có yêu cầu nào phù hợp.
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Thiết Bị</th>
                <th>Chủ Sở Hữu (Owner)</th>
                <th>Trạng Thái Hiện Tại</th>
                <th>Xin Chuyển Sang</th>
                <th>Lý Do Yêu Cầu</th>
                <th>Trạng Thái Duyệt</th>
                <th style={{ textAlign: "right" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {req.equipment_id?.images?.[0] ? (
                        <img
                          src={req.equipment_id.images[0]}
                          alt=""
                          style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px" }}
                        />
                      ) : (
                        <div style={{ width: "42px", height: "42px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          📷
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{req.equipment_id?.title || req.equipment_id?.name || "Thiết bị"}</div>
                        {req.equipment_id?.serial_number && (
                          <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                            SN: {req.equipment_id.serial_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{req.owner_id?.name || "-"}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{req.owner_id?.email || "-"}</div>
                  </td>
                  <td>
                    <span className="admin-status-badge">{req.current_status}</span>
                  </td>
                  <td>{getTargetStatusLabel(req.target_status)}</td>
                  <td>
                    <div style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={req.reason}>
                      {req.reason}
                    </div>
                  </td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      onClick={() => setSelectedRequest(req)}
                    >
                      Kiểm Tra & Duyệt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspection Modal */}
      {selectedRequest && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedRequest(null)}>
          <div
            className="admin-modal-card"
            style={{ maxWidth: "720px", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Thẩm Tra Yêu Cầu Chuyển Trạng Thái Thiết Bị</h3>
              <button
                className="admin-modal-close"
                onClick={() => setSelectedRequest(null)}
                style={{ background: "none", border: "none", color: "inherit", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Thiết bị:</div>
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                  {selectedRequest.equipment_id?.title || selectedRequest.equipment_id?.name || "Thiết bị"}
                </div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>
                  Trạng thái hiện tại: <strong>{selectedRequest.current_status}</strong>
                </div>
              </div>

              <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Chủ máy (Owner):</div>
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>{selectedRequest.owner_id?.name || "-"}</div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>{selectedRequest.owner_id?.email || "-"}</div>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Trạng thái xin chuyển sang:</div>
              <div style={{ fontSize: "16px", marginTop: "4px" }}>
                {getTargetStatusLabel(selectedRequest.target_status)}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Lý do & giải trình từ chủ máy:</div>
              <div style={{ padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", marginTop: "4px", fontSize: "14px", lineHeight: "1.5" }}>
                {selectedRequest.reason}
              </div>
            </div>

            {/* Evidence photos */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                Hình ảnh bằng chứng kiểm tra (Ảnh chụp ngoại quan / Lỗi kỹ thuật):
              </div>
              {selectedRequest.evidence_photos && selectedRequest.evidence_photos.length > 0 ? (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {selectedRequest.evidence_photos.map((photo, idx) => (
                    <a key={idx} href={photo} target="_blank" rel="noreferrer">
                      <img
                        src={photo}
                        alt="Evidence"
                        style={{ width: "120px", height: "90px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)" }}
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  Chủ máy không đính kèm hình ảnh bằng chứng.
                </div>
              )}
            </div>

            {selectedRequest.moderator_note && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(255, 71, 87, 0.08)", borderRadius: "8px", border: "1px solid rgba(255, 71, 87, 0.2)" }}>
                <div style={{ fontSize: "12px", color: "#ff4757", fontWeight: "bold" }}>Ghi chú từ Quản trị viên:</div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>{selectedRequest.moderator_note}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {selectedRequest.status === "pending" ? (
                <>
                  <button
                    className="admin-btn admin-btn-danger"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isSubmitting}
                  >
                    Từ Chối Yêu Cầu
                  </button>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={() => handleReview(selectedRequest._id, "approved")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Đang xử lý..." : "Chấp Thuận Chuyển Trạng Thái"}
                  </button>
                </>
              ) : (
                <button className="admin-btn admin-btn-secondary" onClick={() => setSelectedRequest(null)}>
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedRequest && (
        <div className="admin-modal-backdrop" onClick={() => setIsRejectModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Từ Chối Yêu Cầu Chuyển Trạng Thái</h3>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              Vui lòng nhập lý do từ chối để thông báo cho Chủ máy (VD: Chưa cung cấp đủ ảnh chụp số shot hoặc biên bản sửa chữa từ hãng):
            </p>
            <textarea
              className="admin-input"
              rows={4}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Nhập lý do chi tiết..."
              style={{ width: "100%", marginBottom: "16px" }}
              required
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => setIsRejectModalOpen(false)}>
                Hủy
              </button>
              <button
                className="admin-btn admin-btn-danger"
                disabled={isSubmitting || !rejectionNote.trim()}
                onClick={() => handleReview(selectedRequest._id, "rejected", rejectionNote)}
              >
                {isSubmitting ? "Đang gửi..." : "Xác Nhận Từ Chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
