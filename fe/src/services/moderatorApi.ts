import { ApiError } from "./authApi";
import type { Settlement } from "../types/owner";

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api/moderator${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || "Yêu cầu thất bại.", response.status);
  }
  return data as T;
}

export interface ModeratorRentalRequest {
  _id: string;
  request_code: string;
  renter_name: string;
  renter_email?: string;
  renter_phone?: string;
  rental_type: "daily" | "hourly";
  start_date: string;
  end_date: string;
  duration_days: number;
  duration_hours: number;
  rental_fee: number;
  deposit_amount: number;
  total_estimated_amount: number;
  renter_note?: string;
  status: string;
  moderator_note?: string;
  forwarded_to_owner_at?: string;
  rejection_reason?: string;
  createdAt: string;
  equipment_id: {
    _id: string;
    title: string;
    category?: string;
    brand?: string;
    model_name?: string;
    serial_number?: string;
    images?: string[];
  };
  owner_id: { _id: string; name: string; email: string };
  renter_id: { _id: string; name: string; email: string };
  moderator_id?: { _id: string; name: string; email: string };
}

export interface ModeratorPaymentRental {
  _id: string;
  rentalCode: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate?: number;
  rentalFee: number;
  depositAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  status: string;
  deliveryAddress?: string;
  deliveryTime?: string;
  returnTime?: string;
  deliveryMethod?: string;
  returnMethod?: string;
  shippingFee?: number;
  renterNote?: string;
  renter?: { _id: string; name: string; email: string; phone?: string };
  owner?: { _id: string; name: string; email: string; phone?: string };
  equipment?: {
    _id: string;
    title: string;
    category?: string;
    brand?: string;
    model_name?: string;
    modelNumber?: string;
    serial_number?: string;
    images?: string[];
    dailyRate?: number;
    depositAmount?: number;
  };
  contract?: {
    contractNumber?: string;
    termsAccepted?: boolean;
    renterSignature?: string;
    digitalSignature?: string;
    signedAt?: string;
  };
  payment?: {
    isPaid?: boolean;
    paymentMethod?: string;
    paymentStatus?: "unpaid" | "verifying" | "paid" | "rejected" | "refunded" | string;
    amountPaid?: number;
    transactionId?: string;
    transferNotifiedAt?: string;
    transferNote?: string;
    senderName?: string;
    proofImage?: string;
    receiptImage?: string;
    submittedAt?: string;
    paidAt?: string;
    rejectionReason?: string;
    verifiedBy?: { _id: string; name: string; email: string };
    verifiedAt?: string;
    moderatorNote?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ModeratorContract {
  _id: string;
  contract_code: string;
  title: string;
  status: string;
  version: number;
  terms_content: string;
  rental_price: number;
  deposit_amount: number;
  start_date: string;
  end_date: string;
  special_conditions?: string;
  moderator_feedback?: string;
  moderator_approved_at?: string;
  moderator_id?: { name: string; email: string };
  owner_signature?: {
    signed: boolean;
    signed_at?: string;
    signer_name?: string;
    signature_image?: string;
    signature_type?: string;
    certificate_code?: string;
    signature_data?: string;
  };
  renter_signature?: {
    signed: boolean;
    signed_at?: string;
    signer_name?: string;
    signature_image?: string;
    signature_type?: string;
    certificate_code?: string;
    signature_data?: string;
  };
  moderation_history?: {
    action: string;
    reason: string;
    version: number;
    created_at: string;
    moderator_id: { name: string; email: string };
  }[];
  owner_id: { _id: string; name: string; email: string };
  renter_id: { _id: string; name: string; email: string };
  equipment_id: {
    _id: string;
    title: string;
    brand?: string;
    model_name?: string;
    serial_number?: string;
    condition?: string;
    accessories?: string[];
    status: string;
  };
  request_id?: {
    request_code: string;
    renter_note?: string;
  };
  createdAt: string;
}

export interface ModeratorEquipment {
  _id: string;
  title: string;
  category: string;
  serial_number?: string;
  status: string;
  condition?: string;
  accessories: string[];
  updatedAt: string;
  owner_id: { name: string; email: string };
  status_history: ModeratorStatusRequest[];
  contracts: { _id: string; contract_code: string; title: string; status: string; start_date: string; end_date: string }[];
}

export interface ModeratorStatusRequest {
  _id: string;
  current_status: string;
  target_status: string;
  reason: string;
  evidence_photos: string[];
  status: "pending" | "approved" | "rejected";
  moderator_note?: string;
  reviewed_by?: { name: string; email: string };
  createdAt: string;
  reviewed_at?: string;
  equipment_id: { _id: string; title: string; status: string; serial_number?: string };
  owner_id: { name: string; email: string };
}

export interface ModeratorHandoverRecord {
  _id: string;
  record_type: "handover" | "return";
  record_date: string;
  physical_condition: string;
  working_status: string;
  accessories_checklist: { item: string; checked: boolean; notes?: string }[];
  evidence_photos: string[];
  notes?: string;
  missing_items?: string[];
  damage_detected?: string;
  estimated_damage_cost?: number;
  owner_confirmed: boolean;
  renter_confirmed: boolean;
  moderator_review?: {
    status: "pending" | "verified" | "needs_changes";
    note?: string;
    reviewed_at?: string;
    moderator_id?: { name: string; email: string };
  };
  moderator_review_history?: {
    status: string;
    note?: string;
    reviewed_at: string;
    moderator_id: { name: string; email: string };
  }[];
  contract_id: { _id: string; contract_code: string; title: string; status: string };
  equipment_id: { _id: string; title: string; status: string; accessories: string[] };
  owner_id: { name: string; email: string };
  renter_id: { name: string; email: string };
}

export interface ContractTemplate {
  _id: string;
  template_code: string;
  name: string;
  version: number;
  terms_content: string;
  fields: { key: string; label: string; required: boolean }[];
  status: "draft" | "published" | "retired";
  createdAt: string;
  published_at?: string;
  retired_at?: string;
  created_by?: { name: string; email: string };
}

export interface ModeratorTicket {
  _id: string;
  ticket_code: string;
}

export const moderatorApi = {
  getRentalRequests: (token: string) =>
    request<{ rentalRequests: ModeratorRentalRequest[] }>("/rental-requests", token),
  forwardRentalRequest: (token: string, id: string, action: "forward" | "reject", note?: string) =>
    request<{ message: string; rentalRequest: ModeratorRentalRequest }>(
      `/rental-requests/${id}/forward`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ action, note }),
      }
    ),
  getPayments: (token: string, status?: string) =>
    request<{ payments: ModeratorPaymentRental[] }>(
      `/payments${status ? `?status=${status}` : ""}`,
      token
    ),
  reviewPayment: (token: string, id: string, action: "approve" | "reject", note?: string) =>
    request<{ message: string; rental?: ModeratorPaymentRental; paymentRental?: ModeratorPaymentRental }>(
      `/payments/${id}/review`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ action, note }),
      }
    ),
  verifyPayment: (token: string, id: string, action: "approve" | "reject", note?: string) =>
    request<{ message: string; notificationWarning?: string; paymentRental: ModeratorPaymentRental }>(
      `/payments/${id}/verify`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ action, note }),
      }
    ),
  getContracts: (token: string) =>
    request<{ contracts: ModeratorContract[] }>("/contracts", token),
  reviewContract: (token: string, id: string, action: "approve" | "reject", reason?: string) =>
    request<{ message: string; notificationWarning?: string; contract: ModeratorContract }>(`/contracts/${id}/review`, token, {
      method: "PATCH",
      body: JSON.stringify({ action, reason }),
    }),
  getEquipments: (token: string) =>
    request<{ equipments: ModeratorEquipment[] }>("/equipments", token),
  getHandoverRecords: (token: string) =>
    request<{ records: ModeratorHandoverRecord[] }>("/handover-records", token),
  reviewHandoverRecord: (token: string, id: string, action: "verify" | "request_changes", note?: string) =>
    request<{ message: string; notificationWarning?: string }>(`/handover-records/${id}/review`, token, {
      method: "PATCH",
      body: JSON.stringify({ action, note }),
    }),
  getStatusRequests: (token: string) =>
    request<{ requests: ModeratorStatusRequest[] }>("/status-requests", token),
  reviewStatusRequest: (token: string, id: string, action: "approve" | "reject", note?: string) =>
    request<{ message: string; notificationWarning?: string }>(`/status-requests/${id}/review`, token, {
      method: "PATCH",
      body: JSON.stringify({ action, note }),
    }),
  getTemplates: (token: string) =>
    request<{ templates: ContractTemplate[] }>("/contract-templates", token),
  createTemplate: (token: string, data: { name: string; terms_content: string; fields: ContractTemplate["fields"] }) =>
    request<{ message: string; template: ContractTemplate }>("/contract-templates", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createTemplateVersion: (token: string, id: string, data: { name: string; terms_content: string; fields: ContractTemplate["fields"] }) =>
    request<{ message: string; template: ContractTemplate }>(`/contract-templates/${id}/versions`, token, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  publishTemplate: (token: string, id: string) =>
    request<{ message: string }>(`/contract-templates/${id}/publish`, token, { method: "PATCH" }),
  retireTemplate: (token: string, id: string) =>
    request<{ message: string }>(`/contract-templates/${id}/retire`, token, { method: "PATCH" }),
  submitSupportTicket: (
    token: string,
    data: { category: string; subject: string; message: string; related_record_id?: string }
  ) =>
    request<{ message: string; ticket: ModeratorTicket }>("/support-tickets", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getKycSubmissions: (
    token: string,
    params?: { status?: string; search?: string; page?: number; limit?: number }
  ) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{
      submissions: import("../types/admin").AdminKycSubmission[];
      pagination: { currentPage: number; totalPages: number; totalCount: number; limit: number };
      stats: { pending: number; verified: number; rejected: number; unverified: number; total_active: number };
    }>(`/kyc-submissions${query}`, token);
  },
  reviewKycSubmission: (
    token: string,
    userId: string,
    body: { status: "verified" | "rejected"; rejectionReason?: string; trustScoreBonus?: number }
  ) =>
    request<{
      message: string;
      user: import("../types/admin").AdminKycSubmission;
    }>(`/kyc-submissions/${userId}/review`, token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getPayoutRequests: (token: string) =>
    request<{ payouts: Settlement[] }>("/payouts", token),
  reviewPayoutRequest: (
    token: string,
    id: string,
    body: { action: "approve" | "reject"; note?: string; transaction_code?: string; receipt_image?: string }
  ) =>
    request<{ message: string; settlement: Settlement }>(`/payouts/${id}/review`, token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};