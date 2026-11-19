import React, { useState, useEffect } from "react";
import type { TradeInQuoteResult, ValuationModelPreset } from "../../types/preOwned";
import { preOwnedApi } from "../../services/preOwnedApi";

interface Props {
  onClose: () => void;
}

export const CameraTradeInModal: React.FC<Props> = ({ onClose }) => {
  const [models, setModels] = useState<Record<string, ValuationModelPreset>>({});
  const [selectedKey, setSelectedKey] = useState<string>("sony_a7_iv");
  const [yearsUsed, setYearsUsed] = useState<number>(1.5);
  const [shutterCount, setShutterCount] = useState<number>(18500);
  const [conditionGrade, setConditionGrade] = useState<string>("excellent_95");
  const [sensorCondition, setSensorCondition] = useState<string>("flawless_clean");

  const [quote, setQuote] = useState<TradeInQuoteResult | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const data = await preOwnedApi.getValuationModels();
      setModels(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    calculateValuation();
  }, [selectedKey, yearsUsed, shutterCount, conditionGrade, sensorCondition]);

  const calculateValuation = async () => {
    try {
      const res = await preOwnedApi.calculateValuation({
        cameraKey: selectedKey,
        yearsUsed,
        shutterCount,
        conditionGrade,
        sensorCondition,
      });
      setQuote(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimVoucher = () => {
    setSubmitted(true);
    setTimeout(() => {
      alert(`🎉 Đã tạo yêu cầu Trade-In thành công! Bạn nhận được Voucher thuê thiết bị trị giá ${(quote?.rentalCreditVoucherQuote || 0).toLocaleString("vi-VN")} đ. Nhân viên kiểm định SmartEquip sẽ liên hệ trong 30 phút.`);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              🔄 SmartEquip Trade-In Engine
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              Thẩm Định Giá Máy Ảnh Cũ & Thu Cũ Đổi Mới
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Định giá tức thì dựa trên số shot, độ hao mòn cơ học và thị trường thứ cấp
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Input Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/70 p-5 rounded-2xl border border-slate-800/80 text-xs">
          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold block">Chọn Dòng Máy Ảnh Của Bạn:</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
            >
              {Object.entries(models).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.brand} {item.model} (Mới: {(item.baseNewPriceVnd / 1000000).toFixed(0)}tr)
                </option>
              ))}
            </select>
          </div>

          {/* Years of Use */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold">
              <span className="text-slate-300">Thời Gian Đã Sử Dụng:</span>
              <span className="text-emerald-400">{yearsUsed} Năm</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={yearsUsed}
              onChange={(e) => setYearsUsed(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Shutter Count */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold">
              <span className="text-slate-300">Số Shot Chụp Màn Trập:</span>
              <span className="text-cyan-400">{shutterCount.toLocaleString()} shots</span>
            </div>
            <input
              type="range"
              min="1000"
              max="150000"
              step="1000"
              value={shutterCount}
              onChange={(e) => setShutterCount(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Cosmetic Condition */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold block">Tình Trạng Ngoại Quan:</label>
            <select
              value={conditionGrade}
              onChange={(e) => setConditionGrade(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="like_new_99">Like New 99% - Đẹp keng, không tì vết</option>
              <option value="excellent_95">Tuyệt đẹp 95% - Trầy xước lông mèo cực nhẹ</option>
              <option value="good_90">Tốt 90% - Có xước dăm quanh đáy chân tripod</option>
              <option value="fair_85">Khá 85% - Cũ theo thời gian, cao su hơi bóng</option>
              <option value="cosmetic_wear_80">Trầy xước nhiều 80% - Hoạt động bình thường</option>
            </select>
          </div>

          {/* Sensor Condition */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-slate-300 font-bold block">Tình Trạng Cảm Biến Sensor:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: "flawless_clean", label: "✨ Sạch bóng 100%" },
                { key: "minor_dust", label: "💨 Bụi nhẹ thổi bay" },
                { key: "cleaned_certified", label: "🧼 Đã vệ sinh Lab" },
                { key: "micro_scratches", label: "⚠️ Xước nhẹ bề mặt" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSensorCondition(item.key)}
                  className={`p-2 rounded-xl text-center font-semibold transition ${
                    sensorCondition === item.key
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Valuation Result Cards */}
        {quote && (
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Kết Quả Thẩm Định Giá Tức Thì:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Cash Payout */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">Tiền Mặt Nhận Ngay</span>
                  <div className="text-2xl font-black text-slate-200 mt-1">
                    {quote.cashPayoutQuote.toLocaleString("vi-VN")} đ
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Nhận chuyển khoản ngân hàng trong 15 phút sau khi kiểm tra máy
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800">
                  Khấu hao màn trập: <strong className="text-slate-200">{quote.shutterWearPercentage}% định mức</strong>
                </div>
              </div>

              {/* Option B: Rental Voucher (+12% bonus) */}
              <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-emerald-500/50 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-xl shadow-emerald-950/30">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500 text-black text-[10px] font-black rounded-full uppercase tracking-wider">
                  Khuyên Dùng (+12%)
                </div>
                <div>
                  <span className="text-xs text-emerald-400 font-semibold block">Đổi Sang Voucher Thuê Thiết Bị</span>
                  <div className="text-3xl font-black text-emerald-300 mt-1">
                    {quote.rentalCreditVoucherQuote.toLocaleString("vi-VN")} đ
                  </div>
                  <p className="text-xs text-emerald-400/90 mt-1">
                    Tặng thêm <strong>+{quote.bonusCreditAmount.toLocaleString("vi-VN")} đ</strong> khi đổi lấy Voucher thuê máy
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-emerald-900/50">
                  <button
                    onClick={handleClaimVoucher}
                    disabled={submitted}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
                  >
                    {submitted ? "Đang xử lý..." : "🎁 Chọn Đổi Voucher Thuê Máy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span>Cam kết kiểm định bảo hành 6 tháng bởi SmartEquip Lab</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraTradeInModal;
