import { ApiError } from "./authApi";

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
};
