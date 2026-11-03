import { useState } from "react";
import { useAuth } from "../app/AuthProvider";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Equipment, Rental } from "../types/smartequip";

interface Props {
  equipment: Equipment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rental: Rental) => void;
}

export default function RentalRequestModal({
  equipment,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const { token, user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || "");
  const [renterNote, setRenterNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Tính số ngày thuê
  let totalDays = 0;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end > start) {
      totalDays = Math.ceil(
        Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
  }

  const dailyRate = equipment.dailyRate || 0;

  // Giảm giá thuê dài hạn (>= 7 ngày giảm 10%, >= 30 ngày giảm 20%)
  let discountRate = 0;
  let discountLabel = "";
  if (totalDays >= 30) {
    discountRate = 0.2;
    discountLabel = "Giảm 20% (Thuê dài ngày >= 30 ngày)";
  } else if (totalDays >= 7) {
    discountRate = 0.1;
    discountLabel = "Giảm 10% (Thuê tuần >= 7 ngày)";
  }

  const subtotalRentalFee = dailyRate * totalDays;
  const discountAmount = Math.round(subtotalRentalFee * discountRate);
  const rentalFee = subtotalRentalFee - discountAmount;
  const totalAmount = rentalFee; // Tổng tiền chỉ gồm tiền thuê, không cộng tiền cọc

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");

    if (!startDate || !endDate) {
      setError("Vui lòng chọn ngày bắt đầu và kết thúc thuê.");
      return;
    }

    if (totalDays <= 0) {
      setError("Ngày kết thúc phải sau ngày bắt đầu ít nhất 1 ngày.");
      return;
    }

    if (!deliveryAddress.trim()) {
      setError("Vui lòng nhập địa chỉ nhận thiết bị.");
      return;
    }

    setLoading(true);
    try {
      const res = await smartEquipApi.createRentalRequest(token, {
        equipmentId: equipment._id,
        startDate,
        endDate,
        deliveryAddress: deliveryAddress.trim(),
        renterNote: renterNote.trim(),
      });
      onSuccess(res.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tạo yêu cầu thuê thiết bị",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141d2d] border border-[#263550] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#212c42]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📋</span> Đăng Ký Yêu Cầu Thuê Thiết Bị
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Thiết bị: <span className="text-orange-400 font-medium">{equipment.title}</span>
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

        {/* Workflow Guide Notice */}
        <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <span>ℹ️</span> Quy trình thuê thiết bị:
          </p>
          <p className="text-[11px] text-blue-300/90 leading-relaxed">
            1. Bạn gửi yêu cầu tới <strong>Chủ máy (Owner)</strong> → 2. Chủ máy kiểm tra thiết bị & soạn Hợp đồng gửi <strong>Quản lý web (Moderator)</strong> duyệt → 3. Bạn ký hợp đồng bằng <strong>chữ ký tay điện tử</strong> & thanh toán chuyển khoản <strong>VietQR MB Bank</strong> (Miễn phí cọc) → 4. Nhận máy tại địa chỉ giao hàng.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pt-3 text-xs">
          {/* Start and End date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Ngày bắt đầu thuê *
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Ngày kết thúc thuê *
              </label>
              <input
                type="date"
                min={startDate || new Date().toISOString().split("T")[0]}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 text-xs"
                required
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Địa chỉ nhận máy / Giao hàng *
            </label>
            <input
              type="text"
              placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
              required
            />
          </div>

          {/* Renter Note */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Ghi chú thêm cho Chủ máy (Tùy chọn)
            </label>
            <textarea
              rows={2}
              placeholder="Thời gian nhận máy mong muốn, yêu cầu phụ kiện đi kèm..."
              value={renterNote}
              onChange={(e) => setRenterNote(e.target.value)}
              className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
            />
          </div>

          {/* Price Calculation breakdown */}
          <div className="bg-[#101725] p-3.5 rounded-xl border border-[#1e2a40] space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Đơn giá niêm yết:</span>
              <span className="text-white font-medium">
                {dailyRate.toLocaleString("vi-VN")} đ / ngày
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Số ngày thuê:</span>
              <span className="text-white font-bold">{totalDays} ngày</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tiền thuê gốc:</span>
              <span className="text-white font-medium">
                {subtotalRentalFee.toLocaleString("vi-VN")} đ
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <span>🏷️ {discountLabel}:</span>
                <span>-{discountAmount.toLocaleString("vi-VN")} đ</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-400">
              <span>Tiền cọc bảo đảm:</span>
              <span className="text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                0 đ (Miễn cọc)
              </span>
            </div>

            <div className="pt-2 border-t border-[#202c42] flex justify-between items-baseline font-bold text-sm">
              <span className="text-slate-200">Tổng thanh toán dự kiến:</span>
              <span className="text-orange-400 text-base">
                {totalAmount.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#212c42]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-[#202d45] hover:bg-[#2b3c5c] text-slate-300 font-semibold rounded-xl text-xs transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || totalDays <= 0}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-600/30 flex items-center gap-1.5"
            >
              {loading ? "Đang gửi yêu cầu..." : "Gửi yêu cầu thuê tới Chủ máy ➔"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
