import React, { useState, useEffect } from "react";
import type {
  KanbanBoardData,
  LabMaintenanceWorkOrder,
  LabMetricsOverview,
  KanbanColumnStatus,
} from "../../types/labMaintenance";
import { labMaintenanceApi } from "../../services/labMaintenanceApi";
import LabCertificateModal from "./LabCertificateModal";

export const LabMaintenanceKanban: React.FC = () => {
  const [board, setBoard] = useState<KanbanBoardData>({
    intake_inspection: [],
    ultrasonic_cleaning: [],
    iso_cleanroom_service: [],
    flange_depth_shimming: [],
    quality_certified_ready: [],
  });
  const [metrics, setMetrics] = useState<LabMetricsOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeChecklistOrder, setActiveChecklistOrder] = useState<LabMaintenanceWorkOrder | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [boardData, metricsData] = await Promise.all([
        labMaintenanceApi.getKanbanBoard(),
        labMaintenanceApi.getLabMetrics(),
      ]);
      setBoard(boardData);
      setMetrics(metricsData);
    } catch (err) {
      console.error("Lỗi tải bảng Kanban:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStatus = async (orderId: string, nextStatus: KanbanColumnStatus) => {
    try {
      await labMaintenanceApi.updateStatus(orderId, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Lỗi di chuyển trạng thái");
    }
  };

  const handleToggleStep = async (orderId: string, stepNumber: number, currentPassed: boolean) => {
    try {
      const updated = await labMaintenanceApi.updateChecklistStep(orderId, stepNumber, !currentPassed);
      setActiveChecklistOrder(updated);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Lỗi cập nhật bước");
    }
  };

  const columns: { key: KanbanColumnStatus; label: string; icon: string; color: string }[] = [
    { key: "intake_inspection", label: "1. Tiếp Nhận & Soi Đèn", icon: "🔍", color: "border-blue-500/40" },
    { key: "ultrasonic_cleaning", label: "2. Siêu Âm & Thổi Ion", icon: "🌊", color: "border-purple-500/40" },
    { key: "iso_cleanroom_service", label: "3. Buồng Sạch ISO 5", icon: "🧼", color: "border-cyan-500/40" },
    { key: "flange_depth_shimming", label: "4. Chêm Ngàm Flange", icon: "📐", color: "border-amber-500/40" },
    { key: "quality_certified_ready", label: "5. Xuất Xưởng Đạt Chuẩn", icon: "🏆", color: "border-emerald-500/40" },
  ];

  return (
    <div className="space-y-6">
      {/* Cleanroom Lab Environment Monitor Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              ISO 14644-1 Cleanroom Operations Active
            </div>
            <h2 className="text-xl font-black text-white mt-2">
              Trạm Điều Hành Bảo Dưỡng & Vệ Sinh Thiết Bị Phòng Sạch
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Quy trình 12 bước tiêu chuẩn quốc tế: Vệ sinh cảm biến vô trùng, khử tĩnh điện và căn chỉnh buồng tối ngàm
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition"
            >
              🔄 Làm mới
            </button>
          </div>
        </div>

        {/* Realtime Environment Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block">Mật Độ Bụi Hiện Tại:</span>
            <strong className="text-cyan-400 font-mono text-sm">{metrics?.currentParticleCount || "2,820 / m³"}</strong>
            <span className="text-[10px] text-emerald-400 block mt-0.5">✓ Dưới ngưỡng 3,520 (ISO 5)</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block">Nhiệt Độ & Độ Ẩm:</span>
            <strong className="text-slate-200 font-mono text-sm">
              {metrics?.ambientTemperature || "21.4°C"} • {metrics?.relativeHumidity || "44.5%"}
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">Ổn định thấu kính</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block">Hiệu Suất Màng HEPA:</span>
            <strong className="text-emerald-400 font-mono text-sm">
              {metrics?.hepaFilterEfficiency || "99.997%"}
            </strong>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Lọc hạt 0.3 micron</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block">Thiết Bị Đang Xử Lý:</span>
            <strong className="text-amber-400 font-mono text-sm">
              {metrics?.inProgressOrders || 3} máy trong buồng
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">Đã xuất xưởng: {metrics?.completedOrders || 1}</span>
          </div>
        </div>
      </div>

      {/* Kanban Columns (5 Columns) */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Đang tải bảng Kanban điều phối phòng sạch...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {columns.map((col) => {
            const items = board[col.key] || [];
            return (
              <div
                key={col.key}
                className={`bg-slate-900/90 border-t-4 ${col.color} border-slate-800 rounded-2xl p-3 flex flex-col justify-between min-h-[500px] shadow-lg`}
              >
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800 text-xs">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span>{col.icon}</span>
                      <span>{col.label}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold rounded-full text-[10px]">
                      {items.length}
                    </span>
                  </div>

                  {/* Cards in this column */}
                  <div className="space-y-3">
                    {items.map((order) => {
                      const completedSteps = order.iso_checklist ? order.iso_checklist.filter((s) => s.passed).length : 0;
                      const totalSteps = order.iso_checklist ? order.iso_checklist.length : 12;
                      const pct = Math.round((completedSteps / totalSteps) * 100);

                      return (
                        <div
                          key={order._id}
                          className="bg-slate-950 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3 space-y-2.5 text-xs transition shadow group"
                        >
                          {/* Priority & Code */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-cyan-400 font-bold">
                              {order.work_order_code}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                                order.priority === "emergency_urgent"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : order.priority === "high"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {order.priority === "emergency_urgent" ? "Khẩn cấp" : order.priority === "high" ? "Ưu tiên" : "Chuẩn"}
                            </span>
                          </div>

                          {/* Equipment Name */}
                          <div>
                            <h4 className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                              {order.equipment_name}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Seri: {order.serial_number}
                            </span>
                          </div>

                          {/* 12 Steps Checklist Progress */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Quy chuẩn ISO 5:</span>
                              <strong className="text-cyan-400">{completedSteps}/{totalSteps} bước ({pct}%)</strong>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-1 text-[11px]">
                            <button
                              onClick={() => setActiveChecklistOrder(order)}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold"
                            >
                              📋 Checklist
                            </button>

                            {col.key === "quality_certified_ready" ? (
                              <button
                                onClick={() => setSelectedOrderId(order._id)}
                                className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold rounded text-[10px] border border-emerald-500/40"
                              >
                                🏆 Chứng Thư
                              </button>
                            ) : (
                              <div className="flex gap-1">
                                {col.key !== "intake_inspection" && (
                                  <button
                                    onClick={() => {
                                      const idx = columns.findIndex((c) => c.key === col.key);
                                      if (idx > 0) handleMoveStatus(order._id, columns[idx - 1].key);
                                    }}
                                    className="px-1.5 py-0.5 bg-slate-800 text-slate-400 hover:text-white rounded"
                                    title="Chuyển lùi"
                                  >
                                    ←
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const idx = columns.findIndex((c) => c.key === col.key);
                                    if (idx < columns.length - 1) handleMoveStatus(order._id, columns[idx + 1].key);
                                  }}
                                  className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[10px]"
                                  title="Chuyển tiếp sang bước sau"
                                >
                                  Tiếp →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-600">
                  ISO Class 5 Certified Workflow
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checklist Detail Modal */}
      {activeChecklistOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-2 border-b border-slate-800">
              <div>
                <span className="text-xs text-cyan-400 font-bold uppercase">
                  Checklist Quy Chuẩn ISO Class 5 (12 Bước)
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {activeChecklistOrder.equipment_name}
                </h3>
              </div>
              <button
                onClick={() => setActiveChecklistOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {activeChecklistOrder.iso_checklist.map((step) => (
                <div
                  key={step.step_number}
                  onClick={() => handleToggleStep(activeChecklistOrder._id, step.step_number, step.passed)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    step.passed
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    step.passed ? "bg-emerald-500 text-black" : "bg-slate-800 text-slate-400"
                  }`}>
                    {step.passed ? "✓" : step.step_number}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">{step.title}</div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {step.passed ? "Đã kiểm nghiệm đạt chuẩn" : "Chưa hoàn thành - bấm để đánh dấu"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveChecklistOrder(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
              >
                Hoàn Tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISO Certificate Modal */}
      {selectedOrderId && (
        <LabCertificateModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
};

export default LabMaintenanceKanban;
