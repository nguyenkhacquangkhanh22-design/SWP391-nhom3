import { useState, useEffect } from "react";
import type { RentalContract, HandoverRecord } from "../../types/owner";
import { ownerApi } from "../../services/ownerApi";

interface Props {
  contracts: RentalContract[];
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  selectedContract?: RentalContract | null;
  onRefreshContracts: () => void;
}

export default function OwnerHandoverTab({
  contracts,
  token,
  onError,
  onSuccess,
  selectedContract,
  onRefreshContracts,
}: Props) {
  const eligibleContracts = contracts.filter((c) =>
    ["signed", "active", "completed"].includes(c.status)
  );

  const [activeContractId, setActiveContractId] = useState<string>(
    selectedContract?._id || eligibleContracts[0]?._id || ""
  );

  const [records, setRecords] = useState<HandoverRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Form states: Handover (UC_O08)
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [accessoriesList, setAccessoriesList] = useState<
    { item: string; checked: boolean; notes: string }[]
  >([
    { item: "Thân máy / Thiết bị chính", checked: true, notes: "Nguyên vẹn, không móp méo" },
    { item: "Pin thiết bị", checked: true, notes: "Đầy 100% pin" },
    { item: "Bộ sạc / Cáp nguồn", checked: true, notes: "Hoạt động bình thường" },
    { item: "Thẻ nhớ / Ổ cứng lưu trữ", checked: true, notes: "Đã format sạch" },
    { item: "Túi đựng / Hộp chống sốc", checked: true, notes: "Đầy đủ mút đệm" },
  ]);
  const [handoverCondition, setHandoverCondition] = useState(
    "Thiết bị hoạt động hoàn hảo, kính lens trong, sensor sạch, không trầy xước."
  );
  const [handoverWorkingStatus, setHandoverWorkingStatus] = useState("Hoạt động bình thường");
  const [handoverProofUrl, setHandoverProofUrl] = useState(
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
  );
  const [handoverNotes, setHandoverNotes] = useState(
    "Đã hướng dẫn Renter thao tác cơ bản và kiểm tra trực tiếp tại chỗ."
  );

  // Form states: Return Inspection (UC_O09)
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnCondition, setReturnCondition] = useState("Thiết bị nguyên vẹn, có hao mòn nhẹ.");
  const [returnWorkingStatus, setReturnWorkingStatus] = useState("Hoạt động ổn định");
  const [missingItemsInput, setMissingItemsInput] = useState("");
  const [damageDetected, setDamageDetected] = useState("");
  const [damageCost, setDamageCost] = useState(0);
  const [returnProofUrl, setReturnProofUrl] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeContractId) {
      loadRecords(activeContractId);
    }
  }, [activeContractId]);

  async function loadRecords(contractId: string) {
    setIsLoadingRecords(true);
    try {
      const data = await ownerApi.getHandoverRecords(token, contractId);
      setRecords(data.records);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRecords(false);
    }
  }

  const currentContract = contracts.find((c) => c._id === activeContractId);
  const handoverRecord = records.find((r) => r.record_type === "handover");
  const returnRecord = records.find((r) => r.record_type === "return");

  // UC_O08: Submit Handover Protocol
  async function handleSubmitHandover(e: React.FormEvent) {
    e.preventDefault();
    if (!activeContractId) return;

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.createHandoverRecord(token, activeContractId, {
        accessories_checklist: accessoriesList,
        physical_condition: handoverCondition,
        working_status: handoverWorkingStatus,
        evidence_photos: handoverProofUrl ? [handoverProofUrl] : [],
        notes: handoverNotes,
      });
      onSuccess("Đã lập Biên bản bàn giao thiết bị (UC_O08) và chuyển trạng thái thuê sang Đang thuê.");
      setShowHandoverModal(false);
      loadRecords(activeContractId);
      onRefreshContracts();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lập biên bản bàn giao thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UC_O09: Submit Return Inspection Protocol
  async function handleSubmitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!activeContractId) return;

    setIsSubmitting(true);
    onError("");
    onSuccess("");

    const missingList = missingItemsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await ownerApi.createReturnInspection(token, activeContractId, {
        accessories_checklist: accessoriesList,
        physical_condition: returnCondition,
        working_status: returnWorkingStatus,
        missing_items: missingList,
        damage_detected: damageDetected,
        estimated_damage_cost: Number(damageCost),
        evidence_photos: returnProofUrl ? [returnProofUrl] : [],
        notes: returnNotes,
      });
      onSuccess("Đã lập Biên bản kiểm tra trả thiết bị (UC_O09) và cập nhật dữ liệu quyết toán!");
      setShowReturnModal(false);
      loadRecords(activeContractId);
      onRefreshContracts();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lập biên bản kiểm tra trả thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="owner-tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
            🤝 Biên bản Bàn giao & Kiểm tra trả thiết bị (UC_O08, UC_O09)
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Lập biên bản giao nhận trực tiếp với Renter, đối chiếu phụ kiện, tình trạng vật lý và minh chứng hình ảnh thực tế.
          </p>
        </div>

        {/* Contract Selector */}
        {eligibleContracts.length > 0 && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Hợp đồng:</span>
            <select
              className="input-field"
              value={activeContractId}
              onChange={(e) => setActiveContractId(e.target.value)}
              style={{ width: "auto" }}
            >
              {eligibleContracts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.contract_code} • {c.renter_id?.name || "Renter"} • {c.equipment_id?.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!currentContract ? (
        <div className="owner-section-card owner-empty-state">
          <span style={{ fontSize: "2.5rem" }}>📋</span>
          <h3>Chưa có hợp đồng nào sẵn sàng bàn giao</h3>
          <p>
            Biên bản bàn giao áp dụng cho các hợp đồng đã được ký kết điện tử (Trạng thái: Signed, Active hoặc Completed).
          </p>
        </div>
      ) : isLoadingRecords ? (
        <div className="app-loading" style={{ margin: "40px auto" }}>
          Đang tải dữ liệu biên bản...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Column 1: Biên bản bàn giao thiết bị (UC_O08) */}
          <div className="owner-section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>
                1️⃣ Biên bản bàn giao thiết bị (UC_O08)
              </h3>
              {handoverRecord ? (
                <span className="status-badge status-active">✅ Đã bàn giao</span>
              ) : (
                <button
                  className="button button-primary"
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                  onClick={() => setShowHandoverModal(true)}
                >
                  + Lập biên bản bàn giao (UC_O08)
                </button>
              )}
            </div>

            {handoverRecord ? (
              <div className="record-details-view">
                <div className="record-info-row">
                  <span className="info-lbl">Thời điểm bàn giao:</span>
                  <span className="info-val">
                    {new Date(handoverRecord.record_date).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="record-info-row">
                  <span className="info-lbl">Tình trạng vật lý:</span>
                  <span className="info-val" style={{ color: "#fff" }}>
                    {handoverRecord.physical_condition}
                  </span>
                </div>
                <div className="record-info-row">
                  <span className="info-lbl">Trạng thái hoạt động:</span>
                  <span className="info-val">{handoverRecord.working_status}</span>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "6px" }}>
                    Danh mục phụ kiện bàn giao:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.85rem" }}>
                    {handoverRecord.accessories_checklist.map((acc, i) => (
                      <li key={i} style={{ color: acc.checked ? "#10b981" : "var(--muted)" }}>
                        {acc.checked ? "✓" : "✗"} {acc.item} {acc.notes ? `(${acc.notes})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>

                {handoverRecord.evidence_photos && handoverRecord.evidence_photos.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "6px" }}>
                      Ảnh minh chứng lúc giao:
                    </div>
                    <img
                      src={handoverRecord.evidence_photos[0]}
                      alt="Handover proof"
                      style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "8px" }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="owner-empty-state" style={{ padding: "30px 10px" }}>
                <p style={{ color: "var(--muted)", margin: 0 }}>
                  Chưa lập biên bản bàn giao. Khi giao máy cho khách thuê, hãy bấm lập biên bản để xác nhận phụ kiện và tình trạng ban đầu.
                </p>
              </div>
            )}
          </div>

          {/* Column 2: Biên bản kiểm tra trả thiết bị (UC_O09) */}
          <div className="owner-section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>
                2️⃣ Biên bản kiểm tra trả thiết bị (UC_O09)
              </h3>
              {returnRecord ? (
                <span className="status-badge status-completed">🏁 Đã kiểm tra trả</span>
              ) : handoverRecord ? (
                <button
                  className="button button-primary"
                  style={{ fontSize: "0.8rem", padding: "6px 12px", background: "#f59e0b" }}
                  onClick={() => setShowReturnModal(true)}
                >
                  + Kiểm tra nhận trả (UC_O09)
                </button>
              ) : (
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Cần bàn giao trước</span>
              )}
            </div>

            {returnRecord ? (
              <div className="record-details-view">
                <div className="record-info-row">
                  <span className="info-lbl">Thời điểm kiểm tra trả:</span>
                  <span className="info-val">
                    {new Date(returnRecord.record_date).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="record-info-row">
                  <span className="info-lbl">Tình trạng khi trả:</span>
                  <span className="info-val" style={{ color: "#fff" }}>
                    {returnRecord.physical_condition}
                  </span>
                </div>

                {returnRecord.missing_items && returnRecord.missing_items.length > 0 && (
                  <div className="record-info-row">
                    <span className="info-lbl" style={{ color: "#ef4444" }}>Phụ kiện thiếu:</span>
                    <span className="info-val" style={{ color: "#ef4444" }}>
                      {returnRecord.missing_items.join(", ")}
                    </span>
                  </div>
                )}

                {returnRecord.damage_detected && (
                  <div className="record-info-row">
                    <span className="info-lbl" style={{ color: "#ef4444" }}>Hư hỏng ghi nhận:</span>
                    <span className="info-val" style={{ color: "#ef4444" }}>
                      {returnRecord.damage_detected}
                    </span>
                  </div>
                )}

                {returnRecord.estimated_damage_cost && returnRecord.estimated_damage_cost > 0 ? (
                  <div className="record-info-row" style={{ background: "rgba(239, 68, 68, 0.1)", padding: "8px", borderRadius: "6px" }}>
                    <span className="info-lbl" style={{ color: "#ef4444", fontWeight: 700 }}>
                      Khấu trừ cọc bồi thường:
                    </span>
                    <span className="info-val" style={{ color: "#ef4444", fontWeight: 700 }}>
                      {returnRecord.estimated_damage_cost.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                ) : (
                  <div style={{ color: "#10b981", fontSize: "0.85rem", marginTop: "8px" }}>
                    ✓ Không phát hiện hư hỏng, hoàn 100% tiền cọc.
                  </div>
                )}

                {returnRecord.evidence_photos && returnRecord.evidence_photos.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "6px" }}>
                      Ảnh minh chứng lúc trả:
                    </div>
                    <img
                      src={returnRecord.evidence_photos[0]}
                      alt="Return proof"
                      style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "8px" }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="owner-empty-state" style={{ padding: "30px 10px" }}>
                <p style={{ color: "var(--muted)", margin: 0 }}>
                  Chưa lập biên bản nhận trả. Khi người thuê hoàn trả thiết bị, bấm kiểm tra để đối chiếu với biên bản bàn giao ban đầu.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Handover Equipment (UC_O08) */}
      {showHandoverModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "600px" }}>
            <div className="owner-modal-header">
              <h3>🤝 Lập Biên bản Bàn giao thiết bị (UC_O08)</h3>
              <button className="close-modal-btn" onClick={() => setShowHandoverModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitHandover}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">Tình trạng vật lý & thẩm mỹ khi giao *</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={handoverCondition}
                    onChange={(e) => setHandoverCondition(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Kiểm tra phụ kiện đi kèm:</label>
                  <div style={{ display: "grid", gap: "8px", background: "#111827", padding: "12px", borderRadius: "8px" }}>
                    {accessoriesList.map((item, idx) => (
                      <label key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.88rem" }}>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => {
                            const updated = [...accessoriesList];
                            updated[idx].checked = e.target.checked;
                            setAccessoriesList(updated);
                          }}
                        />
                        <span>{item.item}</span>
                        <input
                          type="text"
                          className="input-field"
                          style={{ padding: "4px 8px", fontSize: "0.8rem", marginLeft: "auto", width: "180px" }}
                          placeholder="Ghi chú (serial pin,...)"
                          value={item.notes}
                          onChange={(e) => {
                            const updated = [...accessoriesList];
                            updated[idx].notes = e.target.value;
                            setAccessoriesList(updated);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="field-label">Trạng thái hoạt động kỹ thuật</label>
                  <input
                    className="input-field"
                    type="text"
                    value={handoverWorkingStatus}
                    onChange={(e) => setHandoverWorkingStatus(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">URL Ảnh chụp hiện trạng bàn giao thực tế</label>
                  <input
                    className="input-field"
                    type="url"
                    value={handoverProofUrl}
                    onChange={(e) => setHandoverProofUrl(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Ghi chú bàn giao</label>
                  <input
                    className="input-field"
                    type="text"
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowHandoverModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Xác nhận bàn giao thiết bị"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Return Inspection (UC_O09) */}
      {showReturnModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "600px" }}>
            <div className="owner-modal-header">
              <h3>🔍 Biên bản kiểm tra trả & Đối chiếu bàn giao (UC_O09)</h3>
              <button className="close-modal-btn" onClick={() => setShowReturnModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReturn}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">Tình trạng vật lý khi nhận lại *</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Phụ kiện thiếu hụt (nếu có, cách nhau bằng dấu phẩy)</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ví dụ: Thiếu 1 nắp lens cap trước, thiếu cáp sạc USB-C"
                    value={missingItemsInput}
                    onChange={(e) => setMissingItemsInput(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Hư hỏng / Trầy xước phát hiện (nếu có)</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ví dụ: Trầy xước viền ngoài lens, va đập cánh quạt flycam"
                    value={damageDetected}
                    onChange={(e) => setDamageDetected(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Chi phí khấu trừ hư hại đề xuất (VND)</label>
                  <input
                    className="input-field"
                    type="number"
                    step={50000}
                    value={damageCost}
                    onChange={(e) => setDamageCost(Number(e.target.value))}
                  />
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    Khoản này sẽ tự động được cấn trừ vào tiền cọc hoàn trả của Renter theo quy định tại UC_O10.
                  </span>
                </div>

                <div>
                  <label className="field-label">Trạng thái hoạt động kỹ thuật</label>
                  <input
                    className="input-field"
                    type="text"
                    value={returnWorkingStatus}
                    onChange={(e) => setReturnWorkingStatus(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Ghi chú kiểm tra trả</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ghi chú thêm về hiện trạng..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">URL Ảnh chụp minh chứng hư hỏng / khi nhận</label>
                  <input
                    className="input-field"
                    type="url"
                    placeholder="https://..."
                    value={returnProofUrl}
                    onChange={(e) => setReturnProofUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowReturnModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Xác nhận biên bản kiểm tra trả"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
