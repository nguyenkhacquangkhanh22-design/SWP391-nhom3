import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../app/AuthProvider";
import { getSocket } from "../services/socket";
import Navbar from "../components/Navbar";
import SignaturePad from "../components/SignaturePad";
import ContractConfirmationModal from "../components/ContractConfirmationModal";
import ContractPdfModal from "../components/ContractPdfModal";
import RentalChatModal from "../components/RentalChatModal";
import PaymentButton from "../components/PaymentButton";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Rental } from "../types/smartequip";
import { ownerApi } from "../services/ownerApi";
import type { RentalContract, SupportTicket } from "../types/owner";
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
  const [complaints, setComplaints] = useState<SupportTicket[]>([]);
  const [signingMarketplaceContract, setSigningMarketplaceContract] = useState<RentalContract | null>(null);
  const [marketplaceSignature, setMarketplaceSignature] = useState("");
  const [marketplaceSignaturePad, setMarketplaceSignaturePad] = useState<string | null>(null);
  const [marketplaceTermsAccepted, setMarketplaceTermsAccepted] = useState(false);
  const [isSigningMarketplaceContract, setIsSigningMarketplaceContract] = useState(false);
  const [confirmingReceiptContract, setConfirmingReceiptContract] = useState<RentalContract | null>(null);
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
  const [chatRental, setChatRental] = useState<Rental | null>(null);

  // Modal trả thiết bị (UC_R10: hẹn giờ, địa điểm, tình trạng)
  const [returningRentalId, setReturningRentalId] = useState<string | null>(null);
  const [returnCondition, setReturnCondition] = useState(
    "Thiết bị nguyên vẹn, hoạt động bình thường, đầy đủ phụ kiện."
  );
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
  const [complaintTarget, setComplaintTarget] = useState<{ type: "rental" | "contract"; id: string } | null>(null);
  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintMessage, setComplaintMessage] = useState("");
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  // Modal hủy đơn & Hoàn tiền (UC_R13)
  const [cancellingRental, setCancellingRental] = useState<Rental | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [refundBankName, setRefundBankName] = useState("");
  const [refundAccountNumber, setRefundAccountNumber] = useState("");
  const [refundAccountName, setRefundAccountName] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Modal gia hạn thuê (UC_R10_EXT)
  const [extendingRental, setExtendingRental] = useState<Rental | null>(null);
  const [extraDays, setExtraDays] = useState(1);
  const [extensionNote, setExtensionNote] = useState("");
  const [isExtending, setIsExtending] = useState(false);

  // Modal Handover Check-in (Lưu ảnh ngoại quan ban đầu khi nhận máy)
  const [checkinRental, setCheckinRental] = useState<Rental | null>(null);
  const [checkinImages, setCheckinImages] = useState<string[]>([]);
  const [checkinNote, setCheckinNote] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Ảnh đính kèm khi đánh giá (Photo Reviews)
  const [reviewImages, setReviewImages] = useState<string[]>([]);

  // Modal In & Tải Hợp đồng / Biên lai PDF
  const [viewingReceiptRental, setViewingReceiptRental] = useState<Rental | null>(null);

  // Modal Xem tiến độ khiếu nại (Dispute Resolution Timeline)
  const [viewingDisputeRental, setViewingDisputeRental] = useState<Rental | null>(null);
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

    Promise.all([
      smartEquipApi.getRentalHistory(token),
      smartEquipApi.getMyComplaints(token).catch(() => ({ complaints: [] as SupportTicket[] })),
    ])
      .then(([historyRes, complaintData]) => {
        const list = historyRes.data || [];
        setRentals(list);
        setComplaints(complaintData.complaints || []);

        // Tự động đối soát và đồng bộ đơn hàng với cổng PayOS nếu có đơn đang ở trạng thái đã ký
        list.forEach((r) => {
          const upper = String(r.status).toUpperCase();
          if (upper === "CONTRACT_SIGNED" && r.payment?.orderCode) {
            axios
              .get(`/api/payments/verify/${r.payment.orderCode}`)
              .then((verifyRes) => {
                if (
                  verifyRes.data?.data?.status === "PAID" ||
                  verifyRes.data?.rentalStatus === "PAID"
                ) {
                  fetchHistory(true);
                }
              })
              .catch(() => {});
          }
        });
      })
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

    // Lắng nghe realtime từ Socket.IO khi có duyệt đơn hoặc xác nhận thanh toán
    const socket = getSocket();
    const handleRentalUpdate = () => {
      fetchHistory(true);
    };

    socket.on("rental:approved", handleRentalUpdate);
    socket.on("rental:agreed", handleRentalUpdate);
    socket.on("payment:approved", handleRentalUpdate);

    // Tự động load lại sau mỗi 10 giây theo yêu cầu
    const interval = setInterval(() => {
      fetchHistory(true);
    }, 10000);

    return () => {
      socket.off("rental:approved", handleRentalUpdate);
      socket.off("rental:agreed", handleRentalUpdate);
      socket.off("payment:approved", handleRentalUpdate);
      clearInterval(interval);
    };
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
      return s === "PENDING" || s === "APPROVED" || s === "CONTRACT_PENDING";
    }
    if (activeTab === "APPROVED") {
      return s === "APPROVED";
    }
    if (activeTab === "CONTRACT_SIGNED") {
      return (
        s === "CONTRACT_SIGNED" ||
        s === "PAYMENT_PENDING" ||
        s === "PAYMENT_VERIFYING" ||
        s === "PAYMENT_REJECTED"
      );
    }
    if (activeTab === "ACTIVE") {
      return s === "PAID" || s === "ACTIVE" || s === "CONFIRMED" || s === "IN_PROGRESS";
    }
    if (activeTab === "RETURNED") {
      return s === "RETURNED" || s === "RETURN_REQUESTED" || s === "COMPLETED";
    }
    return true;
  });

  // Confirm receipt before the owner can request the moderator to release payment.
  const executeConfirmReceipt = async (contract: RentalContract) => {
    setConfirmingReceiptContract(null);
    setError("");
    setNotice("");
    try {
      const result = await ownerApi.confirmMyReceipt(token, contract._id);
      setNotice(result.message);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xác nhận đã nhận thiết bị");
    }
  };

  const handleSignMarketplaceContract = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signingMarketplaceContract || !marketplaceTermsAccepted || !marketplaceSignature.trim()) return;

    setIsSigningMarketplaceContract(true);
    setError("");
    setNotice("");
    try {
      const result = await ownerApi.signMyContract(
        token,
        signingMarketplaceContract._id,
        {
          signature_note: marketplaceSignature.trim(),
          signature_image: marketplaceSignaturePad || undefined,
          signature_data: marketplaceSignaturePad || marketplaceSignature.trim(),
          signer_name: marketplaceSignature.trim(),
          terms_accepted: marketplaceTermsAccepted,
        } as any,
      );
      setNotice(result.message);
      setSigningMarketplaceContract(null);
      setMarketplaceSignature("");
      setMarketplaceSignaturePad(null);
      setMarketplaceTermsAccepted(false);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể ký hợp đồng.");
    } finally {
      setIsSigningMarketplaceContract(false);
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

  // Gửi đánh giá sao & nhận xét & ảnh thực tế (UC_R11)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRentalId) return;
    setIsReviewing(true);
    setError("");
    try {
      const res = await smartEquipApi.reviewRental(token, reviewingRentalId, {
        rating,
        comment: reviewComment,
        reviewImages,
      });
      setNotice(res.message || "Gửi đánh giá thiết bị thành công!");
      setReviewingRentalId(null);
      setReviewComment("");
      setReviewImages([]);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi đánh giá");
    } finally {
      setIsReviewing(false);
    }
  };

  // Lưu ảnh ngoại quan ban đầu khi nhận máy (Handover Check-in)
  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinRental) return;
    if (checkinImages.length === 0) {
      setError("Vui lòng tải lên ít nhất 1 ảnh chụp ngoại quan máy.");
      return;
    }
    setIsCheckingIn(true);
    setError("");
    try {
      const res = await smartEquipApi.submitHandoverCheckin(token, checkinRental._id, {
        images: checkinImages,
        note: checkinNote,
      });
      setNotice(res.message || "Đã lưu ảnh ngoại quan khi nhận máy thành công!");
      setCheckinRental(null);
      setCheckinImages([]);
      setCheckinNote("");
      fetchHistory();
    } catch (err: any) {
      setError(err?.message || "Không thể lưu ảnh ngoại quan");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintTarget || !complaintSubject.trim() || !complaintMessage.trim()) return;
    setIsSubmittingComplaint(true);
    setError("");
    try {
      const res = await smartEquipApi.submitComplaint(token, {
        ...(complaintTarget.type === "rental"
          ? { rentalId: complaintTarget.id }
          : { contractId: complaintTarget.id }),
        subject: complaintSubject.trim(),
        message: complaintMessage.trim(),
      });
      setNotice(res.message || "Đã gửi khiếu nại đến Rental Moderator.");
      setComplaintTarget(null);
      setComplaintSubject("");
      setComplaintMessage("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi khiếu nại.");
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Hủy đơn thuê & Hoàn tiền (UC_R13)
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingRental) return;
    const finalReason = cancelReason.trim() || "Khách thay đổi kế hoạch";
    const isPaid =
      cancellingRental.payment?.isPaid === true ||
      cancellingRental.payment?.paymentStatus === "paid" ||
      String(cancellingRental.status).toUpperCase() === "PAID";

    if (isPaid && (!refundBankName.trim() || !refundAccountNumber.trim() || !refundAccountName.trim())) {
      setError("Vui lòng nhập đầy đủ thông tin Tên ngân hàng, Số tài khoản và Tên chủ tài khoản để nhận tiền hoàn.");
      return;
    }

    setIsCancelling(true);
    setError("");
    try {
      const res = await smartEquipApi.cancelRental(token, cancellingRental._id, {
        reason: finalReason,
        bankName: refundBankName.trim(),
        accountNumber: refundAccountNumber.trim(),
        accountName: refundAccountName.trim(),
      });
      setNotice(res.message || "Hủy đơn thuê thành công.");
      setCancellingRental(null);
      setCancelReason("");
      setRefundBankName("");
      setRefundAccountNumber("");
      setRefundAccountName("");
      fetchHistory(true);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : (err?.message || "Không thể hủy đơn thuê"));
    } finally {
      setIsCancelling(false);
    }
  };

  // Gia hạn thời gian thuê (UC_R10_EXT)
  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingRental) return;
    if (extraDays < 1) {
      setError("Số ngày gia hạn thêm phải từ 1 ngày trở lên.");
      return;
    }
    setIsExtending(true);
    setError("");
    try {
      const res = await smartEquipApi.extendRental(token, extendingRental._id, {
        extraDays,
        note: extensionNote.trim(),
      });
      setNotice(res.message || `Đã gửi yêu cầu gia hạn thêm ${extraDays} ngày tới Chủ máy! Vui lòng chờ Chủ máy duyệt để thanh toán phụ phí.`);
      setExtendingRental(null);
      setExtraDays(1);
      setExtensionNote("");
      fetchHistory(true);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : (err?.message || "Không thể gia hạn đơn thuê"));
    } finally {
      setIsExtending(false);
    }
  };

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    const s = status.toUpperCase();
    if (s === "CANCELLED" && paymentStatus === "refund_pending") {
      return {
        label: "Đã hủy • Đang xử lý hoàn tiền",
        className: "bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold",
      };
    }
    if (s === "PAYMENT_PENDING" || paymentStatus === "pending_confirmation") {
      return {
        label: "⏳ Đã chuyển khoản • Chờ Chủ máy xác nhận",
        className: "bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold",
      };
    }
    switch (s) {
      case "PENDING":
        return {
          label: "⏳ Đang chờ Chủ máy duyệt",
          className: "bg-amber-500/15 text-amber-300 border-amber-500/40",
        };
      case "APPROVED":
        return {
          label: "✅ Đã duyệt đơn • Chờ Ký & Thanh toán",
          className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold",
        };
      case "CONTRACT_SIGNED":
        return {
          label: "💳 Đã ký HĐ — Chờ thanh toán QR",
          className: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        };
      case "PAYMENT_VERIFYING":
        return {
          label: "🔍 Đã CK QR — Chờ Rental Moderator xác nhận",
          className: "bg-sky-500/10 text-sky-300 border-sky-500/30",
        };
      case "PAYMENT_REJECTED":
        return {
          label: "❌ Thanh toán QR bị từ chối (Cần gửi lại)",
          className: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        };
      case "PAID":
      case "CONFIRMED":
        return {
          label: "✅ Đã xác nhận thanh toán (Sẵn sàng nhận máy)",
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

      <main className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 py-8 w-full flex-1">
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
              Ký hợp đồng điện tử, quét mã QR thanh toán phí thuê (Rental Moderator xác nhận), theo dõi lịch trình và báo trả đồ
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
            <button onClick={() => setNotice("")} className="text-xs text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")} className="text-xs text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}



        {complaints.length > 0 && (
          <section className="mb-8 rounded-2xl border border-[#223049] bg-[#141d2d] p-5">
            <h2 className="mb-4 text-lg font-bold text-white">Khiếu nại và phản hồi từ Rental Moderator</h2>
            <div className="space-y-4">
              {complaints.map((complaint) => (
                <article key={complaint._id} className="rounded-xl border border-[#273650] bg-[#0f1624] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-white">{complaint.subject}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      complaint.status === "resolved"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-amber-500/10 text-amber-300"
                    }`}>
                      {complaint.status === "resolved"
                        ? "Đã giải quyết"
                        : complaint.status === "in_progress"
                          ? "Đang xử lý"
                          : complaint.status === "closed"
                            ? "Đã đóng"
                            : "Chờ tiếp nhận"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Mã {complaint.ticket_code} · {new Date(complaint.createdAt).toLocaleString("vi-VN")}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{complaint.message}</p>
                  {complaint.replies?.map((reply, index) => (
                    <div key={`${complaint._id}-${index}`} className="mt-3 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                      <p className="text-xs font-semibold text-sky-300">
                        {reply.sender_name} · {new Date(reply.created_at).toLocaleString("vi-VN")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{reply.message}</p>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        )}

        {signingMarketplaceContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <form
              onSubmit={(event) => void handleSignMarketplaceContract(event)}
              className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[#263550] bg-[#141d2d] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[#263550] pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Ký hợp đồng thuê</h2>
                  <p className="text-xs text-orange-300">{signingMarketplaceContract.contract_code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSigningMarketplaceContract(null)}
                  className="text-slate-400 hover:text-white"
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>
              <div className="mb-4 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#263550] bg-[#0f1624] p-4 text-sm text-slate-300">
                {signingMarketplaceContract.terms_content}
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-bold text-slate-200">
                  ✍️ Vẽ chữ ký điện tử của Bạn (Vẽ bằng chuột hoặc chạm tay):
                </label>
                <SignaturePad
                  width={560}
                  height={130}
                  onChange={(dataUrl) => setMarketplaceSignaturePad(dataUrl)}
                />
              </div>

              <label className="mb-3 flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={marketplaceTermsAccepted}
                  onChange={(event) => setMarketplaceTermsAccepted(event.target.checked)}
                  required
                />
                Tôi đã đọc và đồng ý với toàn bộ điều khoản của hợp đồng.
              </label>
              <label className="mb-4 grid gap-1.5 text-xs text-slate-300">
                Họ và tên người ký xác nhận:
                <input
                  className="w-full bg-[#172236] border border-[#293954] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 font-semibold"
                  value={marketplaceSignature}
                  onChange={(event) => setMarketplaceSignature(event.target.value)}
                  required
                  placeholder={user?.name || "Họ và tên"}
                  autoComplete="name"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSigningMarketplaceContract(null)}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSigningMarketplaceContract || !marketplaceTermsAccepted || !marketplaceSignature.trim()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {isSigningMarketplaceContract ? "Đang ký..." : "Xác nhận ký"}
                </button>
              </div>
            </form>
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
              const isPaymentVerifying = upperStatus === "PAYMENT_VERIFYING" || r.payment?.paymentStatus === "verifying";
              const isPendingApproval = upperStatus === "PENDING" || upperStatus === "CONTRACT_PENDING" || upperStatus === "PENDING_MODERATOR";
              const isApproved = upperStatus === "APPROVED";
              const isReturned =
                upperStatus === "RETURNED" ||
                upperStatus === "RETURN_REQUESTED" ||
                upperStatus === "RETURN_PENDING" ||
                Boolean(r.returnInfo?.requestedAt) ||
                Boolean(r.returnRequest?.requestedAt);
              const isCompleted = upperStatus === "COMPLETED";
              const isPaidConfirmed =
                !isReturned &&
                !isCompleted &&
                (r.payment?.isPaid === true ||
                  r.payment?.paymentStatus === "paid" ||
                  upperStatus === "PAID" ||
                  upperStatus === "CONFIRMED" ||
                  upperStatus === "ACTIVE" ||
                  upperStatus === "IN_PROGRESS");

              const hasAgreedToSign = Boolean(
                r.contract?.agreedToSign ||
                r.contract?.termsAccepted ||
                r.contract?.signedAt ||
                upperStatus === "CONTRACT_SIGNED"
              );
              // Phải đồng ý ký HĐ trong chat trước, sau đó mới hiện Ký hợp đồng & Thanh toán
              const canSign = isApproved && hasAgreedToSign && !isPaidConfirmed && !r.contract?.termsAccepted;
              const canPay = (upperStatus === "CONTRACT_SIGNED" || upperStatus === "PAYMENT_REJECTED") && !isWaitingPaymentApproval && !isPaymentVerifying;
              const canReturn =
                upperStatus === "PAID" ||
                upperStatus === "ACTIVE" ||
                upperStatus === "CONFIRMED" ||
                upperStatus === "IN_PROGRESS";

              // Tính toán thời gian hạn chót trả máy và đếm ngược thời gian thực trên thiết bị (Yêu cầu 2)
              const returnDeadline = getReturnDeadlineDate(r.endDate, r.returnTime || "17:00");
              const diffMs = returnDeadline ? returnDeadline.getTime() - currentTime : null;
              // Thông báo hiển thị khi đơn đang trong quá trình thuê (đã thanh toán / đang thuê, chưa trả máy) và bước vào 3 ngày cuối hoặc đã quá hạn
              const isNearReturnDeadline =
                (canReturn || isPaidConfirmed) &&
                !isReturned &&
                !isCompleted &&
                diffMs !== null &&
                diffMs <= 3 * 24 * 60 * 60 * 1000;
              const canReview =
                (upperStatus === "RETURNED" ||
                  upperStatus === "RETURN_REQUESTED" ||
                  upperStatus === "COMPLETED") &&
                !r.review?.rating;
              const hasComplaint = complaints.some((complaint) =>
                typeof complaint.rental === "object"
                  ? complaint.rental?._id === r._id
                  : complaint.rental === r._id,
              );
              const canDispute = upperStatus === "COMPLETED" && !hasComplaint;
              const canCancel =
                (upperStatus === "PENDING" ||
                  upperStatus === "CONTRACT_PENDING" ||
                  upperStatus === "CONTRACT_SIGNED" ||
                  upperStatus === "PAYMENT_PENDING" ||
                  upperStatus === "PAYMENT_REJECTED" ||
                  upperStatus === "APPROVED" ||
                  upperStatus === "PAID") &&
                !isReturned &&
                !isCompleted;

              const hasPendingExtension = r.extensionRequest?.status === "PENDING_OWNER";
              const hasApprovedExtension = r.extensionRequest?.status === "APPROVED";

              const canExtend =
                (upperStatus === "PAID" ||
                  upperStatus === "ACTIVE" ||
                  upperStatus === "CONFIRMED" ||
                  upperStatus === "IN_PROGRESS") &&
                !isReturned &&
                !isCompleted &&
                !hasPendingExtension &&
                !hasApprovedExtension;

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
                        {isPaymentVerifying && (
                          <span className="text-sky-300">
                            ⏳ Đã gửi CK QR ({r.payment?.transactionId || "Chờ đối chiếu"})
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
                      {isApproved && !hasAgreedToSign && (
                        <div className="mt-2.5 p-2.5 bg-blue-950/40 border border-blue-500/40 rounded-xl text-xs text-blue-300 flex items-start gap-2 shadow-sm">
                          <span className="text-base shrink-0">💬</span>
                          <div>
                            <b>Đơn thuê đã được duyệt:</b> Vui lòng bấm nút <b>"💬 Vào chat Đồng ý ký HĐ"</b> (hoặc <b>"💬 Nhắn tin với Chủ máy"</b>) bên dưới để xem hợp đồng và bấm <b>"Đồng ý ký hợp đồng"</b> trong đoạn chat. Sau đó nút <b>"✍️ Ký hợp đồng & Thanh toán"</b> mới hiển thị.
                          </div>
                        </div>
                      )}
                      {isApproved && hasAgreedToSign && (
                        <div className="mt-2.5 p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2 shadow-sm">
                          <span className="text-base shrink-0">🎉</span>
                          <div>
                            <b>Hai bên đã thống nhất thỏa thuận trong chat!</b> Vui lòng bấm vào nút <b>"✍️ Ký hợp đồng & Thanh toán"</b> bên dưới để ký hợp đồng và chuyển khoản nhận máy.
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
                                      {diffMs > 24 * 60 * 60 * 1000 ? "THÔNG BÁO: ĐƠN THUÊ BƯỚC VÀO 3 NGÀY CUỐI" : "THÔNG BÁO: CÒN CHƯA ĐẦY 24 GIỜ ĐẾN HẠN TRẢ"}
                                    </strong>
                                    <div className="bg-[#0c1322] border border-amber-500/60 px-3 py-1 rounded-lg shadow-inner">
                                      <span className="text-[11px] text-slate-400 mr-1.5">Đếm ngược:</span>
                                      <span className="text-amber-300 font-mono font-extrabold text-sm tracking-wide">
                                        ⏱️ {formatCountdownRemaining(diffMs)}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-slate-200 text-xs leading-relaxed">
                                    Đơn thuê của Quý khách đã bước vào giai đoạn hoàn tất, còn <strong className="text-amber-300 font-mono font-bold">{formatCountdownRemaining(diffMs)}</strong> để hoàn trả thiết bị.
                                    Hạn chót: <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">{r.returnTime || "17:00"} ngày {new Date(r.endDate).toLocaleDateString("vi-VN")}</strong>.
                                  </p>
                                  <p className="text-[11px] text-amber-300/90 italic">
                                    💡 Vui lòng kiểm tra đầy đủ linh phụ kiện và bấm nút <strong className="text-indigo-300">"📦 Báo trả đồ"</strong> ở góc phải trước giờ hẹn để Shipper đến lấy đúng hạn.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            (() => {
                              const overdueMs = Math.abs(diffMs);
                              const overdueHours = Math.max(1, Math.ceil(overdueMs / (1000 * 60 * 60)));
                              const dailyPrice = r.equipment?.dailyRate || r.dailyRate || 0;
                              let penaltyFee = 0;
                              let penaltyTier = "";

                              if (overdueHours <= 1) {
                                penaltyFee = 0;
                                penaltyTier = "Ân hạn miễn phí (dưới 1 giờ)";
                              } else if (overdueHours <= 4) {
                                penaltyFee = Math.round(dailyPrice * 0.3);
                                penaltyTier = "Trễ 1 - 4 giờ (+30% giá ngày)";
                              } else if (overdueHours <= 8) {
                                penaltyFee = Math.round(dailyPrice * 0.6);
                                penaltyTier = "Trễ 4 - 8 giờ (+60% giá ngày)";
                              } else {
                                const extraDays = Math.ceil(overdueHours / 24);
                                penaltyFee = dailyPrice * extraDays;
                                penaltyTier = `Trễ >8 giờ (${extraDays} ngày x 100% giá ngày)`;
                              }

                              return (
                                <div className="p-3.5 bg-gradient-to-r from-rose-950/90 via-red-950/80 to-rose-950/90 border-2 border-rose-500/70 rounded-xl text-xs text-rose-200 shadow-xl space-y-2.5">
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
                                            ⚠️ {formatCountdownRemaining(overdueMs)}
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-slate-200 text-xs leading-relaxed">
                                        Đơn thuê đã quá hạn từ <strong className="text-rose-300 font-mono">{r.returnTime || "17:00"} ngày {new Date(r.endDate).toLocaleDateString("vi-VN")}</strong> (Trễ khoảng <strong>{overdueHours} giờ</strong>).
                                      </p>
                                    </div>
                                  </div>

                                  {/* Bảng công thức phạt trễ hạn minh bạch */}
                                  <div className="bg-[#120a14] border border-rose-500/40 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                                        <span>⚖️</span> Biểu phí phạt quá hạn SmartEquip (Đơn giá: {dailyPrice.toLocaleString("vi-VN")} đ/ngày):
                                      </span>
                                      <span className="text-[11px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/50">
                                        Ước tính phạt: +{penaltyFee.toLocaleString("vi-VN")} đ ({penaltyTier})
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                                      <div className="p-1.5 bg-[#1a0f1d] rounded border border-[#3b1a29]">
                                        <span className="text-emerald-400 font-semibold block">• Dưới 1 giờ:</span>
                                        <span>Miễn phí (Ân hạn)</span>
                                      </div>
                                      <div className="p-1.5 bg-[#1a0f1d] rounded border border-[#3b1a29]">
                                        <span className="text-amber-400 font-semibold block">• 1 - 4 giờ:</span>
                                        <span>+30% ({Math.round(dailyPrice * 0.3).toLocaleString("vi-VN")} đ)</span>
                                      </div>
                                      <div className="p-1.5 bg-[#1a0f1d] rounded border border-[#3b1a29]">
                                        <span className="text-orange-400 font-semibold block">• 4 - 8 giờ:</span>
                                        <span>+60% ({Math.round(dailyPrice * 0.6).toLocaleString("vi-VN")} đ)</span>
                                      </div>
                                      <div className="p-1.5 bg-[#1a0f1d] rounded border border-[#3b1a29]">
                                        <span className="text-rose-400 font-semibold block">• Trên 8 giờ:</span>
                                        <span>100% ({dailyPrice.toLocaleString("vi-VN")} đ/ngày)</span>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-rose-300 italic">
                                      ⚠️ Quý khách vui lòng bấm ngay nút <strong>"📦 Báo trả đồ"</strong> hoặc <strong>"⏳ Gia hạn thuê"</strong> để tránh phát sinh thêm phí phạt cấn trừ vào cọc.
                                    </p>
                                  </div>
                                </div>
                              );
                            })()
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

                      {upperStatus === "PAYMENT_REJECTED" && r.payment?.moderatorNote && (
                        <div className="mt-1.5 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                          <strong>Lý do từ chối xác nhận:</strong>{" "}
                          {r.payment.moderatorNote}
                        </div>
                      )}

                      {/* Ảnh ngoại quan ban đầu khi nhận máy (Issue 5) */}
                      {r.handoverCheckin?.images && r.handoverCheckin.images.length > 0 && (
                        <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-white">
                            <span className="flex items-center gap-1.5">
                              <span>📸</span> Ảnh ngoại quan khi nhận máy ({r.handoverCheckin.images.length} ảnh):
                            </span>
                            {r.handoverCheckin.receivedAt && (
                              <span className="text-[10px] text-emerald-400/80 font-mono">
                                {new Date(r.handoverCheckin.receivedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} {new Date(r.handoverCheckin.receivedAt).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                          </div>
                          {r.handoverCheckin.note && (
                            <p className="text-[11px] text-slate-300 italic">
                              "{r.handoverCheckin.note}"
                            </p>
                          )}
                          <div className="flex items-center gap-2 overflow-x-auto py-1">
                            {r.handoverCheckin.images.map((img, idx) => (
                              <a
                                key={idx}
                                href={img}
                                target="_blank"
                                rel="noreferrer"
                                className="w-14 h-14 rounded-lg overflow-hidden border border-emerald-500/40 shrink-0 hover:scale-105 transition-transform"
                              >
                                <img src={img} alt={`Ngoại quan ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Amount breakdown */}
                  <div className="bg-[#0f1624] p-3.5 rounded-xl border border-[#1e2a40] flex lg:flex-col justify-between items-end gap-1 min-w-[190px]">
                    <span className="text-xs text-slate-400">Tổng thanh toán:</span>
                    <span className="text-lg font-extrabold text-orange-400">
                      {(r.totalAmount || r.rentalFee).toLocaleString("vi-VN")} đ
                    </span>
                    <div className="text-[11px] text-slate-400 text-right space-y-0.5">
                      <div>Tiền thuê: {r.rentalFee.toLocaleString("vi-VN")} đ</div>
                      {r.hasInsurance ? (
                        <div className="text-purple-300 font-semibold">
                          🛡️ Bảo hiểm (+5%): +{(r.insuranceFee || Math.round(r.rentalFee * 0.05)).toLocaleString("vi-VN")} đ
                        </div>
                      ) : null}
                      <div className="text-emerald-400 font-semibold">Tiền cọc: {r.depositAmount ? `${r.depositAmount.toLocaleString("vi-VN")} đ` : "0 đ (Miễn cọc)"}</div>
                      {r.discountAmount ? (
                        <div className="text-emerald-400 font-semibold">
                          Giảm giá: -{r.discountAmount.toLocaleString("vi-VN")} đ
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch min-w-[175px]">
                    {/* Chờ Owner duyệt */}
                    {upperStatus === "PENDING" && (
                      <div className="px-3.5 py-2 bg-[#1b2537] border border-[#27364f] rounded-xl text-center">
                        <span className="text-[11px] text-amber-400 flex items-center justify-center gap-1.5 font-medium">
                          <span>⏳</span> Đang chờ Chủ máy duyệt
                        </span>
                      </div>
                    )}

                    {/* Chưa đồng ý ký HĐ trong chat: Vào chat để trao đổi & bấm Đồng ý ký HĐ */}
                    {isApproved && !hasAgreedToSign && !isPaidConfirmed && !r.contract?.termsAccepted && (
                      <button
                        onClick={() => setChatRental(r)}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 text-center flex items-center justify-center gap-1.5 animate-pulse"
                        title="Vào đoạn chat để trao đổi điều khoản và bấm Đồng ý ký hợp đồng"
                      >
                        <span>💬</span>
                        <span>Vào chat Đồng ý ký HĐ</span>
                      </button>
                    )}

                    {/* Nút ký hợp đồng khi đã được duyệt VÀ ĐÃ ĐỒNG Ý KÝ */}
                    {canSign && (
                      <button
                        onClick={() => setSigningRental(r)}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 text-center flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <span>✍️</span>
                        <span>Ký hợp đồng & Thanh toán</span>
                      </button>
                    )}

                    {/* Nút thanh toán tự động qua cổng PayOS VietQR */}
                    {canPay && (
                      <PaymentButton
                        rentalId={r._id}
                        amount={r.totalAmount || r.rentalFee}
                        description={`TT don ${r.rentalCode}`}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                      />
                    )}

                    {/* Trạng thái chờ Owner duyệt chuyển khoản */}
                    {isWaitingPaymentApproval && (
                      <div className="px-3.5 py-2.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 rounded-xl text-xs text-center font-semibold flex items-center justify-center gap-1.5 shadow-sm">
                        <span>⏳</span>
                        <span>Chờ Chủ máy duyệt chuyển khoản</span>
                      </div>
                    )}

                    {/* Đang chờ Moderator xác nhận thanh toán */}
                    {isPaymentVerifying && (
                      <div className="px-3.5 py-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-center">
                        <span className="text-[11px] text-sky-300 flex items-center justify-center gap-1.5 font-semibold">
                          <span>🔍</span> Chờ Moderator xác nhận
                        </span>
                      </div>
                    )}

                    {/* Nút lưu ảnh ngoại quan khi nhận máy (Issue 5) */}
                    {(isPaidConfirmed || upperStatus === "ACTIVE" || canReturn) && (
                      <button
                        onClick={() => {
                          setCheckinRental(r);
                          setCheckinImages(r.handoverCheckin?.images || []);
                          setCheckinNote(r.handoverCheckin?.note || "");
                          setError("");
                        }}
                        className="px-3 py-2 bg-gradient-to-r from-blue-700/60 to-cyan-700/60 hover:from-blue-600 hover:to-cyan-600 border border-blue-500/40 text-blue-200 hover:text-white font-semibold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        title="Chụp và lưu 1-3 ảnh ngoại quan khi shipper bàn giao máy"
                      >
                        <span>📸</span>
                        <span>{r.handoverCheckin?.images?.length ? `Đã lưu ảnh nhận (${r.handoverCheckin.images.length})` : "Lưu ảnh nhận máy"}</span>
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
                        onClick={() => {
                          setReviewingRentalId(r._id);
                          setReviewImages([]);
                          setRating(5);
                          setReviewComment("");
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1"
                      >
                        <span>⭐</span>
                        <span>Đánh giá đơn</span>
                      </button>
                    )}

                    {/* Đã có đánh giá */}
                    {r.review?.rating && (
                      <div className="text-center text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-1.5 rounded-lg border border-amber-500/20 space-y-1">
                        <div>⭐ Đã đánh giá ({r.review.rating}/5)</div>
                        {r.review.reviewImages && r.review.reviewImages.length > 0 && (
                          <div className="flex items-center justify-center gap-1 pt-1">
                            {r.review.reviewImages.map((img, idx) => (
                              <img key={idx} src={img} alt="review" className="w-6 h-6 object-cover rounded border border-amber-400/40" />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nút theo dõi tiến độ khiếu nại (Issue 10) */}
                    {(upperStatus === "DISPUTED" || Boolean(r.dispute?.reason) || Boolean(r.dispute?.disputedAt)) && (
                      <button
                        onClick={() => setViewingDisputeRental(r)}
                        className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        title="Xem tiến độ xử lý và phản hồi khiếu nại từ Admin"
                      >
                        <span>📋</span>
                        <span>Tiến độ khiếu nại</span>
                      </button>
                    )}

                    {/* Nút khiếu nại (UC_R14) */}
                    {canDispute && (
                      <button
                        onClick={() => setComplaintTarget({ type: "rental", id: r._id })}
                        className="px-3 py-1.5 bg-[#1e1722] hover:bg-red-950/40 text-rose-400 font-semibold rounded-xl text-xs border border-rose-900/40 text-center"
                      >
                        ⚠️ Khiếu nại
                      </button>
                    )}

                    {/* Chỉ hiển thị nút HĐ Chính thức & Tải HĐ khi đã hoàn tất ký/thanh toán. Trước đó chỉ xem & trao đổi trong Khung Chat */}
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
                      if (!isOfficial) return null;
                      return (
                        <>
                          <button
                            onClick={() => setViewingContractRental(r)}
                            className="px-3 py-2 border font-semibold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5 shadow-sm bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
                            title="Mở xem Hợp đồng chính thức"
                          >
                            <span>📜</span>
                            <span>Xem hợp đồng</span>
                          </button>
                          <button
                            onClick={() => setViewingReceiptRental(r)}
                            className="px-3 py-2 border font-semibold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5 shadow-sm bg-indigo-950/50 border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/60 cursor-pointer"
                            title="Tải hoặc in bản Hợp đồng & Biên lai thu tiền điện tử có chữ ký số"
                          >
                            <span>📥</span>
                            <span>Tải HĐ & Biên lai (PDF)</span>
                          </button>
                        </>
                      );
                    })()}

                    {/* Nút Chat trực tiếp với Chủ máy & Gửi hợp đồng */}
                    <button
                      onClick={() => setChatRental(r)}
                      className="px-3 py-2 bg-gradient-to-r from-teal-700/60 to-cyan-700/60 hover:from-teal-600 hover:to-cyan-600 border border-teal-500/40 text-teal-200 hover:text-white font-semibold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                      title="Nhắn tin trực tiếp với Chủ máy và gửi hợp đồng qua chat"
                    >
                      <span>💬</span>
                      <span>Nhắn tin với Chủ máy</span>
                    </button>

                    {/* Trạng thái gia hạn thuê */}
                    {r.extensionRequest?.status === "PENDING_OWNER" && (
                      <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-purple-300 flex items-center gap-1.5">
                          <span className="animate-spin text-sm">⏳</span>
                          <span>Đang chờ Chủ máy duyệt gia hạn (+{r.extensionRequest.extraDays} ngày)</span>
                        </div>
                        <div className="text-[11px] text-purple-200/80">
                          Hạn trả mới: <strong className="text-white">{new Date(r.extensionRequest.newEndDate).toLocaleDateString("vi-VN")}</strong> • Phụ phí: <strong className="text-orange-400">{(r.extensionRequest.extraFee || 0).toLocaleString("vi-VN")} đ</strong>
                        </div>
                      </div>
                    )}

                    {r.extensionRequest?.status === "APPROVED" && (
                      <div className="p-3.5 bg-gradient-to-r from-emerald-950/70 to-purple-950/70 border border-emerald-500/50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                            <span>✅</span> Chủ máy đã duyệt gia hạn (+{r.extensionRequest.extraDays} ngày)
                          </span>
                          <span className="text-xs font-black text-orange-400">
                            {(r.extensionRequest.extraFee || 0).toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Hạn trả mới: <strong className="text-emerald-400">{new Date(r.extensionRequest.newEndDate).toLocaleDateString("vi-VN")}</strong>. Vui lòng quét mã VietQR PayOS để thanh toán phụ phí gia hạn.
                        </p>
                        <PaymentButton
                          rentalId={r._id}
                          amount={r.extensionRequest.extraFee}
                          description={`GH don ${r.rentalCode}`}
                          isExtension={true}
                          label={`Thanh toán phụ phí gia hạn (${(r.extensionRequest.extraFee || 0).toLocaleString("vi-VN")} đ)`}
                          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        />
                      </div>
                    )}

                    {r.extensionRequest?.status === "REJECTED" && (
                      <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-rose-300 flex items-center gap-1.5">
                          <span>✕</span>
                          <span>Chủ máy đã từ chối yêu cầu gia hạn (+{r.extensionRequest.extraDays} ngày)</span>
                        </div>
                        <div className="text-[11px] text-rose-200/80">
                          Lý do: {r.extensionRequest.rejectionReason || "Chủ máy không thể gia hạn vào thời gian này"}
                        </div>
                      </div>
                    )}

                    {/* Nút gia hạn thuê (UC_R10_EXT) */}
                    {canExtend && (
                      <button
                        onClick={() => {
                          setExtendingRental(r);
                          setExtraDays(1);
                          setExtensionNote("");
                          setError("");
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-purple-600/25 text-center flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Gia hạn thêm ngày thuê cho đơn này"
                      >
                        <span>⏳</span>
                        <span>Gia hạn thuê</span>
                      </button>
                    )}

                    {/* Nút hủy yêu cầu (UC_R13) */}
                    {canCancel && (
                      <button
                        onClick={() => {
                          setCancellingRental(r);
                          setError("");
                          setCancelReason("Thay đổi kế hoạch");
                          setRefundBankName("");
                          setRefundAccountNumber("");
                          setRefundAccountName("");
                        }}
                        className="px-3 py-1.5 bg-[#1c2436] hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 font-semibold rounded-xl text-xs border border-[#27344c] text-center cursor-pointer"
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
            setNotice(
              "Đã ký hợp đồng điện tử thành công! Vui lòng hoàn tất thanh toán phí thuê thiết bị."
            );
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
              Gửi thông tin hẹn giờ và địa điểm để Chủ máy chuẩn bị nghiệm thu thiết bị và hoàn tất đơn thuê cho bạn.
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

      {/* Modal Đánh giá (UC_R11: Photo Reviews) */}
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

              {/* Upload 1-3 ảnh thực tế máy (Photo Reviews - Issue 8) */}
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">
                  Ảnh chụp thực tế thiết bị khi dùng (Tối đa 3 ảnh):
                </label>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {reviewImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-amber-500/40 group">
                      <img src={img} alt="review" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setReviewImages(reviewImages.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-black/80 hover:bg-rose-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {reviewImages.length < 3 && (
                    <label className="w-16 h-16 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 flex flex-col items-center justify-center cursor-pointer text-amber-300 transition-colors">
                      <span className="text-xl">📷</span>
                      <span className="text-[9px] font-bold">+ Thêm ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.slice(0, 3 - reviewImages.length).forEach((file) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (reader.result) {
                                setReviewImages((prev) => [...prev, reader.result as string].slice(0, 3));
                              }
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                <button
                  type="button"
                  onClick={() => setReviewingRentalId(null)}
                  disabled={isReviewing}
                  className="px-4 py-2 bg-[#1c2436] text-slate-300 font-semibold rounded-xl text-xs hover:bg-[#253248] transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isReviewing}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-600/30 cursor-pointer"
                >
                  {isReviewing ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Handover Check-in: Lưu ảnh ngoại quan khi nhận máy (Issue 5) */}
      {checkinRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-blue-500/40 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#212c42]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-blue-400">📸</span> Lưu Ảnh Ngoại Quan Khi Nhận Máy #{checkinRental.rentalCode}
              </h3>
              <button
                type="button"
                onClick={() => setCheckinRental(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Vui lòng chụp từ <strong>1 - 3 ảnh rõ nét</strong> các góc máy, màn hình, ống kính và linh phụ kiện ngay khi nhận máy từ shipper. Bằng chứng này sẽ bảo vệ bạn tuyệt đối khỏi các rủi ro bị đổ lỗi trầy xước lúc hoàn trả!
            </p>

            <form onSubmit={handleCheckinSubmit} className="space-y-4 text-xs">
              {/* Image Previews & Upload Button */}
              <div>
                <label className="block font-bold text-slate-300 mb-2">
                  Ảnh ngoại quan thực tế (Tối đa 3 ảnh) *
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {checkinImages.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-500/50 group">
                      <img src={img} alt={`Ngoại quan ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCheckinImages(checkinImages.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-black/80 hover:bg-rose-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold cursor-pointer"
                        title="Xóa ảnh"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {checkinImages.length < 3 && (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-blue-500/40 hover:border-blue-400 bg-blue-500/5 hover:bg-blue-500/10 flex flex-col items-center justify-center cursor-pointer text-blue-300 transition-all">
                      <span className="text-2xl">📷</span>
                      <span className="text-[10px] font-bold mt-1">+ Thêm ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.slice(0, 3 - checkinImages.length).forEach((file) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (reader.result) {
                                setCheckinImages((prev) => [...prev, reader.result as string].slice(0, 3));
                              }
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Ghi chú tình trạng khi nhận (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Máy có vết trầy nhẹ ở nắp pin, đủ 2 pin 1 sạc kèm theo..."
                  value={checkinNote}
                  onChange={(e) => setCheckinNote(e.target.value)}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                <button
                  type="button"
                  onClick={() => setCheckinRental(null)}
                  disabled={isCheckingIn}
                  className="px-4 py-2 bg-[#1c2436] text-slate-300 font-semibold rounded-xl text-xs hover:bg-[#253248] transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isCheckingIn || checkinImages.length === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {isCheckingIn ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu biên bản nhận máy</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal In & Tải Hợp đồng / Biên lai PDF (Issue 7) */}
      {viewingReceiptRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-[#141d2d] border border-indigo-500/40 w-full max-w-3xl rounded-2xl p-6 shadow-2xl relative space-y-5 my-8 text-white max-h-[90vh] overflow-y-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#212c42]">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <span className="font-bold text-sm text-white">Biên Lai & Hợp Đồng Điện Tử (SmartEquip E-Contract)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>In / Lưu PDF (Ctrl + P)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceiptRental(null)}
                  className="px-3 py-2 bg-[#1c2436] hover:bg-[#28354c] text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="bg-white text-slate-900 p-8 rounded-xl shadow-inner space-y-6 text-xs leading-relaxed font-sans">
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black text-orange-600 uppercase tracking-tight">SmartEquip Platform</h1>
                  <p className="text-[11px] text-slate-500">Nền tảng chia sẻ & cho thuê thiết bị công nghệ hàng đầu Việt Nam</p>
                  <p className="text-[11px] text-slate-500">Hotline: 1900-8888 • Email: hotro@smartequip.vn • Website: smartequip.vn</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-full border border-emerald-300 uppercase">
                    ✓ ĐÃ XÁC THỰC ĐIỆN TỬ
                  </span>
                  <p className="text-[11px] font-mono font-bold text-slate-700 mt-1">Mã đơn: #{viewingReceiptRental.rentalCode}</p>
                  <p className="text-[10px] font-mono text-slate-500">Mã HĐ: {viewingReceiptRental.contract?.contractNumber || `HD-${viewingReceiptRental.rentalCode}`}</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-2">
                <h2 className="text-base font-black uppercase text-slate-900 tracking-wide">
                  HỢP ĐỒNG THUÊ THIẾT BỊ VÀ BIÊN LAI THU TIỀN ĐIỆN TỬ
                </h2>
                <p className="text-[11px] text-slate-500 italic">
                  (Căn cứ Bộ Luật Dân sự & Luật Giao dịch điện tử số 20/2023/QH15)
                </p>
              </div>

              {/* Two Parties Information */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                    BÊN CHO THUÊ (BÊN A):
                  </h3>
                  <p><strong>Họ & Tên:</strong> {typeof viewingReceiptRental.owner === "object" ? viewingReceiptRental.owner?.name : "Nguyễn Văn Owner"}</p>
                  <p><strong>Điện thoại:</strong> {typeof viewingReceiptRental.owner === "object" && viewingReceiptRental.owner?.phone ? viewingReceiptRental.owner.phone : "0909123456"}</p>
                  <p><strong>Email:</strong> {typeof viewingReceiptRental.owner === "object" && viewingReceiptRental.owner?.email ? viewingReceiptRental.owner.email : "owner@smartequip.vn"}</p>
                  <p><strong>Địa chỉ kho:</strong> {viewingReceiptRental.equipment?.location?.address || "Kho trung tâm SmartEquip Hub"}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                    BÊN THUÊ (BÊN B):
                  </h3>
                  <p><strong>Họ & Tên:</strong> {typeof viewingReceiptRental.renter === "object" ? viewingReceiptRental.renter?.name : (user?.name || "Khách thuê SmartEquip")}</p>
                  <p><strong>Điện thoại:</strong> {typeof viewingReceiptRental.renter === "object" && viewingReceiptRental.renter?.phone ? viewingReceiptRental.renter.phone : (user?.phone || "0988776655")}</p>
                  <p><strong>Email:</strong> {typeof viewingReceiptRental.renter === "object" && viewingReceiptRental.renter?.email ? viewingReceiptRental.renter.email : (user?.email || "renter@smartequip.vn")}</p>
                  <p><strong>Địa chỉ nhận hàng:</strong> {viewingReceiptRental.deliveryAddress || "Theo đăng ký thuê"}</p>
                </div>
              </div>

              {/* Equipment & Rental Term Table */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 uppercase text-[11px]">CHI TIẾT THIẾT BỊ VÀ CƯỚC THUÊ:</h3>
                <table className="w-full border-collapse border border-slate-300 text-[11.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 p-2 text-left">Nội dung</th>
                      <th className="border border-slate-300 p-2 text-center">Số lượng / Thời gian</th>
                      <th className="border border-slate-300 p-2 text-right">Đơn giá</th>
                      <th className="border border-slate-300 p-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2">
                        <strong>{viewingReceiptRental.equipment?.title || "Thiết bị thuê"}</strong>
                        <div className="text-[10px] text-slate-500">
                          Thời gian: {viewingReceiptRental.deliveryTime || "09:00"} ngày {new Date(viewingReceiptRental.startDate).toLocaleDateString("vi-VN")} đến {viewingReceiptRental.returnTime || "17:00"} ngày {new Date(viewingReceiptRental.endDate).toLocaleDateString("vi-VN")}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {viewingReceiptRental.totalDays || 1} ngày
                      </td>
                      <td className="border border-slate-300 p-2 text-right">
                        {(viewingReceiptRental.dailyRate || viewingReceiptRental.equipment?.dailyRate || 0).toLocaleString("vi-VN")} đ
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-bold">
                        {viewingReceiptRental.rentalFee.toLocaleString("vi-VN")} đ
                      </td>
                    </tr>
                    {viewingReceiptRental.hasInsurance && (
                      <tr>
                        <td className="border border-slate-300 p-2">
                          <strong>Gói Bảo Hiểm Rơi Vỡ Toàn Diện (+5%)</strong>
                          <div className="text-[10px] text-slate-500">Miễn thường 80-100% chi phí sửa chữa khi xảy ra sự cố va đập nhẹ</div>
                        </td>
                        <td className="border border-slate-300 p-2 text-center">1 gói</td>
                        <td className="border border-slate-300 p-2 text-right">5% phí thuê</td>
                        <td className="border border-slate-300 p-2 text-right font-bold text-purple-700">
                          +{(viewingReceiptRental.insuranceFee || Math.round(viewingReceiptRental.rentalFee * 0.05)).toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="border border-slate-300 p-2">
                        <strong>Tiền đặt cọc thiết bị</strong>
                        <div className="text-[10px] text-slate-500">Áp dụng chính sách tín nhiệm SmartEquip TrustScore</div>
                      </td>
                      <td className="border border-slate-300 p-2 text-center">1 đơn</td>
                      <td className="border border-slate-300 p-2 text-right">
                        {viewingReceiptRental.depositAmount ? `${viewingReceiptRental.depositAmount.toLocaleString("vi-VN")} đ` : "0 đ"}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-bold text-emerald-700">
                        {viewingReceiptRental.depositAmount ? `${viewingReceiptRental.depositAmount.toLocaleString("vi-VN")} đ` : "0 đ (Miễn cọc)"}
                      </td>
                    </tr>
                    {viewingReceiptRental.discountAmount ? (
                      <tr>
                        <td className="border border-slate-300 p-2 text-emerald-700">Mã giảm giá ưu đãi SmartEquip</td>
                        <td className="border border-slate-300 p-2 text-center">1 lần</td>
                        <td className="border border-slate-300 p-2 text-right">Voucher</td>
                        <td className="border border-slate-300 p-2 text-right font-bold text-emerald-700">
                          -{viewingReceiptRental.discountAmount.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={3} className="border border-slate-300 p-2.5 text-right uppercase text-[12px]">
                        TỔNG CỘNG THANH TOÁN:
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right text-orange-600 text-sm font-black">
                        {(viewingReceiptRental.totalAmount || viewingReceiptRental.rentalFee).toLocaleString("vi-VN")} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Transaction & Payment Method Info */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-1">
                <p><strong>Cổng thanh toán:</strong> PayOS VietQR tự động (Napas 247)</p>
                <p><strong>Mã giao dịch / Order Code:</strong> {viewingReceiptRental.payment?.orderCode || viewingReceiptRental.payment?.transactionId || viewingReceiptRental.rentalCode}</p>
                <p><strong>Trạng thái giao dịch:</strong> <span className="text-emerald-700 font-bold">✓ ĐÃ THANH TOÁN THÀNH CÔNG (PAID)</span></p>
                <p><strong>Biên bản bàn giao ngoại quan:</strong> {viewingReceiptRental.handoverCheckin?.images?.length ? `Đã lưu ${viewingReceiptRental.handoverCheckin.images.length} ảnh kiểm tra lúc nhận máy` : "Kiểm tra trực tiếp khi nhận hàng"}</p>
              </div>

              {/* Digital Signature Stamps */}
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="text-center space-y-10">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px]">ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)</h4>
                    <p className="text-[10px] text-slate-500">(Ký, ghi rõ họ tên và đóng dấu)</p>
                  </div>
                  <div className="space-y-1">
                    <div className="inline-block border-2 border-emerald-600 rounded-lg p-2 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                      ✓ ĐÃ KÝ SỐ XÁC THỰC
                      <div className="text-[9px] font-mono text-emerald-600">SmartEquip Digital ID: OWNER-VERIFIED</div>
                    </div>
                    <p className="font-bold text-slate-800">{typeof viewingReceiptRental.owner === "object" ? viewingReceiptRental.owner?.name : "Nguyễn Văn Owner"}</p>
                  </div>
                </div>

                <div className="text-center space-y-10">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px]">ĐẠI DIỆN BÊN THUÊ (BÊN B)</h4>
                    <p className="text-[10px] text-slate-500">(Ký và xác nhận điều khoản hợp đồng)</p>
                  </div>
                  <div className="space-y-1">
                    <div className="inline-block border-2 border-indigo-600 rounded-lg p-2 bg-indigo-50 text-indigo-800 text-[10px] font-bold">
                      ✓ ĐÃ KÝ ĐIỆN TỬ
                      <div className="text-[9px] font-mono text-indigo-600">Timestamp: {viewingReceiptRental.contract?.signedAt ? new Date(viewingReceiptRental.contract.signedAt).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN")}</div>
                    </div>
                    <p className="font-bold text-slate-800">{viewingReceiptRental.contract?.renterSignature || (user?.name || "Khách Thuê")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tiến Độ Khiếu Nại (Issue 10) */}
      {viewingDisputeRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-rose-500/40 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#212c42]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-rose-400">📋</span> Tiến Độ Xử Lý Khiếu Nại #{viewingDisputeRental.rentalCode}
              </h3>
              <button
                type="button"
                onClick={() => setViewingDisputeRental(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Rental & Dispute info summary */}
            <div className="p-3.5 bg-[#172033] border border-[#223049] rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">
                  {viewingDisputeRental.equipment?.title || "Thiết bị"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Đang xử lý khiếu nại
                </span>
              </div>
              <div className="text-slate-300">
                <strong>Lý do khiếu nại:</strong>{" "}
                <span className="text-rose-200 italic">
                  "{viewingDisputeRental.dispute?.reason || "Khách yêu cầu kiểm tra tình trạng máy / hoàn cọc"}"
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Thời gian gửi: {viewingDisputeRental.dispute?.disputedAt ? new Date(viewingDisputeRental.dispute.disputedAt).toLocaleString("vi-VN") : "Gần đây"}
              </div>
            </div>

            {/* 4-Step Visual Stepper */}
            <div className="space-y-4 pt-1 text-xs">
              <div className="relative pl-7 pb-4 border-l-2 border-emerald-500">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-black">
                  ✓
                </span>
                <div className="font-bold text-emerald-400 text-xs">Bước 1: Tiếp nhận khiếu nại & Khóa ký quỹ</div>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Hệ thống SmartEquip đã tiếp nhận đơn và tự động tạm giữ toàn bộ số tiền cọc/tiền thuê tại tài khoản Escrow an toàn để chờ kết luận.
                </p>
              </div>

              <div className="relative pl-7 pb-4 border-l-2 border-amber-500">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-amber-400 animate-ping"></span>
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-black">
                  2
                </span>
                <div className="font-bold text-amber-300 text-xs">Bước 2: Moderator đang thụ lý & Kiểm tra chứng cứ</div>
                <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                  Chuyên viên hỗ trợ đang đối chiếu ảnh ngoại quan nhận máy ({viewingDisputeRental.handoverCheckin?.images?.length || 0} ảnh) và biên bản bàn giao của Shipper.
                </p>
              </div>

              <div className="relative pl-7 pb-4 border-l-2 border-slate-700">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                  3
                </span>
                <div className="font-bold text-slate-400 text-xs">Bước 3: Đối soát giải trình hai bên</div>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                  Moderator làm việc với Chủ máy và Khách thuê trong phòng chat hỗ trợ để thống nhất mức hoàn tiền / bồi thường công bằng nhất.
                </p>
              </div>

              <div className="relative pl-7">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                  4
                </span>
                <div className="font-bold text-slate-400 text-xs">Bước 4: Phán quyết cuối cùng & Giải ngân / Hoàn tiền</div>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                  Admin ra quyết định chuyển khoản hoàn tiền cọc về tài khoản của Khách thuê trong vòng 24 - 48 giờ làm việc.
                </p>
              </div>
            </div>

            {/* Hotline support */}
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>📞</span> Cần hỗ trợ khẩn cấp: <strong>1900-8888</strong> (8:00 - 22:00)
              </span>
              <button
                type="button"
                onClick={() => {
                  const target = viewingDisputeRental;
                  setViewingDisputeRental(null);
                  setChatRental(target);
                }}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] cursor-pointer"
              >
                Nhắn tin với Chủ máy
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#212c42]">
              <button
                type="button"
                onClick={() => setViewingDisputeRental(null)}
                className="px-4 py-2 bg-[#1c2436] hover:bg-[#253248] text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint form for completed rentals */}
      {complaintTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#263550] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚠️</span> Gửi Khiếu Nại Đơn Thuê
            </h3>
            <p className="text-xs text-slate-400">
              Khiếu nại chỉ được gửi sau khi đơn thuê hoàn tất. Rental Moderator sẽ tiếp nhận và phản hồi tại lịch sử thuê.
            </p>
            <form onSubmit={handleComplaintSubmit} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-300">Tiêu đề *</label>
                <input
                  value={complaintSubject}
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  maxLength={160}
                  className="w-full rounded-xl border border-[#2b3a56] bg-[#1b273d] p-3 text-white focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">Mô tả khiếu nại *</label>
                <textarea
                  rows={4}
                  placeholder="Mô tả vấn đề bạn gặp phải..."
                  value={complaintMessage}
                  onChange={(e) => setComplaintMessage(e.target.value)}
                  maxLength={5000}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                <button
                  type="button"
                  onClick={() => setComplaintTarget(null)}
                  disabled={isSubmittingComplaint}
                  className="px-4 py-2 bg-[#1c2436] text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplaint || !complaintSubject.trim() || !complaintMessage.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs"
                >
                  {isSubmittingComplaint ? "Đang gửi..." : "Gửi khiếu nại"}
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
          onAgreeToSign={async (r) => {
            try {
              await smartEquipApi.agreeToSignContract(token, r._id);
              fetchHistory(true);
              setViewingContractRental(null);
              setSigningRental(r);
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}

      {/* Modal Chat Trực Tiếp Giữa Khách Thuê và Chủ Máy (Gửi Hợp Đồng Qua Lại) */}
      {chatRental && (
        <RentalChatModal
          rental={chatRental}
          isOpen={Boolean(chatRental)}
          token={token}
          currentUserId={(user as any)?._id || (user as any)?.User_Id}
          onClose={() => setChatRental(null)}
          onViewContract={(r) => {
            setViewingContractRental(r);
          }}
          onAgreeToSign={(updated) => {
            fetchHistory(true);
            setChatRental(null);
            setSigningRental(updated);
          }}
        />
      )}

      {/* Modal Hủy yêu cầu & Hoàn tiền (UC_R13) */}
      {cancellingRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#263550] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#212c42]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-rose-400">🗑️</span> Xác Nhận Hủy Đơn Thuê #{cancellingRental.rentalCode}
              </h3>
              <button
                type="button"
                onClick={() => setCancellingRental(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {(() => {
              const isPaid =
                cancellingRental.payment?.isPaid === true ||
                cancellingRental.payment?.paymentStatus === "paid" ||
                String(cancellingRental.status).toUpperCase() === "PAID";

              return (
                <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
                  {error && (
                    <div className="p-3 bg-rose-950/70 border border-rose-500/60 rounded-xl text-xs text-rose-200 font-semibold flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {isPaid ? (
                    <div className="p-4 bg-gradient-to-r from-amber-950/80 to-emerald-950/50 border border-amber-500/50 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                        <span>💰</span>
                        <span>Đơn hàng đã thanh toán: {(cancellingRental.totalAmount || cancellingRental.rentalFee).toLocaleString("vi-VN")} đ</span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Chính sách SmartEquip cam kết <strong>hoàn tiền 100%</strong> khi bạn hủy trước ngày nhận thiết bị. Vui lòng cung cấp tài khoản ngân hàng để bộ phận kế toán hoàn tiền trong vòng <strong>24 giờ</strong>:
                      </p>

                      <div className="space-y-2.5 pt-2">
                        <div>
                          <label className="block text-[11px] font-bold text-amber-200 uppercase tracking-wider mb-1">
                            Ngân hàng thụ hưởng <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Vietcombank, MB Bank, Techcombank, VPBank, ACB..."
                            value={refundBankName}
                            onChange={(e) => setRefundBankName(e.target.value)}
                            required
                            className="w-full bg-[#1b263b] border border-[#2b3a56] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-amber-200 uppercase tracking-wider mb-1">
                              Số tài khoản <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Nhập số tài khoản"
                              value={refundAccountNumber}
                              onChange={(e) => setRefundAccountNumber(e.target.value)}
                              required
                              className="w-full bg-[#1b263b] border border-[#2b3a56] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400 font-mono font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-amber-200 uppercase tracking-wider mb-1">
                              Tên chủ tài khoản <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="NGUYEN VAN A"
                              value={refundAccountName}
                              onChange={(e) => setRefundAccountName(e.target.value.toUpperCase())}
                              required
                              className="w-full bg-[#1b263b] border border-[#2b3a56] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400 font-bold uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Vui lòng chọn hoặc nhập lý do bạn muốn hủy đơn thuê này. Đơn chưa thanh toán sẽ được hủy ngay lập tức và thiết bị sẽ được mở lại cho người khác thuê.
                    </p>
                  )}

                  {/* Gợi ý lý do nhanh (Quick Reason Chips) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Lý do thường gặp:
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
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border cursor-pointer ${
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
                      rows={2}
                      placeholder="Nhập chi tiết lý do bạn muốn hủy đơn..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                    <button
                      type="button"
                      onClick={() => setCancellingRental(null)}
                      disabled={isCancelling}
                      className="px-4 py-2 bg-[#1c2436] hover:bg-[#253248] text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
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
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        <span>{isPaid ? "Xác nhận hủy & Hoàn tiền" : "Xác nhận hủy đơn"}</span>
                      )}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Gia Hạn Thuê Thiết Bị (UC_R10_EXT) */}
      {extendingRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-purple-500/40 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#212c42]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-purple-400">⏳</span> Gia Hạn Thuê Thiết Bị #{extendingRental.rentalCode}
              </h3>
              <button
                type="button"
                onClick={() => setExtendingRental(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#172033] border border-[#223049] rounded-xl space-y-1 text-xs">
              <div className="font-bold text-white text-sm">
                {extendingRental.equipment?.title || "Thiết bị"}
              </div>
              <div className="text-slate-400">
                Hạn trả máy hiện tại:{" "}
                <strong className="text-amber-300">
                  {extendingRental.returnTime || "17:00"} ngày {new Date(extendingRental.endDate).toLocaleDateString("vi-VN")}
                </strong>
              </div>
              <div className="text-slate-400">
                Đơn giá thuê:{" "}
                <strong className="text-orange-400">
                  {(extendingRental.dailyRate || extendingRental.equipment?.dailyRate || 0).toLocaleString("vi-VN")} đ / ngày
                </strong>
              </div>
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-950/70 border border-rose-500/60 rounded-xl text-xs text-rose-200 font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Chọn số ngày gia hạn thêm */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Chọn số ngày gia hạn thêm:
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[1, 2, 3, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtraDays(d)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        extraDays === d
                          ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30"
                          : "bg-[#1b263b] border-[#2b3a56] text-slate-300 hover:border-slate-400"
                      }`}
                    >
                      +{d} ngày
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs whitespace-nowrap">Hoặc nhập số ngày khác:</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={extraDays}
                    onChange={(e) => setExtraDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 bg-[#1b263b] border border-[#2b3a56] rounded-xl px-3 py-1.5 text-white text-xs font-bold text-center focus:outline-none focus:border-purple-400"
                  />
                  <span className="text-slate-400 text-xs">ngày</span>
                </div>
              </div>

              {/* Tóm tắt chi phí & Hạn trả mới */}
              {(() => {
                const currentEnd = new Date(extendingRental.endDate);
                const newEnd = new Date(currentEnd);
                newEnd.setDate(newEnd.getDate() + extraDays);
                const extraFee = (extendingRental.dailyRate || extendingRental.equipment?.dailyRate || 0) * extraDays;

                return (
                  <div className="p-3.5 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Hạn trả máy mới sau gia hạn:</span>
                      <strong className="text-emerald-400 font-bold">
                        {extendingRental.returnTime || "17:00"} ngày {newEnd.toLocaleDateString("vi-VN")}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-500/20">
                      <span className="text-slate-300">Phụ phí gia hạn ({extraDays} ngày):</span>
                      <strong className="text-orange-400 text-sm font-black">
                        +{extraFee.toLocaleString("vi-VN")} đ
                      </strong>
                    </div>
                    <div className="p-3 bg-blue-950/50 border border-blue-500/40 rounded-xl text-[11px] text-blue-200 leading-relaxed">
                      ℹ️ <strong>Quy trình gia hạn 2 bước:</strong> Yêu cầu gia hạn sẽ được gửi đến Chủ máy. Sau khi Chủ máy phê duyệt đồng ý, bạn sẽ chuyển khoản thanh toán phụ phí gia hạn qua mã <strong>VietQR PayOS</strong> để hoàn tất.
                    </div>
                  </div>
                );
              })()}

              {/* Ghi chú thêm cho Chủ máy */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Ghi chú cho Chủ máy (Tùy chọn):
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Cần quay thêm cảnh bổ sung vào chiều mai..."
                  value={extensionNote}
                  onChange={(e) => setExtensionNote(e.target.value)}
                  className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212c42]">
                <button
                  type="button"
                  onClick={() => setExtendingRental(null)}
                  disabled={isExtending}
                  className="px-4 py-2 bg-[#1c2436] hover:bg-[#253248] text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isExtending}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {isExtending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang gửi yêu cầu...</span>
                    </>
                  ) : (
                    <span>Gửi yêu cầu gia hạn tới Chủ máy (+{extraDays} ngày)</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Popup Modal: Xác nhận nhận thiết bị */}
      {confirmingReceiptContract && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#141d2d] border border-[#273650] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              📦
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Xác Nhận Đã Nhận Thiết Bị?
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Bạn xác nhận đã nhận đúng máy <strong className="text-white">{confirmingReceiptContract.equipment_id?.title || confirmingReceiptContract.title}</strong> từ Chủ thiết bị và máy hoạt động đúng như biên bản bàn giao?
            </p>

            <div className="bg-[#0b101b] border border-[#223049] rounded-xl p-3 mb-6 text-xs text-slate-400 text-left">
              💡 Sau khi xác nhận, Chủ thiết bị (Owner) sẽ đủ điều kiện gửi yêu cầu giải ngân tiền thuê lên Quản lý web.
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => executeConfirmReceipt(confirmingReceiptContract)}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                <span>✓</span>
                <span>Xác nhận đã nhận máy</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReceiptContract(null)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm rounded-xl transition border border-slate-700"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
