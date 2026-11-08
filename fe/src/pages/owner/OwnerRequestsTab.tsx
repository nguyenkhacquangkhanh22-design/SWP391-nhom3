import { useState } from "react";
import type { RentalRequest } from "../../types/owner";
import { ownerApi } from "../../services/ownerApi";

interface Props {
  requests: RentalRequest[];
  token: string;
  onRefresh: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function OwnerRequestsTab({
  requests,
  token,
  onRefresh,
  onError,
  onSuccess,
}: Props) {
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [viewingRequest, setViewingRequest] = useState<RentalRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "approved") return r.status === "approved" || r.status === "contract_created";
    if (statusFilter === "rejected") return r.status === "rejected" || r.status === "moderator_rejected";
    if (statusFilter === "pending") return r.status === "pending" || r.status === "pending_moderator";
    return r.status === statusFilter;
  });

  async function handleApprove(req: RentalRequest) {
    setIsProcessing(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.respondRentalRequest(token, req._id, "approve");
      onRefresh();
      onSuccess(`Đã phê duyệt yêu cầu thuê "${req.request_code}" thành công!`);
      if (viewingRequest && viewingRequest._id === req._id) {
        setViewingRequest({ ...viewingRequest, status: "approved" });
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Phê duyệt yêu cầu thất bại.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleConfirmReject() {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      onError("Vui lòng nhập lý do từ chối yêu cầu.");
      return;
    }

    setIsProcessing(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.respondRentalRequest(token, selectedRequest._id, "reject", rejectionReason);
      onSuccess(`Đã từ chối yêu cầu thuê "${selectedRequest.request_code}" và ghi nhận lý do.`);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason("");
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Từ chối yêu cầu thất bại.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="owner-tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
            📬 Quản lý Yêu cầu thuê (UC_O07)
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Quy trình:{" "}
            <strong style={{ color: "#38bdf8" }}>1. Người thuê gửi yêu cầu trực tiếp</strong> ➔{" "}
            <strong style={{ color: "#10b981" }}>2. Owner xem xét Phê duyệt hoặc Từ chối</strong>.
          </p>
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Lọc trạng thái:</span>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "6px 12px", width: "auto" }}
          >
            <option value="all">Tất cả ({requests.length})</option>
            <option value="pending">
              📬 Chờ Owner duyệt ({requests.filter((r) => r.status === "pending" || r.status === "pending_moderator").length})
            </option>
            <option value="approved">
              ✅ Đã phê duyệt ({requests.filter((r) => r.status === "approved" || r.status === "contract_created").length})
            </option>
            <option value="rejected">
              ❌ Đã từ chối ({requests.filter((r) => r.status === "rejected" || r.status === "moderator_rejected").length})
            </option>
            <option value="pending_moderator">
              ⏳ Yêu cầu cũ chờ chuyển tiếp ({requests.filter((r) => r.status === "pending_moderator").length})
            </option>
          </select>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="owner-section-card owner-empty-state">
          <span style={{ fontSize: "2.5rem" }}>📭</span>
          <h3>Không tìm thấy yêu cầu thuê nào</h3>
          <p>Hiện tại không có yêu cầu nào phù hợp với bộ lọc đã chọn.</p>
        </div>
      ) : (
        <div className="owner-section-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="owner-table-wrapper">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Thiết bị</th>
                  <th>Người thuê</th>
                  <th>Thời gian thuê</th>
                  <th>Tiền thuê</th>
                  <th>Tiền cọc</th>
                  <th>Ghi chú yêu cầu thuê</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req._id}>
                    <td>
                      <strong style={{ color: "#fff" }}>{req.request_code}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img
                          src={
                            req.equipment_id?.images?.[0] ||
                            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
                          }
                          alt=""
                          style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover" }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: "#fff" }}>
                            {req.equipment_id?.title || "Thiết bị"}
                          </div>
                          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                            {req.equipment_id?.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: "#fff" }}>{req.renter_name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                        📞 {req.renter_phone || "N/A"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                        ✉️ {req.renter_email || "N/A"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem" }}>
                        {new Date(req.start_date).toLocaleDateString("vi-VN")}
                        <br />
                        ↳ {new Date(req.end_date).toLocaleDateString("vi-VN")}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--orange)" }}>
                        ({req.duration_days} ngày • {req.rental_type === "hourly" ? "Theo giờ" : "Theo ngày"})
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "#10b981" }}>
                        {req.rental_fee.toLocaleString("vi-VN")} đ
                      </strong>
                    </td>
                    <td style={{ color: "#10b981" }}>0 đ (Miễn cọc)</td>
                    <td style={{ maxWidth: "220px" }}>
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                        {req.renter_note || "Không có ghi chú"}
                      </div>
                      {req.moderator_note && (
                        <div style={{ color: "#38bdf8", fontSize: "0.76rem", marginTop: "4px" }}>
                          🛡️ Quản lý web: {req.moderator_note}
                        </div>
                      )}
                      {req.rejection_reason && (
                        <div style={{ color: "#ef4444", fontSize: "0.78rem", marginTop: "4px" }}>
                          Lý do từ chối: {req.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${req.status}`}>
                        {req.status === "pending_moderator"
                          ? "📬 Chờ Owner duyệt"
                          : req.status === "pending"
                          ? "📬 Chờ Owner duyệt"
                          : (req.status === "approved" || req.status === "contract_created")
                          ? "✅ Đã phê duyệt"
                          : req.status === "moderator_rejected"
                          ? "❌ Quản lý web từ chối"
                          : req.status === "rejected"
                          ? "❌ Owner từ chối"
                          : req.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {["pending", "pending_moderator"].includes(req.status) && (
                          <>
                            <button
                              className="button button-primary"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}
                              onClick={() => void handleApprove(req)}
                              disabled={isProcessing}
                              title="Phê duyệt chấp nhận yêu cầu thuê này"
                            >
                              ✓ Phê duyệt
                            </button>
                            <button
                              className="button button-quiet"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", color: "#ef4444", width: "auto" }}
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowRejectModal(true);
                              }}
                              disabled={isProcessing}
                              title="Từ chối cho thuê và ghi rõ lý do"
                            >
                              ✕ Từ chối
                            </button>
                          </>
                        )}

                        <button
                          className="button button-secondary"
                          style={{ padding: "6px 10px", fontSize: "0.8rem", width: "auto" }}
                          onClick={() => setViewingRequest(req)}
                          title="Xem thông tin chi tiết yêu cầu thuê"
                        >
                          👁️ Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW REQUEST DETAIL MODAL */}
      {viewingRequest && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "600px" }}>
            <div className="owner-modal-header">
              <div>
                <span className="contract-code-tag">{viewingRequest.request_code}</span>
                <h3 style={{ margin: "6px 0 0", color: "#fff" }}>Chi tiết yêu cầu thuê thiết bị</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setViewingRequest(null)}>
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: "16px", marginTop: "10px" }}>
              {/* Status Banner */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Trạng thái yêu cầu:</span>
                <span className={`status-badge status-${viewingRequest.status}`}>
                  {viewingRequest.status === "pending_moderator"
                    ? "📬 Chờ Owner duyệt"
                    : viewingRequest.status === "pending"
                    ? "📬 Chờ Owner duyệt"
                    : (viewingRequest.status === "approved" || viewingRequest.status === "contract_created")
                    ? "✅ Đã phê duyệt"
                    : viewingRequest.status === "moderator_rejected"
                    ? "❌ Quản lý web từ chối"
                    : viewingRequest.status === "rejected"
                    ? "❌ Owner từ chối"
                    : viewingRequest.status}
                </span>
              </div>

              {/* Equipment info */}
              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "center",
                  padding: "12px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <img
                  src={
                    viewingRequest.equipment_id?.images?.[0] ||
                    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
                  }
                  alt=""
                  style={{ width: "60px", height: "60px", borderRadius: "8px", objectFit: "cover" }}
                />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 4px", color: "#fff", fontSize: "0.95rem" }}>
                    {viewingRequest.equipment_id?.title || "Thiết bị cho thuê"}
                  </h4>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {viewingRequest.equipment_id?.brand} {viewingRequest.equipment_id?.model_name} • Danh mục:{" "}
                    {viewingRequest.equipment_id?.category}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "2px" }}>
                    Giá niêm yết: {viewingRequest.equipment_id?.pricing?.price_per_day?.toLocaleString("vi-VN")} đ/ngày
                  </div>
                </div>
              </div>

              {/* Renter & Schedule Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "4px" }}>
                    👤 NGƯỜI THUÊ
                  </div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>{viewingRequest.renter_name}</div>
                  <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: "2px" }}>
                    📞 {viewingRequest.renter_phone || "N/A"}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    ✉️ {viewingRequest.renter_email || "N/A"}
                  </div>
                </div>

                <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "4px" }}>
                    📅 THỜI GIAN THUÊ
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#fff" }}>
                    Bắt đầu: {new Date(viewingRequest.start_date).toLocaleString("vi-VN")}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#fff" }}>
                    Kết thúc: {new Date(viewingRequest.end_date).toLocaleString("vi-VN")}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--orange)", marginTop: "2px" }}>
                    Tổng: {viewingRequest.duration_days} ngày ({viewingRequest.rental_type === "hourly" ? "Theo giờ" : "Theo ngày"})
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>TIỀN THUÊ THIẾT BỊ</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>
                    {viewingRequest.rental_fee.toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>TIỀN ĐẶT CỌC BẢO ĐẢM</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f59e0b", marginTop: "2px" }}>
                    0 đ (Miễn cọc)
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingRequest.renter_note && (
                <div style={{ fontSize: "0.85rem", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                  <strong style={{ color: "#fff" }}>📝 Ghi chú của Người thuê:</strong>
                  <div style={{ color: "var(--muted)", marginTop: "2px" }}>{viewingRequest.renter_note}</div>
                </div>
              )}

              {viewingRequest.moderator_note && (
                <div style={{ fontSize: "0.85rem", padding: "8px 12px", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "6px" }}>
                  <strong style={{ color: "#38bdf8" }}>🛡️ Ý kiến Quản lý web:</strong>
                  <div style={{ color: "#bae6fd", marginTop: "2px" }}>{viewingRequest.moderator_note}</div>
                </div>
              )}

              {viewingRequest.rejection_reason && (
                <div style={{ fontSize: "0.85rem", padding: "8px 12px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px" }}>
                  <strong style={{ color: "#ef4444" }}>❌ Lý do từ chối:</strong>
                  <div style={{ color: "#fca5a5", marginTop: "2px" }}>{viewingRequest.rejection_reason}</div>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setViewingRequest(null)}
              >
                Đóng
              </button>

              {["pending", "pending_moderator"].includes(viewingRequest.status) && (
                <>
                  <button
                    type="button"
                    className="button"
                    style={{ background: "#ef4444", color: "#fff", width: "auto" }}
                    onClick={() => {
                      setSelectedRequest(viewingRequest);
                      setShowRejectModal(true);
                    }}
                    disabled={isProcessing}
                  >
                    ✕ Từ chối
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ width: "auto" }}
                    onClick={() => void handleApprove(viewingRequest)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Đang xử lý..." : "✓ Phê duyệt yêu cầu"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL (UC_O07 with recorded reason) */}
      {showRejectModal && selectedRequest && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "480px" }}>
            <div className="owner-modal-header">
              <h3 style={{ color: "#ef4444" }}>✕ Từ chối yêu cầu thuê (UC_O07)</h3>
              <button className="close-modal-btn" onClick={() => setShowRejectModal(false)}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 0 }}>
              Bạn đang từ chối yêu cầu thuê <strong>{selectedRequest.request_code}</strong> của{" "}
              <strong>{selectedRequest.renter_name}</strong>. Theo quy định hệ thống, Owner cần ghi rõ lý do.
            </p>

            <div>
              <label className="field-label">Lý do từ chối cho thuê *</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Ví dụ: Thiết bị có lịch bảo trì phát sinh, thời gian bàn giao không thuận tiện..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setShowRejectModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="button"
                style={{ background: "#ef4444", color: "#fff", width: "auto" }}
                onClick={handleConfirmReject}
                disabled={isProcessing}
              >
                {isProcessing ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
