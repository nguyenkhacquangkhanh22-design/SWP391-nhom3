import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type { AdminSettlement } from "../../types/admin";

interface AdminSettlementAuditTabProps {
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminSettlementAuditTab({
  token,
  onError,
  onSuccess,
}: AdminSettlementAuditTabProps) {
  const [settlements, setSettlements] = useState<AdminSettlement[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    pendingApproval: number;
    paid: number;
    processing: number;
    totalDepositRefund: number;
    totalDamageDeduction: number;
    totalPlatformFee: number;
    totalOwnerPayout: number;
  }>({
    total: 0,
    pendingApproval: 0,
    paid: 0,
    processing: 0,
    totalDepositRefund: 0,
    totalDamageDeduction: 0,
    totalPlatformFee: 0,
    totalOwnerPayout: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Audit modal
  const [selectedSettlement, setSelectedSettlement] = useState<AdminSettlement | null>(null);
  const [auditAction, setAuditAction] = useState<"approve" | "reject">("approve");
  const [auditNote, setAuditNote] = useState("");
  const [transactionCode, setTransactionCode] = useState("");
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSettlements = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listSettlements(token, {
        payout_status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setSettlements(res.settlements || []);
      setStats(res.stats || {
        total: 0,
        pendingApproval: 0,
        paid: 0,
        processing: 0,
        totalDepositRefund: 0,
        totalDamageDeduction: 0,
        totalPlatformFee: 0,
        totalOwnerPayout: 0,
      });
    } catch (err: any) {
      onError(err.message || "Không thể tải danh sách quyết toán hợp đồng.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, [token, statusFilter]);

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSettlement) return;
    try {
      setIsSubmitting(true);
      const res = await adminApi.approveSettlement(token, selectedSettlement._id, {
        action: auditAction,
        note: auditNote.trim(),
        transaction_code: transactionCode.trim(),
      });
      onSuccess(res.message);
      setIsAuditModalOpen(false);
      setSelectedSettlement(null);
      setAuditNote("");
      setTransactionCode("");
      fetchSettlements();
    } catch (err: any) {
      onError(err.message || "Lỗi khi xử lý duyệt quyết toán.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="admin-status-badge is-active">Đã Hoàn Tất / Giải Ngân</span>;
      case "pending_moderator_approval":
        return <span className="admin-status-badge is-pending" style={{ background: "rgba(255, 171, 0, 0.15)", color: "#ffab00" }}>Chờ Quản Lý Duyệt</span>;
      case "pending_owner_confirmation":
        return <span className="admin-status-badge is-pending">Chờ Owner Xác Nhận</span>;
      case "processing":
        return <span className="admin-status-badge" style={{ background: "rgba(0, 168, 255, 0.15)", color: "#00a8ff" }}>Đang Xử Lý Bank</span>;
      case "rejected":
        return <span className="admin-status-badge is-suspended">Bị Từ Chối</span>;
      default:
        return <span className="admin-status-badge">{status}</span>;
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Đối Soát Quyết Toán Hợp Đồng & Giải Phóng Cọc (UC_A29)</h2>
          <p className="admin-card-desc">
            Thẩm tra tính hợp lý của khấu trừ hư hại, phí quá giờ và phê duyệt giải phóng tiền cọc an toàn cho Người thuê & Tiền thuê cho Chủ máy.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 171, 0, 0.08)", border: "1px solid rgba(255, 171, 0, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ffab00" }}>Chờ Admin Phê Duyệt</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#ffab00", marginTop: "4px" }}>{stats.pendingApproval}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(46, 213, 115, 0.08)", border: "1px solid rgba(46, 213, 115, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#2ed573" }}>Đã Giải Ngân / Trả Cọc</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#2ed573", marginTop: "4px" }}>{stats.paid}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(0, 168, 255, 0.08)", border: "1px solid rgba(0, 168, 255, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#00a8ff" }}>Tổng Cọc Đã Hoàn Trả</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#00a8ff", marginTop: "4px" }}>{formatCurrency(stats.totalDepositRefund)}</div>
        </div>
        <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}>
          <div style={{ fontSize: "12px", color: "#ff4757" }}>Tổng Khấu Trừ Hư Hỏng</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ff4757", marginTop: "4px" }}>{formatCurrency(stats.totalDamageDeduction)}</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          className="admin-input"
          placeholder="Tìm theo mã quyết toán, mã hợp đồng, chủ máy, khách thuê..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: "250px" }}
        />

        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "220px" }}
        >
          <option value="all">Tất cả trạng thái quyết toán</option>
          <option value="pending_moderator_approval">Chờ Quản lý duyệt</option>
          <option value="pending_owner_confirmation">Chờ Owner xác nhận</option>
          <option value="paid">Đã thanh toán / Hoàn cọc</option>
          <option value="rejected">Bị từ chối</option>
        </select>
      </div>

      {/* Settlements Table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Đang tải dữ liệu quyết toán hợp đồng...
        </div>
      ) : settlements.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Không có bản ghi quyết toán nào phù hợp.
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Mã Quyết Toán</th>
                <th>Chủ Máy (Owner)</th>
                <th>Khách Thuê (Renter)</th>
                <th>Khấu Trừ Hư Hại</th>
                <th>Cọc Hoàn Lại Renter</th>
                <th>Thực Nhận Chủ Máy</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: "right" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s._id}>
                  <td>
                    <span style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--color-primary-light, #38bdf8)" }}>
                      {s.settlement_code}
                    </span>
                    {s.contract_id?.contract_code && (
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                        HĐ: {s.contract_id.contract_code}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.owner_id?.name || "-"}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{s.owner_id?.phone || "-"}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.renter_id?.name || "-"}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{s.renter_id?.phone || "-"}</div>
                  </td>
                  <td>
                    <span style={{ color: s.damage_deduction > 0 ? "#ff4757" : "inherit", fontWeight: s.damage_deduction > 0 ? 600 : "normal" }}>
                      {s.damage_deduction > 0 ? `-${formatCurrency(s.damage_deduction)}` : "0 ₫"}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "#2ed573", fontWeight: 600 }}>
                      {formatCurrency(s.deposit_refund_to_renter)}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "var(--color-primary-light, #38bdf8)", fontWeight: 600 }}>
                      {formatCurrency(s.owner_payout_amount)}
                    </span>
                  </td>
                  <td>{getStatusBadge(s.payout_status)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      onClick={() => {
                        setSelectedSettlement(s);
                        setAuditAction("approve");
                        setAuditNote("");
                        setTransactionCode("");
                        setIsAuditModalOpen(true);
                      }}
                    >
                      Đối Soát & Duyệt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Modal */}
      {isAuditModalOpen && selectedSettlement && (
        <div className="admin-modal-backdrop" onClick={() => setIsAuditModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: "680px", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Thẩm Tra Quyết Toán & Giải Phóng Tiền Cọc</h3>
              <button
                className="admin-modal-close"
                onClick={() => setIsAuditModalOpen(false)}
                style={{ background: "none", border: "none", color: "inherit", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Financial breakdown */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "10px", marginBottom: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>Mã Quyết Toán: <strong>{selectedSettlement.settlement_code}</strong></div>
                <div>Trạng thái: {getStatusBadge(selectedSettlement.payout_status)}</div>
                <div>Tiền Thuê Gốc: <strong>{formatCurrency(selectedSettlement.total_rental_fee)}</strong></div>
                <div>Phí Quá Giờ (Late): <strong>{formatCurrency(selectedSettlement.overtime_fee)}</strong></div>
                <div>Tiền Cọc Ban Đầu: <strong>{formatCurrency(selectedSettlement.deposit_paid)}</strong></div>
                <div>Khấu Trừ Hư Hại Phụ Kiện: <strong style={{ color: "#ff4757" }}>{formatCurrency(selectedSettlement.damage_deduction)}</strong></div>
                <div>Tiền Cọc Hoàn Lại Renter: <strong style={{ color: "#2ed573", fontSize: "14px" }}>{formatCurrency(selectedSettlement.deposit_refund_to_renter)}</strong></div>
                <div>Thực Nhận Chủ Máy: <strong style={{ color: "var(--color-primary-light, #38bdf8)", fontSize: "14px" }}>{formatCurrency(selectedSettlement.owner_payout_amount)}</strong></div>
              </div>

              {selectedSettlement.deduction_reason && (
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed rgba(255,255,255,0.1)", fontSize: "13px" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Lý do khấu trừ hư hại từ Chủ máy:</span>
                  <div style={{ marginTop: "2px", color: "#ffab00" }}>{selectedSettlement.deduction_reason}</div>
                </div>
              )}
            </div>

            {/* Bank details of Owner */}
            {selectedSettlement.bank_info?.account_number && (
              <div style={{ background: "rgba(0, 168, 255, 0.05)", border: "1px solid rgba(0, 168, 255, 0.15)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                <div style={{ color: "#00a8ff", fontWeight: "bold", marginBottom: "4px" }}>Thông Tin Tài Khoản Nhận Tiền Của Chủ Máy:</div>
                <div>Ngân hàng: {selectedSettlement.bank_info.bank_name} ({selectedSettlement.bank_info.bank_code})</div>
                <div>Số tài khoản: <strong>{selectedSettlement.bank_info.account_number}</strong> - {selectedSettlement.bank_info.account_holder}</div>
              </div>
            )}

            {/* Audit form */}
            <form onSubmit={handleAuditSubmit}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>Quyết Định Của Quản Trị Viên *</label>
                <div style={{ display: "flex", gap: "16px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="auditAction"
                      value="approve"
                      checked={auditAction === "approve"}
                      onChange={() => setAuditAction("approve")}
                    />
                    <span style={{ color: "#2ed573", fontWeight: 600 }}>Duyệt Giải Ngân & Giải Phóng Hoàn Cọc</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="auditAction"
                      value="reject"
                      checked={auditAction === "reject"}
                      onChange={() => setAuditAction("reject")}
                    />
                    <span style={{ color: "#ff4757", fontWeight: 600 }}>Từ Chối Bảng Quyết Toán</span>
                  </label>
                </div>
              </div>

              {auditAction === "approve" && (
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                    Mã Giao Dịch Chuyển Khoản Ngân Hàng (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="VD: FT261119001928"
                    value={transactionCode}
                    onChange={(e) => setTransactionCode(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Ghi Chú Phê Duyệt / Lý Do Từ Chối</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="Nhập ghi chú lưu vết kiểm toán..."
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsAuditModalOpen(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className={`admin-btn ${auditAction === "approve" ? "admin-btn-primary" : "admin-btn-danger"}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : auditAction === "approve" ? "Xác Nhận Giải Phóng Tiền Cọc" : "Xác Nhận Từ Chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
