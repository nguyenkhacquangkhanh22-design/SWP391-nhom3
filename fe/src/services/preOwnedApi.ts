import type {
  PreOwnedListing,
  TradeInQuoteResult,
  ValuationModelPreset,
} from "../types/preOwned";

const API_BASE = "/api/pre-owned";

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const preOwnedApi = {
  /**
   * Lấy danh sách máy cũ thanh lý kèm bộ lọc
   */
  async getListings(params: {
    category?: string;
    brand?: string;
    condition_grade?: string;
    min_price?: number;
    max_price?: number;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ total: number; page: number; totalPages: number; data: PreOwnedListing[] }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== "") query.append(key, String(val));
    });

    const res = await fetch(`${API_BASE}/listings?${query.toString()}`);
    if (!res.ok) {
      return { total: 0, page: 1, totalPages: 1, data: [] };
    }
    return res.json();
  },

  /**
   * Lấy chi tiết máy cũ theo ID
   */
  async getListingById(id: string): Promise<PreOwnedListing> {
    const res = await fetch(`${API_BASE}/listings/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không tìm thấy thiết bị");
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Lấy danh sách model máy ảnh hỗ trợ định giá tự động
   */
  async getValuationModels(): Promise<Record<string, ValuationModelPreset>> {
    const res = await fetch(`${API_BASE}/valuation-models`);
    if (!res.ok) return {};
    const json = await res.json();
    return json.data || {};
  },

  /**
   * Tính toán định giá Trade-In thu cũ đổi mới
   */
  async calculateValuation(data: {
    cameraKey?: string;
    customOriginalPriceVnd?: number;
    yearsUsed?: number;
    shutterCount?: number;
    conditionGrade?: string;
    sensorCondition?: string;
  }): Promise<TradeInQuoteResult> {
    const res = await fetch(`${API_BASE}/calculate-valuation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Lỗi định giá thiết bị");
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Đăng bán thiết bị thanh lý
   */
  async createListing(data: Partial<PreOwnedListing>): Promise<PreOwnedListing> {
    const res = await fetch(`${API_BASE}/listings`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Không thể đăng bán thiết bị");
    }
    const json = await res.json();
    return json.data;
  },
};
