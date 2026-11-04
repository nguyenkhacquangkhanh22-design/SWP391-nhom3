import { useState, useEffect } from "react";
import type { Settlement } from "../../types/owner";
import { ownerApi } from "../../services/ownerApi";
import { VIETNAM_BANKS, generateVietQrUrl } from "../../constants/vietnamBanks";

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

  // Bank & QR states
  const [selectedBankCode, setSelectedBankCode] = useState("MB");
  const [bankName, setBankName] = useState("Ngân hàng TMCP Quân đội (MB Bank)");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [qrMode, setQrMode] = useState<"auto" | "custom">("auto");
  const [customQrUrl, setCustomQrUrl] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);
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

  function handleSelectBank(bankCode: string) {
    setSelectedBankCode(bankCode);
    const found = VIETNAM_BANKS.find((b) => b.code === bankCode);
    if (found) {
      setBankName(found.name);
    }
  }

  // Calculate VietQR URL live
  const autoQrUrl = confirmingSettlement && selectedBankCode && accountNumber
    ? generateVietQrUrl(
        selectedBankCode,
        accountNumber,
        confirmingSettlement.owner_payout_amount,
        `GIAI NGAN HD ${confirmingSettlement.contract_id?.contract_code || ""}`,
        accountHolder
      )
    : "";

  const effectiveQrUrl = qrMode === "auto" ? autoQrUrl : customQrUrl;

  function openPayoutModal(st: Settlement) {
    setConfirmingSettlement(st);
    if (st.bank_info?.bank_code) {
      setSelectedBankCode(st.bank_info.bank_code);
    } else {
      const match = VIETNAM_BANKS.find((b) => b.name === st.bank_info?.bank_name || b.shortName === st.bank_info?.bank_name);
      setSelectedBankCode(match?.code || "MB");
    }
    setBankName(st.bank_info?.bank_name || "Ngân hàng TMCP Quân đội (MB Bank)");
    setAccountNumber(st.bank_info?.account_number || "");
    setAccountHolder(st.bank_info?.account_holder || "");
    setRequestNote(st.request_note || "");
    if (st.qr_code_url) {
      setCustomQrUrl(st.qr_code_url);
      setQrMode("custom");
    } else {
      setQrMode("auto");
    }
  }

  // UC_O10: Submit Payout Request to Moderator
  async function handleConfirmPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmingSettlement) return;

    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      onError("Vui lòng chọn ngân hàng, nhập số tài khoản và tên chủ tài khoản.");
      return;
    }

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.confirmSettlement(token, confirmingSettlement.contract_id._id, {
        bank_info: {
          bank_name: bankName.trim(),
          bank_code: selectedBankCode,
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim().toUpperCase(),
        },
        qr_code_url: effectiveQrUrl,
        request_note: requestNote.trim(),
      });
      onSuccess(
        `Đã gửi yêu cầu thanh toán tiền giải ngân (${confirmingSettlement.owner_payout_amount.toLocaleString("vi-VN")} đ) lên Quản lý web (Moderator) duyệt thành công!`
      );
      setConfirmingSettlement(null);
      loadData();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gửi yêu cầu thanh toán thất bại.");
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
          Gửi yêu cầu thanh toán giải ngân kèm thông tin ngân hàng & mã QR lên Quản lý web (Moderator) khi khách nhận hàng (UC_O10) & theo dõi lịch sử doanh thu (UC_O11).
        </p>
      </div>

      {/* Revenue Analytics Cards (UC_O11) */}
      <div className="owner-stats-grid" style={{ marginBottom: "24px" }}>
        <div className="owner-stat-card highlight">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Tổng doanh thu kiếm được</span>
            <span>💰</span>
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
            Chờ khách xác nhận nhận hàng, sau đó gửi yêu cầu lên Quản lý web duyệt
          </div>
        </div>

        <div className="owner-stat-card">
          <div className="owner-stat-header">
            <span className="owner-stat-title">Phí nền tảng (5%)</span>
            <span>🏛️</span>
          </div>
          <div className="owner-stat-value" style={{ color: "var(--muted)" }}>
            {(analytics?.platformFees || 0).toLocaleString("vi-VN")} đ
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>
            Đã tự động cấn trừ
          </div>
        </div>
      </div>

      {/* Settlement Records Table (UC_O10) */}
      <div className="owner-section-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff" }}>
            📋 Danh sách Quyết toán & Yêu cầu giải ngân
          </h3>
          <button className="button button-quiet" onClick={() => loadData()}>
            Làm mới ⟳
          </button>
        </div>

        {settlements.length === 0 ? (
          <div className="owner-empty-state">
            <span style={{ fontSize: "2rem" }}>🪙</span>
            <p>Chưa có dữ liệu quyết toán nào. Dữ liệu sẽ xuất hiện khi các hợp đồng cho thuê được ký kết và hoàn tất bàn giao.</p>
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
                  <th>Khấu trừ hư hại</th>
                  <th>Thực nhận Owner</th>
                  <th>Thông tin nhận tiền & QR</th>
                  <th>Trạng thái giải ngân</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((st) => (
                  <tr key={st._id}>
                    <td>
                      <strong style={{ color: "#fff" }}>{st.settlement_code}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {new Date(st.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.85rem", color: "#38bdf8", fontWeight: 500 }}>
                        {st.contract_id?.contract_code || "HĐ"}
                      </span>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {st.contract_id?.title || "Thiết bị"}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: "#fff" }}>{st.renter_id?.name || "Renter"}</span>
                      {st.renter_id?.phone && (
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{st.renter_id.phone}</div>
                      )}
                    </td>
                    <td>{st.total_rental_fee.toLocaleString("vi-VN")} đ</td>
                    <td>
                      {st.damage_deduction > 0 ? (
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>
                          +{st.damage_deduction.toLocaleString("vi-VN")} đ
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
                    <td>
                      <strong style={{ color: "#10b981", fontSize: "0.95rem" }}>
                        {st.owner_payout_amount.toLocaleString("vi-VN")} đ
                      </strong>
                    </td>
                    <td>
                      {st.bank_info?.account_number ? (
                        <div style={{ fontSize: "0.82rem" }}>
                          <span style={{ color: "#fff", fontWeight: 500 }}>{st.bank_info.bank_name}</span>
                          <div style={{ color: "var(--muted)", fontFamily: "monospace" }}>
                            {st.bank_info.account_number} • {st.bank_info.account_holder}
                          </div>
                          {st.qr_code_url && (
                            <button
                              type="button"
                              className="button button-quiet"
                              style={{ padding: "2px 6px", fontSize: "0.72rem", marginTop: 4, height: "auto" }}
                              onClick={() => setPreviewQrUrl(st.qr_code_url || null)}
                            >
                              📱 Xem mã QR
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Chưa cung cấp</span>
                      )}
                    </td>
                    <td>
                      {st.payout_status === "pending_owner_confirmation" && (
                        <span className="status-badge" style={{ background: "#475569", color: "#e2e8f0" }}>
                          Chưa gửi yêu cầu
                        </span>
                      )}
                      {st.payout_status === "pending_moderator_approval" && (
                        <span className="status-badge status-pending">
                          ⏳ Chờ Quản lý web duyệt
                        </span>
                      )}
                      {st.payout_status === "paid" && (
                        <div>
                          <span className="status-badge status-active">
                            ✓ Đã giải ngân
                          </span>
                          {st.moderator_review?.transaction_code && (
                            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
                              Mã GD: {st.moderator_review.transaction_code}
                            </div>
                          )}
                        </div>
                      )}
                      {st.payout_status === "rejected" && (
                        <div>
                          <span className="status-badge" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }}>
                            ✕ Bị từ chối
                          </span>
                          {st.moderator_review?.note && (
                            <div style={{ fontSize: "0.72rem", color: "#f87171", marginTop: 2, maxWidth: 160 }}>
                              {st.moderator_review.note}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {st.payout_status === "pending_owner_confirmation" || st.payout_status === "rejected" ? (
                        <button
                          className="button button-primary"
                          style={{ fontSize: "0.78rem", padding: "6px 12px", background: st.payout_status === "rejected" ? "#ef4444" : undefined }}
                          onClick={() => openPayoutModal(st)}
                        >
                          {st.payout_status === "rejected" ? "Gửi lại yêu cầu" : "💸 Gửi yêu cầu giải ngân"}
                        </button>
                      ) : st.payout_status === "pending_moderator_approval" ? (
                        <button
                          className="button button-secondary"
                          style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                          onClick={() => openPayoutModal(st)}
                        >
                          Cập nhật thông tin
                        </button>
                      ) : st.payout_status === "processing" ? (
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                          Chờ khách xác nhận nhận hàng
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                          Hoàn tất
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

      {/* MODAL: Submit Payout Request with Bank & QR Code (UC_O10) */}
      {confirmingSettlement && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "620px" }}>
            <div className="owner-modal-header">
              <h3>💳 Gửi yêu cầu thanh toán tiền thuê lên Quản lý web</h3>
              <button className="close-modal-btn" onClick={() => setConfirmingSettlement(null)}>
                ✕
              </button>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Cung cấp số tài khoản ngân hàng và mã QR nhận tiền. Quản lý web (Moderator) sẽ kiểm tra và giải ngân trực tiếp cho bạn:
            </p>

            <div style={{ background: "#111827", padding: "14px 16px", borderRadius: "10px", border: "1px solid var(--border)", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.88rem" }}>
                <span style={{ color: "var(--muted)" }}>Tổng tiền thuê thiết bị:</span>
                <strong style={{ color: "#fff" }}>
                  {confirmingSettlement.total_rental_fee.toLocaleString("vi-VN")} đ
                </strong>
              </div>
              {confirmingSettlement.damage_deduction > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.88rem" }}>
                  <span style={{ color: "var(--muted)" }}>Khấu trừ hư hại / bồi thường:</span>
                  <span style={{ color: "#ef4444" }}>
                    +{confirmingSettlement.damage_deduction.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.88rem" }}>
                <span style={{ color: "var(--muted)" }}>Phí nền tảng (5%):</span>
                <span style={{ color: "var(--muted)" }}>
                  -{confirmingSettlement.platform_fee.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600 }}>Số tiền Quản lý web giải ngân:</span>
                <strong style={{ color: "#10b981", fontSize: "1.25rem" }}>
                  {confirmingSettlement.owner_payout_amount.toLocaleString("vi-VN")} đ
                </strong>
              </div>
            </div>

            <form onSubmit={handleConfirmPayout}>
              <h4 style={{ margin: "0 0 12px", fontSize: "0.95rem", color: "var(--orange)" }}>
                🏦 Thông tin tài khoản ngân hàng & Mã QR nhận tiền:
              </h4>

              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label className="field-label">Chọn ngân hàng *</label>
                  <select
                    className="input-field"
                    value={selectedBankCode}
                    onChange={(e) => handleSelectBank(e.target.value)}
                    required
                  >
                    {VIETNAM_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.shortName} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="field-label">Số tài khoản ngân hàng *</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="Ví dụ: 0398889999"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ""))}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Tên chủ tài khoản (In hoa) *</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="NGUYEN VAN A"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                </div>

                {/* QR Code Section */}
                <div style={{ background: "#0b1329", padding: "14px", borderRadius: "10px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <label className="field-label" style={{ margin: 0, color: "#fff" }}>
                      📱 Mã QR chuyển khoản nhận tiền
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className={`button ${qrMode === "auto" ? "button-primary" : "button-quiet"}`}
                        style={{ fontSize: "0.75rem", padding: "3px 10px", height: "auto" }}
                        onClick={() => setQrMode("auto")}
                      >
                        ⚡ Tự tạo VietQR
                      </button>
                      <button
                        type="button"
                        className={`button ${qrMode === "custom" ? "button-primary" : "button-quiet"}`}
                        style={{ fontSize: "0.75rem", padding: "3px 10px", height: "auto" }}
                        onClick={() => setQrMode("custom")}
                      >
                        🖼️ Dán link / Tải ảnh
                      </button>
                    </div>
                  </div>

                  {qrMode === "auto" ? (
                    <div>
                      {accountNumber ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <img
                            src={autoQrUrl}
                            alt="VietQR Nhận tiền"
                            style={{
                              width: 130,
                              height: 130,
                              borderRadius: 8,
                              background: "#fff",
                              padding: 4,
                              border: "1px solid #334155",
                              cursor: "pointer",
                            }}
                            onClick={() => setPreviewQrUrl(autoQrUrl)}
                            title="Bấm để phóng to mã QR"
                          />
                          <div style={{ fontSize: "0.82rem", color: "var(--muted)", flex: 1 }}>
                            <p style={{ margin: "0 0 6px", color: "#10b981", fontWeight: 600 }}>
                              ✓ Mã VietQR đã được tự động tạo chuẩn ngân hàng
                            </p>
                            <p style={{ margin: "0 0 4px" }}>
                              Ngân hàng: <strong style={{ color: "#fff" }}>{bankName}</strong>
                            </p>
                            <p style={{ margin: "0 0 4px" }}>
                              Số tiền: <strong style={{ color: "#10b981" }}>{confirmingSettlement.owner_payout_amount.toLocaleString("vi-VN")} đ</strong>
                            </p>
                            <p style={{ margin: 0, fontSize: "0.78rem" }}>
                              Quản lý web có thể quét mã QR này trực tiếp bằng ứng dụng ngân hàng để chuyển tiền cho bạn nhanh chóng.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: "var(--muted)", fontSize: "0.85rem", padding: "10px 0" }}>
                          👉 Vui lòng nhập Số tài khoản ở trên để hiển thị mã VietQR tự động.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        className="input-field"
                        type="url"
                        placeholder="Dán link ảnh mã QR ngân hàng của bạn (https://...)"
                        value={customQrUrl}
                        onChange={(e) => setCustomQrUrl(e.target.value)}
                      />
                      {customQrUrl && (
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                          <img
                            src={customQrUrl}
                            alt="Mã QR cá nhân"
                            style={{ width: 100, height: 100, objectFit: "contain", borderRadius: 8, background: "#fff", padding: 4 }}
                          />
                          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                            Xem trước mã QR của bạn.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="field-label">Ghi chú cho Quản lý web (Tùy chọn)</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Ví dụ: Khách đã nhận bàn giao máy tốt ngày ..., xin giải ngân sớm..."
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setConfirmingSettlement(null)}
                >
                  Đóng
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang gửi yêu cầu..." : "📤 Gửi yêu cầu thanh toán lên Quản lý web"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN QR PREVIEW MODAL */}
      {previewQrUrl && (
        <div className="owner-modal-overlay" onClick={() => setPreviewQrUrl(null)}>
          <div
            className="owner-modal-card"
            style={{ maxWidth: "380px", textAlign: "center", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 14px", fontSize: "1.1rem", color: "#fff" }}>
              📱 Mã QR Chuyển khoản giải ngân
            </h3>
            <img
              src={previewQrUrl}
              alt="Mã QR"
              style={{ width: "100%", maxWidth: "320px", borderRadius: "10px", background: "#fff", padding: "8px" }}
            />
            <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "100%" }}
                onClick={() => setPreviewQrUrl(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
