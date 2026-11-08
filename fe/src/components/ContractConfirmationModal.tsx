import { useState } from "react";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Rental } from "../types/smartequip";

interface Props {
  rental: Rental;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedRental: Rental) => void;
}

export default function ContractConfirmationModal({
  rental,
  token,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Vui lòng tích chọn đồng ý với các điều khoản của hợp đồng thuê.");
      return;
    }
    if (!signature.trim()) {
      setError("Vui lòng nhập chữ ký / Họ và tên để ký hợp đồng điện tử.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await smartEquipApi.confirmContract(token, rental._id, {
        termsAccepted: true,
        renterSignature: signature.trim(),
        digitalSignature: signature.trim(),
      });
      onSuccess(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể ký hợp đồng");
    } finally {
      setLoading(false);
    }
  };

  const renterName =
    typeof rental.renter === "object" && rental.renter !== null
      ? rental.renter.name
      : "Người thuê SmartEquip";

  const ownerName =
    typeof rental.owner === "object" && rental.owner !== null
      ? rental.owner.name
      : "Chủ sở hữu thiết bị";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141d2d] border border-[#263550] w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#212c42]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>✍️</span> Hợp Đồng Thuê Thiết Bị Điện Tử
            </h2>
            <p className="text-xs text-orange-400 mt-0.5">
              Mã đơn: <strong className="font-mono">{rental.rentalCode}</strong> | Mã HĐ:{" "}
              <strong className="font-mono">
                {rental.contract?.contractNumber || `HD-${rental.rentalCode}`}
              </strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1f2b3e]"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Contract Text Body */}
        <div className="flex-1 overflow-y-auto my-4 p-5 rounded-xl bg-[#0f1624] border border-[#1e2a40] text-xs text-slate-300 space-y-4 leading-relaxed">
          {/* Owner sent the contract to the renter for signature. */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-2 font-semibold">
              <span>📨</span> Owner đã gửi hợp đồng trực tiếp cho bạn ký
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              {rental.contract?.contractNumber || `HD-${rental.rentalCode}`}
            </span>
          </div>

          <div className="text-center pb-3 border-b border-[#212d42]">
            <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h3>
            <p className="text-[11px] text-slate-400 italic">Độc lập - Tự do - Hạnh phúc</p>
            <h4 className="font-extrabold text-sm text-orange-400 mt-2 uppercase">
              HỢP ĐỒNG THUÊ THIẾT BỊ
            </h4>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#172236] rounded-xl border border-[#24334e]">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                BÊN CHO THUÊ (BÊN A)
              </span>
              <p className="font-bold text-white text-xs mt-0.5">{ownerName}</p>
              <p className="text-[11px] text-slate-400">
                Email: {typeof rental.owner === "object" ? rental.owner?.email : "Chủ máy"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                BÊN THUÊ (BÊN B)
              </span>
              <p className="font-bold text-white text-xs mt-0.5">{renterName}</p>
              <p className="text-[11px] text-slate-400">
                Địa chỉ nhận: {rental.deliveryAddress || "Địa chỉ mặc định"}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="p-3.5 bg-[#172236] rounded-xl border border-[#24334e] space-y-1.5">
            <p>
              <strong className="text-slate-200">Thiết bị thuê:</strong>{" "}
              <span className="text-orange-400 font-bold">{rental.equipment?.title}</span>
            </p>
            <p>
              <strong className="text-slate-200">Thời gian thuê:</strong> Từ ngày{" "}
              <span className="text-white font-medium">
                {new Date(rental.startDate).toLocaleDateString("vi-VN")}
              </span>{" "}
              đến ngày{" "}
              <span className="text-white font-medium">
                {new Date(rental.endDate).toLocaleDateString("vi-VN")}
              </span>{" "}
              (Tổng: <strong className="text-white">{rental.totalDays} ngày</strong>)
            </p>
            <div className="pt-2 border-t border-[#23314c] grid grid-cols-3 gap-2 text-center text-[11px]">
              <div>
                <span className="text-slate-400 block">Tiền thuê</span>
                <span className="text-white font-bold">{rental.rentalFee.toLocaleString("vi-VN")} đ</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tiền cọc</span>
                <span className="text-emerald-400 font-bold">Miễn phí (0 đ)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tổng thanh toán</span>
                <span className="text-orange-400 font-bold text-xs">{rental.totalAmount.toLocaleString("vi-VN")} đ</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-[#24334e] bg-[#172236] p-3.5">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">
              ĐIỀU KHOẢN HỢP ĐỒNG:
            </h5>
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-400">
              {rental.contract?.contractTerms ||
                "Người thuê cam kết bảo quản thiết bị, hoàn trả đúng hạn và chịu trách nhiệm đối với hư hỏng do lỗi chủ quan."}
            </p>
          </div>
        </div>

        {/* E-Signature Form */}
        <form onSubmit={handleSignContract} className="pt-3 border-t border-[#212c42] space-y-3">
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="rounded accent-orange-500 w-4 h-4 cursor-pointer"
            />
            <span>Tôi đã đọc kỹ, hiểu rõ và đồng ý toàn bộ điều khoản trong hợp đồng thuê trên.</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Ký tên điện tử (Nhập đầy đủ Họ và tên của bạn) *
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-[#202d45] hover:bg-[#2b3c5c] text-slate-300 font-semibold rounded-xl text-xs transition-all"
              >
                Để sau
              </button>
              <button
                type="submit"
                disabled={loading || !termsAccepted || !signature.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                {loading ? "Đang xác nhận..." : "✍️ Ký & Xác Nhận Hợp Đồng"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
