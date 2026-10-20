import type {
  AdminOverviewResponse,
  AdminSupportTicketsResponse,
  AdminSupportTicket,
  AdminEquipmentsResponse,
  AdminEquipment,
} from "../types/admin";
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

  // UC_A17: Support Tickets
  listSupportTickets: (
    token: string,
    params?: { status?: string; category?: string; priority?: string; search?: string }
  ) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.category) query.set("category", params.category);
    if (params?.priority) query.set("priority", params.priority);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return adminRequest<AdminSupportTicketsResponse>(`/support-tickets${qs}`, { method: "GET" }, token);
  },

  replySupportTicket: (
    token: string,
    ticketId: string,
    body: { message: string; nextStatus?: string }
  ) =>
    adminRequest<{ message: string; ticket: AdminSupportTicket }>(
      `/support-tickets/${ticketId}/reply`,
      { method: "POST", body: JSON.stringify(body) },
      token
    ),

  updateSupportTicketStatus: (
    token: string,
    ticketId: string,
    body: { status: string; note?: string }
  ) =>
    adminRequest<{ message: string; ticket: AdminSupportTicket }>(
      `/support-tickets/${ticketId}/status`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),

  // UC_A11 & UC_A12: Equipment Listings Moderation & Visibility
  listEquipments: (
    token: string,
    params?: {
      search?: string;
      category?: string;
      approvalStatus?: string;
      visibility?: string;
      sortBy?: string;
    }
  ) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    if (params?.approvalStatus) query.set("approvalStatus", params.approvalStatus);
    if (params?.visibility) query.set("visibility", params.visibility);
    if (params?.sortBy) query.set("sortBy", params.sortBy);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return adminRequest<AdminEquipmentsResponse>(`/equipments${qs}`, { method: "GET" }, token);
  },

  reviewEquipmentApproval: (
    token: string,
    equipmentId: string,
    body: { approval_status: "approved" | "rejected"; rejection_reason?: string }
  ) =>
    adminRequest<{ message: string; equipment: AdminEquipment }>(
      `/equipments/${equipmentId}/approval`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),

  updateEquipmentVisibility: (
    token: string,
    equipmentId: string,
    body: { visibility: "published" | "hidden"; reason?: string }
  ) =>
    adminRequest<{ message: string; equipment: AdminEquipment }>(
      `/equipments/${equipmentId}/visibility`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    ),
};
