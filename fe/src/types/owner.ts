export interface EquipmentSpec {
  key: string;
  value: string;
}

export interface EquipmentSchedule {
  start_date: string;
  end_date: string;
  status: "available" | "blocked" | "booked";
  note?: string;
}

export interface EquipmentPricing {
  price_per_hour: number;
  price_per_day: number;
  deposit_amount: number;
  weekend_rate?: number;
}

export interface Equipment {
  _id: string;
  owner_id: string | { _id: string; name: string; email: string; trust_score?: number };
  title: string;
  category: string;
  brand: string;
  model_name: string;
  serial_number: string;
  description: string;
  specifications: EquipmentSpec[];
  images: string[];
  accessories: string[];
  condition: string;
  pricing: EquipmentPricing;
  rental_terms: string;
  cancellation_policy: string;
  visibility: "published" | "hidden" | "draft";
  status: "available" | "rented" | "maintenance" | "reserved";
  availability_schedule: EquipmentSchedule[];
  rating: number;
  review_count: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RentalRequest {
  _id: string;
  request_code: string;
  equipment_id: Equipment;
  owner_id: string | { _id: string; name: string; email: string };
  renter_id: string | { _id: string; name: string; email: string; phone?: string };
  renter_name: string;
  renter_phone?: string;
  renter_email?: string;
  rental_type: "daily" | "hourly";
  start_date: string;
  end_date: string;
  duration_days: number;
  duration_hours: number;
  rental_fee: number;
  deposit_amount: number;
  total_estimated_amount: number;
  renter_note?: string;
  status:
    | "pending_moderator"
    | "moderator_rejected"
    | "pending"
    | "approved"
    | "rejected"
    | "contract_created"
    | "active"
    | "completed"
    | "cancelled";
  moderator_id?: { _id: string; name: string; email: string };
  moderator_note?: string;
  forwarded_to_owner_at?: string;
  rejection_reason?: string;
  responded_at?: string;
  createdAt: string;
}

export interface ContractVersionHistory {
  version: number;
  edited_at: string;
  changes_summary: string;
  terms_content: string;
}

export interface RentalContract {
  _id: string;
  contract_code: string;
  request_id: string | { _id: string; request_code: string };
  equipment_id: Equipment;
  owner_id: string | { _id: string; name: string; email: string };
  renter_id: { _id: string; name: string; email: string; phone?: string };
  title: string;
  terms_content: string;
  rental_price: number;
  deposit_amount: number;
  start_date: string;
  end_date: string;
  special_conditions?: string;
  version: number;
  version_history: ContractVersionHistory[];
  status:
    | "draft"
    | "pending_renter_signature"
    | "pending_approval"
    | "moderator_rejected"
    | "moderator_approved"
    | "signed"
    | "active"
    | "completed"
    | "cancelled";
  moderator_feedback?: string;
  moderator_approved_at?: string;
  moderator_approved_version?: number;
  moderator_id?: { _id: string; name: string; email: string };
  moderation_history?: {
    action: "approved" | "rejected";
    moderator_id?: { _id: string; name: string; email: string };
    reason?: string;
    version: number;
    created_at: string;
  }[];
  owner_signature?: ContractSignature;
  renter_signature?: ContractSignature;
  handover_records?: HandoverRecord[];
  createdAt: string;
}

export interface ContractSignature {
  signed: boolean;
  signed_at?: string;
  signature_data?: string;
  signer_name?: string;
  signature_image?: string;
  signature_type?: "drawn" | "typed";
  certificate_code?: string;
}

export interface DigitalSignaturePayload {
  signer_name: string;
  signature_type: "drawn" | "typed";
  signature_image?: string;
  signature_note?: string;
  declaration_accepted?: boolean;
}

export interface OwnerContractTemplate {
  _id: string;
  template_code: string;
  name: string;
  version: number;
  terms_content: string;
  fields: { key: string; label: string; required: boolean }[];
}

export interface HandoverRecord {
  _id: string;
  contract_id: string;
  equipment_id: string;
  owner_id: string;
  renter_id: string;
  record_type: "handover" | "return";
  record_date: string;
  accessories_checklist: { item: string; checked: boolean; notes?: string }[];
  physical_condition: string;
  working_status: string;
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
  };
  createdAt: string;
}

export interface Settlement {
  _id: string;
  settlement_code: string;
  contract_id: RentalContract;
  owner_id: string | { _id: string; name: string; email: string; phone?: string };
  renter_id: { _id: string; name: string; email: string; phone?: string };
  total_rental_fee: number;
  overtime_fee: number;
  damage_deduction: number;
  deduction_reason?: string;
  deposit_paid: number;
  deposit_refund_to_renter: number;
  platform_fee: number;
  owner_payout_amount: number;
  owner_confirmed: boolean;
  owner_confirmed_at?: string;
  requested_at?: string;
  request_note?: string;
  qr_code_url?: string;
  payout_status: "pending_owner_confirmation" | "pending_moderator_approval" | "confirmed" | "processing" | "paid" | "rejected";
  paid_at?: string;
  bank_info?: {
    bank_name: string;
    bank_code?: string;
    account_number: string;
    account_holder: string;
  };
  moderator_review?: {
    moderator_id?: { _id: string; name: string; email: string };
    reviewed_at?: string;
    note?: string;
    transaction_code?: string;
    receipt_image?: string;
  };
  createdAt: string;
}

export interface OwnerApplication {
  _id: string;
  user_id: string | { _id: string; name: string; email: string; role: string; status: string };
  applicant_name: string;
  applicant_email: string;
  phone: string;
  identity_card: string;
  address: string;
  shop_name?: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  identity_card_front?: string;
  identity_card_back?: string;
  business_license?: string;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string;
  reviewed_at?: string;
  createdAt: string;
}

export interface Dispute {
  _id: string;
  dispute_code: string;
  contract_id: { _id: string; contract_code: string; title: string };
  owner_id: string;
  renter_id: { _id: string; name: string; email: string; phone?: string };
  title: string;
  reason: string;
  description: string;
  evidence_urls: string[];
  claimed_compensation: number;
  status: "pending_review" | "investigating" | "resolved" | "dismissed";
  resolution_note?: string;
  createdAt: string;
}

export interface SupportTicketReply {
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export interface SupportTicket {
  _id: string;
  ticket_code: string;
  user_id: string;
  user_role: string;
  category: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  replies: SupportTicketReply[];
  createdAt: string;
}

export interface OwnerStats {
  totalEquipments: number;
  activeEquipments: number;
  pendingRequests: number;
  activeContracts: number;
  totalRevenue: number;
  pendingPayout: number;
  completedOrders: number;
}
