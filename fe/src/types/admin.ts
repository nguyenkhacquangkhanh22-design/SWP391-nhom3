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
