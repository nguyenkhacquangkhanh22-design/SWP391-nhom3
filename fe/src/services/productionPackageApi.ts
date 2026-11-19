import type {
  ProductionProjectPackage,
  ProductionPackageTemplate,
  PowerSimulatorResult,
} from "../types/productionPackage";

const API_BASE = "/api/production-packages";

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const productionPackageApi = {
  /**
   * Lấy danh sách mẫu gói quay phim dựng sẵn
   */
  async getTemplates(): Promise<ProductionPackageTemplate[]> {
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  /**
   * Tính toán mô phỏng phụ tải pin và nguồn điện
   */
  async simulatePower(params: {
    cameraRigWatts: number;
    lightingWatts: number;
    audioWatts: number;
    shootingHours: number;
    batteryType: number;
  }): Promise<PowerSimulatorResult> {
    const res = await fetch(`${API_BASE}/power-simulator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Lỗi mô phỏng công suất pin");
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Lấy danh sách gói của tôi
   */
  async getMyPackages(): Promise<ProductionProjectPackage[]> {
    const res = await fetch(`${API_BASE}/my-packages`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },

  /**
   * Lấy chi tiết gói theo ID
   */
  async getPackageById(id: string): Promise<ProductionProjectPackage> {
    const res = await fetch(`${API_BASE}/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không tìm thấy gói dự án");
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Tạo gói dự án mới
   */
  async createPackage(data: Partial<ProductionProjectPackage>): Promise<ProductionProjectPackage> {
    const res = await fetch(`${API_BASE}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể tạo gói dự án");
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Cập nhật gói dự án
   */
  async updatePackage(id: string, data: Partial<ProductionProjectPackage>): Promise<ProductionProjectPackage> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể cập nhật gói dự án");
    }
    const json = await res.json();
    return json.data;
  },
};
