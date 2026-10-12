import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Navbar from "../components/Navbar";
import ContractConfirmationModal from "../components/ContractConfirmationModal";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Rental } from "../types/smartequip";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  contract_pending: { label: "Chờ ký hợp đồng", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  payment_pending: { label: "Chờ thanh toán", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  confirmed: { label: "Đã xác nhận", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  in_progress: { label: "Đang thuê", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  return_requested: { label: "Chờ xác nhận trả", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  completed: { label: "Đã hoàn thành", color: "bg-slate-500/10 text-slate-300 border-slate-500/20" },
  cancelled: { label: "Đã hủy", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  disputed: { label: "Đang khiếu nại", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function RentalHistoryPage() {
  const { user, token, isLoading } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Modal ký hợp đồng (UC_R08)
  const [signingRental, setSigningRental] = useState<Rental | null>(null);

  // Modal hủy đơn (UC_R13)
  const [cancellingRentalId, setCancellingRentalId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Modal trả thiết bị (UC_R10)
  const [returningRentalId, setReturningRentalId] = useState<string | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [isReturning, setIsReturning] = useState(false);

  // Modal đánh giá (UC_R11)
  const [reviewingRentalId, setReviewingRentalId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Modal khiếu nại (UC_R14)
  const [disputingRentalId, setDisputingRentalId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [isDisputing, setIsDisputing] = useState(false);

  // Xử lý thanh toán (UC_R09)
  const [payingRentalId, setPayingRentalId] = useState<string | null>(null);

  const fetchHistory = () => {
    if (!token) return;
    setLoading(true);
    smartEquipApi
      .getRentalHistory(token)
      .then((res) => setRentals(res.data))
      .catch((err) => setError(err.message || "Không thể tải lịch sử thuê"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  if (isLoading) {
    return <div className="app-loading">Đang tải...</div>;
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Xử lý Hủy đơn (UC_R13)
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingRentalId || !cancelReason.trim()) return;
    setIsCancelling(true);
    setError("");
    setNotice("");
    try {
      const res = await smartEquipApi.cancelRental(token, cancellingRentalId, {
        reason: cancelReason.trim(),
      });
      setNotice(res.message);
      setCancellingRentalId(null);
      setCancelReason("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hủy yêu cầu thuê");
    } finally {
      setIsCancelling(false);
    }
  };

  // Xử lý Thanh toán (UC_R09)
  const handlePay = async (rentalId: string) => {
    setPayingRentalId(rentalId);
    setError("");
    setNotice("");
    try {
      const res = await smartEquipApi.payRental(token, rentalId, {
        paymentMethod: "vnpay",
      });
      setNotice(res.message);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thanh toán");
    } finally {
      setPayingRentalId(null);
    }
  };

  // Xử lý Trả máy (UC_R10)
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningRentalId) return;
    setIsReturning(true);
    setError("");
    try {
      const res = await smartEquipApi.requestReturn(token, returningRentalId, {
        returnNotes,
      });
      setNotice(res.message);
      setReturningRentalId(null);
      setReturnNotes("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu trả");
    } finally {
      setIsReturning(false);
    }
  };

  // Xử lý Đánh giá (UC_R11)
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
      setNotice(res.message);
      setReviewingRentalId(null);
      setReviewComment("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi đánh giá");
    } finally {
      setIsReviewing(false);
    }
  };

  // Xử lý Khiếu nại (UC_R14)
  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingRentalId || !disputeReason.trim()) return;
    setIsDisputing(true);
    setError("");
    try {
      const res = await smartEquipApi.submitDispute(token, disputingRentalId, {
        reason: disputeReason.trim(),
      });
      setNotice(res.message);
      setDisputingRentalId(null);
      setDisputeReason("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi khiếu nại");
    } finally {
      setIsDisputing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1623] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white">
              Lịch Sử Thuê & Hợp Đồng
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Quản lý các yêu cầu thuê, ký hợp đồng điện tử, thanh toán và gửi yêu cầu trả thiết bị
            </p>
          </div>
          <Link
            to="/equipment"
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all self-start sm:self-auto"
          >
            + Thuê thêm thiết bị
          </Link>
        </div>

        {notice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
            <span>✅ {notice}</span>
            <button onClick={() => setNotice("")} className="text-xs text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")} className="text-xs text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm">Đang tải danh sách đơn thuê...</p>
          </div>
        ) : rentals.length === 0 ? (
          <div className="py-20 text-center bg-[#151e2f] rounded-2xl border border-[#232e44] p-8 space-y-3">
            <div className="text-5xl">📋</div>
            <h3 className="text-lg font-bold text-white">Bạn chưa có yêu cầu thuê nào</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Khám phá danh sách thiết bị công nghệ và tạo yêu cầu thuê đầu tiên ngay hôm nay!
            </p>
            <Link
              to="/equipment"
              className="inline-block mt-3 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs"
            >
              Khám phá thiết bị ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rentals.map((r) => {
              const statusBadge = STATUS_LABELS[r.status] || {
                label: r.status,
                color: "bg-slate-500/10 text-slate-300 border-slate-500/20",
              };
              const canCancel = ["contract_pending", "payment_pending", "confirmed"].includes(r.status);
              const canReturn = ["confirmed", "in_progress"].includes(r.status);
              const canReview = ["return_requested", "completed"].includes(r.status) && !r.review?.rating;
              const canDispute = ["confirmed", "in_progress", "return_requested"].includes(r.status) && r.status !== "disputed";

              return (
                <div
                  key={r._id}
                  className="bg-[#151e2f] border border-[#243048] rounded-2xl p-5 hover:border-[#2f3d5a] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  {/* Left: Equipment & Rental code */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-20 h-20 rounded-xl bg-[#1d273c] border border-[#26344d] overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {r.equipment?.images && r.equipment.images.length > 0 ? (
                        <img
                          src={r.equipment.images[0]}
                          alt={r.equipment.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-slate-600">📷</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-orange-400">
                          #{r.rentalCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.color}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-white">
                        {r.equipment?.title || "Thiết bị"}
                      </h3>

                      <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Thời gian: <strong className="text-slate-300">{new Date(r.startDate).toLocaleDateString("vi-VN")} - {new Date(r.endDate).toLocaleDateString("vi-VN")}</strong> ({r.totalDays} ngày)
                        </span>
                        <span>
                          Chủ máy: <strong className="text-slate-300">{r.owner?.name}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Amount */}
                  <div className="bg-[#121927] p-3 rounded-xl border border-[#202c40] flex lg:flex-col justify-between items-end gap-1 min-w-[160px]">
                    <span className="text-xs text-slate-400">Tổng thanh toán:</span>
                    <span className="text-base font-extrabold text-orange-400">
                      {r.totalAmount.toLocaleString("vi-VN")} đ
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (Cọc: {r.depositAmount.toLocaleString("vi-VN")} đ)
                    </span>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch min-w-[150px]">
                    {/* Nút ký hợp đồng (UC_R08) */}
                    {r.status === "contract_pending" && (
                      <button
                        onClick={() => setSigningRental(r)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center"
                      >
                        ✍️ Ký hợp đồng
                      </button>
                    )}

                    {/* Nút thanh toán (UC_R09) */}
                    {r.status === "payment_pending" && (
                      <button
                        onClick={() => handlePay(r._id)}
                        disabled={payingRentalId === r._id}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center"
                      >
                        {payingRentalId === r._id ? "Đang xử lý..." : "💳 Thanh toán"}
                      </button>
                    )}

                    {/* Nút yêu cầu trả thiết bị (UC_R10) */}
                    {canReturn && (
                      <button
                        onClick={() => setReturningRentalId(r._id)}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all text-center"
                      >
                        📦 Trả thiết bị
                      </button>
                    )}

                    {/* Nút đánh giá (UC_R11) */}
                    {canReview && (
                      <button
                        onClick={() => setReviewingRentalId(r._id)}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all text-center"
                      >
                        ⭐ Đánh giá
                      </button>
                    )}

                    {/* Nút khiếu nại (UC_R14) */}
                    {canDispute && (
                      <button
                        onClick={() => setDisputingRentalId(r._id)}
                        className="px-3 py-2 bg-[#251f28] hover:bg-red-900/30 text-rose-400 font-semibold rounded-xl text-xs border border-rose-900/40 text-center"
                      >
                        ⚠️ Khiếu nại
                      </button>
                    )}

                    {/* Nút hủy yêu cầu (UC_R13) */}
                    {canCancel && (
                      <button
                        onClick={() => setCancellingRentalId(r._id)}
                        className="px-3 py-2 bg-[#212c42] hover:bg-rose-900/30 text-rose-300 font-semibold rounded-xl text-xs border border-[#2b3752] text-center"
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
            setNotice("Ký hợp đồng thành công! Đơn thuê đã chuyển sang trạng thái chờ thanh toán.");
            fetchHistory();
          }}
        />
      )}

      {/* Modal Hủy yêu cầu (UC_R13) */}
      {cancellingRentalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#172033] border border-[#27344d] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white">Xác Nhận Hủy Yêu Cầu Thuê</h3>
            <p className="text-xs text-slate-400">
              Vui lòng cung cấp lý do hủy yêu cầu. Nếu bạn đã thanh toán, tiền cọc và tiền thuê sẽ được hoàn lại theo chính sách.
            </p>
            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Nhập lý do hủy..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingRentalId(null)}
                  className="px-4 py-2 bg-[#202a3f] text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || !cancelReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs"
                >
                  {isCancelling ? "Đang hủy..." : "Xác nhận hủy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Trả thiết bị (UC_R10) */}
      {returningRentalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#172033] border border-[#27344d] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white">Yêu Cầu Hoàn Trả Thiết Bị</h3>
            <p className="text-xs text-slate-400">
              Xác nhận bạn đã chuẩn bị bàn giao lại thiết bị cùng đầy đủ phụ kiện cho Chủ máy.
            </p>
            <form onSubmit={handleReturnSubmit} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Ghi chú thêm về tình trạng máy lúc bàn giao..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturningRentalId(null)}
                  className="px-4 py-2 bg-[#202a3f] text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isReturning}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
                >
                  {isReturning ? "Đang gửi..." : "Gửi yêu cầu trả"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đánh giá (UC_R11) */}
      {reviewingRentalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#172033] border border-[#27344d] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white">Đánh Giá Thiết Bị & Chủ Sở Hữu</h3>
            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Số sao (1 - 5 sao)</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl p-2.5 text-xs text-white"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5/5) - Rất hài lòng</option>
                  <option value={4}>⭐⭐⭐⭐ (4/5) - Hài lòng</option>
                  <option value={3}>⭐⭐⭐ (3/5) - Bình thường</option>
                  <option value={2}>⭐⭐ (2/5) - Chưa tốt</option>
                  <option value={1}>⭐ (1/5) - Thất vọng</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nhận xét chi tiết</label>
                <textarea
                  rows={3}
                  placeholder="Chất lượng thiết bị, độ nhiệt tình của chủ máy..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingRentalId(null)}
                  className="px-4 py-2 bg-[#202a3f] text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isReviewing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#172033] border border-[#27344d] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white">Gửi Khiếu Nại Tranh Chấp</h3>
            <p className="text-xs text-slate-400">
              Đội ngũ SmartEquip sẽ can thiệp điều tra và hỗ trợ giải quyết tranh chấp công bằng cho cả hai bên.
            </p>
            <form onSubmit={handleDisputeSubmit} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Mô tả cụ thể sự cố (VD: Thiết bị giao không đúng mô tả, lỗi kỹ thuật có sẵn...)"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputingRentalId(null)}
                  className="px-4 py-2 bg-[#202a3f] text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Đóng
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
    </div>
  );
}
