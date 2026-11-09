import { useState, useEffect } from "react";
import type { RentalRequest } from "../../types/owner";
import type { Rental } from "../../types/smartequip";
import { ownerApi } from "../../services/ownerApi";
import RentalChatModal from "../../components/RentalChatModal";
import ContractPdfModal from "../../components/ContractPdfModal";
import OwnerEditContractModal from "../../components/OwnerEditContractModal";

interface Props {
  requests?: RentalRequest[];
  token: string;
  onRefresh: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onCreateContract?: (req: RentalRequest) => void;
}

export default function OwnerRequestsTab({
  token,
  onRefresh,
  onError,
  onSuccess,
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

  // Thao tác duyệt đơn thuê trực tiếp (Owner duyệt -> Tự động chuyển sang lập & điều chỉnh hợp đồng)
  async function handleApproveDirectRental(rental: Rental) {
    setIsProcessing(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.respondOwnerRental(token, rental._id, "approve");
      onSuccess(`✅ Đã duyệt đơn thuê #${rental.rentalCode}! Hệ thống chuyển sang màn hình lập & điều chỉnh hợp đồng.`);
      const updatedList = await fetchDirectRentals();
      onRefresh();
      // Chuyển sang lập hợp đồng ngay sau khi duyệt!
      const targetRental = updatedList?.find((item) => item._id === rental._id) || { ...rental, status: "approved" };
      setEditingContractRental(targetRental);
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
            <strong style={{ color: "#38bdf8" }}>2. Chủ máy duyệt & Lập/Sửa HĐ</strong> ➔{" "}
            <strong style={{ color: "#a855f7" }}>3. Khách ký & Chuyển khoản QR</strong> ➔{" "}
            <strong style={{ color: "#10b981" }}>4. Bạn xác nhận nhận tiền & Giao thiết bị</strong>.
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
                          {/* NÚT DUYỆT ĐƠN KHI PENDING -> CHUYỂN SANG LẬP HỢP ĐỒNG */}
                          {isPendingOwner && (
                            <button
                              type="button"
                              onClick={() => handleApproveDirectRental(r)}
                              disabled={isProcessing}
                              className="button button-primary"
                              style={{ padding: "6px 14px", fontSize: "0.8rem", width: "auto" }}
                              title="Duyệt đơn và chuyển sang lập hợp đồng"
                            >
                              ✅ Duyệt & Lập HĐ
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

                          {/* NÚT SỬA HỢP ĐỒNG TRỰC TIẾP DÀNH CHO OWNER */}
                          <button
                            type="button"
                            onClick={() => setEditingContractRental(r)}
                            className="button button-quiet"
                            style={{ padding: "6px 10px", fontSize: "0.8rem", width: "auto", color: "#38bdf8", borderColor: "#0284c7" }}
                            title="Chỉnh sửa điều khoản, biểu phí hợp đồng theo thỏa thuận"
                          >
                            ✏️ Sửa HĐ
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
    </div>
  );
}
