import { useState } from "react";
import type { Rental } from "../types/smartequip";
import { ownerApi } from "../services/ownerApi";
import { DELIVERY_OPTIONS, RETURN_OPTIONS } from "../constants/deliveryMethods";

interface Props {
  rental: Rental;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedRental: Rental) => void;
}

export default function OwnerEditContractModal({
  rental,
  token,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [contractTerms, setContractTerms] = useState(
    rental.contract?.contractTerms || ""
  );

  const initialStartDate = rental.startDate
    ? new Date(rental.startDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const initialEndDate = rental.endDate
    ? new Date(rental.endDate).toISOString().slice(0, 10)
    : new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [deliveryTime, setDeliveryTime] = useState(rental.deliveryTime || "09:00");
  const [returnTime, setReturnTime] = useState(rental.returnTime || "17:00");

  const [dailyRate, setDailyRate] = useState<number>(rental.dailyRate || 100000);
  const [totalDays, setTotalDays] = useState<number>(rental.totalDays || 1);
  const [depositAmount, setDepositAmount] = useState<number>(rental.depositAmount || 0);
  const [discountAmount, setDiscountAmount] = useState<number>(rental.discountAmount || 0);
  const [shippingFee, setShippingFee] = useState<number>(rental.shippingFee || 30000);

  const [deliveryAddress, setDeliveryAddress] = useState(rental.deliveryAddress || "");
  const [deliveryMethod, setDeliveryMethod] = useState(rental.deliveryMethod || "motorcycle");
  const [returnMethod, setReturnMethod] = useState(rental.returnMethod || "motorcycle");

  const [changeSummary, setChangeSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Tự động tính tiền thuê và tổng thanh toán khi thay đổi ngày hoặc đơn giá
  const calculatedRentalFee = dailyRate * totalDays;
  const calculatedTotalAmount = Math.max(
    0,
    calculatedRentalFee + depositAmount + shippingFee - discountAmount
  );

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && endDate) {
      const s = new Date(val).getTime();
      const e = new Date(endDate).getTime();
      const diff = Math.max(1, Math.round((e - s) / 86400000));
      setTotalDays(diff);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val) {
      const s = new Date(startDate).getTime();
      const e = new Date(val).getTime();
      const diff = Math.max(1, Math.round((e - s) / 86400000));
      setTotalDays(diff);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (dailyRate < 2000) {
      setError("Thiết lập đơn giá cho thuê theo ngày phải từ 2.000 VNĐ trở lên.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        contractTerms: contractTerms.trim(),
        dailyRate,
        totalDays,
        rentalFee: calculatedRentalFee,
        depositAmount,
        discountAmount,
        shippingFee,
        totalAmount: calculatedTotalAmount,
        startDate,
        endDate,
        deliveryTime,
        returnTime,
        deliveryAddress: deliveryAddress.trim(),
        deliveryMethod,
        returnMethod,
        changeSummary:
          changeSummary.trim() ||
          "Chủ máy đã cập nhật lại điều khoản hợp đồng & biểu phí theo thỏa thuận.",
      };

      const res = await ownerApi.updateOwnerRentalContractTerms(token, rental._id, payload);
      onSuccess(res.rental || { ...rental, ...payload });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Không thể cập nhật hợp đồng");
    } finally {
      setLoading(false);
    }
  };

  // Các gợi ý điều khoản nhanh
  const quickTerms = [
    "Miễn 100% phí ship chiều về cho khách thuê",
    "Được dời hạn trả thêm 2 tiếng không tính phụ phí trễ",
    "Tặng kèm 1 thẻ nhớ 128GB tốc độ cao và 1 pin dự phòng",
    "Giảm thêm 50.000 đ tiền thuê theo thỏa thuận",
    "Bên thuê được kiểm tra máy trực tiếp 15 phút trước khi nhận",
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121a29] border border-[#233550] w-full max-w-2xl rounded-2xl p-5 shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#202f48]">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <h3 className="font-extrabold text-white text-base">
                Chỉnh Sửa Điều Khoản & Biểu Phí Hợp Đồng
              </h3>
              <p className="text-xs text-slate-400">
                Đơn thuê: <strong className="text-amber-400 font-mono">#{rental.rentalCode}</strong> • Khách:{" "}
                <strong className="text-slate-200">{typeof rental.renter === "object" ? rental.renter?.name : "Khách thuê"}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a263d] transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-950/70 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center gap-2 font-medium">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 text-xs pr-1">
          {/* Section 1: Thời gian thuê & Giờ hẹn */}
          <div className="bg-[#152136] p-3 rounded-xl border border-[#213350] space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-cyan-300 flex items-center gap-1.5">
              <span>📅</span> 1. Thời Gian Thuê & Khung Giờ Giao Nhận
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ngày bắt đầu thuê:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Giờ nhận máy:</label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ngày trả máy:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Giờ trả máy:</label>
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Biểu phí & Tiền thuê */}
          <div className="bg-[#152136] p-3 rounded-xl border border-[#213350] space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-amber-300 flex items-center gap-1.5">
              <span>💰</span> 2. Biểu Phí & Tổng Tiền Thanh Toán
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Đơn giá / ngày (đ) <span className="text-xs font-normal text-emerald-400">(&ge; 2.000 đ)</span>:
                </label>
                <input
                  type="number"
                  min="2000"
                  step="any"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Math.max(0, Number(e.target.value)))}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") e.preventDefault();
                  }}
                  className={`w-full bg-[#0d1524] border ${
                    dailyRate < 2000 ? "border-rose-500 focus:border-rose-500" : "border-[#2a3c5a] focus:border-amber-400"
                  } rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none`}
                  required
                />
                {dailyRate < 2000 && (
                  <span className="text-rose-400 text-[11px] mt-1 block">
                    ⚠️ Giá thuê phải từ 2.000 đ trở lên
                  </span>
                )}
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Số ngày thuê:</label>
                <input
                  type="number"
                  min="1"
                  value={totalDays}
                  onChange={(e) => setTotalDays(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tiền thuê thực tính (đ):</label>
                <div className="bg-[#0b101c] border border-[#24344d] rounded-lg px-3 py-1.5 text-amber-300 font-bold font-mono">
                  {calculatedRentalFee.toLocaleString("vi-VN")} đ
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phí vận chuyển (đ):</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value)))}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") e.preventDefault();
                  }}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Giảm giá / Ưu đãi (đ):</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") e.preventDefault();
                  }}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-emerald-400 font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tiền cọc (đ):</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value)))}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") e.preventDefault();
                  }}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Tổng cộng */}
            <div className="p-2.5 bg-[#0e1726] rounded-lg border border-amber-500/30 flex items-center justify-between">
              <span className="font-bold text-slate-200">Tổng thanh toán hiển thị trên HĐ:</span>
              <strong className="text-sm font-extrabold text-amber-400 font-mono">
                {calculatedTotalAmount.toLocaleString("vi-VN")} đ
              </strong>
            </div>
          </div>

          {/* Section 3: Phương thức & Địa chỉ giao nhận */}
          <div className="bg-[#152136] p-3 rounded-xl border border-[#213350] space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-teal-300 flex items-center gap-1.5">
              <span>🚚</span> 3. Địa Chỉ & Phương Thức Vận Chuyển
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phương thức nhận máy:</label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-teal-400"
                >
                  {DELIVERY_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.icon} {o.label} (+{o.fee.toLocaleString("vi-VN")} đ)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phương thức trả máy:</label>
                <select
                  value={returnMethod}
                  onChange={(e) => setReturnMethod(e.target.value)}
                  className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-teal-400"
                >
                  {RETURN_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.icon} {o.label} (+{o.fee.toLocaleString("vi-VN")} đ)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Địa chỉ giao nhận máy:</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"
                className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          {/* Section 4: Điều khoản cam kết bổ sung do Owner & Renter thỏa thuận */}
          <div className="bg-[#152136] p-3 rounded-xl border border-[#213350] space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-purple-300 flex items-center gap-1.5">
              <span>📜</span> 4. Điều Khoản & Cam Kết Thỏa Thuận Bổ Sung (In trực tiếp vào Mục IV HĐ)
            </h4>
            <textarea
              rows={3}
              value={contractTerms}
              onChange={(e) => setContractTerms(e.target.value)}
              placeholder="Nhập điều khoản riêng đã thương lượng với khách (VD: Miễn phí ship chiều về, tặng pin sạc dự phòng, hỗ trợ hướng dẫn sử dụng máy...)"
              className="w-full bg-[#0d1524] border border-[#2a3c5a] rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 leading-relaxed"
            />
            {/* Gợi ý điều khoản nhanh */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickTerms.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setContractTerms((prev) => (prev ? `${prev}. ${t}` : t));
                  }}
                  className="px-2 py-0.5 rounded bg-[#0b101c] hover:bg-purple-900/40 border border-purple-500/30 text-[10.5px] text-purple-200 transition-all cursor-pointer"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Tóm tắt nội dung thay đổi để tự động gửi vào khung Chat */}
          <div className="bg-gradient-to-r from-orange-950/40 to-slate-900 p-3 rounded-xl border border-orange-500/40 space-y-1.5">
            <label className="block text-white font-bold text-[11px] flex items-center gap-1">
              <span>💬</span> Tóm tắt nội dung thay đổi (Tự động gửi tin nhắn thông báo vào Khung Chat):
            </label>
            <input
              type="text"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="VD: Đã giảm 50k tiền thuê và tặng thêm pin dự phòng theo thỏa thuận."
              className="w-full bg-[#0d1524] border border-orange-500/50 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-400"
            />
            <p className="text-[10px] text-slate-400">
              * Khách thuê sẽ ngay lập tức nhận được tin nhắn trong chat kèm thẻ hợp đồng mới nhất để kiểm tra & xác nhận.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#202f48]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-[#1b2537] hover:bg-[#253550] text-slate-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-orange-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Đang lưu & gửi chat...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Lưu & Gửi Hợp Đồng Mới Vào Chat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

