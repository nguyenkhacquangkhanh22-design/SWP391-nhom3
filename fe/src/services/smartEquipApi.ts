import type { ApiErrorResponse, User } from "../types/auth";
import type { Equipment, Rental, SystemInfo } from "../types/smartequip";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
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
    throw new ApiError(
      "Không thể kết nối máy chủ. Hãy kiểm tra backend và thử lại.",
      0,
    );
  }

  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorData = data as ApiErrorResponse;
    const message =
      typeof errorData.message === "string" && errorData.message.trim()
        ? errorData.message
        : `Đã xảy ra lỗi (HTTP ${response.status}). Vui lòng thử lại hoặc khởi động lại backend.`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const smartEquipApi = {
  // UC_G01: Thông tin hệ thống SmartEquip
  getSystemInfo: () =>
    request<{ success: boolean; data: SystemInfo }>("/api/system/info"),

  // UC_G02 & UC_R04, UC_R05: Lọc & tìm kiếm thiết bị
  getEquipments: (params: {
    keyword?: string;
    category?: string;
    minPrice?: number | string;
    maxPrice?: number | string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set("keyword", params.keyword);
    if (params.category && params.category !== "all") searchParams.set("category", params.category);
    if (params.minPrice) searchParams.set("minPrice", String(params.minPrice));
    if (params.maxPrice) searchParams.set("maxPrice", String(params.maxPrice));
    if (params.status && params.status !== "all") searchParams.set("status", params.status);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));

    const queryString = searchParams.toString();
    return request<{
      success: boolean;
      data: Equipment[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/equipment${queryString ? `?${queryString}` : ""}`);
  },

  // UC_G03 & UC_R06: Chi tiết thiết bị
  getEquipmentById: (id: string) =>
    request<{ success: boolean; data: Equipment }>(`/api/equipment/${id}`),

  // UC_R02: Xem profile
  getUserProfile: (token: string) =>
    request<{ success: boolean; user: User }>("/api/user/profile", {}, token),

  // UC_R02: Cập nhật profile
  updateUserProfile: (
    token: string,
    data: { name?: string; phone?: string; address?: string; avatarUrl?: string },
  ) =>
    request<{ success: boolean; message: string; user: User }>(
      "/api/user/profile",
      { method: "PUT", body: JSON.stringify(data) },
      token,
    ),

  // Xác thực nhanh KYC (Dành cho test / dev)
  quickVerifyKyc: (token: string) =>
    request<{ success: boolean; message: string; user: User }>(
      "/api/user/kyc/quick-verify",
      { method: "POST", body: JSON.stringify({}) },
      token,
    ),

  // UC_R03: Nộp hồ sơ KYC
  submitKyc: (
    token: string,
    data: { idNumber: string; idCardFront: string; idCardBack: string; selfiePhoto?: string },
  ) =>
    request<{ success: boolean; message: string; user: User }>(
      "/api/user/kyc",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // UC_R07: Tạo yêu cầu thuê thiết bị
  createRentalRequest: (
    token: string,
    data: {
      equipmentId: string;
      startDate: string;
      endDate: string;
      deliveryTime?: string;
      returnTime?: string;
      deliveryMethod?: string;
      returnMethod?: string;
      deliveryAddress?: string;
      renterNote?: string;
      notes?: string;
    },
  ) =>
    request<{ success: boolean; message: string; data: Rental }>(
      "/api/rentals/request",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // Phê duyệt đơn thuê (Chủ máy / Quản lý)
  approveRental: (token: string, rentalId: string, note?: string) =>
    request<{ success: boolean; message: string; data: Rental }>(
      `/api/rentals/${rentalId}/approve`,
      { method: "POST", body: JSON.stringify({ note }) },
      token,
    ),

  // Owner từ chối yêu cầu thuê
  rejectRental: (token: string, rentalId: string, reason: string) =>
    request<{ success: boolean; message: string; data: Rental }>(
      `/api/rentals/${rentalId}/reject`,
      { method: "POST", body: JSON.stringify({ reason }) },
      token,
    ),

  // Đồng ý thỏa thuận điều khoản để mở quyền Ký hợp đồng & Thanh toán
  agreeToSignContract: (token: string, rentalId: string) =>
    request<{ success: boolean; message: string; data: Rental }>(
      `/api/rentals/${rentalId}/agree-contract`,
      { method: "POST" },
      token,
    ),

  // UC_R08: Ký hợp đồng điện tử
  confirmContract: (
    token: string,
    rentalId: string,
    data: { termsAccepted: boolean; digitalSignature?: string; renterSignature?: string; signatureImage?: string },
  ) =>
    request<{ success: boolean; message: string; data: Rental }>(
      `/api/rentals/${rentalId}/confirm-contract`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // UC_R09: Thanh toán đơn thuê qua QR (chờ Rental Moderator xác nhận)
  payRental: (
    token: string,
    rentalId: string,
    data: {
      paymentMethod?: string;
      receiptImage?: string;
      digitalSignature?: string;
      renterSignature?: string;
      transactionId?: string;
      transferNote?: string;
      senderName?: string;
      proofImage?: string;
    } = {},
  ) =>
    request<{ success: boolean; message: string; data: Rental }>(
      `/api/rentals/${rentalId}/pay`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // UC_R10: Yêu cầu trả thiết bị
  requestReturn: (
    token: string,
    rentalId: string,
    data: {
      returnCondition?: string;
      returnNote?: string;
      returnTime?: string;
      returnLocation?: string;
      returnNotes?: string;
      deviceConditionNote?: string;
      returnImages?: string[];
    } = {},
  ) =>
    request<{ success: boolean; message: string; data: Rental }>(
      `/api/rentals/${rentalId}/return`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // UC_R11: Đánh giá thiết bị & chủ sở hữu
  reviewRental: (
    token: string,
    rentalId: string,
    data: { rating: number; comment?: string },
  ) =>
    request<{ success: boolean; message: string; data: Rental }>(
      `/api/rentals/${rentalId}/review`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // Xóa toàn bộ lịch sử thuê của tài khoản Renter (Reset test)
  resetRentalHistory: (token: string) =>
    request<{ success: boolean; message: string; data: any }>(
      "/api/rentals/reset-history",
      { method: "POST" },
      token,
    ),

  // UC_R12: Xem lịch sử thuê
  getRentalHistory: (
    token: string,
    params: { status?: string; page?: number; limit?: number } = {},
  ) => {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== "all") searchParams.set("status", params.status);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return request<{
      success: boolean;
      data: Rental[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/rentals/history${qs ? `?${qs}` : ""}`, {}, token);
  },

  // UC_R10_EXT: Gia hạn thời gian thuê thiết bị
  extendRental: (
    token: string,
    rentalId: string,
    data: { extraDays: number; note?: string },
  ) =>
    request<{ success: boolean; message: string; rental: Rental }>(
      `/api/rentals/${rentalId}/extend`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // UC_R13: Hủy yêu cầu thuê
  cancelRental: (
    token: string,
    rentalId: string,
    data: {
      reason: string;
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
    },
  ) =>
    request<{ success: boolean; message: string; data: Rental }>(
      `/api/rentals/${rentalId}/cancel`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // UC_R14: Khiếu nại đơn thuê
  submitDispute: (
    token: string,
    rentalId: string,
    data: { reason: string; evidenceImages?: string[] },
  ) =>
    request<{ success: boolean; message: string; data: Rental }>(
      `/api/rentals/${rentalId}/dispute`,
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // UC_R15: Gửi support ticket
  createSupportTicket: (
    token: string,
    data: { subject: string; message: string; category?: string; rentalId?: string },
  ) =>
    request<{ success: boolean; message: string; data: unknown }>(
      "/api/support/ticket",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  // Chat Box giữa Owner & Khách thuê (gửi tin nhắn & gửi hợp đồng)
  getChatMessages: (
    token: string,
    params: { rentalId?: string; otherUserId?: string } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.rentalId) qs.set("rentalId", params.rentalId);
    if (params.otherUserId) qs.set("otherUserId", params.otherUserId);
    return request<{ success: boolean; data: any[] }>(
      `/api/chat/messages?${qs.toString()}`,
      {},
      token,
    );
  },

  sendChatMessage: (
    token: string,
    data: {
      receiverId: string;
      rentalId?: string;
      message?: string;
      messageType?: "text" | "contract" | "image";
      fileUrl?: string;
      contractData?: any;
    },
  ) =>
    request<{ success: boolean; data: any }>(
      "/api/chat/send",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),

  uploadChatImage: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/chat/upload-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Không thể tải ảnh lên");
    return data as { success: boolean; url: string; filename: string };
  },

  markChatAsRead: (token: string, data: { senderId?: string; rentalId?: string }) =>
    request<{ success: boolean; message: string }>(
      "/api/chat/read",
      { method: "PATCH", body: JSON.stringify(data) },
      token,
    ),

  // AI-powered Product Filter & Assistant
  aiFilterEquipment: (data: {
    prompt: string;
    category?: string;
    maxPrice?: number;
    minPrice?: number;
  }) =>
    request<{
      success: boolean;
      data: Equipment[];
      matchedItems?: Array<{ equipment: Equipment; matchScore: number; matchReason: string }>;
      aiAdvice: string;
      purpose: string;
      tags: string[];
      suggestedAddons: string[];
      detectedCriteria: any;
    }>("/api/equipment/ai-filter", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
