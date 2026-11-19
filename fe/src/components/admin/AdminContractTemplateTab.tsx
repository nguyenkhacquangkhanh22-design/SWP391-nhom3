import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type { AdminContractTemplate } from "../../types/admin";

interface AdminContractTemplateTabProps {
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminContractTemplateTab({
  token,
  onError,
  onSuccess,
}: AdminContractTemplateTabProps) {
  const [templates, setTemplates] = useState<AdminContractTemplate[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    draft: number;
    published: number;
    retired: number;
  }>({ total: 0, draft: 0, published: 0, retired: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [selectedTemplate, setSelectedTemplate] = useState<AdminContractTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for creating new template
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newVersion, setNewVersion] = useState(1);
  const [newTerms, setNewTerms] = useState(
    "1. BÊN THUÊ cam kết bảo quản nguyên vẹn máy ảnh, thấu kính ống kính, cảm biến (sensor) và các phụ kiện đi kèm (pin zin, sạc kép, thẻ nhớ CFexpress/SD, hood, cap che).\n" +
      "2. Nghiêm cấm chiếu tia laser trực tiếp vào cảm biến máy ảnh hoặc làm rơi máy vào nước. Mọi hư hại do laser hoặc nước sẽ chịu bồi thường 100% chi phí thay thế linh kiện chính hãng.\n" +
      "3. Trả máy quá hạn sẽ tính phụ phí 10% đơn giá ngày cho mỗi giờ trễ hạn.\n" +
      "4. BÊN CHO THUÊ có trách nhiệm đối soát biên bản bàn giao và giải phóng tiền cọc trong vòng 24h kể từ khi nhận lại thiết bị đầy đủ."
  );

  const fetchTemplates = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listContractTemplates(token, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setTemplates(res.templates || []);
      setStats(res.stats || { total: 0, draft: 0, published: 0, retired: 0 });
    } catch (err: any) {
      onError(err.message || "Không thể tải danh sách mẫu hợp đồng điện tử.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [token, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemplates();
  };

  const handleStatusChange = async (id: string, newStatus: "draft" | "published" | "retired") => {
    try {
      setIsSubmitting(true);
      const res = await adminApi.updateContractTemplateStatus(token, id, newStatus);
      onSuccess(res.message || "Đã cập nhật trạng thái hợp đồng thành công.");
      if (selectedTemplate && selectedTemplate._id === id) {
        setSelectedTemplate(res.template);
      }
      fetchTemplates();
    } catch (err: any) {
      onError(err.message || "Không thể cập nhật trạng thái hợp đồng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim() || !newTerms.trim()) {
      onError("Vui lòng điền đầy đủ mã mẫu, tên mẫu và điều khoản thuê.");
      return;
    }
    try {
      setIsSubmitting(true);
      await adminApi.createContractTemplate(token, {
        template_code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        version: Number(newVersion) || 1,
        terms_content: newTerms.trim(),
        fields: [
          { key: "serial_number", label: "Số Serial máy & ống kính", required: true },
          { key: "handover_notes", label: "Ghi chú ngoại quan & phụ kiện", required: true },
          { key: "deposit_amount", label: "Tiền cọc cam kết", required: true },
        ],
        status: "published",
      });
      onSuccess("Đã tạo và ban hành mẫu hợp đồng mới thành công.");
      setIsCreateModalOpen(false);
      setNewCode("");
      setNewName("");
      fetchTemplates();
    } catch (err: any) {
      onError(err.message || "Không thể tạo mẫu hợp đồng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <span className="admin-status-badge is-active">Đang áp dụng</span>;
      case "draft":
        return <span className="admin-status-badge is-pending">Bản nháp</span>;
      case "retired":
        return <span className="admin-status-badge is-suspended">Đã lưu trữ / Hết hiệu lực</span>;
      default:
        return <span className="admin-status-badge">{status}</span>;
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 className="admin-card-title">Mẫu Hợp Đồng Thuê Máy Ảnh Điện Tử (UC_A26)</h2>
          <p className="admin-card-desc">
            Quản trị các điều khoản pháp lý, quy chế bồi thường hư hỏng và trường dữ liệu bắt buộc trong hợp đồng thuê.
          </p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>➕</span> Tạo Mẫu Hợp Đồng Mới
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Tổng Mẫu Hợp Đồng</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", marginTop: "4px" }}>{stats.total}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(46, 213, 115, 0.08)", border: "1px solid rgba(46, 213, 115, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#2ed573" }}>Đang Ban Hành (Hiệu lực)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2ed573", marginTop: "4px" }}>{stats.published}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 171, 0, 0.08)", border: "1px solid rgba(255, 171, 0, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ffab00" }}>Bản Nháp (Draft)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ffab00", marginTop: "4px" }}>{stats.draft}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Đã Hết Hiệu Lực</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", marginTop: "4px" }}>{stats.retired}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            className="admin-input"
            placeholder="Tìm theo mã mẫu (VD: CAMERA-PRO-01) hoặc tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%" }}
          />
          <button type="submit" className="admin-btn admin-btn-secondary">Tìm</button>
        </form>

        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "180px" }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Đang áp dụng</option>
          <option value="draft">Bản nháp</option>
          <option value="retired">Đã lưu trữ</option>
        </select>
      </div>

      {/* Table list */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Đang tải danh sách mẫu hợp đồng...
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Chưa có mẫu hợp đồng nào phù hợp bộ lọc.
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Mã Mẫu</th>
                <th>Tên Hợp Đồng</th>
                <th>Phiên Bản</th>
                <th>Trạng Thái</th>
                <th>Số Trường Bắt Buộc</th>
                <th>Cập Nhật Lần Cuối</th>
                <th style={{ textAlign: "right" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl._id}>
                  <td>
                    <span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--color-primary-light, #38bdf8)" }}>
                      {tpl.template_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{tpl.name}</div>
                  </td>
                  <td>v{tpl.version}.0</td>
                  <td>{getStatusBadge(tpl.status)}</td>
                  <td>{tpl.fields?.length || 0} trường</td>
                  <td>{new Date(tpl.updatedAt).toLocaleDateString("vi-VN")}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <button
                        className="admin-btn admin-btn-sm admin-btn-secondary"
                        onClick={() => setSelectedTemplate(tpl)}
                      >
                        Xem & Điều Khoản
                      </button>
                      {tpl.status === "draft" && (
                        <button
                          className="admin-btn admin-btn-sm admin-btn-primary"
                          onClick={() => handleStatusChange(tpl._id, "published")}
                          disabled={isSubmitting}
                        >
                          Ban Hành
                        </button>
                      )}
                      {tpl.status === "published" && (
                        <button
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => handleStatusChange(tpl._id, "retired")}
                          disabled={isSubmitting}
                        >
                          Lưu Trữ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail / Terms Modal */}
      {selectedTemplate && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedTemplate(null)}>
          <div
            className="admin-modal-card"
            style={{ maxWidth: "700px", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>
                Chi Tiết Mẫu: {selectedTemplate.template_code} (v{selectedTemplate.version}.0)
              </h3>
              <button
                className="admin-modal-close"
                onClick={() => setSelectedTemplate(null)}
                style={{ background: "none", border: "none", color: "inherit", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Tên hợp đồng:</div>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>{selectedTemplate.name}</div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                Điều khoản pháp lý bảo vệ thiết bị quay chụp:
              </div>
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: "14px",
                  borderRadius: "8px",
                  whiteSpace: "pre-wrap",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  border: "1px solid rgba(255,255,255,0.08)",
                  maxHeight: "260px",
                  overflowY: "auto",
                }}
              >
                {selectedTemplate.terms_content}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                Các trường dữ liệu kiểm tra bắt buộc:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedTemplate.fields?.map((f, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  >
                    🏷️ {f.label} ({f.key})
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {selectedTemplate.status === "draft" && (
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={() => handleStatusChange(selectedTemplate._id, "published")}
                  disabled={isSubmitting}
                >
                  Ban Hành Cho Sàn Áp Dụng
                </button>
              )}
              {selectedTemplate.status === "published" && (
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={() => handleStatusChange(selectedTemplate._id, "retired")}
                  disabled={isSubmitting}
                >
                  Ngưng Áp Dụng (Lưu Trữ)
                </button>
              )}
              <button className="admin-btn admin-btn-secondary" onClick={() => setSelectedTemplate(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="admin-modal-card"
            style={{ maxWidth: "650px", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Soạn Mẫu Hợp Đồng Thuê Máy Ảnh Mới</h3>
              <button
                className="admin-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "none", border: "none", color: "inherit", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Mã mẫu hợp đồng *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="VD: CAMERA-PRO-V1"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Phiên bản (Version)</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={1}
                    value={newVersion}
                    onChange={(e) => setNewVersion(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Tên mẫu hợp đồng *</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="VD: Hợp đồng thuê thiết bị quay phim & máy ảnh chuyên nghiệp"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                  Điều khoản pháp lý & bồi thường (Camera Rental Clauses) *
                </label>
                <textarea
                  className="admin-input"
                  rows={8}
                  value={newTerms}
                  onChange={(e) => setNewTerms(e.target.value)}
                  style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : "Tạo & Ban Hành"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
