import type { AdminStats } from "../../types/admin";

interface AdminStatsGridProps {
  stats: AdminStats | null;
}

export default function AdminStatsGrid({ stats }: AdminStatsGridProps) {
  return (
    <section className="admin-metrics-grid">
      <div className="admin-metric-card">
        <span className="metric-title">Tổng số tài khoản</span>
        <span className="metric-value">{stats ? stats.totalUsers : "--"}</span>
        <span className="metric-sub">Đã đăng ký trong cơ sở dữ liệu</span>
      </div>
      <div className="admin-metric-card">
        <span className="metric-title">Tài khoản hoạt động</span>
        <span className="metric-value is-success">
          {stats ? stats.activeUsers : "--"}
        </span>
        <span className="metric-sub">Trạng thái active</span>
      </div>
      <div className="admin-metric-card">
        <span className="metric-title">Tài khoản quản trị</span>
        <span className="metric-value is-accent">
          {stats ? stats.adminCount : "--"}
        </span>
        <span className="metric-sub">Role Systemadmin</span>
      </div>
      <div className="admin-metric-card">
        <span className="metric-title">Tài khoản bị khóa</span>
        <span className="metric-value is-muted">
          {stats ? stats.inactiveUsers : "--"}
        </span>
        <span className="metric-sub">Chưa kích hoạt hoặc blocked</span>
      </div>
    </section>
  );
}
