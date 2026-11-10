import { ApiError } from "./authApi";
import type { Rental } from "../types/smartequip";
import type {
  Equipment,
  RentalRequest,
  RentalContract,
  HandoverRecord,
  Settlement,
  OwnerApplication,
  Dispute,
  SupportTicket,
  OwnerStats,
  OwnerContractTemplate,
  DigitalSignaturePayload,
} from "../types/owner";

async function request<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.", 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError(
        "Phiên đăng nhập đã hết hạn (do máy chủ vừa khởi động lại). Vui lòng bấm Đăng xuất ở góc trên và Đăng nhập lại tài khoản Owner.",
        401
      );
    }
    throw new ApiError(data.message || "Yêu cầu thất bại.", response.status);
  }

  return data as T;
}

export const ownerApi = {
  // 1. Overview & Stats
  getOverview: (token: string) =>
    request<{ stats: OwnerStats; recentRequests: RentalRequest[] }>(
      "/api/owner/overview",
      { method: "GET" },
      token
    ),

  // 2. Equipment Management (UC_O03, UC_O04, UC_O05, UC_O06, UC_O16)
  uploadPhoto: async (token: string, file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch("/api/owner/upload-photo", {
        method: "POST",
        headers,
        body: formData,
      });
    } catch {
      throw new ApiError("Không thể kết nối đến máy chủ để tải ảnh lên.", 0);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError(
          "Phiên đăng nhập đã hết hạn (do máy chủ vừa khởi động lại). Vui lòng bấm Đăng xuất ở góc trên và Đăng nhập lại tài khoản Owner.",
          401
        );
      }
      throw new ApiError(data.message || "Tải ảnh lên thất bại.", response.status);
    }

    return data as { url: string; filename: string };
  },

  uploadPhotos: async (token: string, files: File[]): Promise<{ urls: string[] }> => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch("/api/owner/upload-photos", {
        method: "POST",
        headers,
        body: formData,
      });
    } catch {
      throw new ApiError("Không thể kết nối đến máy chủ để tải ảnh lên.", 0);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError(
          "Phiên đăng nhập đã hết hạn (do máy chủ vừa khởi động lại). Vui lòng bấm Đăng xuất ở góc trên và Đăng nhập lại tài khoản Owner.",
          401
        );
      }
      throw new ApiError(data.message || "Tải ảnh lên thất bại.", response.status);
    }

    return data as { urls: string[] };
  },

  getEquipments: (token: string) =>
    request<{ equipments: Equipment[] }>("/api/owner/equipments", { method: "GET" }, token),

  getEquipmentDetail: (token: string, id: string) =>
    request<{ equipment: Equipment }>(`/api/owner/equipments/${id}`, { method: "GET" }, token),

  createEquipment: (token: string, data: Partial<Equipment>) =>
    request<{ message: string; equipment: Equipment }>(
      "/api/owner/equipments",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  updateEquipment: (token: string, id: string, data: Partial<Equipment>) =>
    request<{ message: string; equipment: Equipment }>(
      `/api/owner/equipments/${id}`,
      { method: "PUT", body: JSON.stringify(data) },
      token
    ),

  toggleVisibility: (token: string, id: string, visibility: "published" | "hidden" | "draft") =>
    request<{ message: string; equipment: Equipment }>(
      `/api/owner/equipments/${id}/visibility`,
      { method: "PATCH", body: JSON.stringify({ visibility }) },
      token
    ),

  scheduleAvailability: (
    token: string,
    id: string,
    data: { start_date: string; end_date: string; status: "available" | "blocked"; note?: string }
  ) =>
    request<{ message: string; equipment: Equipment }>(
      `/api/owner/equipments/${id}/schedule`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  submitStatusRequest: (
    token: string,
    id: string,
    data: { target_status: string; reason: string; evidence_photos?: string[] }
  ) =>
    request<{ message: string }>(
      `/api/owner/equipments/${id}/status-request`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  // 3. Rental Requests & Direct Rental Management
  getRentalRequests: (token: string) =>
    request<{ requests: RentalRequest[] }>("/api/owner/rental-requests", { method: "GET" }, token),

  respondRentalRequest: (
    token: string,
    id: string,
    action: "approve" | "reject",
    rejection_reason?: string
  ) =>
    request<{ message: string; request: RentalRequest }>(
      `/api/owner/rental-requests/${id}/respond`,
      { method: "PATCH", body: JSON.stringify({ action, rejection_reason }) },
      token
    ),

  getOwnerRentals: (token: string, status?: string) => {
    const qs = status && status !== "all" ? `?status=${status}` : "";
    return request<{ success: boolean; data: any[]; pagination: any }>(
      `/api/owner/rentals${qs}`,
      { method: "GET" },
      token
    );
  },

  respondOwnerRental: (
    token: string,
    rentalId: string,
    action: "approve" | "reject",
    rejection_reason?: string
  ) =>
    request<{ success: boolean; message: string; rental: any; rentalRequest?: RentalRequest }>(
      `/api/owner/rentals/${rentalId}/respond`,
      { method: "PATCH", body: JSON.stringify({ action, rejection_reason }) },
      token
    ),

  confirmOwnerRentalPayment: (
    token: string,
    rentalId: string,
    action: "approve" | "reject",
    note?: string
  ) =>
    request<{ success: boolean; message: string; rental: any }>(
      `/api/owner/rentals/${rentalId}/confirm-payment`,
      { method: "PATCH", body: JSON.stringify({ action, note }) },
      token
    ),

  updateOwnerRentalContractTerms: (
    token: string,
    rentalId: string,
    data: {
      contractTerms?: string;
      dailyRate?: number;
      totalDays?: number;
      rentalFee?: number;
      depositAmount?: number;
      discountAmount?: number;
      shippingFee?: number;
      totalAmount?: number;
      startDate?: string;
      endDate?: string;
      deliveryTime?: string;
      returnTime?: string;
      deliveryAddress?: string;
      deliveryMethod?: string;
      returnMethod?: string;
      changeSummary?: string;
    }
  ) =>
    request<{ success: boolean; message: string; rental: any; chatMessage?: any }>(
      `/api/owner/rentals/${rentalId}/contract`,
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),

  // 4. Rental Contracts (UC_O12, UC_O13, UC_O14, UC_O15)
  getContracts: (token: string) =>
    request<{ contracts: RentalContract[] }>("/api/owner/contracts", { method: "GET" }, token),

  getPublishedContractTemplates: (token: string) =>
    request<{ templates: OwnerContractTemplate[] }>(
      "/api/owner/contract-templates/published",
      { method: "GET" },
      token
    ),

  getContractDetail: (token: string, id: string) =>
    request<{ contract: RentalContract }>(`/api/owner/contracts/${id}`, { method: "GET" }, token),

  createContract: (
    token: string,
    data: {
      request_id: string;
      special_conditions?: string;
      custom_terms?: string;
      template_id?: string;
      template_values?: Record<string, string>;
      submit_immediately?: boolean;
      digital_signature?: DigitalSignaturePayload;
    }
  ) =>
    request<{ message: string; contract: RentalContract }>(
      "/api/owner/contracts",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  updateDraftContract: (
    token: string,
    id: string,
    data: {
      terms_content: string;
      special_conditions?: string;
      changes_summary?: string;
      submit_immediately?: boolean;
      digital_signature?: DigitalSignaturePayload;
    }
  ) =>
    request<{ message: string; contract: RentalContract }>(
      `/api/owner/contracts/${id}`,
      { method: "PUT", body: JSON.stringify(data) },
      token
    ),

  submitContractApproval: (token: string, id: string, digital_signature?: DigitalSignaturePayload) =>
    request<{ message: string; contract: RentalContract }>(
      `/api/owner/contracts/${id}/submit-approval`,
      { method: "POST", body: JSON.stringify({ digital_signature }) },
      token
    ),

  confirmEContract: (
    token: string,
    id: string,
    data?:
      | string
      | {
          signature_note?: string;
          signer_name?: string;
          signature_image?: string;
          signature_type?: "drawn" | "typed";
          digital_signature?: DigitalSignaturePayload;
        }
  ) =>
    request<{ message: string; contract: RentalContract }>(
      `/api/owner/contracts/${id}/confirm-e-contract`,
      {
        method: "POST",
        body: JSON.stringify(
          typeof data === "string" ? { signature_note: data } : data || {}
        ),
      },
      token
    ),

  // 5. Handover & Return Inspection (UC_O08, UC_O09)
  getHandoverRecords: (token: string, contractId: string) =>
    request<{ records: HandoverRecord[] }>(
      `/api/owner/contracts/${contractId}/handover`,
      { method: "GET" },
      token
    ),

  createHandoverRecord: (token: string, contractId: string, data: Partial<HandoverRecord>) =>
    request<{ message: string; record: HandoverRecord }>(
      `/api/owner/contracts/${contractId}/handover`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  createReturnInspection: (token: string, contractId: string, data: Partial<HandoverRecord>) =>
    request<{ message: string; record: HandoverRecord; settlement?: Settlement }>(
      `/api/owner/contracts/${contractId}/return-inspection`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  updateHandoverRecord: (token: string, id: string, data: Partial<HandoverRecord>) =>
    request<{ message: string; record: HandoverRecord }>(
      `/api/owner/handover-records/${id}`,
      { method: "PUT", body: JSON.stringify(data) },
      token
    ),

  // 6. Settlements & Revenue History (UC_O10, UC_O11)
  getSettlements: (token: string) =>
    request<{ settlements: Settlement[] }>("/api/owner/settlements", { method: "GET" }, token),

  getSettlementByContract: (token: string, contractId: string) =>
    request<{ settlement: Settlement }>(
      `/api/owner/settlements/${contractId}`,
      { method: "GET" },
      token
    ),

  confirmSettlement: (
    token: string,
    contractId: string,
    payload: {
      bank_info: { bank_name: string; bank_code?: string; account_number: string; account_holder: string };
      qr_code_url?: string;
      request_note?: string;
    }
  ) =>
    request<{ message: string; settlement: Settlement }>(
      `/api/owner/settlements/${contractId}/confirm`,
      { method: "POST", body: JSON.stringify(payload) },
      token
    ),

  getRevenueHistory: (token: string) =>
    request<{
      analytics: {
        totalEarned: number;
        paidOut: number;
        pendingPayout: number;
        platformFees: number;
        totalContracts: number;
        totalRequests: number;
      };
      settlements: Settlement[];
      contracts: RentalContract[];
      requests: RentalRequest[];
    }>("/api/owner/revenue-history", { method: "GET" }, token),

  // 7. Disputes & Support (UC_O17, UC_O18)
  getDisputes: (token: string) =>
    request<{ disputes: Dispute[] }>("/api/owner/disputes", { method: "GET" }, token),

  submitDispute: (token: string, data: Partial<Dispute>) =>
    request<{ message: string; dispute: Dispute }>(
      "/api/owner/disputes",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  getSupportTickets: (token: string) =>
    request<{ tickets: SupportTicket[] }>("/api/owner/support-tickets", { method: "GET" }, token),

  submitSupportTicket: (
    token: string,
    data: { category: string; subject: string; message: string; priority?: string }
  ) =>
    request<{ message: string; ticket: SupportTicket }>(
      "/api/owner/support-tickets",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  replySupportTicket: (token: string, id: string, message: string) =>
    request<{ message: string; ticket: SupportTicket }>(
      `/api/owner/support-tickets/${id}/reply`,
      { method: "POST", body: JSON.stringify({ message }) },
      token
    ),

  // 8. Public Marketplace & Renter Actions (UC_O19, UC_O20, Renter Sign Contract)
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

  getMyRentals: (token: string) =>
    request<{ requests: RentalRequest[]; contracts: RentalContract[] }>(
      "/api/equipments/my/rentals",
      { method: "GET" },
      token
    ),

  signMyContract: (
    token: string,
    contractId: string,
    payload?: { signature_note?: string; signature_image?: string; payment_method?: string } | string
  ) => {
    const body = typeof payload === "string" ? { signature_note: payload } : payload || {};
    return request<{ message: string; contract: RentalContract }>(
      `/api/equipments/my/contracts/${contractId}/sign`,
      { method: "POST", body: JSON.stringify(body) },
      token
    );
  },

  confirmMyReceipt: (token: string, contractId: string) =>
    request<{ message: string; contract: RentalContract }>(
      `/api/equipments/my/contracts/${contractId}/confirm-receipt`,
      { method: "POST", body: JSON.stringify({}) },
      token
    ),

  // 9. Owner Registration (UC_O02)
  submitOwnerRegistration: (token: string, data: Partial<OwnerApplication>) =>
    request<{ message: string; application: OwnerApplication }>(
      "/api/owner-registration",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  getOwnerRegistrationStatus: (token: string) =>
    request<{ hasApplication: boolean; application: OwnerApplication | null }>(
      "/api/owner-registration/status",
      { method: "GET" },
      token
    ),

  // System Admin: review owner applications
  adminListOwnerApplications: (token: string) =>
    request<{ applications: OwnerApplication[] }>(
      "/api/admin/owner-applications",
      { method: "GET" },
      token
    ),

  adminReviewOwnerApplication: (
    token: string,
    id: string,
    action: "approve" | "reject",
    admin_note?: string
  ) =>
    request<{ message: string; application: OwnerApplication }>(
      `/api/admin/owner-applications/${id}/review`,
      { method: "PATCH", body: JSON.stringify({ action, admin_note }) },
      token
    ),

  // Chủ máy chủ động hủy đơn / từ chối bàn giao trước giờ giao máy
  cancelRentalByOwner: (
    token: string,
    id: string,
    reason: string,
    isDamaged?: boolean
  ) =>
    request<{ success: boolean; message: string; rental: Rental }>(
      `/api/owner/rentals/${id}/cancel`,
      { method: "POST", body: JSON.stringify({ reason, is_damaged: isDamaged }) },
      token
    ),

  // Owner đánh giá Renter & chấm điểm uy tín (trust_score)
  reviewRenter: (
    token: string,
    id: string,
    data: {
      rating: number;
      equipment_preservation: string;
      on_time_return: boolean;
      comment?: string;
    }
  ) =>
    request<{
      success: boolean;
      message: string;
      ownerReview: any;
      newTrustScore: number;
    }>(
      `/api/owner/rentals/${id}/review-renter`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),
};
