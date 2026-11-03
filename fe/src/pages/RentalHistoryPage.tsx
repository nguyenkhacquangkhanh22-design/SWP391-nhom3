import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Navbar from "../components/Navbar";
import ContractConfirmationModal from "../components/ContractConfirmationModal";
import VietQRPaymentModal from "../components/VietQRPaymentModal";
import ContractPdfModal from "../components/ContractPdfModal";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Rental } from "../types/smartequip";
import {
  getDeliveryOption,
  getReturnOption,
  formatEstimatedDeliveryDate,
  formatEstimatedReturnPickup,
  getReturnDeadlineDate,
  formatCountdownRemaining,
} from "../constants/deliveryMethods";

type TabKey = "ALL" | "PENDING" | "APPROVED" | "CONTRACT_SIGNED" | "ACTIVE" | "RETURNED";

interface TabItem {
  key: TabKey;
  label: string;
  badge?: number;
}

const TABS: TabItem[] = [
  { key: "ALL", label: "Tất cả đơn" },
  { key: "PENDING", label: "Chờ duyệt đơn" },
  { key: "APPROVED", label: "Đã duyệt • Chờ ký & thanh toán" },
  { key: "CONTRACT_SIGNED", label: "Đã ký • Chờ thanh toán" },
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

  const [resettingHistory, setResettingHistory] = useState(false);

  const handleResetHistory = async () => {
    if (!token) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử đơn thuê để bắt đầu test lại từ đầu không?")) {
      return;
    }
    setResettingHistory(true);
    setError("");
    try {
      const res = await smartEquipApi.resetRentalHistory(token);
      setNotice(res.message || "Đã xóa sạch lịch sử đơn thuê.");
      setRentals([]);
    } catch (err: any) {
      setError(err?.message || "Không thể reset lịch sử thuê.");
    } finally {
      setResettingHistory(false);
    }
  };

  // Modal ký hợp đồng (UC_R08)
  const [signingRental, setSigningRental] = useState<Rental | null>(null);
  const [viewingContractRental, setViewingContractRental] = useState<Rental | null>(null);

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
  const [payingRental, setPayingRental] = useState<Rental | null>(null);


  const [isRefreshing, setIsRefreshing] = useState(false);

  // Đồng hồ thời gian thực đếm ngược hạn trả thiết bị theo thời gian thực trên thiết bị
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchHistory = (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    smartEquipApi
      .getRentalHistory(token)
      .then((res) => setRentals(res.data))
      .catch((err) => {
        if (!silent) setError(err.message || "Không thể tải lịch sử đơn thuê");
      })
      .finally(() => {
        if (!silent) setLoading(false);
        else setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchHistory(false);
    // Tự động load lại sau mỗi 10 giây theo yêu cầu
    const interval = setInterval(() => {
      fetchHistory(true);
    }, 10000);
    return () => clearInterval(interval);
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
    if (activeTab === "APPROVED") {
      return s === "APPROVED";
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

  // Xử lý Thanh toán VietQR MB Bank (UC_R09 - Không cần tiền cọc)
  const handlePayConfirm = async (receiptImage?: string) => {
    if (!payingRental) return;
    setPayingRentalId(payingRental._id);
    setError("");
    setNotice("");
    try {
      const res = await smartEquipApi.payRental(token, payingRental._id, {
        paymentMethod: "bank_transfer",
        receiptImage,
      });
      setNotice(res.message || "Thanh toán chuyển khoản VietQR MB Bank thành công! Đơn thuê đã sẵn sàng bàn giao.");
      setPayingRental(null);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xác nhận thanh toán");
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
    if (!cancellingRentalId) return;
    const finalReason = cancelReason.trim() || "Khách thay đổi kế hoạch";
    setIsCancelling(true);
    setError("");
    try {
      const res = await smartEquipApi.cancelRental(token, cancellingRentalId, {
        reason: finalReason,
      });
      setNotice(res.message || "Hủy đơn thuê thành công.");
      setCancellingRentalId(null);
      setCancelReason("");
      fetchHistory();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : (err?.message || "Không thể hủy đơn thuê"));
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    const s = status.toUpperCase();
    if (s === "PAYMENT_PENDING" || paymentStatus === "pending_confirmation") {
      return {
        label: "⏳ Đã chuyển khoản • Chờ Quản lý duyệt",
        className: "bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold",
      };
    }
    switch (s) {
      case "PENDING":
      case "CONTRACT_PENDING":
        return {
          label: "⏳ Đang chờ Chủ máy & Quản lý duyệt",
          className: "bg-amber-500/15 text-amber-300 border-amber-500/40",
        };
      case "APPROVED":
        return {
          label: "✅ Đã duyệt đơn • Chờ Ký & Thanh toán",
          className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold",
        };
      case "CONTRACT_SIGNED":
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Quản Lý Đơn Thuê Của Bạn
              </h1>
              <div className="flex items-center gap-2">
                {/* Nút load lại thủ công */}
                <button
                  type="button"
                  onClick={() => fetchHistory(false)}
                  disabled={loading || isRefreshing}
                  className="px-3 py-1.5 bg-[#162032] hover:bg-[#1f2d46] border border-[#263753] hover:border-sky-500/50 text-sky-300 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Nhấp để tải lại trang lịch sử thuê ngay lập tức"
                >
                  <span className={loading || isRefreshing ? "animate-spin inline-block" : ""}>🔄</span>
                  <span>{loading || isRefreshing ? "Đang tải..." : "Tải lại"}</span>
                </button>

                {/* Nút xóa lịch sử */}
                <button
                  type="button"
                  onClick={handleResetHistory}
                  disabled={resettingHistory}
                  className="px-3 py-1.5 bg-[#1e1724] hover:bg-rose-950/40 border border-rose-800/40 hover:border-rose-600/60 text-rose-300 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Xóa toàn bộ các đơn thuê đã tạo"
                >
                  <span>🗑️</span>
                  <span>{resettingHistory ? "Đang xóa..." : "Xóa lịch sử"}</span>
                </button>
              </div>
            </div>
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
              const statusBadge = getStatusBadge(r.status, r.payment?.paymentStatus);
              const upperStatus = r.status.toUpperCase();

              const isWaitingPaymentApproval = upperStatus === "PAYMENT_PENDING" || r.payment?.paymentStatus === "pending_confirmation";
              const isPendingApproval = upperStatus === "PENDING" || upperStatus === "CONTRACT_PENDING" || upperStatus === "PENDING_MODERATOR";
              const isApproved = upperStatus === "APPROVED";
              const isPaidConfirmed =
                r.payment?.isPaid === true ||
                r.payment?.paymentStatus === "paid" ||
                upperStatus === "PAID" ||
                upperStatus === "CONFIRMED" ||
                upperStatus === "ACTIVE" ||
                upperStatus === "IN_PROGRESS";
              const isReturned =
                upperStatus === "RETURNED" ||
                upperStatus === "RETURN_REQUESTED" ||
                Boolean(r.returnInfo?.requestedAt);
              const isCompleted = upperStatus === "COMPLETED";

              const canSign = isApproved; // Chỉ ký khi đơn đã được duyệt!
              const canPay = upperStatus === "CONTRACT_SIGNED" && !isWaitingPaymentApproval;
              const canReturn =
                upperStatus === "PAID" ||
                upperStatus === "ACTIVE" ||
                upperStatus === "CONFIRMED" ||
                upperStatus === "IN_PROGRESS";

              // Tính toán thời gian hạn chót trả máy và đếm ngược thời gian thực trên thiết bị (Yêu cầu 2)
              const returnDeadline = getReturnDeadlineDate(r.endDate, r.returnTime || "17:00");
              const diffMs = returnDeadline ? returnDeadline.getTime() - currentTime : null;
              // Thông báo hiển thị khi đơn đang trong quá trình thuê (đã thanh toán / đang thuê, chưa trả máy) và còn <= 24h hoặc đã quá hạn
              const isNearReturnDeadline =
                (canReturn || isPaidConfirmed) &&
                !isReturned &&
                !isCompleted &&
                diffMs !== null &&
                diffMs <= 24 * 60 * 60 * 1000;
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
                            ✓ Đã ký HĐ: {r.contract.renterSignature && !r.contract.renterSignature.startsWith("data:image") ? r.contract.renterSignature : "Người thuê"}
                          </span>
                        )}
                        {r.payment?.isPaid && (
                          <span className="text-blue-400">
                            ✓ Đã thanh toán ({r.payment.paymentMethod || "VietQR"})
                          </span>
                        )}
                        {r.deliveryTime && (
                          <span className="text-cyan-400">
                            🚚 Nhận: {r.deliveryTime} ➔ Trả: {r.returnTime || "17:00"} {r.shippingFee ? `• Phí ship: ${r.shippingFee.toLocaleString("vi-VN")} đ` : ""}
                          </span>
                        )}
                        {isReturned ? (
                          <span className="text-purple-300 font-semibold">
                            🚚 Dự kiến shipper đến lấy: {formatEstimatedReturnPickup(r.endDate, r.returnMethod || "motorcycle", r.returnTime || "17:00")}
                          </span>
                        ) : r.startDate && r.deliveryMethod ? (
                          <span className="text-amber-300/90 font-medium">
                            🚚 Dự kiến giao: {formatEstimatedDeliveryDate(r.startDate, r.deliveryMethod, r.deliveryTime)}
                          </span>
                        ) : null}
                        {r.payment?.receiptImage && (
                          <span className="text-amber-300 font-semibold">
                            📸 Đã gửi ảnh bill CK
                          </span>
                        )}
                      </div>

                      {/* Thông báo trạng thái phê duyệt */}
                      {isPendingApproval && (
                        <div className="mt-2.5 p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                          <span className="text-base shrink-0">⏳</span>
                          <div>
                            <b>Đang chờ Chủ máy & Quản lý duyệt:</b> Đơn thuê đã được gửi đến Chủ máy để kiểm tra thiết bị và lập hợp đồng gửi Quản lý duyệt. Sau khi hai bên duyệt xong, nút <b>"✍️ Ký hợp đồng & Thanh toán"</b> sẽ xuất hiện tại đây.
                          </div>
                        </div>
                      )}
                      {isApproved && (
                        <div className="mt-2.5 p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2 shadow-sm">
                          <span className="text-base shrink-0">🎉</span>
                          <div>
                            <b>Đơn thuê đã được phê duyệt!</b> Vui lòng bấm vào nút <b>"Ký hợp đồng & Thanh toán"</b> bên dưới để hoàn tất nhận máy.
                          </div>
                        </div>
                      )}

                      {/* Yêu cầu 2: Thông báo trước 1 ngày khi gần đến hạn trả & đếm ngược thời gian thực trên thiết bị */}
                      {isNearReturnDeadline && diffMs !== null && (
                        <div className="mt-3">
                          {diffMs > 0 ? (
                            <div className="p-3.5 bg-gradient-to-r from-amber-950/80 via-orange-950/70 to-amber-950/80 border-2 border-amber-500/60 rounded-xl text-xs text-amber-200 shadow-xl">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl shrink-0 animate-bounce">⏰</span>
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <strong className="text-amber-300 font-extrabold uppercase tracking-wider text-xs flex items-center gap-1.5">
                                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                                      THÔNG BÁO SẮP ĐẾN HẠN TRẢ THIẾT BỊ:
                                    </strong>
                                    <div className="bg-[#0c1322] border border-amber-500/60 px-3 py-1 rounded-lg shadow-inner">
                                      <span className="text-[11px] text-slate-400 mr-1.5">Đếm ngược:</span>
                                      <span className="text-amber-300 font-mono font-extrabold text-sm tracking-wide">
                                        ⏱️ {formatCountdownRemaining(diffMs)}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-slate-200 text-xs leading-relaxed">
                                    Quý khách còn <strong className="text-amber-300 font-mono font-bold">{formatCountdownRemaining(diffMs)}</strong> để hoàn trả thiết bị.
                                    Hạn chót: <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">{r.returnTime || "17:00"} ngày {new Date(r.endDate).toLocaleDateString("vi-VN")}</strong>.
                                  </p>
                                  <p className="text-[11px] text-amber-300/90 italic">
                                    💡 Vui lòng kiểm tra đầy đủ linh phụ kiện và bấm nút <strong className="text-indigo-300">"📦 Báo trả đồ"</strong> ở góc phải trước giờ hẹn để Shipper đến lấy đúng hạn.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 bg-gradient-to-r from-rose-950/90 via-red-950/80 to-rose-950/90 border-2 border-rose-500/70 rounded-xl text-xs text-rose-200 shadow-xl">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl shrink-0 animate-pulse">🚨</span>
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <strong className="text-rose-300 font-extrabold uppercase tracking-wider text-xs flex items-center gap-1.5">
                                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                                      CẢNH BÁO: ĐÃ QUÁ HẠN HOÀN TRẢ THIẾT BỊ!
                                    </strong>
                                    <div className="bg-[#0c1322] border border-rose-500/60 px-3 py-1 rounded-lg">
                                      <span className="text-[11px] text-rose-400 mr-1.5">Quá hạn:</span>
                                      <span className="text-rose-300 font-mono font-extrabold text-sm tracking-wide">
                                        ⚠️ {formatCountdownRemaining(Math.abs(diffMs))}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-slate-200 text-xs leading-relaxed">
                                    Đơn thuê đã quá hạn hoàn trả từ <strong className="text-rose-300 font-mono">{r.returnTime || "17:00"} ngày {new Date(r.endDate).toLocaleDateString("vi-VN")}</strong>.
                                  </p>
                                  <p className="text-[11px] text-rose-300 italic">
                                    ⚠️ Quý khách vui lòng bấm ngay nút <strong>"📦 Báo trả đồ"</strong> bên phải hoặc liên hệ Chủ máy để tiến hành thu hồi thiết bị.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Yêu cầu 3: Khi đã báo trả hàng (isReturned) -> Hiển thị thông tin Thu hồi & Ngày giờ dự kiến shipper đến lấy */}
                      {isReturned ? (
                        <div className="mt-3">
                          {r.returnMethod === "pickup" ? (
                            <div className="p-3.5 bg-purple-950/60 border border-purple-500/50 rounded-xl text-xs text-purple-200 flex items-start gap-3 shadow-sm">
                              <span className="text-2xl shrink-0">🏪</span>
                              <div className="space-y-1.5 flex-1">
                                <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                                  <span>Thông tin hoàn trả máy tại Cửa hàng / Kho:</span>
                                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/40 font-semibold">
                                    ✓ Đã tiếp nhận yêu cầu trả đồ
                                  </span>
                                </div>
                                <div className="bg-[#0b1728] p-2.5 rounded-lg border border-[#1b2f4c] space-y-1">
                                  <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                                    <span className="text-slate-400">📅 Ngày gửi yêu cầu trả:</span>
                                    <span className="text-slate-300 font-medium">
                                      {new Date(r.returnInfo?.requestedAt || r.updatedAt || Date.now()).toLocaleDateString("vi-VN")}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between flex-wrap gap-1 pt-1 border-t border-[#1b2f4c]">
                                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                                      <span>⏰</span>
                                      <span>Hạn chót mang trả tại Hub:</span>
                                    </span>
                                    <strong className="text-amber-300 text-xs font-bold">
                                      {r.returnTime || "17:00"} • Ngày {new Date(r.endDate).toLocaleDateString("vi-VN")}
                                    </strong>
                                  </div>
                                </div>
                                <div className="text-slate-200 bg-[#0c1624] p-2 rounded-lg border border-[#1c2c44]">
                                  <span className="text-slate-400">Địa điểm Hub nhận trả máy:</span>{" "}
                                  <strong className="text-amber-300 text-xs">
                                    {r.equipment?.location?.address || "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"}
                                  </strong>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                                  <span>Chủ máy: <strong className="text-slate-200">{typeof r.owner === "object" ? r.owner?.name : "Nguyễn Văn Owner"}</strong></span>
                                  <span>Điện thoại: <strong className="text-orange-400 font-mono">{typeof r.owner === "object" && r.owner?.phone ? r.owner.phone : "0909123456"}</strong></span>
                                </div>
                                {r.returnInfo?.returnNote && (
                                  <div className="text-[11px] text-slate-300 bg-[#0e1626] p-2 rounded border border-slate-700/50 mt-1">
                                    <span className="text-slate-400">Ghi chú trả máy:</span> "{r.returnInfo.returnNote}"
                                    {r.returnInfo?.returnCondition ? ` • Tình trạng máy: ${r.returnInfo.returnCondition}` : ""}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 bg-purple-950/60 border border-purple-500/50 rounded-xl text-xs text-purple-200 flex items-start gap-3 shadow-sm">
                              <span className="text-2xl shrink-0">🚚</span>
                              <div className="space-y-1.5 flex-1">
                                <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                                  <span>Thông tin thu hồi & Hoàn trả máy:</span>
                                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/40 font-semibold">
                                    ✓ Đã tiếp nhận yêu cầu trả đồ
                                  </span>
                                </div>
                                <div className="bg-[#0b1728] p-2.5 rounded-lg border border-[#1b2f4c] space-y-1">
                                  <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                                    <span className="text-slate-400">📅 Ngày gửi yêu cầu trả:</span>
                                    <span className="text-slate-300 font-medium">
                                      {new Date(r.returnInfo?.requestedAt || r.updatedAt || Date.now()).toLocaleDateString("vi-VN")}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between flex-wrap gap-1 pt-1 border-t border-[#1b2f4c]">
                                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                                      <span>🚚</span>
                                      <span>Ngày giờ dự kiến shipper đến lấy:</span>
                                    </span>
                                    <strong className="text-amber-300 text-xs font-bold">
                                      {formatEstimatedReturnPickup(r.endDate, r.returnMethod || "motorcycle", r.returnTime || "17:00")}
                                    </strong>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-400">Địa chỉ shipper đến lấy máy:</span>{" "}
                                  <strong className="text-slate-200">
                                    {r.returnInfo?.returnLocation || r.deliveryAddress || "Địa chỉ theo đơn đặt thuê"}
                                  </strong>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                                  <span>Hình thức: <strong className="text-cyan-300">{getReturnOption(r.returnMethod || "motorcycle").label}</strong></span>
                                  <span>Trạng thái: <strong className="text-emerald-400">✓ Đang điều phối shipper đến kiểm tra & thu hồi máy</strong></span>
                                </div>
                                {r.returnInfo?.returnNote && (
                                  <div className="text-[11px] text-slate-300 bg-[#0e1626] p-2 rounded border border-slate-700/50 mt-1">
                                    <span className="text-slate-400">Ghi chú trả máy:</span> "{r.returnInfo.returnNote}"
                                    {r.returnInfo?.returnCondition ? ` • Tình trạng máy: ${r.returnInfo.returnCondition}` : ""}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : isPaidConfirmed ? (
                        /* Khi chưa báo trả đồ nhưng đã thanh toán -> Hiện thông tin giao máy ban đầu */
                        <div className="mt-3">
                          {r.deliveryMethod === "pickup" ? (
                            <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-start gap-3 shadow-sm">
                              <span className="text-2xl shrink-0">📍</span>
                              <div className="space-y-1.5 flex-1">
                                <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                                  <span>Địa chỉ đến nhận máy (Nhận tận nơi):</span>
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-semibold">
                                    ✓ Đã xác nhận thanh toán
                                  </span>
                                </div>
                                <div className="text-slate-200 bg-[#0c1624] p-2 rounded-lg border border-[#1c2c44]">
                                  <span className="text-slate-400">Địa điểm nhận:</span>{" "}
                                  <strong className="text-amber-300 text-xs">
                                    {r.equipment?.location?.address || "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"}
                                  </strong>
                                </div>
                                <div className="text-emerald-300">
                                  <b>Thời gian hẹn nhận máy:</b>{" "}
                                  <strong className="text-white">
                                    {r.deliveryTime || "09:00"} • Ngày {new Date(r.startDate).toLocaleDateString("vi-VN")}
                                  </strong>
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Chủ máy: <strong className="text-slate-200">{typeof r.owner === "object" ? r.owner?.name : "Nguyễn Văn Owner"}</strong>
                                  {" "}• Điện thoại liên hệ: <strong className="text-orange-400 font-mono">{typeof r.owner === "object" && r.owner?.phone ? r.owner.phone : "0909123456"}</strong>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 bg-sky-950/50 border border-sky-500/50 rounded-xl text-xs text-sky-200 flex items-start gap-3 shadow-sm">
                              <span className="text-2xl shrink-0">🚚</span>
                              <div className="space-y-1.5 flex-1">
                                <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                                  <span>Thông tin vận chuyển (Giao hàng tận nơi):</span>
                                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/40 font-semibold">
                                    ✓ Đã xác nhận thanh toán
                                  </span>
                                </div>
                                <div className="bg-[#0b1728] p-2.5 rounded-lg border border-[#1b2f4c] space-y-1">
                                  <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                                    <span className="text-slate-400">📅 Ngày đặt đơn:</span>
                                    <span className="text-slate-300 font-medium">
                                      {new Date(r.createdAt || r.startDate).toLocaleDateString("vi-VN")}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between flex-wrap gap-1 pt-1 border-t border-[#1b2f4c]">
                                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                                      <span>🚚</span>
                                      <span>Ngày giờ dự kiến giao tới nơi:</span>
                                    </span>
                                    <strong className="text-amber-300 text-xs font-bold">
                                      {formatEstimatedDeliveryDate(r.startDate, r.deliveryMethod || "motorcycle", r.deliveryTime || "09:00")}
                                    </strong>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-400">Địa chỉ nhận hàng:</span>{" "}
                                  <strong className="text-slate-200">
                                    {r.deliveryAddress || "Địa chỉ theo đơn đặt thuê"}
                                  </strong>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                                  <span>Hình thức: <strong className="text-cyan-300">{getDeliveryOption(r.deliveryMethod || "motorcycle").label}</strong></span>
                                  <span>Trạng thái: <strong className="text-emerald-400">✓ Đang chuẩn bị bàn giao cho shipper</strong></span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Middle: Amount breakdown */}
                  <div className="bg-[#0f1624] p-3.5 rounded-xl border border-[#1e2a40] flex lg:flex-col justify-between items-end gap-1 min-w-[190px]">
                    <span className="text-xs text-slate-400">Tổng thanh toán:</span>
                    <span className="text-lg font-extrabold text-orange-400">
                      {r.rentalFee.toLocaleString("vi-VN")} đ
                    </span>
                    <div className="text-[11px] text-slate-400 text-right space-y-0.5">
                      <div>Tiền thuê: {r.rentalFee.toLocaleString("vi-VN")} đ</div>
                      <div className="text-emerald-400 font-semibold">Tiền cọc: 0 đ (Miễn cọc)</div>
                      {r.discountAmount ? (
                        <div className="text-emerald-400 font-semibold">
                          Giảm giá: -{r.discountAmount.toLocaleString("vi-VN")} đ
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch min-w-[160px]">


                    {/* Nút ký hợp đồng (UC_R08) khi đã được duyệt */}
                    {canSign && (
                      <button
                        onClick={() => setSigningRental(r)}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 text-center flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <span>✍️</span>
                        <span>Ký hợp đồng & Thanh toán</span>
                      </button>
                    )}

                    {/* Nút thanh toán (UC_R09) */}
                    {canPay && (
                      <button
                        onClick={() => setPayingRental(r)}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center flex items-center justify-center gap-1.5"
                      >
                        <span>💳</span>
                        <span>Thanh toán VietQR</span>
                      </button>
                    )}

                    {/* Trạng thái chờ Moderator duyệt chuyển khoản */}
                    {isWaitingPaymentApproval && (
                      <div className="px-3.5 py-2.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 rounded-xl text-xs text-center font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                        <span>⏳</span>
                        <span>Chờ Quản lý duyệt chuyển khoản</span>
                      </div>
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

                    {/* Nút xem & tải Hợp đồng PDF */}
                    {(() => {
                      const isOfficial = Boolean(
                        r.contract?.renterSignature ||
                        r.contract?.termsAccepted ||
                        r.contract?.signedAt ||
                        r.payment?.isPaid ||
                        r.payment?.paymentStatus === "paid" ||
                        r.status === "CONTRACT_SIGNED" ||
                        r.status === "PAID" ||
                        r.status === "ACTIVE" ||
                        r.status === "confirmed" ||
                        r.status === "COMPLETED"
                      );
                      return (
                        <button
                          onClick={() => setViewingContractRental(r)}
                          className={`px-3 py-2 border font-semibold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5 shadow-sm ${
                            isOfficial
                              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50"
                              : "bg-[#1b2537] hover:bg-[#25334a] border-[#2b3c54] text-orange-400 hover:text-orange-300"
                          }`}
                          title={isOfficial ? "Mở xem Hợp đồng chính thức" : "Mở xem Hợp đồng mẫu (Dự thảo)"}
                        >
                          <span>{isOfficial ? "📜" : "📄"}</span>
                          <span>{isOfficial ? "HĐ Chính thức (PDF)" : "HĐ Mẫu (PDF)"}</span>
                        </button>
                      );
                    })()}

                    {/* Nút hủy yêu cầu (UC_R13) */}
                    {canCancel && (
                      <button
                        onClick={() => { setCancellingRentalId(r._id); setError(""); setCancelReason("Thay đổi kế hoạch"); }}
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

      {/* Modal Thanh toán VietQR MB Bank */}
      {payingRental && (
        <VietQRPaymentModal
          isOpen={!!payingRental}
          onClose={() => setPayingRental(null)}
          onConfirmPayment={(receiptImg) => handlePayConfirm(receiptImg)}
          amount={payingRental.totalAmount || payingRental.rentalFee}
          rentalCode={payingRental.rentalCode}
          contractCode={payingRental.contract?.contractNumber}
          equipmentTitle={payingRental.equipment?.title}
          loading={payingRentalId === payingRental._id}
        />
      )}

      {/* Modal Ký hợp đồng điện tử (UC_R08) */}
      {signingRental && (
        <ContractConfirmationModal
          rental={signingRental}
          token={token}
          isOpen={Boolean(signingRental)}
          onClose={() => setSigningRental(null)}
          onSuccess={() => {
            setSigningRental(null);
            setNotice("Ký hợp đồng & gửi thông tin chuyển khoản VietQR thành công! Vui lòng chờ Quản lý web (Moderator) xác nhận.");
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

            {/* Modal Xem & Tải Hợp Đồng PDF */}
      {viewingContractRental && (
        <ContractPdfModal
          rental={viewingContractRental}
          isOpen={Boolean(viewingContractRental)}
          onClose={() => setViewingContractRental(null)}
        />
      )}

      {/* Modal Hủy yêu cầu (UC_R13) */}
      {cancellingRentalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#263550] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#212c42]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-rose-400">🗑️</span> Xác Nhận Hủy Đơn Thuê
              </h3>
              <button
                type="button"
                onClick={() => setCancellingRentalId(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Vui lòng chọn hoặc nhập lý do bạn muốn hủy đơn thuê này. Nếu bạn đã thanh toán, hệ thống sẽ tự động chuyển trạng thái hoàn tiền.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3.5 text-xs">
              {error && (
                <div className="p-3 bg-rose-950/70 border border-rose-500/60 rounded-xl text-xs text-rose-200 font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Gợi ý lý do nhanh (Quick Reason Chips) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Lý do thường gặp (Bấm để chọn nhanh):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Thay đổi kế hoạch",
                    "Đổi ngày thuê khác",
                    "Tìm được thiết bị phù hợp hơn",
                    "Lý do cá nhân",
                    "Chưa sắp xếp được thời gian",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setCancelReason(chip)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                        cancelReason === chip
                          ? "bg-rose-600/30 border-rose-500 text-rose-200"
                          : "bg-[#1b273d] border-[#2b3a56] text-slate-300 hover:border-slate-400 hover:text-white"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Chi tiết lý do:
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập lý do hủy (hoặc chọn các lý do nhanh ở trên)..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                <button
                  type="button"
                  onClick={() => setCancellingRentalId(null)}
                  disabled={isCancelling}
                  className="px-4 py-2 bg-[#1c2436] hover:bg-[#253248] text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {isCancelling ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang hủy...</span>
                    </>
                  ) : (
                    <span>Xác nhận hủy đơn</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
