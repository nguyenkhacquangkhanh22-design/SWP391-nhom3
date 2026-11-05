import { useState, useEffect } from "react";
import type { RentalRequest } from "../../types/owner";
import type { Rental } from "../../types/smartequip";
import { ownerApi } from "../../services/ownerApi";
import RentalChatModal from "../../components/RentalChatModal";
import ContractPdfModal from "../../components/ContractPdfModal";

interface Props {
  requests: RentalRequest[];
  token: string;
  onRefresh: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onCreateContract: (req: RentalRequest) => void;
}

export default function OwnerRequestsTab({
  requests,
  token,
  onRefresh,
  onError,
  onSuccess,
  onCreateContract,
}: Props) {
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Sub-tab: "direct_rentals" (Luồng trực tiếp Renter <-> Owner) vs "moderator_requests" (Yêu cầu qua Quản lý)
  const [subTab, setSubTab] = useState<"direct_rentals" | "moderator_requests">("direct_rentals");

  // Direct Rentals State
  const [directRentals, setDirectRentals] = useState<Rental[]>([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [chatRental, setChatRental] = useState<Rental | null>(null);
  const [viewingContractRental, setViewingContractRental] = useState<Rental | null>(null);
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);

  const fetchDirectRentals = async () => {
    if (!token) return;
    setDirectLoading(true);
    try {
      const res = await ownerApi.getOwnerRentals(token);
      if (res && Array.isArray(res.data)) {
        setDirectRentals(res.data);
      }
    } catch (e: any) {
      console.warn("Không thể tải danh sách đơn thuê trực tiếp:", e?.message);
    } finally {
      setDirectLoading(false);
    }
  };

  useEffect(() => {
    void fetchDirectRentals();
  }, [token]);

  // Thao tác duyệt đơn thuê trực tiếp (Owner duyệt -> Renter được phép ký & thanh toán)
  async function handleApproveDirectRental(rentalId: string, rentalCode: string) {
    setIsProcessing(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.respondOwnerRental(token, rentalId, "approve");
      onSuccess(`✅ Đã duyệt đơn thuê #${rentalCode}! Hệ thống đã gửi thông báo đến Khách thuê để tiến hành Ký hợp đồng & Chuyển khoản.`);
      await fetchDirectRentals();
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Duyệt đơn thuê thất bại.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Thao tác xác nhận đã nhận tiền chuyển khoản của khách (Bắt đầu gửi hàng)
  async function handleConfirmDirectPayment(rentalId: string, rentalCode: string) {
    setIsProcessing(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.confirmOwnerRentalPayment(token, rentalId, "approve");
      onSuccess(`🎉 Đã xác nhận nhận tiền thành công cho đơn #${rentalCode}! Hợp đồng chính thức có hiệu lực, bạn hãy bắt đầu chuẩn bị và gửi hàng cho Khách thuê.`);
      await fetchDirectRentals();
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Xác nhận tiền chuyển khoản thất bại.");
    } finally {
      setIsProcessing(false);
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  async function handleApprove(req: RentalRequest) {
    setIsProcessing(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.respondRentalRequest(token, req._id, "approve");
      onRefresh();
      onCreateContract({ ...req, status: "approved" });
      onSuccess(
        `Đã duyệt yêu cầu thuê "${req.request_code}"! Hệ thống đã chuyển sang màn hình lập Hợp đồng cho thuê để gửi Quản lý web duyệt.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Chấp nhận yêu cầu thất bại.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleConfirmReject() {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      onError("Vui lòng nhập lý do từ chối yêu cầu.");
      return;
    }

    setIsProcessing(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.respondRentalRequest(token, selectedRequest._id, "reject", rejectionReason);
      onSuccess(`Đã từ chối yêu cầu thuê "${selectedRequest.request_code}" và ghi nhận lý do.`);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason("");
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Từ chối yêu cầu thất bại.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="owner-tab-content">
      {/* Tab Switcher: Đơn thuê trực tiếp (Mới) vs Yêu cầu thuê qua Quản lý web */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setSubTab("direct_rentals")}
          className="button"
          style={{
            background: subTab === "direct_rentals" ? "#ea580c" : "rgba(30, 41, 59, 0.7)",
            color: "#fff",
            fontWeight: "bold",
            padding: "8px 18px",
            borderRadius: "10px",
            fontSize: "0.9rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>📦 Đơn thuê trực tiếp từ khách</span>
          <span style={{ background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "999px", fontSize: "0.75rem" }}>
            {directRentals.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("moderator_requests")}
          className="button button-quiet"
          style={{
            background: subTab === "moderator_requests" ? "#ea580c" : "rgba(30, 41, 59, 0.7)",
            color: subTab === "moderator_requests" ? "#fff" : "var(--muted)",
            fontWeight: "bold",
            padding: "8px 18px",
            borderRadius: "10px",
            fontSize: "0.9rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>📬 Yêu cầu từ Quản lý web (Cũ)</span>
          <span style={{ background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "999px", fontSize: "0.75rem" }}>
            {requests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { void fetchDirectRentals(); onRefresh(); }}
          className="button button-secondary"
          style={{ marginLeft: "auto", fontSize: "0.85rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          title="Tải lại danh sách đơn thuê"
        >
          <span>🔄</span> Tải lại danh sách
        </button>
      </div>

      {subTab === "direct_rentals" ? (
        /* MÀN HÌNH QUẢN LÝ ĐƠN THUÊ TRỰC TIẾP (LUỒNG CHÍNH MỚI: OWNER DUYỆT ĐƠN -> RENTER KÝ & CK -> OWNER CHECK TIỀN -> GỬI HÀNG) */
        <div>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🚀</span> Quản Lý Đơn Thuê Của Khách & Xác Nhận Chuyển Khoản
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.88rem" }}>
              Luồng duyệt trực tiếp: <strong style={{ color: "#fb923c" }}>1. Khách đặt thuê</strong> ➔{" "}
              <strong style={{ color: "#38bdf8" }}>2. Chủ máy duyệt đơn</strong> ➔{" "}
              <strong style={{ color: "#a855f7" }}>3. Khách ký hợp đồng & Chuyển khoản VietQR theo STK của bạn</strong> ➔{" "}
              <strong style={{ color: "#10b981" }}>4. Bạn kiểm tra tiền & xác nhận để bắt đầu gửi hàng</strong>.
            </p>
          </div>

          {directLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
              Đang tải danh sách đơn thuê của bạn...
            </div>
          ) : directRentals.length === 0 ? (
            <div className="owner-section-card owner-empty-state">
              <span style={{ fontSize: "2.5rem" }}>📭</span>
              <h3>Chưa có đơn thuê trực tiếp nào</h3>
              <p>Khi có khách thuê đặt thiết bị của bạn, đơn thuê sẽ xuất hiện tại đây để bạn duyệt và xác nhận tiền.</p>
            </div>
          ) : (
            <div className="owner-section-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="owner-table-wrapper">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Mã đơn & Ngày</th>
                      <th>Thiết bị</th>
                      <th>Khách thuê</th>
                      <th>Thời gian thuê</th>
                      <th>Tổng tiền & Trạng thái CK</th>
                      <th>Trạng thái đơn</th>
                      <th style={{ textAlign: "right" }}>Thao tác của Chủ máy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directRentals.map((r: any) => {
                      const upperStatus = String(r.status || "").toUpperCase();
                      const isPendingOwner = upperStatus === "PENDING" || upperStatus === "CONTRACT_PENDING";
                      const isApproved = upperStatus === "APPROVED";
                      const isSigned = upperStatus === "CONTRACT_SIGNED";
                      const isWaitingPayment = upperStatus === "PAYMENT_PENDING" || r.payment?.paymentStatus === "pending_confirmation";
                      const isPaid = upperStatus === "PAID" || r.payment?.isPaid === true || r.payment?.paymentStatus === "paid";
                      const isReturned = upperStatus === "RETURNED" || upperStatus === "RETURN_REQUESTED";

                      const renterName = typeof r.renter === "object" ? r.renter?.name : "Khách thuê";
                      const renterPhone = typeof r.renter === "object" ? r.renter?.phone : "0909xxxxxx";
                      const equipTitle = typeof r.equipment === "object" ? r.equipment?.title : "Thiết bị thuê";
                      const equipImg = typeof r.equipment === "object" && r.equipment?.images?.[0]
                        ? r.equipment.images[0]
                        : "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80";

                      return (
                        <tr key={r._id}>
                          <td>
                            <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>#{r.rentalCode}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                              {new Date(r.createdAt || Date.now()).toLocaleDateString("vi-VN")}
                            </div>
                            {r.contract?.contractNumber && (
                              <div style={{ fontSize: "0.72rem", color: "#fb923c" }}>
                                HĐ: {r.contract.contractNumber}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={equipImg}
                                alt=""
                                style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover" }}
                              />
                              <div>
                                <strong style={{ color: "#fff", fontSize: "0.9rem" }}>{equipTitle}</strong>
                                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                  Đơn giá: {(r.dailyRate || 0).toLocaleString("vi-VN")} đ/ngày
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: "#fff" }}>{renterName}</strong>
                            <div style={{ fontSize: "0.75rem", color: "#38bdf8" }}>📞 {renterPhone}</div>
                            {r.deliveryAddress && (
                              <div style={{ fontSize: "0.72rem", color: "var(--muted)", maxWidth: "180px" }}>
                                📍 {r.deliveryAddress}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: "0.85rem", color: "#fff" }}>
                              {new Date(r.startDate).toLocaleDateString("vi-VN")} ➔ {new Date(r.endDate).toLocaleDateString("vi-VN")}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#a855f7" }}>
                              ({r.totalDays} ngày)
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: "#fb923c", fontSize: "0.95rem" }}>
                              {(r.totalAmount || r.rentalFee || 0).toLocaleString("vi-VN")} đ
                            </strong>
                            <div style={{ marginTop: "4px" }}>
                              {isPaid ? (
                                <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: "bold" }}>
                                  ✓ Đã nhận tiền vào TK
                                </span>
                              ) : isWaitingPayment ? (
                                <span style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: "bold" }}>
                                  📸 Đã có bill CK • Chờ bạn check
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                  Chưa thanh toán
                                </span>
                              )}
                            </div>
                            {r.payment?.receiptImage && (
                              <button
                                type="button"
                                onClick={() => setPreviewBillUrl(r.payment.receiptImage)}
                                style={{
                                  marginTop: "4px",
                                  padding: "2px 8px",
                                  background: "rgba(56, 189, 248, 0.15)",
                                  border: "1px solid #38bdf8",
                                  borderRadius: "6px",
                                  color: "#38bdf8",
                                  fontSize: "0.72rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <span>🔍</span> Xem ảnh bill CK
                              </button>
                            )}
                          </td>
                          <td>
                            {isPendingOwner && (
                              <span style={{ padding: "4px 10px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid #f59e0b", color: "#fbbf24", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold" }}>
                                ⏳ Chờ Owner duyệt
                              </span>
                            )}
                            {isApproved && (
                              <span style={{ padding: "4px 10px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid #38bdf8", color: "#38bdf8", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold" }}>
                                ✅ Đã duyệt • Chờ khách ký & CK
                              </span>
                            )}
                            {isSigned && (
                              <span style={{ padding: "4px 10px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid #a855f7", color: "#c084fc", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold" }}>
                                ✍️ Đã ký HĐ • Chờ chuyển khoản
                              </span>
                            )}
                            {isWaitingPayment && (
                              <span style={{ padding: "4px 10px", background: "rgba(234, 88, 12, 0.2)", border: "1px solid #ea580c", color: "#fdba74", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold" }}>
                                💳 Khách đã CK • Chờ bạn xác nhận
                              </span>
                            )}
                            {isPaid && !isReturned && (
                              <span style={{ padding: "4px 10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#34d399", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold" }}>
                                🚚 Sẵn sàng gửi hàng / Đang thuê
                              </span>
                            )}
                            {isReturned && (
                              <span style={{ padding: "4px 10px", background: "rgba(147, 51, 234, 0.2)", border: "1px solid #9333ea", color: "#d8b4fe", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold" }}>
                                📦 Đã báo trả máy
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                              {/* NÚT DUYỆT ĐƠN KHI PENDING */}
                              {isPendingOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveDirectRental(r._id, r.rentalCode)}
                                  disabled={isProcessing}
                                  className="button button-primary"
                                  style={{ padding: "6px 14px", fontSize: "0.8rem", width: "auto" }}
                                >
                                  ✅ Duyệt đơn thuê
                                </button>
                              )}

                              {/* NÚT CHECK TIỀN & XÁC NHẬN KHI PAYMENT_PENDING */}
                              {isWaitingPayment && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDirectPayment(r._id, r.rentalCode)}
                                  disabled={isProcessing}
                                  className="button"
                                  style={{ background: "#059669", color: "#fff", padding: "6px 14px", fontSize: "0.8rem", width: "auto", fontWeight: "bold" }}
                                >
                                  ✅ Xác nhận đã nhận tiền (Gửi hàng)
                                </button>
                              )}

                              {/* NÚT CHAT VỚI KHÁCH THUÊ & GỬI HỢP ĐỒNG */}
                              <button
                                type="button"
                                onClick={() => setChatRental(r)}
                                className="button button-secondary"
                                style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                title="Nhắn tin với khách thuê & gửi hợp đồng"
                              >
                                <span>💬</span> Nhắn tin
                              </button>

                              {/* NÚT XEM HỢP ĐỒNG PDF */}
                              <button
                                type="button"
                                onClick={() => setViewingContractRental(r)}
                                className="button button-quiet"
                                style={{ padding: "6px 10px", fontSize: "0.8rem", width: "auto" }}
                                title="Mở bản hợp đồng PDF"
                              >
                                📄 HĐ PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MÀN HÌNH QUẢN LÝ YÊU CẦU THUÊ QUA QUẢN LÝ WEB (UC_O07 CŨ) */
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
                📬 Yêu cầu thuê do Quản lý web gửi sang (UC_O07)
              </h2>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                Quy trình:{" "}
                <strong style={{ color: "#fb923c" }}>1. Người thuê gửi YC cho Quản lý web</strong> ➔{" "}
                <strong style={{ color: "#38bdf8" }}>2. Quản lý web gửi cho Owner duyệt</strong> ➔{" "}
                <strong style={{ color: "#10b981" }}>3. Owner duyệt & lập Hợp đồng gửi Quản lý web</strong> ➔{" "}
                <strong style={{ color: "#fff" }}>4. Quản lý web duyệt & gửi Người thuê ký tên</strong>.
              </p>
            </div>

            {/* Filter */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Lọc trạng thái:</span>
              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "6px 12px", width: "auto" }}
              >
                <option value="all">Tất cả ({requests.length})</option>
                <option value="pending">
                  📬 Quản lý web đã gửi - Chờ Owner duyệt ({requests.filter((r) => r.status === "pending").length})
                </option>
                <option value="pending_moderator">
                  ⏳ Đang ở Quản lý web ({requests.filter((r) => r.status === "pending_moderator").length})
                </option>
                <option value="approved">
                  ✅ Đã duyệt - Chờ lập HĐ ({requests.filter((r) => r.status === "approved").length})
                </option>
                <option value="contract_created">
                  📜 Đã lập HĐ ({requests.filter((r) => r.status === "contract_created").length})
                </option>
                <option value="rejected">
                  ❌ Đã từ chối ({requests.filter((r) => r.status === "rejected" || r.status === "moderator_rejected").length})
                </option>
              </select>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="owner-section-card owner-empty-state">
              <span style={{ fontSize: "2.5rem" }}>📭</span>
              <h3>Không tìm thấy yêu cầu thuê nào</h3>
              <p>Hiện tại không có yêu cầu nào phù hợp với bộ lọc đã chọn.</p>
            </div>
          ) : (
            <div className="owner-section-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="owner-table-wrapper">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Thiết bị</th>
                      <th>Người thuê</th>
                      <th>Thời gian thuê</th>
                      <th>Tiền thuê</th>
                      <th>Tiền cọc</th>
                      <th>Ghi chú Renter & Quản lý web</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: "right" }}>Thao tác của Owner (UC_O07)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr key={req._id}>
                        <td>
                          <strong style={{ color: "#fff" }}>{req.request_code}</strong>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                            {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={
                                req.equipment_id?.images?.[0] ||
                                "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
                              }
                              alt=""
                              style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover" }}
                            />
                            <div>
                              <strong style={{ color: "#fff" }}>{req.equipment_id?.title || "Thiết bị"}</strong>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                Hãng: {req.equipment_id?.brand || "Chính hãng"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: "#fff" }}>{req.renter_name}</strong>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{req.renter_phone}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{req.renter_email}</div>
                          {(req as any).delivery_address && (
                            <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: "2px" }}>
                              📍 {(req as any).delivery_address}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: "0.85rem", color: "#fff" }}>
                            {new Date(req.start_date).toLocaleDateString("vi-VN")} ➔{" "}
                            {new Date(req.end_date).toLocaleDateString("vi-VN")}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                            ({req.duration_days} ngày)
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: "#fb923c" }}>
                            {req.rental_fee.toLocaleString("vi-VN")} đ
                          </strong>
                        </td>
                        <td>
                          <span style={{ color: "var(--muted)" }}>
                            {req.deposit_amount.toLocaleString("vi-VN")} đ
                          </span>
                        </td>
                        <td>
                          {req.renter_note && (
                            <div style={{ fontSize: "0.8rem", color: "#fff", marginBottom: "4px" }}>
                              💬 Renter: "{req.renter_note}"
                            </div>
                          )}
                          {req.moderator_note && (
                            <div style={{ fontSize: "0.75rem", color: "#38bdf8" }}>
                              🛡️ Quản lý: "{req.moderator_note}"
                            </div>
                          )}
                        </td>
                        <td>
                          {req.status === "pending_moderator" && (
                            <span style={{ padding: "4px 8px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid #f59e0b", color: "#f59e0b", borderRadius: "999px", fontSize: "0.75rem" }}>
                              ⏳ Chờ Quản lý web gửi sang
                            </span>
                          )}
                          {req.status === "pending" && (
                            <span style={{ padding: "4px 8px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid #38bdf8", color: "#38bdf8", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold" }}>
                              📬 Quản lý web đã gửi - Chờ Owner duyệt
                            </span>
                          )}
                          {req.status === "approved" && (
                            <span style={{ padding: "4px 8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#10b981", borderRadius: "999px", fontSize: "0.75rem" }}>
                              ✅ Owner đã duyệt - Chờ lập HĐ
                            </span>
                          )}
                          {req.status === "contract_created" && (
                            <span style={{ padding: "4px 8px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid #a855f7", color: "#a855f7", borderRadius: "999px", fontSize: "0.75rem" }}>
                              📜 Đã lập HĐ gửi Quản lý web
                            </span>
                          )}
                          {(req.status === "rejected" || req.status === "moderator_rejected") && (
                            <span style={{ padding: "4px 8px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "999px", fontSize: "0.75rem" }}>
                              ❌ Đã từ chối
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            {req.status === "pending" && (
                              <>
                                <button
                                  className="button button-primary"
                                  style={{ padding: "6px 14px", fontSize: "0.8rem", width: "auto" }}
                                  onClick={() => handleApprove(req)}
                                  disabled={isProcessing}
                                  title="Duyệt yêu cầu và chuyển sang lập hợp đồng"
                                >
                                  ✓ Duyệt & Lập HĐ
                                </button>
                                <button
                                  className="button button-quiet"
                                  style={{ padding: "6px 12px", fontSize: "0.8rem", color: "#ef4444", width: "auto" }}
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setShowRejectModal(true);
                                  }}
                                  disabled={isProcessing}
                                  title="Từ chối cho thuê và ghi lý do"
                                >
                                  ✕ Từ chối
                                </button>
                              </>
                            )}

                            {req.status === "approved" && (
                              <button
                                className="button button-primary"
                                style={{ padding: "6px 14px", fontSize: "0.8rem", width: "auto" }}
                                onClick={() => onCreateContract(req)}
                              >
                                + Lập HĐ gửi Quản lý web 📜
                              </button>
                            )}

                            {req.status === "contract_created" && (
                              <span style={{ fontSize: "0.8rem", color: "#10b981" }}>
                                ✓ Đã lập HĐ gửi Quản lý web
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL XEM ẢNH BIÊN LAI CHUYỂN KHOẢN (BILL PREVIEW) */}
      {previewBillUrl && (
        <div className="owner-modal-overlay" onClick={() => setPreviewBillUrl(null)}>
          <div className="owner-modal-card" style={{ maxWidth: "540px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h3 style={{ color: "#38bdf8" }}>📸 Biên Lai Chuyển Khoản Của Khách</h3>
              <button className="close-modal-btn" onClick={() => setPreviewBillUrl(null)}>
                ✕
              </button>
            </div>
            <div style={{ margin: "16px 0", maxHeight: "65vh", overflow: "auto" }}>
              <img
                src={previewBillUrl}
                alt="Biên lai chuyển khoản"
                style={{ maxWidth: "100%", maxHeight: "500px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </div>
            <div className="modal-actions" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setPreviewBillUrl(null)}
              >
                Đóng xem ảnh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHAT VỚI KHÁCH THUÊ & GỬI HỢP ĐỒNG QUA LẠI */}
      {chatRental && (
        <RentalChatModal
          rental={chatRental}
          isOpen={Boolean(chatRental)}
          onClose={() => setChatRental(null)}
          onViewContract={(r) => {
            setViewingContractRental(r);
          }}
        />
      )}

      {/* MODAL XEM HỢP ĐỒNG PDF */}
      {viewingContractRental && (
        <ContractPdfModal
          rental={viewingContractRental}
          isOpen={Boolean(viewingContractRental)}
          onClose={() => setViewingContractRental(null)}
        />
      )}

      {/* REJECT MODAL (UC_O07 with recorded reason) */}
      {showRejectModal && selectedRequest && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "480px" }}>
            <div className="owner-modal-header">
              <h3 style={{ color: "#ef4444" }}>✕ Từ chối yêu cầu thuê (UC_O07)</h3>
              <button className="close-modal-btn" onClick={() => setShowRejectModal(false)}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 0 }}>
              Bạn đang từ chối yêu cầu thuê <strong>{selectedRequest.request_code}</strong> của{" "}
              <strong>{selectedRequest.renter_name}</strong>. Theo quy định hệ thống, Owner cần ghi rõ lý do.
            </p>

            <div>
              <label className="field-label">Lý do từ chối cho thuê *</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Ví dụ: Thiết bị có lịch bảo trì phát sinh, thời gian bàn giao không thuận tiện..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setShowRejectModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="button"
                style={{ background: "#ef4444", color: "#fff", width: "auto" }}
                onClick={handleConfirmReject}
                disabled={isProcessing}
              >
                {isProcessing ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}