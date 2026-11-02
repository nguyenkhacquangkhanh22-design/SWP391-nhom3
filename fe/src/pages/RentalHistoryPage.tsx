import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Navbar from "../components/Navbar";
import ContractConfirmationModal from "../components/ContractConfirmationModal";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Rental } from "../types/smartequip";

type TabKey = "ALL" | "PENDING" | "CONTRACT_SIGNED" | "ACTIVE" | "RETURNED";

interface TabItem {
  key: TabKey;
  label: string;
  badge?: number;
}

const TABS: TabItem[] = [
  { key: "ALL", label: "Tất cả đơn" },
  { key: "PENDING", label: "Chờ ký hợp đồng" },
  { key: "CONTRACT_SIGNED", label: "Chờ thanh toán" },
  { key: "ACTIVE", label: "Đang thuê" },
  { key: "RETURNED", label: "Đã trả / Hoàn tất" },
];

export default function RentalHistoryPage() {
  const { user, token, isLoading } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");

  // Modal ký hợp đồng (UC_R08)
  const [signingRental, setSigningRental] = useState<Rental | null>(null);

  // Modal trả thiết bị (UC_R10: hẹn giờ, địa điểm, tình trạng)
  const [returningRentalId, setReturningRentalId] = useState<string | null>(null);
  const [returnCondition, setReturnCondition] = useState("Thiết bị nguyên vẹn, hoạt động bình thường, đầy đủ phụ kiện.");
  const [returnNote, setReturnNote] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [isReturning, setIsReturning] = useState(false);

  // Modal đánh giá (UC_R11)
  const [reviewingRentalId, setReviewingRentalId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Modal khiếu nại / Ticket (UC_R14, UC_R15)
  const [disputingRentalId, setDisputingRentalId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [isDisputing, setIsDisputing] = useState(false);

  // Modal hủy đơn (UC_R13)
  const [cancellingRentalId, setCancellingRentalId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // State thanh toán (UC_R09)
  const [payingRentalId, setPayingRentalId] = useState<string | null>(null);

  const fetchHistory = () => {
    if (!token) return;
    setLoading(true);
    smartEquipApi
      .getRentalHistory(token)
      .then((res) => setRentals(res.data))
      .catch((err) => setError(err.message || "Không thể tải lịch sử đơn thuê"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Lọc theo Tab trạng thái
  const filteredRentals = rentals.filter((r) => {
    const s = r.status.toUpperCase();
    if (activeTab === "ALL") return true;
    if (activeTab === "PENDING") {
      return s === "PENDING" || s === "CONTRACT_PENDING";
    }
    if (activeTab === "CONTRACT_SIGNED") {
      return s === "CONTRACT_SIGNED" || s === "PAYMENT_PENDING";
    }
    if (activeTab === "ACTIVE") {
      return s === "PAID" || s === "ACTIVE" || s === "CONFIRMED" || s === "IN_PROGRESS";
    }
    if (activeTab === "RETURNED") {
      return s === "RETURNED" || s === "RETURN_REQUESTED" || s === "COMPLETED";
    }
    return true;
  });

  // Xử lý Thanh toán (UC_R09)
  const handlePay = async (rentalId: string) => {
    setPayingRentalId(rentalId);
    setError("");
    setNotice("");
    try {
      const res = await smartEquipApi.payRental(token, rentalId, {
        paymentMethod: "vnpay",
      });
      setNotice(res.message || "Thanh toán thành công! Đơn thuê đã được chuyển sang trạng thái ĐÃ THANH TOÁN.");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thanh toán");
    } finally {
      setPayingRentalId(null);
    }
  };

  // Mở modal báo trả máy
  const openReturnModal = (r: Rental) => {
    setReturningRentalId(r._id);
    setReturnLocation(r.deliveryAddress || "");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReturnTime(tomorrow.toISOString().slice(0, 16));
  };

  // Gửi yêu cầu hoàn trả thiết bị (UC_R10)
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningRentalId) return;
    setIsReturning(true);
    setError("");
    try {
      const res = await smartEquipApi.requestReturn(token, returningRentalId, {
        returnCondition,
        returnNote,
        returnTime,
        returnLocation,
      });
      setNotice(res.message || "Đã gửi yêu cầu hoàn trả thiết bị thành công!");
      setReturningRentalId(null);
      setReturnNote("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu trả");
    } finally {
      setIsReturning(false);
    }
  };

  // Gửi đánh giá sao & nhận xét (UC_R11)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRentalId) return;
    setIsReviewing(true);
    setError("");
    try {
      const res = await smartEquipApi.reviewRental(token, reviewingRentalId, {
        rating,
        comment: reviewComment,
      });
      setNotice(res.message || "Gửi đánh giá thiết bị thành công!");
      setReviewingRentalId(null);
      setReviewComment("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi đánh giá");
    } finally {
      setIsReviewing(false);
    }
  };

  // Gửi khiếu nại tranh chấp (UC_R14)
  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingRentalId || !disputeReason.trim()) return;
    setIsDisputing(true);
    setError("");
    try {
      const res = await smartEquipApi.submitDispute(token, disputingRentalId, {
        reason: disputeReason.trim(),
      });
      setNotice(res.message || "Đã gửi khiếu nại tới bộ phận hỗ trợ SmartEquip.");
      setDisputingRentalId(null);
      setDisputeReason("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi khiếu nại");
    } finally {
      setIsDisputing(false);
    }
  };

  // Hủy đơn thuê (UC_R13)
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingRentalId || !cancelReason.trim()) return;
    setIsCancelling(true);
    setError("");
    try {
      const res = await smartEquipApi.cancelRental(token, cancellingRentalId, {
        reason: cancelReason.trim(),
      });
      setNotice(res.message || "Hủy đơn thuê thành công.");
      setCancellingRentalId(null);
      setCancelReason("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hủy đơn thuê");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "PENDING":
      case "CONTRACT_PENDING":
        return {
          label: "Chờ ký hợp đồng",
          className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "CONTRACT_SIGNED":
      case "PAYMENT_PENDING":
        return {
          label: "Chờ thanh toán",
          className: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        };
      case "PAID":
      case "CONFIRMED":
        return {
          label: "Đã thanh toán (Sẵn sàng nhận máy)",
          className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "ACTIVE":
      case "IN_PROGRESS":
        return {
          label: "Đang thuê",
          className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        };
      case "RETURNED":
      case "RETURN_REQUESTED":
        return {
          label: "Đã báo trả đồ (Chờ nghiệm thu)",
          className: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        };
      case "COMPLETED":
        return {
          label: "Hoàn tất & Đã hoàn cọc",
          className: "bg-teal-500/10 text-teal-400 border-teal-500/30",
        };
      case "CANCELLED":
        return {
          label: "Đã hủy đơn",
          className: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        };
      case "DISPUTED":
        return {
          label: "Đang khiếu nại",
          className: "bg-red-500/10 text-red-400 border-red-500/30",
        };
      default:
        return {
          label: status,
          className: "bg-slate-500/10 text-slate-300 border-slate-500/30",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Quản Lý Đơn Thuê Của Bạn
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Ký hợp đồng điện tử, thanh toán phí thuê & tiền cọc, theo dõi lịch trình và báo trả đồ
            </p>
          </div>
          <Link
            to="/equipment"
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs shadow-md transition-all self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Thuê thiết bị khác</span>
          </Link>
        </div>

        {/* Notice alert */}
        {notice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
            <span>✅ {notice}</span>
            <button onClick={() => setNotice("")} className="text-xs text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")} className="text-xs text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-[#1f2b3e]">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                    : "text-slate-400 hover:text-white hover:bg-[#152033]"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm">Đang nạp dữ liệu đơn thuê...</p>
          </div>
        ) : filteredRentals.length === 0 ? (
          <div className="py-20 text-center bg-[#141d2d] rounded-2xl border border-[#223049] p-8 space-y-3">
            <div className="text-5xl">📋</div>
            <h3 className="text-lg font-bold text-white">Không có đơn thuê nào trong mục này</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Chưa có đơn thuê nào khớp với tab bạn đã chọn. Bạn có thể chọn xem tất cả hoặc đặt thuê thiết bị mới!
            </p>
            <Link
              to="/equipment"
              className="inline-block mt-3 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs shadow-md"
            >
              Xem danh sách thiết bị
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRentals.map((r) => {
              const statusBadge = getStatusBadge(r.status);
              const upperStatus = r.status.toUpperCase();

              const canSign = upperStatus === "APPROVED" || upperStatus === "CONTRACT_PENDING";
              const canPay = upperStatus === "CONTRACT_SIGNED" || upperStatus === "PAYMENT_PENDING";
              const canReturn =
                upperStatus === "PAID" ||
                upperStatus === "ACTIVE" ||
                upperStatus === "CONFIRMED" ||
                upperStatus === "IN_PROGRESS";
              const canReview =
                (upperStatus === "RETURNED" ||
                  upperStatus === "RETURN_REQUESTED" ||
                  upperStatus === "COMPLETED") &&
                !r.review?.rating;
              const canDispute =
                upperStatus === "PAID" ||
                upperStatus === "ACTIVE" ||
                upperStatus === "CONFIRMED" ||
                upperStatus === "IN_PROGRESS" ||
                upperStatus === "RETURNED";
              const canCancel =
                upperStatus === "PENDING" ||
                upperStatus === "CONTRACT_PENDING" ||
                upperStatus === "CONTRACT_SIGNED" ||
                upperStatus === "PAYMENT_PENDING";

              return (
                <div
                  key={r._id}
                  className="bg-[#141d2d] border border-[#223049] rounded-2xl p-5 hover:border-[#2d3e5e] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-md"
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-24 h-24 rounded-xl bg-[#1b273d] border border-[#273650] overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                      {r.equipment?.images && r.equipment.images.length > 0 ? (
                        <img
                          src={r.equipment.images[0]}
                          alt={r.equipment.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl text-slate-600">📷</span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                          #{r.rentalCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-white truncate">
                        {r.equipment?.title || "Thiết bị SmartEquip"}
                      </h3>

                      <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Thời gian:{" "}
                          <strong className="text-slate-200">
                            {new Date(r.startDate).toLocaleDateString("vi-VN")} -{" "}
                            {new Date(r.endDate).toLocaleDateString("vi-VN")}
                          </strong>{" "}
                          ({r.totalDays} ngày)
                        </span>
                        <span>
                          Chủ máy:{" "}
                          <strong className="text-slate-200">
                            {typeof r.owner === "object" ? r.owner?.name : "Owner"}
                          </strong>
                        </span>
                      </div>

                      {/* Contract & Payment snippet */}
                      <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                        {r.contract?.signedAt && (
                          <span className="text-emerald-400">
                            ✓ Đã ký HĐ: {r.contract.renterSignature || r.contract.digitalSignature}
                          </span>
                        )}
                        {r.payment?.isPaid && (
                          <span className="text-blue-400">
                            ✓ Đã thanh toán ({r.payment.paymentMethod || "VNPay"})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Amount breakdown */}
                  <div className="bg-[#0f1624] p-3.5 rounded-xl border border-[#1e2a40] flex lg:flex-col justify-between items-end gap-1 min-w-[190px]">
                    <span className="text-xs text-slate-400">Tổng thanh toán:</span>
                    <span className="text-lg font-extrabold text-orange-400">
                      {r.totalAmount.toLocaleString("vi-VN")} đ
                    </span>
                    <div className="text-[11px] text-slate-400 text-right space-y-0.5">
                      <div>Tiền thuê: {r.rentalFee.toLocaleString("vi-VN")} đ</div>
                      <div>Tiền cọc: {r.depositAmount.toLocaleString("vi-VN")} đ</div>
                      {r.discountAmount ? (
                        <div className="text-emerald-400 font-semibold">
                          Giảm giá: -{r.discountAmount.toLocaleString("vi-VN")} đ
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch min-w-[160px]">
                    {/* Chờ Owner duyệt */}
                    {upperStatus === "PENDING" && (
                      <div className="px-3.5 py-2 bg-[#1b2537] border border-[#27364f] rounded-xl text-center">
                        <span className="text-[11px] text-amber-400 flex items-center justify-center gap-1.5 font-medium">
                          <span>⏳</span> Đang chờ Chủ máy duyệt
                        </span>
                      </div>
                    )}

                    {/* Nút ký hợp đồng (UC_R08) */}
                    {canSign && (
                      <button
                        onClick={() => setSigningRental(r)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center flex items-center justify-center gap-1.5"
                      >
                        <span>✍️</span>
                        <span>Ký hợp đồng</span>
                      </button>
                    )}

                    {/* Nút thanh toán (UC_R09) */}
                    {canPay && (
                      <button
                        onClick={() => handlePay(r._id)}
                        disabled={payingRentalId === r._id}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center flex items-center justify-center gap-1.5"
                      >
                        <span>💳</span>
                        <span>
                          {payingRentalId === r._id ? "Đang xử lý..." : "Thanh toán cọc & phí"}
                        </span>
                      </button>
                    )}

                    {/* Nút báo trả đồ (UC_R10) */}
                    {canReturn && (
                      <button
                        onClick={() => openReturnModal(r)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <span>📦</span>
                        <span>Báo trả đồ</span>
                      </button>
                    )}

                    {/* Nút đánh giá (UC_R11) */}
                    {canReview && (
                      <button
                        onClick={() => setReviewingRentalId(r._id)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1"
                      >
                        <span>⭐</span>
                        <span>Đánh giá đơn</span>
                      </button>
                    )}

                    {/* Đã có đánh giá */}
                    {r.review?.rating && (
                      <div className="text-center text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                        ⭐ Đã đánh giá ({r.review.rating}/5)
                      </div>
                    )}

                    {/* Nút khiếu nại (UC_R14) */}
                    {canDispute && (
                      <button
                        onClick={() => setDisputingRentalId(r._id)}
                        className="px-3 py-1.5 bg-[#1e1722] hover:bg-red-950/40 text-rose-400 font-semibold rounded-xl text-xs border border-rose-900/40 text-center"
                      >
                        ⚠️ Khiếu nại
                      </button>
                    )}

                    {/* Nút hủy yêu cầu (UC_R13) */}
                    {canCancel && (
                      <button
                        onClick={() => setCancellingRentalId(r._id)}
                        className="px-3 py-1.5 bg-[#1c2436] hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 font-semibold rounded-xl text-xs border border-[#27344c] text-center"
                      >
                        Hủy yêu cầu
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Ký hợp đồng điện tử (UC_R08) */}
      {signingRental && (
        <ContractConfirmationModal
          rental={signingRental}
          token={token}
          isOpen={Boolean(signingRental)}
          onClose={() => setSigningRental(null)}
          onSuccess={() => {
            setSigningRental(null);
            setNotice("Ký hợp đồng thành công! Vui lòng tiến hành thanh toán tiền thuê và tiền cọc.");
            fetchHistory();
          }}
        />
      )}

      {/* Modal Báo trả đồ (UC_R10: hẹn giờ, địa điểm, tình trạng) */}
      {returningRentalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#263550] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📦</span> Yêu Cầu Hoàn Trả Thiết Bị
            </h3>
            <p className="text-xs text-slate-400">
              Gửi thông tin hẹn giờ và địa điểm để Chủ máy chuẩn bị nghiệm thu thiết bị và hoàn trả tiền cọc cho bạn.
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Thời gian hẹn trả máy *
                </label>
                <input
                  type="datetime-local"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Địa điểm bàn giao trả máy *
                </label>
                <input
                  type="text"
                  placeholder="Địa chỉ bàn giao..."
                  value={returnLocation}
                  onChange={(e) => setReturnLocation(e.target.value)}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Tình trạng thiết bị khi hoàn trả
                </label>
                <input
                  type="text"
                  placeholder="VD: Máy hoạt động tốt, đầy đủ pin sạc và dây cáp..."
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Ghi chú thêm cho Chủ thiết bị
                </label>
                <textarea
                  rows={2}
                  placeholder="Nhắn thêm thông tin cho chủ máy..."
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                <button
                  type="button"
                  onClick={() => setReturningRentalId(null)}
                  disabled={isReturning}
                  className="px-4 py-2 bg-[#1c2436] text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isReturning}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/30"
                >
                  {isReturning ? "Đang gửi..." : "Gửi yêu cầu hoàn trả"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đánh giá (UC_R11) */}
      {reviewingRentalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#263550] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>⭐</span> Đánh Giá Thiết Bị & Chủ Sở Hữu
            </h3>
            <form onSubmit={handleReviewSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Mức độ hài lòng (1 - 5 sao) *
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5/5) - Rất hài lòng, thiết bị tốt</option>
                  <option value={4}>⭐⭐⭐⭐ (4/5) - Hài lòng, đúng mô tả</option>
                  <option value={3}>⭐⭐⭐ (3/5) - Bình thường</option>
                  <option value={2}>⭐⭐ (2/5) - Chưa hài lòng</option>
                  <option value={1}>⭐ (1/5) - Không hài lòng</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Nhận xét chi tiết
                </label>
                <textarea
                  rows={3}
                  placeholder="Chia sẻ trải nghiệm sử dụng thiết bị, tình trạng hoạt động..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                <button
                  type="button"
                  onClick={() => setReviewingRentalId(null)}
                  disabled={isReviewing}
                  className="px-4 py-2 bg-[#1c2436] text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isReviewing}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-600/30"
                >
                  {isReviewing ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Khiếu nại (UC_R14) */}
      {disputingRentalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#263550] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚠️</span> Gửi Khiếu Nại Đơn Thuê
            </h3>
            <p className="text-xs text-slate-400">
              Đội ngũ SmartEquip sẽ tiếp nhận và tiến hành bảo vệ quyền lợi chính đáng cho bạn theo điều khoản hợp đồng.
            </p>
            <form onSubmit={handleDisputeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Lý do khiếu nại cụ thể *
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả sự cố (VD: Thiết bị thiếu phụ kiện, không đúng mô tả kỹ thuật...)"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                <button
                  type="button"
                  onClick={() => setDisputingRentalId(null)}
                  disabled={isDisputing}
                  className="px-4 py-2 bg-[#1c2436] text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isDisputing || !disputeReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs"
                >
                  {isDisputing ? "Đang gửi..." : "Gửi khiếu nại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hủy yêu cầu (UC_R13) */}
      {cancellingRentalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#263550] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white">Xác Nhận Hủy Đơn Thuê</h3>
            <p className="text-xs text-slate-400">
              Vui lòng cho biết lý do bạn muốn hủy đơn thuê này. Nếu bạn đã thanh toán, số tiền sẽ được hoàn trả theo quy định.
            </p>
            <form onSubmit={handleCancelSubmit} className="space-y-3 text-xs">
              <textarea
                rows={3}
                placeholder="Nhập lý do hủy..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                <button
                  type="button"
                  onClick={() => setCancellingRentalId(null)}
                  disabled={isCancelling}
                  className="px-4 py-2 bg-[#1c2436] text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || !cancelReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs"
                >
                  {isCancelling ? "Đang hủy..." : "Xác nhận hủy đơn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
