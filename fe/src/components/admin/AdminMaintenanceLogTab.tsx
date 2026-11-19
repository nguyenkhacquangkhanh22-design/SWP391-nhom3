import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type { AdminMaintenanceLog, AdminEquipment } from "../../types/admin";

interface AdminMaintenanceLogTabProps {
  token: string;
  equipments: AdminEquipment[];
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminMaintenanceLogTab({
  token,
  equipments,
  onError,
  onSuccess,
}: AdminMaintenanceLogTabProps) {
  const [logs, setLogs] = useState<AdminMaintenanceLog[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    shutterAlerts: number;
    totalCost: number;
  }>({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    shutterAlerts: 0,
    totalCost: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("periodic_inspection");
  const [currentShutter, setCurrentShutter] = useState(45000);
  const [maxShutter, setMaxShutter] = useState(200000);
  const [serviceCenter, setServiceCenter] = useState("Trung tâm bảo hành Sony Việt Nam");
  const [cost, setCost] = useState(350000);
  const [notes, setNotes] = useState("");

  // Update Status Modal state
  const [selectedLog, setSelectedLog] = useState<AdminMaintenanceLog | null>(null);
  const [updateStatus, setUpdateStatus] = useState<"scheduled" | "in_progress" | "completed" | "cancelled">("completed");
  const [finalCost, setFinalCost] = useState(0);
  const [techNotes, setTechNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLogs = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listMaintenanceLogs(token, {
        maintenance_type: typeFilter !== "all" ? typeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setLogs(res.logs || []);
      setStats(res.stats || {
        total: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        shutterAlerts: 0,
        totalCost: 0,
      });
    } catch (err: any) {
      onError(err.message || "Không thể tải sổ theo dõi bảo dưỡng máy ảnh.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, typeFilter, statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipmentId) {
      onError("Vui lòng chọn thiết bị cần lên lịch bảo dưỡng.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await adminApi.createMaintenanceLog(token, {
        equipment_id: selectedEquipmentId,
        maintenance_type: maintenanceType,
        current_shutter_count: Number(currentShutter),
        max_rated_shutter: Number(maxShutter),
        service_center: serviceCenter.trim(),
        cost: Number(cost),
        technician_notes: notes.trim(),
      });
      onSuccess(res.message);
      setIsCreateModalOpen(false);
      setSelectedEquipmentId("");
      setNotes("");
      fetchLogs();
    } catch (err: any) {
      onError(err.message || "Lỗi khi tạo phiếu bảo dưỡng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog) return;
    try {
      setIsSubmitting(true);
      const res = await adminApi.updateMaintenanceLogStatus(token, selectedLog._id, {
        status: updateStatus,
        cost: Number(finalCost),
        technician_notes: techNotes.trim(),
      });
      onSuccess(res.message);
      setSelectedLog(null);
      fetchLogs();
    } catch (err: any) {
      onError(err.message || "Lỗi khi cập nhật trạng thái bảo dưỡng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  const getMaintenanceTypeLabel = (type: string) => {
    switch (type) {
      case "sensor_cleaning":
        return <span style={{ color: "#38bdf8", fontWeight: 600 }}>✨ Vệ Sinh Cảm Biến Sensor</span>;
      case "shutter_replacement":
        return <span style={{ color: "#ff4757", fontWeight: 600 }}>⚙️ Thay Màn Trập Mới</span>;
      case "lens_calibration":
        return <span style={{ color: "#2ed573", fontWeight: 600 }}>🎯 Căn Nét & Quang Học Lens</span>;
      case "firmware_update":
        return <span style={{ color: "#00a8ff", fontWeight: 600 }}>💾 Cập Nhật Firmware Hãng</span>;
      case "periodic_inspection":
      default:
        return <span style={{ color: "#ffab00", fontWeight: 600 }}>🔍 Kiểm Tra Định Kỳ 3 Tháng</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="admin-status-badge is-active">Đã Hoàn Tất</span>;
      case "in_progress":
        return <span className="admin-status-badge" style={{ background: "rgba(0, 168, 255, 0.15)", color: "#00a8ff" }}>Đang Xử Lý Tại Lab</span>;
      case "cancelled":
        return <span className="admin-status-badge is-suspended">Đã Hủy</span>;
      case "scheduled":
      default:
        return <span className="admin-status-badge is-pending">Đã Lên Lịch</span>;
    }
  };

  const renderShutterLife = (current: number, max: number) => {
    if (!max || current === undefined) return "-";
    const percent = Math.min(100, Math.round((current / max) * 100));
    let color = "#2ed573";
    if (percent >= 80) color = "#ff4757";
    else if (percent >= 60) color = "#ffab00";

    return (
      <div style={{ minWidth: "140px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
          <span>{current.toLocaleString()} / {max.toLocaleString()}</span>
          <span style={{ fontWeight: "bold", color }}>{percent}%</span>
        </div>
        <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: "3px" }} />
        </div>
        {percent >= 75 && (
          <div style={{ fontSize: "10px", color: "#ff4757", marginTop: "2px", fontWeight: 600 }}>
            ⚠️ Sắp hết tuổi thọ màn trập
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 className="admin-card-title">Sổ Theo Dõi Bảo Trì & Số Shot Màn Trập Máy Ảnh (UC_A33)</h2>
          <p className="admin-card-desc">
            Giám sát số shot màn trập cơ (shutter count), chu kỳ vệ sinh cảm biến sensor và lịch sử bảo dưỡng thấu kính quang học nhằm ngăn ngừa sự cố kỹ thuật giữa buổi quay của khách thuê.
          </p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>➕</span> Tạo Phiếu Bảo Dưỡng Mới
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Tổng Phiếu Bảo Trì</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", marginTop: "4px" }}>{stats.total}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ff4757" }}>Cảnh Báo Màn Trập Cao (&gt;75%)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ff4757", marginTop: "4px" }}>
            {stats.shutterAlerts} thiết bị
          </div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(0, 168, 255, 0.08)", border: "1px solid rgba(0, 168, 255, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#00a8ff" }}>Đang Thực Hiện Tại Lab</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#00a8ff", marginTop: "4px" }}>
            {stats.inProgress}
          </div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(46, 213, 115, 0.08)", border: "1px solid rgba(46, 213, 115, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#2ed573" }}>Chi Phí Bảo Dưỡng Đã Chi</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2ed573", marginTop: "4px" }}>
            {formatCurrency(stats.totalCost)}
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="admin-input"
          placeholder="Tìm theo tên máy ảnh, số serial, chủ máy, trung tâm..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: "250px" }}
        />

        <select
          className="admin-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: "210px" }}
        >
          <option value="all">Tất cả loại bảo trì</option>
          <option value="sensor_cleaning">Vệ sinh cảm biến sensor</option>
          <option value="shutter_replacement">Thay thế màn trập</option>
          <option value="lens_calibration">Căn chỉnh nét ống kính</option>
          <option value="firmware_update">Cập nhật firmware</option>
          <option value="periodic_inspection">Kiểm tra định kỳ 3 tháng</option>
        </select>

        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "180px" }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="scheduled">Đã lên lịch</option>
          <option value="in_progress">Đang xử lý tại Lab</option>
          <option value="completed">Đã hoàn tất</option>
        </select>
      </div>

      {/* Maintenance Logs Table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Đang tải sổ bảo dưỡng máy ảnh...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Không có phiếu bảo dưỡng nào phù hợp bộ lọc.
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Thiết Bị & Serial</th>
                <th>Chủ Sở Hữu</th>
                <th>Hạng Mục Bảo Dưỡng</th>
                <th>Tuổi Thọ Màn Trập (Shutter)</th>
                <th>Nơi Thực Hiện</th>
                <th>Chi Phí</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: "right" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{log.equipment_id?.title || log.equipment_id?.name || "Thiết bị"}</div>
                    {log.equipment_id?.serial_number && (
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                        SN: {log.equipment_id.serial_number}
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{log.owner_id?.name || "-"}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{log.owner_id?.phone || "-"}</div>
                  </td>
                  <td>{getMaintenanceTypeLabel(log.maintenance_type)}</td>
                  <td>{renderShutterLife(log.current_shutter_count, log.max_rated_shutter)}</td>
                  <td>
                    <div style={{ fontSize: "13px" }}>{log.service_center}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      Lịch: {new Date(log.scheduled_date).toLocaleDateString("vi-VN")}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: log.cost > 0 ? "var(--color-primary-light, #38bdf8)" : "var(--color-text-muted)" }}>
                      {log.cost > 0 ? formatCurrency(log.cost) : "Chưa có"}
                    </span>
                  </td>
                  <td>{getStatusBadge(log.status)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      onClick={() => {
                        setSelectedLog(log);
                        setUpdateStatus(log.status);
                        setFinalCost(log.cost || 0);
                        setTechNotes(log.technician_notes || "");
                      }}
                    >
                      Cập Nhật Tiến Độ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: "620px", maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Lập Phiếu Bảo Dưỡng Máy Ảnh Định Kỳ</h3>
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
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Chọn Thiết Bị Cần Bảo Trì *</label>
                <select
                  className="admin-select"
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  style={{ width: "100%" }}
                  required
                >
                  <option value="">-- Chọn máy ảnh / ống kính từ hệ thống --</option>
                  {equipments.map((eq) => (
                    <option key={eq._id} value={eq._id}>
                      {eq.title} {eq.serial_number ? `(SN: ${eq.serial_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Hạng Mục Kỹ Thuật</label>
                  <select
                    className="admin-select"
                    value={maintenanceType}
                    onChange={(e) => setMaintenanceType(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="periodic_inspection">Kiểm tra định kỳ 3 tháng</option>
                    <option value="sensor_cleaning">Vệ sinh cảm biến sensor</option>
                    <option value="shutter_replacement">Thay thế cụm màn trập</option>
                    <option value="lens_calibration">Căn nét quang học lens</option>
                    <option value="firmware_update">Cập nhật firmware hãng</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Chi Phí Dự Kiến (VND)</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={0}
                    step={50000}
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Số Shot Hiện Tại (Shutter Count)</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={0}
                    value={currentShutter}
                    onChange={(e) => setCurrentShutter(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Định Mức Tối Đa Của Hãng</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={1000}
                    value={maxShutter}
                    onChange={(e) => setMaxShutter(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Trung Tâm Dịch Vụ / Nơi Sửa Chữa</label>
                <input
                  type="text"
                  className="admin-input"
                  value={serviceCenter}
                  onChange={(e) => setServiceCenter(e.target.value)}
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Ghi Chú Kỹ Thuật (Lỗi cảm biến, bụi bám thấu kính...)</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  placeholder="Ghi chú chi tiết cho kỹ thuật viên..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {isSubmitting ? "Đang lưu..." : "Lập Phiếu Bảo Dưỡng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {selectedLog && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="admin-modal-card" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Cập Nhật Tiến Độ Bảo Dưỡng</h3>
              <button
                className="admin-modal-close"
                onClick={() => setSelectedLog(null)}
                style={{ background: "none", border: "none", color: "inherit", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit}>
              <div style={{ marginBottom: "12px", background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Thiết Bị:</div>
                <div style={{ fontWeight: "bold" }}>
                  {selectedLog.equipment_id?.title || selectedLog.equipment_id?.name || "Thiết bị"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Trạng Thái *</label>
                  <select
                    className="admin-select"
                    value={updateStatus}
                    onChange={(e: any) => setUpdateStatus(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="scheduled">Đã lên lịch</option>
                    <option value="in_progress">Đang xử lý tại Lab</option>
                    <option value="completed">Đã hoàn tất kiểm tra</option>
                    <option value="cancelled">Hủy lịch</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Chi Phí Thực Tế (VND)</label>
                  <input
                    type="number"
                    className="admin-input"
                    min={0}
                    step={10000}
                    value={finalCost}
                    onChange={(e) => setFinalCost(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Kết Quả Kiểm Thử Của Kỹ Thuật Viên</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  placeholder="Ghi nhận: Cảm biến đã được vệ sinh sạch bụi, AF hoạt động ổn định..."
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setSelectedLog(null)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu Cập Nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
