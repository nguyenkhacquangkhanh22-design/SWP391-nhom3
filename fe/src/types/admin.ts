import type { User } from "./auth";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminCount: number;
  pendingEquipments?: number;
  pendingDisputes?: number;
  pendingKyc?: number;
  openTickets?: number;
}

export interface AdminOverviewResponse {
  stats: AdminStats;
  users: Array<
    User & {
      _id: string;
    }
  >;
}

export interface AdminTicketSender {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface AdminTicketReply {
  _id?: string;
  sender_id?: AdminTicketSender | string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at?: string;
}

export interface AdminSupportTicket {
  _id: string;
  ticket_code: string;
  user_id: AdminTicketSender;
  user_role: string;
  category: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  replies: AdminTicketReply[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface AdminSupportTicketsResponse {
  tickets: AdminSupportTicket[];
  stats: TicketStats;
}

export interface AdminEquipmentOwner {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  trust_score?: number;
}

export interface AdminEquipmentPricing {
  price_per_hour?: number;
  price_per_day: number;
  deposit_amount: number;
  weekend_rate?: number;
}

export interface AdminEquipmentSpec {
  key: string;
  value: string;
}

export interface AdminEquipment {
  _id: string;
  owner_id: AdminEquipmentOwner;
  title: string;
  category: string;
  brand?: string;
  model_name?: string;
  serial_number?: string;
  description?: string;
  specifications: AdminEquipmentSpec[];
  images: string[];
  accessories?: string[];
  condition?: string;
  pricing: AdminEquipmentPricing;
  rental_terms?: string;
  cancellation_policy?: string;
  visibility: "published" | "hidden" | "draft";
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  moderated_by?: {
    _id: string;
    name: string;
    email: string;
  };
  moderated_at?: string;
  hidden_reason?: string;
  status: "available" | "rented" | "maintenance" | "reserved" | "damaged" | "retired" | "hidden";
  rating?: number;
  review_count?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEquipmentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  hidden: number;
}

export interface AdminEquipmentsResponse {
  equipments: AdminEquipment[];
  stats: AdminEquipmentStats;
}

// ==========================================
// DISPUTES (UC_A15 & UC_A16)
// ==========================================
export interface AdminDisputeParty {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  trust_score?: number;
}

export interface AdminDisputeContract {
  _id: string;
  contract_code: string;
  rental_price: number;
  deposit_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  equipment_id?: {
    _id: string;
    title: string;
    images?: string[];
    price_per_day?: number;
    deposit_amount?: number;
    category?: string;
    description?: string;
  };
}

export interface AdminDispute {
  _id: string;
  dispute_code: string;
  contract_id: AdminDisputeContract;
  owner_id: AdminDisputeParty;
  renter_id: AdminDisputeParty;
  title: string;
  reason: string;
  description: string;
  evidence_urls: string[];
  claimed_compensation: number;
  compensation_approved?: number;
  status: "pending_review" | "investigating" | "resolved" | "dismissed";
  resolution_note?: string;
  resolved_by?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  resolved_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDisputeStats {
  total: number;
  pending_review: number;
  investigating: number;
  resolved: number;
  dismissed: number;
}

export interface AdminDisputesResponse {
  disputes: AdminDispute[];
  stats: AdminDisputeStats;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}

export interface AdminHandoverRecord {
  _id: string;
  record_type: "handover" | "return";
  record_date: string;
  accessories_checklist: Array<{
    item: string;
    checked: boolean;
    notes?: string;
  }>;
  physical_condition: string;
  working_status: string;
  evidence_photos: string[];
  notes?: string;
  missing_items?: string[];
  damage_detected?: string;
  estimated_damage_cost?: number;
  owner_confirmed: boolean;
  renter_confirmed: boolean;
}

export interface AdminSettlementRecord {
  _id: string;
  settlement_code: string;
  total_rental_fee: number;
  overtime_fee: number;
  damage_deduction: number;
  deduction_reason?: string;
  deposit_paid: number;
  deposit_refund_to_renter: number;
  platform_fee: number;
  owner_payout_amount: number;
  payout_status: string;
}

export interface DisputeDetailResponse {
  dispute: AdminDispute;
  handovers: AdminHandoverRecord[];
  settlement: AdminSettlementRecord | null;
}

export interface ResolveDisputePayload {
  status: "resolved" | "dismissed" | "investigating";
  compensation_approved?: number;
  resolution_note?: string;
}

// ==========================================
// KYC SUBMISSIONS (UC_A06)
// ==========================================
export interface AdminKycDocument {
  idNumber?: string;
  idCardFront?: string;
  idCardBack?: string;
  selfiePhoto?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  verifiedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface AdminKycSubmission {
  _id: string;
  User_Id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  trust_score: number;
  kycStatus: "unverified" | "pending" | "verified" | "rejected";
  kycDocument?: AdminKycDocument;
  createdAt: string;
  updatedAt: string;
}

export interface AdminKycStats {
  pending: number;
  verified: number;
  rejected: number;
  unverified: number;
  total_active: number;
}

export interface AdminKycResponse {
  submissions: AdminKycSubmission[];
  stats: AdminKycStats;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}

export interface ReviewKycPayload {
  status: "verified" | "rejected";
  rejectionReason?: string;
  trustScoreBonus?: number;
}

// ==========================================
// AUDIT LOGS (UC_A21)
// ==========================================
export interface AdminAuditLog {
  _id: string;
  actor_id: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string;
  target_label?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLogsResponse {
  logs: AdminAuditLog[];
  stats: {
    total: number;
    today: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}
