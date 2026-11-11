import { useState, useEffect } from "react";
import type { RentalRequest } from "../../types/owner";
import type { Rental } from "../../types/smartequip";
import { ownerApi } from "../../services/ownerApi";
import RentalChatModal from "../../components/RentalChatModal";
import ContractPdfModal from "../../components/ContractPdfModal";
import OwnerEditContractModal from "../../components/OwnerEditContractModal";
import OwnerCancelRentalModal from "../../components/OwnerCancelRentalModal";
import OwnerReviewRenterModal from "../../components/OwnerReviewRenterModal";
import OwnerDamageReportModal from "../../components/owner/OwnerDamageReportModal";

interface Props {
  requests?: RentalRequest[];
  token: string;
  onRefresh: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onCreateContract?: (req: RentalRequest) => void;
}

export default function OwnerRequestsTab({
  requests = [],
  token,
  onRefresh,
  onError,
  onSuccess,
  onCreateContract,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Direct Rentals State
  const [directRentals, setDirectRentals] = useState<Rental[]>([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [chatRental, setChatRental] = useState<Rental | null>(null);
  const [viewingContractRental, setViewingContractRental] = useState<Rental | null>(null);
  const [editingContractRental, setEditingContractRental] = useState<Rental | null>(null);
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);
  const [cancellingRental, setCancellingRental] = useState<Rental | null>(null);
  const [reviewingRental, setReviewingRental] = useState<Rental | null>(null);
  const [damageReportRental, setDamageReportRental] = useState<Rental | null>(null);

  const fetchDirectRentals = async (): Promise<Rental[] | undefined> => {
    if (!token) return;
    setDirectLoading(true);
    try {
      const res = await ownerApi.getOwnerRentals(token);
      if (res && Array.isArray(res.data)) {
        setDirectRentals(res.data);
        return res.data;
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

  // Thao tác duyệt đơn thuê trực tiếp (Owner chỉ duyệt đơn, không tự động chuyển tab)
  async function handleApproveDirectRental(rental: Rental) {
    setIsProcessing(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.respondOwnerRental(token, rental._id, "approve");
      onSuccess(`✅ Đã duyệt đơn thuê #${rental.rentalCode}! Bạn có thể chuyển sang tab "Hợp đồng thuê" để tiến hành lập hợp đồng.`);
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

  const filteredDirectRentals = directRentals.filter((r: any) => {
    if (statusFilter === "all") return true;
    const upperStatus = String(r.status || "").toUpperCase();
    const isPendingOwner = upperStatus === "PENDING" || upperStatus === "CONTRACT_PENDING";
    const isApproved = upperStatus === "APPROVED" || upperStatus === "CONTRACT_SIGNED";
    const isWaitingPayment = upperStatus === "PAYMENT_PENDING" || r.payment?.paymentStatus === "pending_confirmation";
    const isPaid = upperStatus === "PAID" || r.payment?.isPaid === true || r.payment?.paymentStatus === "paid";
    const isReturned = upperStatus === "RETURNED" || upperStatus === "RETURN_REQUESTED";

    if (statusFilter === "pending") return isPendingOwner;
    if (statusFilter === "approved") return isApproved;
    if (statusFilter === "waiting_payment") return isWaitingPayment;
    if (statusFilter === "paid") return isPaid && !isReturned;
    if (statusFilter === "returned") return isReturned;
    return true;
  });

  return (
    <div className="owner-tab-content">
      {/* Header & Filter Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.35rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📦</span> Quản Lý Đơn Thuê & Xác Nhận Chuyển Khoản
            <span style={{ fontSize: "0.8rem", background: "rgba(234, 88, 12, 0.2)", border: "1px solid #ea580c", color: "#fb923c", padding: "2px 10px", borderRadius: "999px" }}>
              {directRentals.length} đơn
            </span>
          </h2>
          <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.88rem" }}>
            Luồng trực tiếp: <strong style={{ color: "#fb923c" }}>1. Khách đặt thuê</strong> ➔{" "}
            <strong style={{ color: "#38bdf8" }}>2. Chủ máy duyệt đơn</strong> ➔{" "}
            <strong style={{ color: "#a855f7" }}>3. Sang tab "Hợp đồng thuê" để lập & ký HĐ</strong> ➔{" "}
            <strong style={{ color: "#10b981" }}>4. Khách ký & Thanh toán</strong> ➔{" "}
            <strong style={{ color: "#f59e0b" }}>5. Bàn giao thiết bị</strong>.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Lọc trạng thái */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Lọc:</span>
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "6px 12px", width: "auto", fontSize: "0.85rem" }}
            >
              <option value="all">Tất cả ({directRentals.length})</option>
              <option value="pending">
                ⏳ Chờ duyệt ({directRentals.filter((r: any) => ["PENDING", "CONTRACT_PENDING"].includes(String(r.status || "").toUpperCase())).length})
              </option>
              <option value="approved">
                📝 Đã duyệt / Chờ ký & CK ({directRentals.filter((r: any) => ["APPROVED", "CONTRACT_SIGNED"].includes(String(r.status || "").toUpperCase())).length})
              </option>
              <option value="waiting_payment">
                💳 Khách đã CK - Chờ bạn check ({directRentals.filter((r: any) => String(r.status || "").toUpperCase() === "PAYMENT_PENDING" || r.payment?.paymentStatus === "pending_confirmation").length})
              </option>
              <option value="paid">
                🚚 Đã thanh toán / Đang thuê ({directRentals.filter((r: any) => (String(r.status || "").toUpperCase() === "PAID" || r.payment?.isPaid === true) && !["RETURNED", "RETURN_REQUESTED"].includes(String(r.status || "").toUpperCase())).length})
              </option>
              <option value="returned">
                📦 Báo trả / Đã trả ({directRentals.filter((r: any) => ["RETURNED", "RETURN_REQUESTED"].includes(String(r.status || "").toUpperCase())).length})
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => { void fetchDirectRentals(); onRefresh(); }}
            className="button button-secondary"
            style={{ fontSize: "0.85rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Tải lại danh sách đơn thuê"
          >
            <span>🔄</span> Tải lại
          </button>
        </div>
      </div>

      {/* Danh sách đơn thuê */}
      {directLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
          Đang tải danh sách đơn thuê của bạn...
        </div>
      ) : filteredDirectRentals.length === 0 ? (
        <div className="owner-section-card owner-empty-state">
          <span style={{ fontSize: "2.5rem" }}>📭</span>
          <h3>Không có đơn thuê nào</h3>
          <p>
            {statusFilter !== "all"
              ? "Không có đơn thuê nào phù hợp với bộ lọc hiện tại."
              : "Khi có khách thuê đặt thiết bị của bạn, đơn thuê sẽ xuất hiện tại đây để bạn duyệt và xác nhận tiền."}
          </p>
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
                {filteredDirectRentals.map((r: any) => {
                  const upperStatus = String(r.status || "").toUpperCase();
                  const isPendingOwner = upperStatus === "PENDING" || upperStatus === "CONTRACT_PENDING";
                  const isApproved = upperStatus === "APPROVED";
                  const isSigned = upperStatus === "CONTRACT_SIGNED";
                  const isWaitingPayment = upperStatus === "PAYMENT_PENDING" || r.payment?.paymentStatus === "pending_confirmation";
                  const isPaid = upperStatus === "PAID" || r.payment?.isPaid === true || r.payment?.paymentStatus === "paid";
                  const isReturned = upperStatus === "RETURNED" || upperStatus === "RETURN_REQUESTED";

                  const currentEquipId = String(typeof r.equipment === "object" ? r.equipment?._id : r.equipment);
                  const rStart = new Date(r.startDate).getTime();
                  const rEnd = new Date(r.endDate).getTime();

                  const conflictingOrder = directRentals.find((other: any) => {
                    if (String(other._id) === String(r._id)) return false;
                    const otherUpper = String(other.status || "").toUpperCase();
                    const otherIsActive = [
                      "APPROVED",
                      "CONTRACT_PENDING",
                      "CONTRACT_SIGNED",
                      "PAYMENT_PENDING",
                      "PAYMENT_VERIFYING",
                      "PAID",
                      "ACTIVE",
                      "CONFIRMED",
                    ].includes(otherUpper);
                    if (!otherIsActive) return false;
                    const otherEquipId = String(
                      typeof other.equipment === "object" ? other.equipment?._id : other.equipment
                    );
                    if (otherEquipId !== currentEquipId) return false;
                    const oStart = new Date(other.startDate).getTime();
                    const oEnd = new Date(other.endDate).getTime();
                    return rStart <= oEnd && rEnd >= oStart;
                  });

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
                        {conflictingOrder && isPendingOwner && (
                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "0.72rem",
                              color: "#f87171",
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              borderRadius: "6px",
                              padding: "2px 6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title={`Trùng khoảng thời gian thuê với đơn #${conflictingOrder.rentalCode} (${new Date(conflictingOrder.startDate).toLocaleDateString("vi-VN")} - ${new Date(conflictingOrder.endDate).toLocaleDateString("vi-VN")})`}
                          >
                            <span>⚠️</span>
                            <span>Trùng lịch với #{conflictingOrder.rentalCode}</span>
                          </div>
                        )}
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
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
                          {/* NÚT DUYỆT ĐƠN CHO THUÊ (Chỉ duyệt đơn tại đây) */}
                          {isPendingOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                if (conflictingOrder) {
                                  if (
                                    !window.confirm(
                                      `⚠️ CẢNH BÁO TRÙNG LỊCH: Thiết bị này đã có đơn #${conflictingOrder.rentalCode} được duyệt trước đó trong cùng khoảng thời gian. Bạn có chắc chắn vẫn muốn thử duyệt không?`
                                    )
                                  ) {
                                    return;
                                  }
                                }
                                handleApproveDirectRental(r);
                              }}
                              disabled={isProcessing}
                              className={conflictingOrder ? "button button-secondary" : "button button-primary"}
                              style={{
                                padding: "6px 14px",
                                fontSize: "0.8rem",
                                borderRadius: "10px",
                                fontWeight: 700,
                                width: "auto",
                                ...(conflictingOrder ? { borderColor: "#ef4444", color: "#f87171" } : {}),
                              }}
                              title={
                                conflictingOrder
                                  ? `Trùng lịch với đơn #${conflictingOrder.rentalCode}`
                                  : "Duyệt chấp nhận đơn thuê này"
                              }
                            >
                              {conflictingOrder ? "⚠️ Trùng lịch" : "✅ Duyệt đơn"}
                            </button>
                          )}

                          {/* NÚT CHUYỂN SANG TAB HỢP ĐỒNG KHI ĐÃ DUYỆT */}
                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => {
                                const matchingReq = (requests || []).find(
                                  (rq) => rq.request_code === r.rentalCode || String(rq._id) === String(r._id)
                                );
                                const requestObj: RentalRequest = matchingReq || ({
                                  _id: r._id,
                                  request_code: r.rentalCode,
                                  renter_name: typeof r.renter === "object" ? r.renter?.name : "Khách thuê",
                                  renter_email: typeof r.renter === "object" ? r.renter?.email : "",
                                  renter_phone: typeof r.renter === "object" ? r.renter?.phone : "",
                                  equipment_id: typeof r.equipment === "object" ? r.equipment : ({ _id: r.equipment, title: "Thiết bị thuê" } as any),
                                  start_date: r.startDate,
                                  end_date: r.endDate,
                                  rental_fee: r.totalAmount || r.rentalFee || 0,
                                  deposit_amount: 0,
                                  status: "approved",
                                  delivery_address: r.deliveryAddress,
                                  duration_days: r.totalDays || 1,
                                } as any);
                                onCreateContract?.(requestObj);
                              }}
                              className="button button-secondary"
                              style={{
                                padding: "6px 12px",
                                fontSize: "0.8rem",
                                borderRadius: "10px",
                                width: "auto",
                                borderColor: "#f97316",
                                color: "#fb923c",
                                background: "rgba(249, 115, 22, 0.12)",
                                fontWeight: 600,
                              }}
                              title="Chuyển sang tab Hợp đồng thuê để lập hợp đồng"
                            >
                              Sang tab HĐ ➔
                            </button>
                          )}

                          {/* NÚT CHECK TIỀN & XÁC NHẬN KHI PAYMENT_PENDING */}
                          {isWaitingPayment && (
                            <button
                              type="button"
                              onClick={() => handleConfirmDirectPayment(r._id, r.rentalCode)}
                              disabled={isProcessing}
                              className="button"
                              style={{
                                background: "linear-gradient(135deg, #059669, #10b981)",
                                color: "#fff",
                                padding: "6px 14px",
                                fontSize: "0.8rem",
                                borderRadius: "10px",
                                width: "auto",
                                fontWeight: "bold",
                                border: "none",
                                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                              }}
                            >
                              ✅ Xác nhận đã nhận tiền (Gửi hàng)
                            </button>
                          )}

                          {/* NÚT CHAT VỚI KHÁCH THUÊ & GỬI HỢP ĐỒNG */}
                          <button
                            type="button"
                            onClick={() => setChatRental(r)}
                            className="button button-secondary"
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.8rem",
                              borderRadius: "10px",
                              width: "auto",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "rgba(56, 189, 248, 0.1)",
                              borderColor: "rgba(56, 189, 248, 0.35)",
                              color: "#38bdf8",
                            }}
                            title="Nhắn tin với khách thuê & gửi hợp đồng"
                          >
                            <span>💬</span> Nhắn tin
                          </button>

                          {/* NÚT XEM HỢP ĐỒNG PDF */}
                          <button
                            type="button"
                            onClick={() => setViewingContractRental(r)}
                            className="button button-quiet"
                            style={{
                              padding: "6px 10px",
                              fontSize: "0.8rem",
                              borderRadius: "10px",
                              width: "auto",
                              background: "rgba(255, 255, 255, 0.05)",
                              borderColor: "rgba(255, 255, 255, 0.12)",
                              color: "#cbd5e1",
                            }}
                            title="Mở bản hợp đồng PDF"
                          >
                            📄 HĐ PDF
                          </button>

                          {/* NÚT SỬA HỢP ĐỒNG TRỰC TIẾP DÀNH CHO OWNER */}
                          <button
                            type="button"
                            onClick={() => setEditingContractRental(r)}
                            className="button button-quiet"
                            style={{
                              padding: "6px 10px",
                              fontSize: "0.8rem",
                              borderRadius: "10px",
                              width: "auto",
                              color: "#38bdf8",
                              borderColor: "rgba(2, 132, 199, 0.4)",
                              background: "rgba(2, 132, 199, 0.08)",
                            }}
                            title="Chỉnh sửa điều khoản, biểu phí hợp đồng theo thỏa thuận"
                          >
                            ✏️ Sửa HĐ
                          </button>

                          {/* NÚT ĐÁNH GIÁ KHÁCH THUÊ KHI HOÀN TẤT */}
                          {(upperStatus === "COMPLETED" || upperStatus === "RETURNED" || upperStatus === "completed" || upperStatus === "returned") && (
                            r.ownerReview ? (
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "8px",
                                  fontSize: "0.75rem",
                                  background: "rgba(245, 158, 11, 0.15)",
                                  border: "1px solid #f59e0b",
                                  color: "#fbbf24",
                                  fontWeight: "bold",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title={r.ownerReview?.comment ? `Đã đánh giá: "${r.ownerReview.comment}"` : "Đã gửi đánh giá uy tín cho khách thuê"}
                              >
                                ⭐ {r.ownerReview?.rating || 5}★
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReviewingRental(r)}
                                className="button"
                                style={{
                                  padding: "6px 10px",
                                  fontSize: "0.8rem",
                                  borderRadius: "10px",
                                  width: "auto",
                                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                                  color: "#111827",
                                  fontWeight: "bold",
                                  border: "none",
                                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                                }}
                                title="Đánh giá khách thuê & chấm điểm uy tín"
                              >
                                ⭐ Đánh giá khách
                              </button>
                            )
                          )}

                          {/* NÚT KHIẾU NẠI HƯ HỎNG THIẾT BỊ (REPORT DAMAGE) */}
                          {(upperStatus === "COMPLETED" ||
                            upperStatus === "RETURNED" ||
                            upperStatus === "completed" ||
                            upperStatus === "returned" ||
                            upperStatus === "DISPUTED" ||
                            upperStatus === "disputed" ||
                            Boolean(r.dispute?.disputeId)) && (
                            r.dispute?.disputeId || upperStatus === "DISPUTED" || upperStatus === "disputed" ? (
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "8px",
                                  fontSize: "0.75rem",
                                  background: "rgba(239, 68, 68, 0.15)",
                                  border: "1px solid #ef4444",
                                  color: "#f87171",
                                  fontWeight: "bold",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title="Đơn thuê đang trong quá trình khiếu nại - Chờ Admin phân xử bồi thường"
                              >
                                ⚠️ Đang khiếu nại
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDamageReportRental(r)}
                                className="button button-quiet"
                                style={{
                                  padding: "6px 10px",
                                  fontSize: "0.8rem",
                                  borderRadius: "10px",
                                  width: "auto",
                                  color: "#f87171",
                                  borderColor: "rgba(239, 68, 68, 0.4)",
                                  background: "rgba(239, 68, 68, 0.12)",
                                  fontWeight: "bold",
                                }}
                                title="Báo cáo máy bị móp méo, trầy xước, hỏng hóc hoặc thiếu linh kiện kèm hình ảnh"
                              >
                                ⚠️ Báo hư hỏng
                              </button>
                            )
                          )}

                          {/* NÚT CHỦ ĐỘNG HỦY ĐƠN / SỰ CỐ THIẾT BỊ TRƯỚC BÀN GIAO */}
                          {upperStatus !== "IN_PROGRESS" &&
                            upperStatus !== "ACTIVE" &&
                            upperStatus !== "RETURNED" &&
                            upperStatus !== "COMPLETED" &&
                            upperStatus !== "CANCELLED" && (
                              <button
                                type="button"
                                onClick={() => setCancellingRental(r)}
                                className="button button-quiet"
                                style={{
                                  padding: "6px 10px",
                                  fontSize: "0.8rem",
                                  borderRadius: "10px",
                                  width: "auto",
                                  color: "#f87171",
                                  borderColor: "rgba(239, 68, 68, 0.35)",
                                  background: "rgba(239, 68, 68, 0.08)",
                                }}
                                title="Chủ động hủy đơn / Sự cố thiết bị đột xuất"
                              >
                                🚫 Hủy đơn
                              </button>
                            )}
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
          token={token}
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
          isOwner={true}
          onEditContract={() => {
            const target = viewingContractRental;
            setViewingContractRental(null);
            setEditingContractRental(target);
          }}
          onClose={() => setViewingContractRental(null)}
        />
      )}

      {/* MODAL CHỈNH SỬA ĐIỀU KHOẢN HỢP ĐỒNG TRỰC TIẾP DÀNH CHO OWNER */}
      {editingContractRental && (
        <OwnerEditContractModal
          rental={editingContractRental}
          token={token}
          isOpen={Boolean(editingContractRental)}
          onClose={() => setEditingContractRental(null)}
          onSuccess={() => {
            setEditingContractRental(null);
            fetchDirectRentals();
            onSuccess("Đã cập nhật điều khoản hợp đồng & tự động gửi bản cập nhật vào khung chat!");
          }}
        />
      )}
      {/* MODAL CHỦ ĐỘNG HỦY ĐƠN / SỰ CỐ THIẾT BỊ KÈM LÝ DO & HOÀN TIỀN */}
      {cancellingRental && (
        <OwnerCancelRentalModal
          isOpen={Boolean(cancellingRental)}
          rentalId={cancellingRental._id}
          rentalCode={cancellingRental.rentalCode}
          equipmentTitle={typeof cancellingRental.equipment === "object" ? cancellingRental.equipment?.title : "Thiết bị"}
          renterName={typeof cancellingRental.renter === "object" ? cancellingRental.renter?.name : "Khách thuê"}
          isPaid={
            String(cancellingRental.status).toUpperCase() === "PAID" ||
            cancellingRental.payment?.isPaid === true ||
            cancellingRental.payment?.paymentStatus === "paid"
          }
          totalAmount={cancellingRental.totalAmount || cancellingRental.rentalFee || 0}
          token={token}
          onClose={() => setCancellingRental(null)}
          onSuccess={(msg) => {
            onSuccess(msg);
            void fetchDirectRentals();
            onRefresh();
          }}
          onError={onError}
        />
      )}

      {/* MODAL ĐÁNH GIÁ KHÁCH THUÊ & CHẤM ĐIỂM UY TÍN (TRUST SCORE) */}
      {reviewingRental && (
        <OwnerReviewRenterModal
          isOpen={Boolean(reviewingRental)}
          rentalId={reviewingRental._id}
          rentalCode={reviewingRental.rentalCode}
          equipmentTitle={typeof reviewingRental.equipment === "object" ? reviewingRental.equipment?.title : "Thiết bị"}
          renterName={typeof reviewingRental.renter === "object" ? reviewingRental.renter?.name : "Khách thuê"}
          token={token}
          initialReview={reviewingRental.ownerReview}
          onClose={() => setReviewingRental(null)}
          onSuccess={(msg) => {
            onSuccess(msg);
            void fetchDirectRentals();
            onRefresh();
          }}
          onError={onError}
        />
      )}

      {/* MODAL KHIẾU NẠI HƯ HỎNG THIẾT BỊ (REPORT DAMAGE) */}
      {damageReportRental && (
        <OwnerDamageReportModal
          isOpen={Boolean(damageReportRental)}
          rental={damageReportRental as any}
          token={token}
          onClose={() => setDamageReportRental(null)}
          onSuccess={() => {
            onSuccess("Đã gửi hồ sơ khiếu nại hư hỏng lên Admin thành công. Đơn hàng chuyển sang trạng thái Đang tranh chấp.");
            void fetchDirectRentals();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
