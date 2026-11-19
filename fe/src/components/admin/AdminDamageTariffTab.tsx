import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type { AdminDamageTariff } from "../../types/admin";

interface AdminDamageTariffTabProps {
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminDamageTariffTab({
  token,
  onError,
  onSuccess,
}: AdminDamageTariffTabProps) {
  const [tariffs, setTariffs] = useState<AdminDamageTariff[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number }>({ total: 0, active: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit modal
  const [selectedTariff, setSelectedTariff] = useState<AdminDamageTariff | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editFee, setEditFee] = useState(0);
  const [editDesc, setEditDesc] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSeverity, setEditSeverity] = useState("minor");

  // Create form state
  const [newCategory, setNewCategory] = useState("Ống Kính & Thấu Kính");
  const [newItemName, setNewItemName] = useState("");
  const [newFee, setNewFee] = useState(200000);
  const [newSeverity, setNewSeverity] = useState("minor");
  const [newDesc, setNewDesc] = useState("");

  const fetchTariffs = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listDamageTariffs(token, {
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        severity: severityFilter !== "all" ? severityFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setTariffs(res.tariffs || []);
      setCategories(res.categories || []);
      setStats(res.stats || { total: 0, active: 0 });
    } catch (err: any) {
      onError(err.message || "Không thể tải biểu phí bồi thường hư hại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, [token, categoryFilter, severityFilter]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTariff) return;
    try {
      setIsSubmitting(true);
      const res = await adminApi.updateDamageTariff(token, selectedTariff._id, {
        standard_fee: Number(editFee),
        description: editDesc.trim(),
        is_active: editActive,
        severity: editSeverity,
      });
      onSuccess(res.message);
      setIsEditModalOpen(false);
      setSelectedTariff(null);
      fetchTariffs();
    } catch (err: any) {
      onError(err.message || "Lỗi khi cập nhật biểu phí.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newCategory.trim()) {
      onError("Vui lòng nhập tên linh kiện và danh mục.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await adminApi.createDamageTariff(token, {
        category: newCategory.trim(),
        item_name: newItemName.trim(),
        standard_fee: Number(newFee),
        severity: newSeverity,
        description: newDesc.trim(),
      });
      onSuccess(res.message);
      setIsCreateModalOpen(false);
      setNewItemName("");
      setNewDesc("");
      fetchTariffs();
    } catch (err: any) {
      onError(err.message || "Lỗi khi tạo biểu phí.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "minor":
        return <span className="admin-status-badge is-active" style={{ background: "rgba(46, 213, 115, 0.15)", color: "#2ed573" }}>Nhẹ (Phụ kiện/Bụi)</span>;
      case "moderate":
        return <span className="admin-status-badge is-pending" style={{ background: "rgba(255, 171, 0, 0.15)", color: "#ffab00" }}>Vừa (Trầy xước/Mất pin)</span>;
      case "severe":
        return <span className="admin-status-badge is-suspended" style={{ background: "rgba(255, 71, 87, 0.15)", color: "#ff4757" }}>Nghiêm Trọng (Sensor/Vỡ)</span>;
      case "total_loss":
        return <span className="admin-status-badge is-suspended" style={{ background: "rgba(255, 0, 0, 0.25)", color: "#ff0000", fontWeight: "bold" }}>Mất Trắng 100%</span>;
      default:
        return <span className="admin-status-badge">{severity}</span>;
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 className="admin-card-title">Khung Biểu Phí Đền Bù & Khấu Hao Thiết Bị Chuẩn Hóa (UC_A32)</h2>
          <p className="admin-card-desc">
            Quy định mức phí bồi thường chuẩn mực (mất cap lens, rơi vỡ thấu kính, bụi cảm biến, mất pin zin) làm căn cứ phân xử công bằng khi có tranh chấp.
          </p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>➕</span> Thêm Mức Phí Mới
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Tổng Hạng Mục Biểu Phí</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", marginTop: "4px" }}>{stats.total}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(46, 213, 115, 0.08)", border: "1px solid rgba(46, 213, 115, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#2ed573" }}>Đang Áp Dụng Toàn Sàn</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2ed573", marginTop: "4px" }}>{stats.active}</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="admin-input"
          placeholder="Tìm theo tên linh kiện hư hỏng, phụ kiện..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: "250px" }}
        />

        <select
          className="admin-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: "200px" }}
        >
          <option value="all">Tất cả nhóm ngành</option>
          {categories.map((c, idx) => (
            <option key={idx} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="admin-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ width: "190px" }}
        >
          <option value="all">Tất cả mức độ</option>
          <option value="minor">Nhẹ</option>
          <option value="moderate">Vừa</option>
          <option value="severe">Nghiêm trọng</option>
        </select>
      </div>

      {/* Tariffs Table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Đang tải biểu phí đền bù...
        </div>
      ) : tariffs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Không có biểu phí nào phù hợp bộ lọc.
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Linh Kiện / Trường Hợp Hư Hại</th>
                <th>Phân Nhóm</th>
                <th>Mức Độ Hư Hỏng</th>
                <th>Mức Phí Bồi Thường Chuẩn</th>
                <th>Trạng Thái</th>
                <th>Ghi Chú Hướng Dẫn</th>
                <th style={{ textAlign: "right" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map((t) => (
                <tr key={t._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.item_name}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "4px" }}>
                      {t.category}
                    </span>
                  </td>
                  <td>{getSeverityBadge(t.severity)}</td>
                  <td>
                    <span style={{ fontWeight: "bold", color: "var(--color-primary-light, #38bdf8)", fontSize: "14px" }}>
                      {formatCurrency(t.standard_fee)}
                    </span>
                  </td>
                  <td>
                    {t.is_active ? (
                      <span className="admin-status-badge is-active">Áp Dụng</span>
                    ) : (
                      <span className="admin-status-badge is-suspended">Tạm Ngưng</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)", maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.description || "-"}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      onClick={() => {
                        setSelectedTariff(t);
                        setEditFee(t.standard_fee);
                        setEditDesc(t.description || "");
                        setEditActive(t.is_active);
                        setEditSeverity(t.severity);
                        setIsEditModalOpen(true);
                      }}
                    >
                      Hiệu Chỉnh
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedTariff && (
        <div className="admin-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Hiệu Chỉnh Biểu Phí Đền Bù</h3>
              <button
                className="admin-modal-close"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: "none", border: "none", color: "inherit", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Hạng mục:</div>
                <div style={{ fontWeight: "bold", fontSize: "15px" }}>{selectedTariff.item_name}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Mức Phí Bồi Thường (VND) *</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={0}
                    step={10000}
                    value={editFee}
                    onChange={(e) => setEditFee(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Mức Độ Hư Hỏng</label>
                  <select
                    className="admin-select"
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="minor">Nhẹ (Minor)</option>
                    <option value="moderate">Vừa (Moderate)</option>
                    <option value="severe">Nghiêm trọng (Severe)</option>
                    <option value="total_loss">Mất trắng (Total Loss)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Ghi Chú Hướng Dẫn & Căn Cứ Hãng</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                  />
                  <span>Áp dụng biểu phí này trên sàn</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Thêm Hạng Mục Biểu Phí Đền Bù Mới</h3>
              <button
                className="admin-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "none", border: "none", color: "inherit", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Phân Nhóm Ngành Hàng *</label>
                <select
                  className="admin-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="Ống Kính & Thấu Kính">Ống Kính & Thấu Kính</option>
                  <option value="Thân Máy & Cảm Biến">Thân Máy & Cảm Biến</option>
                  <option value="Phụ Kiện Điện Ảnh">Phụ Kiện Điện Ảnh (Pin, Sạc, Thẻ)</option>
                  <option value="Flycam & Gimbal Chống Rung">Flycam & Gimbal Chống Rung</option>
                  <option value="Đèn Studio & Thiết Bị Âm Thanh">Đèn Studio & Thiết Bị Âm Thanh</option>
                </select>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Tên Linh Kiện / Trường Hợp Hư Hỏng *</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="VD: Gãy cánh quạt Drone DJI / Mất ngàm chuyển mount"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Mức Phí Bồi Thường (VND) *</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={0}
                    step={10000}
                    value={newFee}
                    onChange={(e) => setNewFee(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Mức Độ Hư Hỏng</label>
                  <select
                    className="admin-select"
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="minor">Nhẹ</option>
                    <option value="moderate">Vừa</option>
                    <option value="severe">Nghiêm trọng</option>
                    <option value="total_loss">Mất trắng 100%</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Ghi Chú Hướng Dẫn</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  placeholder="Nhập căn cứ bồi thường..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : "Tạo Biểu Phí"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
