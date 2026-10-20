import type { User } from "./auth";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminCount: number;
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
