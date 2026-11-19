import type { OpticalBenchmark, SensorCompatibilityResult, CalibrationCertificate } from "../types/opticalBenchmark";

const API_BASE = "/api/optical-benchmark";

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const opticalBenchmarkApi = {
  /**
   * Lấy kết quả đo kiểm định quang học theo ID thiết bị
   */
  async getBenchmark(equipmentId: string): Promise<OpticalBenchmark> {
    const res = await fetch(`${API_BASE}/${equipmentId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể tải dữ liệu kiểm định quang học");
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Tính toán độ tương thích giữa ống kính và độ phân giải cảm biến (Megapixel)
   */
  async getSensorCompatibility(
    equipmentId: string,
    sensorResolutionMp: number,
    sensorFormat = "full_frame"
  ): Promise<SensorCompatibilityResult> {
    const url = `${API_BASE}/${equipmentId}/compatibility?sensorResolutionMp=${sensorResolutionMp}&sensorFormat=${sensorFormat}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Lỗi kiểm tra tương thích cảm biến");
    }
    return res.json();
  },

  /**
   * Lấy chứng chỉ kiểm định chất lượng quang học
   */
  async getCertificate(equipmentId: string): Promise<CalibrationCertificate> {
    const res = await fetch(`${API_BASE}/${equipmentId}/certificate`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không tìm thấy chứng chỉ kiểm định");
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Lấy danh sách ống kính có chỉ số quang học cao nhất
   */
  async getTopPerformers(limit = 6): Promise<OpticalBenchmark[]> {
    const res = await fetch(`${API_BASE}/top-performers?limit=${limit}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  },
};
