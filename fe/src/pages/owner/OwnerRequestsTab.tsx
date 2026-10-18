import { useState } from "react";
import type { RentalRequest } from "../../types/owner";
import { ownerApi } from "../../services/ownerApi";

interface Props {
  requests: RentalRequest[];
  token: string;
  onRefresh: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onCreateContract: (req: RentalRequest) => void;
}

export default function OwnerRequestsTab({
  requests,
  token,
  onRefresh,
  onError,
  onSuccess,
  onCreateContract,
}: Props) {
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  async function handleApprove(req: RentalRequest) {
    if (!confirm(`Bạn có chắc chắn muốn CHẤP NHẬN yêu cầu thuê "${req.request_code}" của ${req.renter_name}?`)) {
      return;
    }

    setIsProcessing(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.respondRentalRequest(token, req._id, "approve");
      onSuccess(`Đã chấp nhận yêu cầu thuê "${req.request_code}". Bạn có thể tạo hợp đồng ngay.`);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Chấp nhận yêu cầu thất bại.");
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
            📬 Yêu cầu thuê từ Renter (UC_O07)
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Xem xét hồ sơ người thuê, chấp thuận hoặc từ chối có lý do. Đây là quyết định độc lập của Owner trước khi Moderator duyệt hợp đồng.
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
            <option value="pending">Chờ Owner duyệt ({requests.filter((r) => r.status === "pending").length})</option>
            <option value="approved">Đã chấp thuận ({requests.filter((r) => r.status === "approved").length})</option>
            <option value="contract_created">Đã tạo HĐ ({requests.filter((r) => r.status === "contract_created").length})</option>
            <option value="rejected">Đã từ chối ({requests.filter((r) => r.status === "rejected").length})</option>
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
                  <th>Ghi chú của Renter</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác (UC_O07)</th>
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
                    <td>{req.deposit_amount.toLocaleString("vi-VN")} đ</td>
                    <td style={{ maxWidth: "180px" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                        {req.renter_note || "Không có ghi chú"}
                      </span>
                      {req.rejection_reason && (
                        <div style={{ color: "#ef4444", fontSize: "0.78rem", marginTop: "4px" }}>
                          Lý do từ chối: {req.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${req.status}`}>
                        {req.status === "pending"
                          ? "⏳ Chờ duyệt"
                          : req.status === "approved"
                          ? "✅ Đã chấp thuận"
                          : req.status === "contract_created"
                          ? "📝 Đã tạo HĐ"
                          : req.status === "rejected"
                          ? "❌ Đã từ chối"
                          : req.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        {req.status === "pending" && (
                          <>
                            <button
                              className="button button-primary"
                              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                              onClick={() => handleApprove(req)}
                              disabled={isProcessing}
                              title="Chấp nhận cho thuê"
                            >
                              ✓ Chấp nhận
                            </button>
                            <button
                              className="button button-quiet"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", color: "#ef4444" }}
                              onClick={() => {
                                setSelectedRequest(req);
                                setShowRejectModal(true);
                              }}
                              disabled={isProcessing}
                              title="Từ chối cho thuê và ghi lý do"
                            >
                              ✕ Từ chối
                            </button>
                          </>
                        )}

                        {req.status === "approved" && (
                          <button
                            className="button button-primary"
                            style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                            onClick={() => onCreateContract(req)}
                          >
                            + Lập hợp đồng (UC_O12) 📜
                          </button>
                        )}

                        {req.status === "contract_created" && (
                          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                            Đã lập hợp đồng
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                style={{ background: "#ef4444", color: "#fff" }}
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
