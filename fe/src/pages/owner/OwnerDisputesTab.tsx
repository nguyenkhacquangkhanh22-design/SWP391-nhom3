import { useState, useEffect } from "react";
import type { Dispute, RentalContract } from "../../types/owner";
import { ownerApi } from "../../services/ownerApi";

interface Props {
  contracts: RentalContract[];
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function OwnerDisputesTab({ contracts, token, onError, onSuccess }: Props) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [selectedContractId, setSelectedContractId] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("Thiết bị bị trầy xước/hư hỏng không chịu bồi thường");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [claimedCompensation, setClaimedCompensation] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, [token]);

  async function loadDisputes() {
    try {
      const data = await ownerApi.getDisputes(token);
      setDisputes(data.disputes);
    } catch (err) {
      console.error(err);
    }
  }

  // UC_O17: Submit Rental Dispute
  async function handleSubmitDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContractId) {
      onError("Vui lòng chọn hợp đồng cho thuê liên quan.");
      return;
    }

    if (Number(claimedCompensation) < 0) {
      onError("Số tiền yêu cầu bồi thường không được là số âm (phải ≥ 0).");
      return;
    }

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.submitDispute(token, {
        contract_id: selectedContractId as any,
        title,
        reason,
        description,
        evidence_urls: evidenceUrl ? [evidenceUrl] : [],
        claimed_compensation: Number(claimedCompensation),
      });
      onSuccess("Đã gửi khiếu nại (UC_O17) thành công. Ban quản trị sẽ tiến hành thẩm định bằng chứng.");
      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setEvidenceUrl("");
      setClaimedCompensation(0);
      loadDisputes();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gửi khiếu nại thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="owner-tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
            ⚖️ Quản lý Khiếu nại giao dịch (UC_O17)
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Gửi khiếu nại về giao dịch, thiết bị hoặc vi phạm nghĩa vụ hợp đồng của Renter, kèm hình ảnh/tài liệu minh chứng.
          </p>
        </div>
        <button
          className="button button-primary"
          style={{ background: "#ef4444" }}
          onClick={() => setShowCreateModal(true)}
        >
          + Gửi khiếu nại mới (UC_O17) ⚠️
        </button>
      </div>

      {disputes.length === 0 ? (
        <div className="owner-section-card owner-empty-state">
          <span style={{ fontSize: "2.5rem" }}>⚖️</span>
          <h3>Chưa có khiếu nại nào</h3>
          <p>Mọi giao dịch cho thuê của bạn hiện đang diễn ra thuận lợi mà không có tranh chấp.</p>
        </div>
      ) : (
        <div className="owner-section-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="owner-table-wrapper">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Mã khiếu nại</th>
                  <th>Hợp đồng / Đơn thuê</th>
                  <th>Người bị khiếu nại</th>
                  <th>Mức độ & Lý do</th>
                  <th>Bằng chứng</th>
                  <th>Số tiền yêu cầu</th>
                  <th>Trạng thái</th>
                  <th>Kết luận giải quyết</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => {
                  const level = d.damageLevel || d.damage_level;
                  const images = d.evidenceImages || d.evidence_urls || [];
                  const comp = d.claimedAmount ?? d.claimed_compensation ?? 0;
                  const renter = d.renter_id || (d.rentalOrderId as any)?.renterId;
                  const orderCode = d.contract_id?.contract_code || (d.rentalOrderId as any)?.rentalCode || "Đơn thuê";
                  const resolved = d.status === "resolved" || d.status === "RESOLVED_REFUND_OWNER";
                  const rejected = d.status === "dismissed" || d.status === "REJECTED";
                  const isPending = d.status === "pending_review" || d.status === "PENDING_ADMIN_REVIEW";

                  return (
                    <tr key={d._id}>
                      <td>
                        <strong style={{ color: "#fff" }}>{d.dispute_code || (d as any).code}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          {new Date(d.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "#38bdf8", fontWeight: 600 }}>
                          #{orderCode}
                        </span>
                        {(d.rentalOrderId as any)?.equipmentTitle && (
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                            {(d.rentalOrderId as any).equipmentTitle}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: "#fff" }}>{renter?.name || "Khách thuê"}</div>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          {renter?.phone || renter?.email}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          {level === "MINOR" && (
                            <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", fontWeight: 700 }}>
                              🟢 Nhẹ
                            </span>
                          )}
                          {level === "SEVERE" && (
                            <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)", fontWeight: 700 }}>
                              🟡 Nặng
                            </span>
                          )}
                          {level === "TOTAL_LOSS" && (
                            <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", fontWeight: 700 }}>
                              🔴 Hỏng hoàn toàn
                            </span>
                          )}
                          <strong style={{ color: "#fff", fontSize: "0.85rem" }}>{d.title || d.reason}</strong>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", maxWidth: "250px" }}>
                          {d.description || d.reason}
                        </div>
                      </td>
                      <td>
                        {images.length > 0 ? (
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "90px" }}>
                            {images.slice(0, 3).map((img, idx) => (
                              <a key={idx} href={img} target="_blank" rel="noreferrer">
                                <img
                                  src={img}
                                  alt="Bằng chứng"
                                  style={{ width: "26px", height: "26px", objectFit: "cover", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.15)" }}
                                />
                              </a>
                            ))}
                            {images.length > 3 && (
                              <span style={{ fontSize: "0.7rem", color: "var(--muted)", alignSelf: "center" }}>
                                +{images.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Không có</span>
                        )}
                      </td>
                      <td style={{ color: "#ef4444", fontWeight: 700 }}>
                        {comp.toLocaleString("vi-VN")} đ
                      </td>
                      <td>
                        <span className={`status-badge status-${d.status}`}>
                          {isPending
                            ? "⏳ Chờ Admin duyệt"
                            : d.status === "investigating"
                            ? "🔍 Đang điều tra"
                            : resolved
                            ? "✅ Đã bồi thường"
                            : rejected
                            ? "❌ Bác bỏ"
                            : d.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: "200px" }}>
                        <span style={{ fontSize: "0.82rem", color: d.adminNote || d.resolution_note ? (resolved ? "#10b981" : "#f87171") : "var(--muted)" }}>
                          {d.adminNote || d.resolution_note || "Đang xử lý hồ sơ..."}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Submit Rental Dispute (UC_O17) */}
      {showCreateModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "600px" }}>
            <div className="owner-modal-header">
              <h3 style={{ color: "#ef4444" }}>⚠️ Gửi khiếu nại Renter (UC_O17)</h3>
              <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDispute}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">Chọn Hợp đồng cho thuê liên quan *</label>
                  <select
                    className="input-field"
                    value={selectedContractId}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn hợp đồng --</option>
                    {contracts.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.contract_code} • {c.renter_id?.name || "Renter"} • {c.equipment_id?.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Tiêu đề khiếu nại *</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ví dụ: Renter làm xước cảm biến máy ảnh nhưng từ chối đền bù"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Lý do khiếu nại</label>
                  <select
                    className="input-field"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option value="Thiết bị bị trầy xước/hư hỏng không chịu bồi thường">
                      Thiết bị bị trầy xước/hư hỏng không chịu bồi thường
                    </option>
                    <option value="Trả thiết bị trễ hạn nhiều ngày không báo">
                      Trả thiết bị trễ hạn nhiều ngày không báo
                    </option>
                    <option value="Thiếu phụ kiện hoặc tráo đổi linh kiện gốc">
                      Thiếu phụ kiện hoặc tráo đổi linh kiện gốc
                    </option>
                    <option value="Người thuê không hợp tác ký biên bản trả">
                      Người thuê không hợp tác ký biên bản trả
                    </option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Mô tả chi tiết sự việc *</label>
                  <textarea
                    className="input-field"
                    rows={4}
                    placeholder="Trình bày chi tiết mốc thời gian bàn giao, phát hiện hư hỏng, trao đổi giữa hai bên..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Số tiền yêu cầu bồi thường (VND)</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0}
                    step={100000}
                    value={claimedCompensation}
                    onChange={(e) => setClaimedCompensation(Math.max(0, Number(e.target.value)))}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e") e.preventDefault();
                    }}
                  />
                </div>

                <div>
                  <label className="field-label">Link ảnh / video bằng chứng đối chiếu</label>
                  <input
                    className="input-field"
                    type="url"
                    placeholder="https://... ảnh đối chiếu với biên bản bàn giao ban đầu"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button"
                  style={{ background: "#ef4444", color: "#fff" }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi khiếu nại chính thức"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
