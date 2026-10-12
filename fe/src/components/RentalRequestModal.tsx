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
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

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

  const rentalFee = totalDays * equipment.dailyRate;
  const depositAmount = equipment.depositAmount;
  const totalAmount = rentalFee + depositAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");

    if (!startDate || !endDate) {
      setError("Vui lòng chọn ngày bắt đầu và kết thúc.");
      return;
    }

    if (totalDays <= 0) {
      setError("Ngày kết thúc phải sau ngày bắt đầu ít nhất 1 ngày.");
      return;
    }

    setLoading(true);
    try {
      const res = await smartEquipApi.createRentalRequest(token, {
        equipmentId: equipment._id,
        startDate,
        endDate,
        deliveryAddress,
        notes,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#172033] border border-[#27344d] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#25324c]">
          <div>
            <h2 className="text-lg font-bold text-white">Gửi Yêu Cầu Thuê Thiết Bị</h2>
            <p className="text-xs text-slate-400 mt-0.5">{equipment.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#202c42]"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ngày bắt đầu thuê *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ngày trả thiết bị *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 text-xs"
                required
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Địa chỉ nhận máy / Giao nhận
            </label>
            <input
              type="text"
              placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP.HCM"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ghi chú thêm cho Chủ thiết bị
            </label>
            <textarea
              rows={2}
              placeholder="Nhu cầu sử dụng, thời gian mong muốn nhận máy..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
            />
          </div>

          {/* Calculation summary */}
          <div className="bg-[#121926] p-4 rounded-xl border border-[#202c40] space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Đơn giá thuê:</span>
              <span className="text-white font-medium">
                {equipment.dailyRate.toLocaleString("vi-VN")} đ / ngày
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Số ngày thuê:</span>
              <span className="text-white font-medium">{totalDays} ngày</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tiền thuê:</span>
              <span className="text-white font-medium">
                {rentalFee.toLocaleString("vi-VN")} đ
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tiền đặt cọc (hoàn lại):</span>
              <span className="text-white font-medium">
                {depositAmount.toLocaleString("vi-VN")} đ
              </span>
            </div>
            <div className="pt-2 border-t border-[#222f46] flex justify-between font-bold text-sm">
              <span className="text-slate-200">Tổng tạm tính:</span>
              <span className="text-orange-400 text-base">
                {totalAmount.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-[#202a3f] hover:bg-[#2b3752] text-slate-300 font-semibold rounded-xl text-xs transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || totalDays <= 0}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-600/30"
            >
              {loading ? "Đang kiểm tra lịch & tạo đơn..." : "Gửi yêu cầu thuê →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
