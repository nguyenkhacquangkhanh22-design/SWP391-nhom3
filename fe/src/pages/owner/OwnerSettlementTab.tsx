import { useState, useEffect } from "react";
import type { Settlement } from "../../types/owner";
import { ownerApi } from "../../services/ownerApi";

interface Props {
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function OwnerSettlementTab({ token, onError, onSuccess }: Props) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalEarned: number;
    paidOut: number;
    pendingPayout: number;
    platformFees: number;
    totalContracts: number;
    totalRequests: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [confirmingSettlement, setConfirmingSettlement] = useState<Settlement | null>(null);
  const [bankName, setBankName] = useState("Vietcombank");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await ownerApi.getRevenueHistory(token);
      setSettlements(data.settlements);
      setAnalytics(data.analytics);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // UC_O10: Confirm Settlement & Payout
  async function handleConfirmPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmingSettlement) return;

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.confirmSettlement(token, confirmingSettlement.contract_id._id, {
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
      });
      onSuccess(`Đã xác nhận dữ liệu quyết toán cho hợp đồng ${confirmingSettlement.settlement_code}. Tiền giải ngân sẽ được chuyển khoản theo quy định.`);
      setConfirmingSettlement(null);
      loadData();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Xác nhận quyết toán thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="owner-tab-content">
        <div className="app-loading" style={{ margin: "40px auto" }}>
          Đang tải dữ liệu quyết toán & doanh thu...
        </div>
      </div>
    );
  }

  return (
    <div className="owner-tab-content">
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
          💰 Quyết toán & Theo dõi Doanh thu (UC_O10, UC_O11)
        </h2>
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
          Xác nhận số liệu quyết toán, khấu trừ cọc minh bạch (UC_O10) & theo dõi lịch sử doanh thu, giải ngân (UC_O11).
        </p>
      </div>

      {/* Revenue Analytics Cards (UC_O11) */}
      <div className="owner-stats-grid" style={{ marginBottom: "24px" }}>
        <div className="owner-stat-card highlight">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Tổng doanh thu kiếm được</span>
            <span>💵</span>
          </div>
          <div className="owner-stat-value" style={{ color: "#10b981" }}>
            {(analytics?.totalEarned || 0).toLocaleString("vi-VN")} đ
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>
            Từ {analytics?.totalContracts || 0} đơn hợp đồng hoàn tất
          </div>
        </div>

        <div className="owner-stat-card">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Đã giải ngân về tài khoản</span>
            <span>🏦</span>
          </div>
          <div className="owner-stat-value" style={{ color: "#38bdf8" }}>
            {(analytics?.paidOut || 0).toLocaleString("vi-VN")} đ
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>
            Đã thanh toán thành công
          </div>
        </div>

        <div className="owner-stat-card">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Đang chờ giải ngân</span>
            <span>⏳</span>
          </div>
          <div className="owner-stat-value" style={{ color: "var(--orange)" }}>
            {(analytics?.pendingPayout || 0).toLocaleString("vi-VN")} đ
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>
            Cần Owner xác nhận quyết toán
          </div>
        </div>

        <div className="owner-stat-card">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Phí nền tảng (5%)</span>
            <span>🛡️</span>
          </div>
          <div className="owner-stat-value" style={{ color: "var(--muted)" }}>
            {(analytics?.platformFees || 0).toLocaleString("vi-VN")} đ
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>
            Bao gồm bảo hiểm & hạ tầng hợp đồng
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="owner-section-card">
        <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: "1.1rem" }}>
          📋 Bảng quyết toán & Danh sách giải ngân (UC_O10)
        </h3>

        {settlements.length === 0 ? (
          <div className="owner-empty-state">
            <span style={{ fontSize: "2rem" }}>🪙</span>
            <p>Chưa có dữ liệu quyết toán nào. Dữ liệu sẽ xuất hiện khi các hợp đồng cho thuê được ký kết và hoàn tất.</p>
          </div>
        ) : (
          <div className="owner-table-wrapper">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Mã quyết toán</th>
                  <th>Hợp đồng</th>
                  <th>Người thuê</th>
                  <th>Tiền thuê</th>
                  <th>Tiền cọc ban đầu</th>
                  <th>Khấu trừ hư hại</th>
                  <th>Hoàn cọc Renter</th>
                  <th>Thực nhận Owner</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((st) => (
                  <tr key={st._id}>
                    <td>
                      <strong style={{ color: "#fff" }}>{st.settlement_code}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                        {st.contract_id?.contract_code || "HĐ"}
                      </span>
                    </td>
                    <td>{st.renter_id?.name || "Renter"}</td>
                    <td>{st.total_rental_fee.toLocaleString("vi-VN")} đ</td>
                    <td>{st.deposit_paid.toLocaleString("vi-VN")} đ</td>
                    <td>
                      {st.damage_deduction > 0 ? (
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>
                          -{st.damage_deduction.toLocaleString("vi-VN")} đ
                          {st.deduction_reason && (
                            <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                              ({st.deduction_reason})
                            </div>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>0 đ</span>
                      )}
                    </td>
                    <td style={{ color: "#38bdf8" }}>
                      {st.deposit_refund_to_renter.toLocaleString("vi-VN")} đ
                    </td>
                    <td>
                      <strong style={{ color: "#10b981", fontSize: "0.95rem" }}>
                        {st.owner_payout_amount.toLocaleString("vi-VN")} đ
                      </strong>
                    </td>
                    <td>
                      <span className={`status-badge status-${st.payout_status}`}>
                        {st.payout_status === "pending_owner_confirmation"
                          ? "⏳ Chờ xác nhận"
                          : st.payout_status === "confirmed"
                          ? "✅ Đã xác nhận"
                          : st.payout_status === "paid"
                          ? "💵 Đã giải ngân"
                          : st.payout_status}
                      </span>
                    </td>
                    <td>
                      {st.payout_status === "pending_owner_confirmation" ? (
                        <button
                          className="button button-primary"
                          style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                          onClick={() => {
                            setConfirmingSettlement(st);
                            setBankName(st.bank_info?.bank_name || "Vietcombank");
                            setAccountNumber(st.bank_info?.account_number || "");
                            setAccountHolder(st.bank_info?.account_holder || "");
                          }}
                        >
                          Xác nhận (UC_O10)
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                          Đã chốt số liệu
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Confirm Settlement & Payout (UC_O10) */}
      {confirmingSettlement && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "560px" }}>
            <div className="owner-modal-header">
              <h3>💳 Xác nhận quyết toán & Yêu cầu giải ngân (UC_O10)</h3>
              <button className="close-modal-btn" onClick={() => setConfirmingSettlement(null)}>
                ✕
              </button>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Kiểm tra bảng tính quyết toán theo quy định bảo đảm quyền lợi giữa Owner và Renter:
            </p>

            <div style={{ background: "#111827", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Tổng tiền thuê thiết bị:</span>
                <strong style={{ color: "#fff" }}>
                  {confirmingSettlement.total_rental_fee.toLocaleString("vi-VN")} đ
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Khấu trừ hư hại / bồi thường (có căn cứ):</span>
                <span style={{ color: "#ef4444" }}>
                  +{confirmingSettlement.damage_deduction.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Phí nền tảng (5%):</span>
                <span style={{ color: "var(--muted)" }}>
                  -{confirmingSettlement.platform_fee.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600 }}>Thực nhận giải ngân cho Owner:</span>
                <strong style={{ color: "#10b981", fontSize: "1.2rem" }}>
                  {confirmingSettlement.owner_payout_amount.toLocaleString("vi-VN")} đ
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.82rem", color: "#38bdf8" }}>
                <span>Hoàn cọc trả lại Renter:</span>
                <span>{confirmingSettlement.deposit_refund_to_renter.toLocaleString("vi-VN")} đ</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayout}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "#fff" }}>
                Tài khoản nhận chuyển khoản giải ngân:
              </h4>
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label className="field-label">Ngân hàng</label>
                  <input
                    className="input-field"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Số tài khoản</label>
                  <input
                    className="input-field"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Tên chủ tài khoản</label>
                  <input
                    className="input-field"
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setConfirmingSettlement(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang xác nhận..." : "Xác nhận & Gửi yêu cầu giải ngân"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
