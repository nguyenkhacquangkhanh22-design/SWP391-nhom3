import type { User } from "../../types/auth";

export type AdminUserRow = User & { _id: string };

interface AdminUserTableProps {
  users: AdminUserRow[];
  currentAdminEmail?: string;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  updatingId: string | null;
  onToggleRole: (user: AdminUserRow) => void;
  onToggleStatus: (user: AdminUserRow) => void;
}

export default function AdminUserTable({
  users,
  currentAdminEmail,
  isLoading,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  updatingId,
  onToggleRole,
  onToggleStatus,
}: AdminUserTableProps) {
  return (
    <section className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2>Danh sách người dùng hệ thống</h2>
          <p>Xem, phân quyền và kiểm soát trạng thái các tài khoản.</p>
        </div>
        <div className="admin-table-filters">
          <input
            type="text"
            placeholder="Tìm theo tên, email, ID..."
            className="admin-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="admin-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="systemadmin">Systemadmin</option>
            <option value="owner">Owner (Người cho thuê)</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      <div className="admin-table-wrap" style={{ overflowX: "auto", minWidth: "100%" }}>
        <table className="admin-table" style={{ minWidth: "820px" }}>
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Mã ID</th>
              <th>Vai trò (Role)</th>
              <th>Trạng thái</th>
              <th>Điểm tin cậy</th>
              <th>Ngày tham gia</th>
              <th style={{ minWidth: "220px", textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-table-empty">
                  {isLoading
                    ? "Đang tải danh sách người dùng..."
                    : "Không tìm thấy người dùng phù hợp."}
                </td>
              </tr>
            ) : (
              (() => {
                const totalAdmins = users.filter(
                  (x) => (x.role || "").toLowerCase() === "systemadmin"
                ).length;

                return users.map((u) => {
                  const isAdmin = (u.role || "").toLowerCase() === "systemadmin";
                  const isUpdating = updatingId === u._id;
                  const isSelf = Boolean(
                    currentAdminEmail &&
                      u.email?.toLowerCase() === currentAdminEmail.toLowerCase()
                  );
                  const isSoleAdmin = isAdmin && totalAdmins <= 1;
                  const isDemoteDisabled = isUpdating || isSelf || isSoleAdmin;
                  const demoteTooltip = isSelf
                    ? "Không thể tự hạ quyền của chính tài khoản đang đăng nhập"
                    : isSoleAdmin
                    ? "Hệ thống phải có ít nhất 1 System Admin duy nhất, không thể hạ quyền"
                    : isAdmin
                    ? "Hạ quyền tài khoản này xuống User thông thường"
                    : "Nâng cấp tài khoản này lên System Admin";

                  return (
                    <tr key={u._id} className={isSelf ? "is-self-row" : ""}>
                      <td>
                        <div className="admin-user-cell">
                          <span className="user-cell-name">{u.name}</span>
                          <span className="user-cell-email">{u.email}</span>
                        </div>
                      </td>
                      <td>
                        <code className="admin-id-code">
                          {(u.User_Id || u._id).slice(0, 8)}...
                        </code>
                      </td>
                      <td>
                        <span
                          className={`role-tag ${
                            isAdmin ? "role-tag-admin" : "role-tag-user"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-tag ${
                            u.status === "active"
                              ? "status-tag-active"
                              : "status-tag-blocked"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <span className="trust-score">{u.trust_score ?? 0}</span>
                      </td>
                      <td>
                        <span className="date-cell">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString("vi-VN")
                            : "--"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          <button
                            className={`button button-compact ${
                              isDemoteDisabled ? "button-disabled opacity-50" : "button-quiet"
                            }`}
                            onClick={() => onToggleRole(u)}
                            disabled={isDemoteDisabled}
                            title={demoteTooltip}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {isAdmin ? "Hạ xuống User" : "Cấp Systemadmin"}
                          </button>
                          <button
                            className={`button button-compact ${
                              u.status === "active"
                                ? "button-danger"
                                : "button-secondary"
                            }`}
                            onClick={() => onToggleStatus(u)}
                            disabled={isUpdating || isSelf}
                            title={
                              isSelf
                                ? "Không thể khóa tài khoản chính mình"
                                : "Đổi trạng thái tài khoản"
                            }
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {u.status === "active" ? "Khóa" : "Mở khóa"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
