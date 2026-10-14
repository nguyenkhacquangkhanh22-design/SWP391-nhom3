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
