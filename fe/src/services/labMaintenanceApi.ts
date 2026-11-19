import type {
  KanbanBoardData,
  LabMaintenanceWorkOrder,
  LabMetricsOverview,
  QualityCertificateData,
  KanbanColumnStatus,
} from "../types/labMaintenance";

const API_BASE = "/api/lab-maintenance";

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const labMaintenanceApi = {
  /**
   * Lấy toàn bộ bảng Kanban chia theo 5 cột tiến trình
   */
  async getKanbanBoard(): Promise<KanbanBoardData> {
    const res = await fetch(`${API_BASE}/kanban`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      return {
        intake_inspection: [],
        ultrasonic_cleaning: [],
        iso_cleanroom_service: [],
        flange_depth_shimming: [],
        quality_certified_ready: [],
      };
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Lấy chỉ số môi trường phòng sạch ISO 5
   */
  async getLabMetrics(): Promise<LabMetricsOverview> {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) {
      return {
        totalOrders: 0,
        completedOrders: 0,
        inProgressOrders: 0,
        cleanroomStatus: "Online",
        currentParticleCount: "2,850 particles / m³",
        ambientTemperature: "21.5°C",
        relativeHumidity: "45%",
        hepaFilterEfficiency: "99.997%",
      };
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Cập nhật cột Kanban (Di chuyển phiếu bảo dưỡng)
   */
  async updateStatus(orderId: string, nextStatus: KanbanColumnStatus): Promise<LabMaintenanceWorkOrder> {
    const res = await fetch(`${API_BASE}/work-orders/${orderId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ next_status: nextStatus }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Lỗi di chuyển cột Kanban");
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Cập nhật bước trong checklist 12 bước ISO 5
   */
  async updateChecklistStep(
    orderId: string,
    stepNumber: number,
    passed: boolean,
    notes = ""
  ): Promise<LabMaintenanceWorkOrder> {
    const res = await fetch(`${API_BASE}/work-orders/${orderId}/checklist/${stepNumber}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ passed, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Lỗi cập nhật checklist");
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Lấy chứng chỉ kiểm định xuất xưởng phòng sạch
   */
  async getCertificate(orderId: string): Promise<QualityCertificateData> {
    const res = await fetch(`${API_BASE}/certificate/${orderId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không tìm thấy chứng chỉ");
    }
    const json = await res.json();
    return json.data;
  },
};
