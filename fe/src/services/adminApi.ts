import type { AdminOverviewResponse } from "../types/admin";
import type { User } from "../types/auth";
import { ApiError } from "./authApi";

const ADMIN_BASE_URL = "/api/admin";

async function adminRequest<T>(
  path: string,
  options: RequestInit = {},
  token: string
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${ADMIN_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Không thể kết nối máy chủ quản trị.", 0);
  }

  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorData = data as { message?: string };
    const message = errorData.message || "Đã xảy ra lỗi tại máy chủ quản trị.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const adminApi = {
  getOverview: (token: string) =>
    adminRequest<AdminOverviewResponse>("/overview", { method: "GET" }, token),

  updateUserRole: (token: string, userId: string, role: string) =>
    adminRequest<{ message: string; user: User }>(
      `/users/${userId}/role`,
      { method: "PATCH", body: JSON.stringify({ role }) },
      token
    ),

  updateUserStatus: (token: string, userId: string, status: string) =>
    adminRequest<{ message: string; user: User }>(
      `/users/${userId}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      token
    ),
};
