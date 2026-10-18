import { ApiError } from "./authApi";
import type { Equipment, RentalRequest } from "../types/equipment";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new ApiError("Không thể kết nối máy chủ.", 0);
  }

  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorData = data as { message?: string };
    const message = errorData.message || "Đã xảy ra lỗi tại máy chủ.";
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const marketplaceApi = {
  browseEquipments: (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params || {}).toString();
    const query = searchParams ? `?${searchParams}` : "";
    return request<{ total: number; equipments: Equipment[] }>(`/api/equipments${query}`);
  },

  getEquipmentPublicDetail: (id: string) =>
    request<{ equipment: Equipment }>(`/api/equipments/${id}`),

  requestRental: (
    token: string,
    equipmentId: string,
    data: {
      start_date: string;
      end_date: string;
      rental_type?: string;
      renter_note?: string;
      renter_phone?: string;
    }
  ) =>
    request<{ message: string; request: RentalRequest }>(
      `/api/equipments/${equipmentId}/request-rental`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),
};
