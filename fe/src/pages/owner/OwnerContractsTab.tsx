import { useEffect, useState } from "react";
import type { OwnerContractTemplate, RentalContract, RentalRequest } from "../../types/owner";
import { ownerApi } from "../../services/ownerApi";

interface Props {
  contracts: RentalContract[];
  approvedRequests: RentalRequest[];
  token: string;
  onRefresh: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  initialSelectedRequest?: RentalRequest | null;
  onOpenHandoverTab: (contract: RentalContract) => void;
}

export default function OwnerContractsTab({
  contracts,
  approvedRequests,
  token,
  onRefresh,
  onError,
  onSuccess,
  initialSelectedRequest,
  onOpenHandoverTab,
}: Props) {
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(Boolean(initialSelectedRequest));
  const [selectedRequestForContract, setSelectedRequestForContract] = useState<string>(
    initialSelectedRequest?._id || ""
  );
  const [specialConditions, setSpecialConditions] = useState("");
  const [publishedTemplates, setPublishedTemplates] = useState<OwnerContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});

  const [editingContract, setEditingContract] = useState<RentalContract | null>(null);
  const [editedTerms, setEditedTerms] = useState("");
  const [changesSummary, setChangesSummary] = useState("");

  const [viewingContract, setViewingContract] = useState<RentalContract | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    ownerApi.getPublishedContractTemplates(token)
      .then(({ templates }) => setPublishedTemplates(templates))
      .catch((err: unknown) => onError(err instanceof Error ? err.message : "Không thể tải mẫu hợp đồng."));
  }, [token]);

  const selectedTemplate = publishedTemplates.find((template) => template._id === selectedTemplateId);
  const automaticTemplateFields = new Set([
    "contract_code", "owner_name", "owner_email", "renter_name", "renter_email",
    "renter_phone", "equipment_title", "equipment_brand", "equipment_model",
    "equipment_condition", "start_date", "end_date", "rental_price", "deposit_amount",
    "special_conditions",
  ]);

  // UC_O12: Create Contract
  async function handleCreateContract(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRequestForContract) {
      onError("Vui lòng chọn một yêu cầu thuê đã chấp nhận.");
      return;
    }

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      const res = await ownerApi.createContract(token, {
        request_id: selectedRequestForContract,
        special_conditions: specialConditions,
        template_id: selectedTemplateId || undefined,
        template_values: templateValues,
      });
      onSuccess(`Đã lập bản nháp hợp đồng "${res.contract.contract_code}" thành công.`);
      setShowCreateModal(false);
      setSpecialConditions("");
      setSelectedTemplateId("");
      setTemplateValues({});
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lập hợp đồng thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UC_O13: Update Draft Contract
  async function handleUpdateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!editingContract) return;

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      const res = await ownerApi.updateDraftContract(token, editingContract._id, {
        terms_content: editedTerms,
        changes_summary: changesSummary,
      });
      onSuccess(`Đã lưu hợp đồng phiên bản mới (v${res.contract.version}) thành công.`);
      setEditingContract(null);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Cập nhật hợp đồng thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UC_O14: Submit for Approval to Moderator
  async function handleSubmitApproval(contract: RentalContract) {
    if (!confirm(`Gửi hợp đồng "${contract.contract_code}" (phiên bản v${contract.version}) đến Rental Moderator để kiểm tra và phê duyệt?`)) {
      return;
    }

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.submitContractApproval(token, contract._id);
      onSuccess(`Đã gửi hợp đồng "${contract.contract_code}" đến Rental Moderator xét duyệt.`);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gửi phê duyệt thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UC_O15: Confirm E-Contract (Owner signs approved contract)
  async function handleConfirmEContract(contract: RentalContract) {
    setIsSigning(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.confirmEContract(token, contract._id, "Xác nhận ký điện tử bởi Owner");
      onSuccess(`Đã xác nhận ký điện tử Hợp đồng "${contract.contract_code}" thành công!`);
      setViewingContract(null);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ký hợp đồng thất bại.");
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <div className="owner-tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
            📝 Quản lý Hợp đồng cho thuê (UC_O12 - UC_O15)
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Lập hợp đồng chuẩn (UC_O12), cập nhật phiên bản (UC_O13), gửi Rental Moderator duyệt (UC_O14) & xác nhận ký điện tử (UC_O15).
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Lập hợp đồng mới (UC_O12) 📜
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="owner-section-card owner-empty-state">
          <span style={{ fontSize: "2.5rem" }}>📜</span>
          <h3>Chưa có hợp đồng nào</h3>
          <p>Hợp đồng sẽ được lập từ các yêu cầu thuê đã được bạn chấp nhận.</p>
          {approvedRequests.length > 0 && (
            <button
              className="button button-primary"
              style={{ marginTop: "12px" }}
              onClick={() => setShowCreateModal(true)}
            >
              Lập hợp đồng cho {approvedRequests.length} yêu cầu đã duyệt 🚀
            </button>
          )}
        </div>
      ) : (
        <div className="owner-contracts-list">
          {contracts.map((c) => (
            <div key={c._id} className="owner-contract-card">
              <div className="owner-contract-header">
                <div>
                  <span className="contract-code-tag">{c.contract_code}</span>
                  <span className="contract-version-tag">Phiên bản: v{c.version}</span>
                  <h3 style={{ margin: "8px 0 4px", fontSize: "1.15rem", color: "#fff" }}>
                    {c.title}
                  </h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    Người thuê: <strong style={{ color: "#fff" }}>{c.renter_id?.name || "Renter"}</strong> ({c.renter_id?.email || "N/A"}) •{" "}
                    Thiết bị: <strong style={{ color: "#fff" }}>{c.equipment_id?.title}</strong>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span className={`status-badge status-${c.status}`}>
                    {c.status === "draft"
                      ? "📝 Bản nháp"
                      : c.status === "pending_approval"
                      ? "⏳ Chờ Moderator duyệt"
                      : c.status === "moderator_rejected"
                      ? "❌ Bị từ chối / Cần sửa"
                      : c.status === "moderator_approved"
                      ? "✅ Moderator đã duyệt"
                      : c.status === "signed"
                      ? "✍️ Đã ký điện tử"
                      : c.status === "active"
                      ? "🚀 Đang thuê (Đã bàn giao)"
                      : c.status === "completed"
                      ? "🏁 Đã hoàn tất"
                      : c.status}
                  </span>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "6px" }}>
                    Tạo ngày: {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
              {c.moderator_feedback && (
                <div className="moderator-warning" style={{ marginTop: 12 }}>
                  <strong>Phản hồi kiểm duyệt:</strong> {c.moderator_feedback}
                </div>
              )}

              {/* Financial & Dates summary */}
              <div className="contract-meta-bar">
                <div>
                  <span className="meta-label">Thời gian thuê:</span>
                  <span className="meta-val">
                    {new Date(c.start_date).toLocaleDateString("vi-VN")} ➔ {new Date(c.end_date).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Giá trị thuê:</span>
                  <span className="meta-val" style={{ color: "#10b981", fontWeight: 700 }}>
                    {c.rental_price.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div>
                  <span className="meta-label">Tiền cọc cam kết:</span>
                  <span className="meta-val">
                    {c.deposit_amount.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div>
                  <span className="meta-label">Chữ ký Owner:</span>
                  <span className="meta-val">
                    {c.owner_signature?.signed ? "✅ Đã ký số" : "⏳ Chưa ký"}
                  </span>
                </div>
              </div>

              {/* Version History preview */}
              {c.version_history && c.version_history.length > 1 && (
                <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--muted)" }}>
                  <span>Lịch sử xét duyệt & chỉnh sửa ({c.version_history.length} phiên bản): </span>
                  {c.version_history.map((v, i) => (
                    <span key={i} style={{ marginRight: "8px" }}>
                      [v{v.version}: {v.changes_summary}]
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="contract-actions-bar">
                <button
                  className="button button-secondary"
                  onClick={() => setViewingContract(c)}
                >
                  👁️ Xem chi tiết điều khoản
                </button>

                {/* UC_O13: Sửa bản nháp / bị trả lại */}
                {["draft", "moderator_rejected"].includes(c.status) && (
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setEditingContract(c);
                      setEditedTerms(c.terms_content);
                      setChangesSummary(`Chỉnh sửa bổ sung phiên bản v${c.version + 1}`);
                    }}
                  >
                    ✏️ Sửa nháp & Tạo v{c.version + 1} (UC_O13)
                  </button>
                )}

                {/* UC_O14: Gửi duyệt */}
                {c.status === "draft" && (
                  <button
                    className="button button-primary"
                    onClick={() => handleSubmitApproval(c)}
                    disabled={isSubmitting}
                  >
                    📤 Gửi Moderator duyệt (UC_O14)
                  </button>
                )}

                {/* UC_O15: Ký điện tử */}
                {(c.status === "moderator_approved" || c.status === "pending_approval") &&
                  !c.owner_signature?.signed && (
                    <button
                      className="button button-primary"
                      style={{ background: "#10b981", color: "#fff" }}
                      onClick={() => setViewingContract(c)}
                    >
                      ✍️ Ký hợp đồng điện tử (UC_O15)
                    </button>
                  )}

                {/* Move to Handover when signed */}
                {(c.status === "signed" || c.status === "active") && (
                  <button
                    className="button button-primary"
                    onClick={() => onOpenHandoverTab(c)}
                  >
                    🤝 Bàn giao & Kiểm tra (UC_O08, UC_O09)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Create Contract from Request (UC_O12) */}
      {showCreateModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "600px" }}>
            <div className="owner-modal-header">
              <h3>📜 Lập hợp đồng thuê từ yêu cầu được duyệt (UC_O12)</h3>
              <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Sử dụng mẫu hợp đồng điện tử được công bố bởi nền tảng. Hệ thống tự động điền thông tin thiết bị, thời gian, giá thuê và tiền cọc.
            </p>

            <form onSubmit={handleCreateContract}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">Chọn yêu cầu thuê đã chấp thuận *</label>
                  <select
                    className="input-field"
                    value={selectedRequestForContract}
                    onChange={(e) => setSelectedRequestForContract(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn yêu cầu thuê --</option>
                    {approvedRequests.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.request_code} • {r.renter_name} • {r.equipment_id?.title} (
                        {r.rental_fee.toLocaleString("vi-VN")} đ)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Mẫu hợp đồng đã công bố</label>
                  <select
                    className="input-field"
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      setTemplateValues({});
                    }}
                  >
                    <option value="">-- Dùng mẫu mặc định của hệ thống --</option>
                    {publishedTemplates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name} • v{template.version}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                      Mẫu {selectedTemplate.template_code} v{selectedTemplate.version} được lưu cùng hợp đồng.
                    </p>
                  )}
                </div>

                {selectedTemplate?.fields.filter((field) => !automaticTemplateFields.has(field.key)).map((field) => (
                  <div key={field.key}>
                    <label className="field-label" htmlFor={`template-${field.key}`}>
                      {field.label}{field.required ? " *" : ""}
                    </label>
                    <input
                      id={`template-${field.key}`}
                      className="input-field"
                      value={templateValues[field.key] || ""}
                      onChange={(e) => setTemplateValues((current) => ({ ...current, [field.key]: e.target.value }))}
                      required={field.required}
                    />
                  </div>
                ))}

                <div>
                  <label className="field-label">Điều khoản bổ sung cụ thể (nếu có)</label>
                  <textarea
                    className="input-field"
                    rows={4}
                    placeholder="Ví dụ: Renter cam kết không đem máy đi chụp dưới mưa, kiểm tra sensor trước khi nhận..."
                    value={specialConditions}
                    onChange={(e) => setSpecialConditions(e.target.value)}
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
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang tạo..." : "Lập bản nháp hợp đồng (v1)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Draft Contract (UC_O13 with versioning) */}
      {editingContract && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "720px" }}>
            <div className="owner-modal-header">
              <h3>✏️ Chỉnh sửa hợp đồng & Lưu phiên bản (UC_O13)</h3>
              <button className="close-modal-btn" onClick={() => setEditingContract(null)}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Hợp đồng: <strong>{editingContract.contract_code}</strong>. Phiên bản hiện tại:{" "}
              <strong>v{editingContract.version}</strong> ➔ Sẽ lưu thành{" "}
              <strong style={{ color: "var(--orange)" }}>v{editingContract.version + 1}</strong>.
            </p>

            <form onSubmit={handleUpdateDraft}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">Tóm tắt nội dung thay đổi *</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ví dụ: Bổ sung điều khoản đền bù trầy xước thấu kính..."
                    value={changesSummary}
                    onChange={(e) => setChangesSummary(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Toàn văn điều khoản hợp đồng *</label>
                  <textarea
                    className="input-field"
                    rows={12}
                    value={editedTerms}
                    onChange={(e) => setEditedTerms(e.target.value)}
                    style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setEditingContract(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : `Lưu phiên bản v${editingContract.version + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Contract & Confirm E-Contract (UC_O15) */}
      {viewingContract && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "780px" }}>
            <div className="owner-modal-header">
              <h3>📄 Toàn văn Hợp đồng điện tử {viewingContract.contract_code}</h3>
              <button className="close-modal-btn" onClick={() => setViewingContract(null)}>
                ✕
              </button>
            </div>

            <div
              style={{
                background: "#0b101b",
                padding: "20px",
                borderRadius: "8px",
                maxHeight: "380px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                color: "#e2e8f0",
                lineHeight: 1.6,
                border: "1px solid var(--border)",
              }}
            >
              {viewingContract.terms_content}
            </div>

            <div style={{ marginTop: "16px", padding: "14px", background: "#1a2235", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>Chữ ký điện tử của Owner:</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    {viewingContract.owner_signature?.signed ? (
                      <span style={{ color: "#10b981" }}>
                        ✅ Đã ký bởi {viewingContract.owner_signature.signer_name} lúc{" "}
                        {viewingContract.owner_signature.signed_at &&
                          new Date(viewingContract.owner_signature.signed_at).toLocaleString("vi-VN")}
                      </span>
                    ) : (
                      "Chưa thực hiện ký xác nhận điện tử."
                    )}
                  </div>
                </div>

                {!viewingContract.owner_signature?.signed && (
                  <button
                    className="button button-primary"
                    style={{ background: "#10b981" }}
                    onClick={() => handleConfirmEContract(viewingContract)}
                    disabled={isSigning}
                  >
                    {isSigning ? "Đang ký số..." : "Xác nhận ký điện tử (UC_O15) ✍️"}
                  </button>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setViewingContract(null)}
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
