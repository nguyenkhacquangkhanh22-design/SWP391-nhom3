import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type { AdminHandoverDetail } from "../../types/admin";

interface AdminHandoverTabProps {
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminHandoverTab({
  token,
  onError,
  onSuccess,
}: AdminHandoverTabProps) {
  const [records, setRecords] = useState<AdminHandoverDetail[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    handover: number;
    return: number;
    pendingReview: number;
    verified: number;
  }>({ total: 0, handover: 0, return: 0, pendingReview: 0, verified: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspection modal
  const [selectedRecord, setSelectedRecord] = useState<AdminHandoverDetail | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRecords = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listHandoverRecords(token, {
        record_type: typeFilter !== "all" ? typeFilter : undefined,
        review_status: reviewFilter !== "all" ? reviewFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setRecords(res.records || []);
      setStats(res.stats || { total: 0, handover: 0, return: 0, pendingReview: 0, verified: 0 });
    } catch (err: any) {
      onError(err.message || "Không thể tải danh sách biên bản bàn giao & hoàn trả.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [token, typeFilter, reviewFilter]);

  const handleReview = async (id: string, status: "verified" | "needs_changes") => {
    try {
      setIsSubmitting(true);
      const res = await adminApi.reviewHandoverRecord(token, id, {
        status,
        note: reviewNote.trim(),
      });
      onSuccess(res.message);
      setSelectedRecord(null);
      setReviewNote("");
      fetchRecords();
    } catch (err: any) {
      onError(err.message || "Lỗi khi cập nhật trạng thái kiểm tra biên bản.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRecordTypeBadge = (type: string) => {
    if (type === "handover") {
      return (
        <span className="admin-status-badge" style={{ background: "rgba(0, 168, 255, 0.15)", color: "#00a8ff" }}>
          🤝 Giao Máy (Handover)
        </span>
      );
    }
    return (
      <span className="admin-status-badge" style={{ background: "rgba(255, 171, 0, 0.15)", color: "#ffab00" }}>
        ↩️ Nhận Lại (Return)
      </span>
    );
  };

  const getReviewStatusBadge = (status?: string) => {
    switch (status) {
      case "verified":
        return <span className="admin-status-badge is-active">Đã Thẩm Định Hợp Lệ</span>;
      case "needs_changes":
        return <span className="admin-status-badge is-suspended">Cần Bổ Sung Ảnh</span>;
      case "pending":
      default:
        return <span className="admin-status-badge is-pending">Chờ Kiểm Tra</span>;
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Tra Cứu & Đối Soát Biên Bản Bàn Giao Thiết Bị (UC_A30)</h2>
          <p className="admin-card-desc">
            Kiểm tra chi tiết biên bản giao nhận máy ảnh (Checklist phụ kiện: pin, sạc, thẻ nhớ, cap thấu kính, cảm biến sensor và ảnh ngoại quan).
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Tổng Biên Bản</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", marginTop: "4px" }}>{stats.total}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(0, 168, 255, 0.08)", border: "1px solid rgba(0, 168, 255, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#00a8ff" }}>Biên Bản Bàn Giao (Nhận)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#00a8ff", marginTop: "4px" }}>{stats.handover}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 171, 0, 0.08)", border: "1px solid rgba(255, 171, 0, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ffab00" }}>Biên Bản Hoàn Trả (Trả)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ffab00", marginTop: "4px" }}>{stats.return}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(46, 213, 115, 0.08)", border: "1px solid rgba(46, 213, 115, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#2ed573" }}>Đã Thẩm Định Chuẩn</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2ed573", marginTop: "4px" }}>{stats.verified}</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="admin-input"
          placeholder="Tìm theo thiết bị, chủ máy, khách thuê, hợp đồng..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: "250px" }}
        />

        <select
          className="admin-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: "190px" }}
        >
          <option value="all">Tất cả loại biên bản</option>
          <option value="handover">Biên bản Giao Máy</option>
          <option value="return">Biên bản Hoàn Trả</option>
        </select>

        <select
          className="admin-select"
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value)}
          style={{ width: "190px" }}
        >
          <option value="all">Tất cả thẩm định</option>
          <option value="pending">Chờ kiểm tra</option>
          <option value="verified">Đã thẩm định hợp lệ</option>
          <option value="needs_changes">Cần bổ sung ảnh</option>
        </select>
      </div>

      {/* Table list */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Đang tải biên bản bàn giao...
        </div>
      ) : records.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Không có biên bản nào phù hợp.
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Thiết Bị & Serial</th>
                <th>Loại Biên Bản</th>
                <th>Hợp Đồng</th>
                <th>Chủ Máy (Owner)</th>
                <th>Khách Thuê (Renter)</th>
                <th>Tình Trạng Thiết Bị</th>
                <th>Trạng Thái Thẩm Định</th>
                <th style={{ textAlign: "right" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.equipment_id?.title || r.equipment_id?.name || "Thiết bị"}</div>
                    {r.equipment_id?.serial_number && (
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                        SN: {r.equipment_id.serial_number}
                      </div>
                    )}
                  </td>
                  <td>{getRecordTypeBadge(r.record_type)}</td>
                  <td>
                    <span style={{ fontFamily: "monospace", color: "var(--color-primary-light, #38bdf8)" }}>
                      {r.contract_id?.contract_code || "-"}
                    </span>
                  </td>
                  <td>{r.owner_id?.name || "-"}</td>
                  <td>{r.renter_id?.name || "-"}</td>
                  <td>
                    <div style={{ fontSize: "13px" }}>{r.physical_condition}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{r.working_status}</div>
                  </td>
                  <td>{getReviewStatusBadge(r.moderator_review?.status)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      onClick={() => {
                        setSelectedRecord(r);
                        setReviewNote(r.moderator_review?.note || "");
                      }}
                    >
                      Đối Soát Chi Tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail / Side-by-side inspection modal */}
      {selectedRecord && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="admin-modal-card" style={{ maxWidth: "780px", maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>
                Chi Tiết Biên Bản: {selectedRecord.record_type === "handover" ? "Bàn Giao Máy (Lúc Giao)" : "Kiểm Tra Hoàn Trả (Lúc Nhận)"}
              </h3>
              <button
                className="admin-modal-close"
                onClick={() => setSelectedRecord(null)}
                style={{ background: "none", border: "none", color: "inherit", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Equipment & Parties */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Thiết Bị:</div>
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                  {selectedRecord.equipment_id?.title || selectedRecord.equipment_id?.name || "Thiết bị"}
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                  Mã Serial Number: <strong>{selectedRecord.equipment_id?.serial_number || "Chưa cập nhật"}</strong>
                </div>
                <div style={{ fontSize: "12px" }}>
                  Hợp đồng: <strong>{selectedRecord.contract_id?.contract_code || "-"}</strong>
                </div>
              </div>

              <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Các Bên Liên Quan:</div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>
                  Chủ máy: <strong>{selectedRecord.owner_id?.name}</strong> ({selectedRecord.owner_id?.phone || "-"})
                </div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>
                  Khách thuê: <strong>{selectedRecord.renter_id?.name}</strong> ({selectedRecord.renter_id?.phone || "-"})
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px", color: "var(--color-text-muted)" }}>
                  Thời điểm ghi nhận: {new Date(selectedRecord.record_date).toLocaleString("vi-VN")}
                </div>
              </div>
            </div>

            {/* Checklist accessories */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                Checklist phụ kiện đi kèm (Pin, sạc, thẻ nhớ, cap thấu kính, hood, filter):
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
                {selectedRecord.accessories_checklist?.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: item.checked ? "rgba(46, 213, 115, 0.08)" : "rgba(255, 71, 87, 0.08)",
                      border: `1px solid ${item.checked ? "rgba(46, 213, 115, 0.2)" : "rgba(255, 71, 87, 0.2)"}`,
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>{item.checked ? "✅" : "❌"}</span>
                    <span style={{ fontWeight: 500 }}>{item.item}</span>
                    {item.notes && <span style={{ color: "var(--color-text-muted)" }}>({item.notes})</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Missing items or damage if return record */}
            {selectedRecord.record_type === "return" && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(255, 71, 87, 0.05)", border: "1px solid rgba(255, 71, 87, 0.2)", borderRadius: "8px" }}>
                <div style={{ fontSize: "13px", color: "#ff4757", fontWeight: "bold" }}>Ghi Nhận Hư Hỏng / Mất Mát Lúc Trả Máy:</div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>
                  Mô tả hư hại: {selectedRecord.damage_detected || "Không ghi nhận hư hại"}
                </div>
                {selectedRecord.missing_items && selectedRecord.missing_items.length > 0 && (
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>
                    Phụ kiện thiếu: <strong>{selectedRecord.missing_items.join(", ")}</strong>
                  </div>
                )}
                {selectedRecord.estimated_damage_cost ? (
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>
                    Ước tính phí bồi thường: <strong style={{ color: "#ff4757" }}>{selectedRecord.estimated_damage_cost.toLocaleString("vi-VN")} ₫</strong>
                  </div>
                ) : null}
              </div>
            )}

            {/* Evidence photos */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                Ảnh chụp ngoại quan máy ảnh, thấu kính & cảm biến sensor:
              </div>
              {selectedRecord.evidence_photos && selectedRecord.evidence_photos.length > 0 ? (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {selectedRecord.evidence_photos.map((photo, idx) => (
                    <a key={idx} href={photo} target="_blank" rel="noreferrer">
                      <img
                        src={photo}
                        alt="Photo"
                        style={{ width: "120px", height: "90px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)" }}
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  Không có hình ảnh đính kèm trong biên bản.
                </div>
              )}
            </div>

            {/* Review actions */}
            <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Ghi chú thẩm tra biên bản của Quản trị viên:</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Ghi chú xác nhận hoặc yêu cầu bổ sung..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={() => handleReview(selectedRecord._id, "needs_changes")}
                  disabled={isSubmitting}
                >
                  Yêu Cầu Bổ Sung Ảnh
                </button>
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={() => handleReview(selectedRecord._id, "verified")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : "Xác Nhận Biên Bản Hợp Lệ"}
                </button>
                <button className="admin-btn admin-btn-secondary" onClick={() => setSelectedRecord(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
