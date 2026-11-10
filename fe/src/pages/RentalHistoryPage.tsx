import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Navbar from "../components/Navbar";
import ContractConfirmationModal from "../components/ContractConfirmationModal";
import PaymentQRModal from "../components/PaymentQRModal";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Rental } from "../types/smartequip";
import { ownerApi } from "../services/ownerApi";
import type { RentalContract } from "../types/owner";

type TabKey = "ALL" | "PENDING" | "CONTRACT_SIGNED" | "ACTIVE" | "RETURNED";

interface TabItem {
  key: TabKey;
  label: string;
  badge?: number;
}

const TABS: TabItem[] = [
  { key: "ALL", label: "Tất cả đơn" },
  { key: "PENDING", label: "Chờ duyệt & Ký HĐ" },
  { key: "CONTRACT_SIGNED", label: "Thanh toán QR & Xác nhận" },
  { key: "ACTIVE", label: "Đang thuê" },
  { key: "RETURNED", label: "Đã trả / Hoàn tất" },
];

export default function RentalHistoryPage() {
  const { user, token, isLoading } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [marketplaceContracts, setMarketplaceContracts] = useState<RentalContract[]>([]);
  const [signingMarketplaceContract, setSigningMarketplaceContract] = useState<RentalContract | null>(null);
  const [marketplaceSignature, setMarketplaceSignature] = useState("");
  const [marketplaceTermsAccepted, setMarketplaceTermsAccepted] = useState(false);
  const [isSigningMarketplaceContract, setIsSigningMarketplaceContract] = useState(false);
  const [confirmingReceiptId, setConfirmingReceiptId] = useState<string | null>(null);
  const [confirmingReceiptContract, setConfirmingReceiptContract] = useState<RentalContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");

  // Modal ký hợp đồng (UC_R08)
  const [signingRental, setSigningRental] = useState<Rental | null>(null);

  // Modal thanh toán QR (UC_R09)
  const [payingRental, setPayingRental] = useState<Rental | null>(null);

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
  const [disputingRentalId, setDisputingRentalId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [isDisputing, setIsDisputing] = useState(false);

  // Modal hủy đơn (UC_R13)
  const [cancellingRentalId, setCancellingRentalId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchHistory = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([smartEquipApi.getRentalHistory(token), ownerApi.getMyRentals(token)])
      .then(([history, marketplace]) => {
        setRentals(history.data);
        setMarketplaceContracts(marketplace.contracts);
      })
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
      return s === "PENDING" || s === "APPROVED" || s === "CONTRACT_PENDING";
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
    setConfirmingReceiptId(contract._id);
    setError("");
    setNotice("");
    try {
      const result = await ownerApi.confirmMyReceipt(token, contract._id);
      setNotice(result.message);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xác nhận đã nhận thiết bị");
    } finally {
      setConfirmingReceiptId(null);
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
          terms_accepted: marketplaceTermsAccepted,
        },
      );
      setNotice(result.message);
      setSigningMarketplaceContract(null);
      setMarketplaceSignature("");
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

  const getStatusBadge = (rental: Rental) => {
    const s = rental.status.toUpperCase();
    switch (s) {
      case "PENDING":
        return {
          label: "⏳ Chờ Chủ máy (Owner) duyệt",
          className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "APPROVED":
      case "CONTRACT_PENDING": {
        const modStatus = rental.contract?.moderatorStatus;
        if (modStatus === "pending_approval") {
          return {
            label: "🔍 Hợp đồng cũ đang chờ kiểm tra",
            className: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          };
        }
        if (modStatus === "moderator_rejected") {
          return {
            label: "⚠️ Quản lý web yêu cầu sửa HĐ",
            className: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          };
        }
        if (
          rental.contract?.moderatorApproved ||
          ["pending_renter_signature", "moderator_approved"].includes(modStatus || "")
        ) {
          return {
            label: "📨 Owner đã gửi HĐ — Chờ bạn ký",
            className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          };
        }
        return {
          label: "📝 Đã duyệt đơn — Chờ Owner lập HĐ",
          className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      }
      case "CONTRACT_SIGNED":
      case "PAYMENT_PENDING":
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Quản Lý Đơn Thuê Của Bạn
            </h1>
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

        {marketplaceContracts.length > 0 && (
          <section className="mb-8 rounded-2xl border border-[#223049] bg-[#141d2d] p-5">
            <h2 className="mb-4 text-lg font-bold text-white">Đơn thuê marketplace & xác nhận nhận hàng</h2>
            <div className="space-y-3">
              {marketplaceContracts.map((contract) => {
                const handover = contract.handover_records?.find((record) => record.record_type === "handover");
                const isReceived = Boolean(handover?.renter_confirmed);
                return (
                  <div key={contract._id} className="flex flex-col gap-3 rounded-xl border border-[#273650] bg-[#0f1624] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">{contract.equipment_id?.title || contract.title}</p>
                      <p className="text-xs text-slate-400">
                        Hợp đồng {contract.contract_code} · Owner {typeof contract.owner_id === "object" ? contract.owner_id?.name : "—"} · {
                          contract.status === "pending_renter_signature" || contract.status === "moderator_approved"
                            ? "Chờ bạn ký"
                            : contract.status === "signed"
                            ? "Đã ký"
                            : contract.status
                        }
                      </p>
                    </div>
                    {isReceived ? (
                      <span className="text-sm font-semibold text-emerald-400">✓ Đã xác nhận nhận hàng</span>
                    ) : contract.status === "active" && handover ? (
                      <button
                        type="button"
                        onClick={() => setConfirmingReceiptContract(contract)}
                        disabled={confirmingReceiptId === contract._id}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {confirmingReceiptId === contract._id ? "Đang xác nhận..." : "Xác nhận đã nhận hàng"}
                      </button>
                    ) : contract.status === "pending_approval" ? (
                      <span className="text-xs text-sky-400">Quản lý web đang kiểm tra HĐ</span>
                    ) : ["pending_renter_signature", "moderator_approved"].includes(contract.status) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSigningMarketplaceContract(contract);
                          setMarketplaceTermsAccepted(false);
                          setMarketplaceSignature("");
                        }}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
                      >
                        Ký hợp đồng
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Chờ Owner bàn giao thiết bị</span>
                    )}
                  </div>
                );
              })}
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
              <label className="mb-3 flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={marketplaceTermsAccepted}
                  onChange={(event) => setMarketplaceTermsAccepted(event.target.checked)}
                  required
                />
                Tôi đã đọc và đồng ý với toàn bộ điều khoản của hợp đồng.
              </label>
              <label className="mb-4 grid gap-2 text-sm text-slate-300">
                Chữ ký điện tử / Họ và tên
                <input
                  className="input-field"
                  value={marketplaceSignature}
                  onChange={(event) => setMarketplaceSignature(event.target.value)}
                  required
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
              const statusBadge = getStatusBadge(r);
              const upperStatus = r.status.toUpperCase();

              const isContractSentToRenter = Boolean(
                r.contract?.moderatorApproved ||
                  ["pending_renter_signature", "moderator_approved"].includes(
                    r.contract?.moderatorStatus || "",
                  )
              );
              const isContractPendingReview = r.contract?.moderatorStatus === "pending_approval";
              const isContractRejected = r.contract?.moderatorStatus === "moderator_rejected";
              const canSign =
                (upperStatus === "APPROVED" || upperStatus === "CONTRACT_PENDING") &&
                isContractSentToRenter;
              const canPay =
                upperStatus === "CONTRACT_SIGNED" ||
                upperStatus === "PAYMENT_PENDING" ||
                upperStatus === "PAYMENT_REJECTED";
              const isPaymentVerifying = upperStatus === "PAYMENT_VERIFYING";
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
                upperStatus === "APPROVED" ||
                upperStatus === "CONTRACT_PENDING" ||
                upperStatus === "CONTRACT_SIGNED" ||
                upperStatus === "PAYMENT_PENDING" ||
                upperStatus === "PAYMENT_REJECTED";

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
                        {isPaymentVerifying && (
                          <span className="text-sky-300">
                            ⏳ Đã gửi CK QR ({r.payment?.transactionId || "Chờ đối chiếu"})
                          </span>
                        )}
                        {r.payment?.isPaid && (
                          <span className="text-emerald-400">
                            ✓ Moderator đã xác nhận thanh toán QR
                          </span>
                        )}
                      </div>

                      {upperStatus === "PAYMENT_REJECTED" && r.payment?.moderatorNote && (
                        <div className="mt-1.5 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                          <strong>Lý do Rental Moderator từ chối xác nhận:</strong>{" "}
                          {r.payment.moderatorNote}
                        </div>
                      )}
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
                      <div className="text-emerald-400">Tiền cọc: Miễn phí (0 đ)</div>
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

                    {/* Sign the contract after the Owner sends it directly. */}
                    {canSign ? (
                      <button
                        onClick={() => setSigningRental(r)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center flex items-center justify-center gap-1.5"
                      >
                        <span>✍️</span>
                        <span>Ký hợp đồng</span>
                      </button>
                    ) : (upperStatus === "APPROVED" || upperStatus === "CONTRACT_PENDING") ? (
                      <div className="px-3.5 py-2 bg-slate-800/90 border border-slate-700/60 rounded-xl text-center">
                        <span className="text-[11px] text-slate-300 flex items-center justify-center gap-1.5 font-medium">
                          <span>🔒</span>
                          {isContractPendingReview
                            ? "Hợp đồng cũ đang chờ kiểm tra"
                            : isContractRejected
                            ? "HĐ đang được sửa lại"
                            : "Chờ Owner lập HĐ"}
                        </span>
                      </div>
                    ) : null}

                    {/* Nút thanh toán QR (UC_R09) */}
                    {canPay && (
                      <button
                        onClick={() => setPayingRental(r)}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center flex items-center justify-center gap-1.5"
                      >
                        <span>💳</span>
                        <span>
                          {upperStatus === "PAYMENT_REJECTED"
                            ? "Quét QR & Gửi lại"
                            : "Quét QR Thanh toán"}
                        </span>
                      </button>
                    )}

                    {/* Đang chờ Moderator xác nhận thanh toán */}
                    {isPaymentVerifying && (
                      <div className="px-3.5 py-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-center">
                        <span className="text-[11px] text-sky-300 flex items-center justify-center gap-1.5 font-semibold">
                          <span>🔍</span> Chờ Moderator xác nhận
                        </span>
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
          onSuccess={(updatedRental) => {
            setSigningRental(null);
            setNotice(
              "Đã ký hợp đồng điện tử thành công! Vui lòng quét mã QR để thanh toán phí thuê thiết bị."
            );
            fetchHistory();
            if (updatedRental) {
              setPayingRental(updatedRental);
            }
          }}
        />
      )}

      {/* Modal Quét QR Thanh toán (UC_R09) */}
      {payingRental && (
        <PaymentQRModal
          rental={payingRental}
          token={token}
          isOpen={Boolean(payingRental)}
          defaultSenderName={user.name || ""}
          onClose={() => setPayingRental(null)}
          onSuccess={(message) => {
            setPayingRental(null);
            setNotice(message);
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
