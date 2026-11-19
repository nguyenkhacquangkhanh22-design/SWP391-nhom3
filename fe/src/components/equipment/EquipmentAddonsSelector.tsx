import React, { useState } from "react";

export interface AddonItem {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  discountedRate: number;
  depositAmount: number;
  specification: string;
  recommendedReason: string;
}

const AVAILABLE_ADDONS: AddonItem[] = [
  {
    id: "addon_sd_128",
    name: "Thẻ nhớ SanDisk Extreme Pro 128GB V60 (4K)",
    category: "Thẻ nhớ",
    dailyRate: 60000,
    discountedRate: 50000,
    depositAmount: 300000,
    specification: "Đọc 280MB/s, Ghi 150MB/s, quay 4K 120fps chuẩn U3",
    recommendedReason: "Bắt buộc cần để lưu trữ video chất lượng cao mà không bị nghẽn buffer",
  },
  {
    id: "addon_bat_fz100",
    name: "Bộ 2 Pin Sony NP-FZ100 + Dock Sạc Đôi LCD",
    category: "Pin & Nguồn",
    dailyRate: 85000,
    discountedRate: 70000,
    depositAmount: 800000,
    specification: "2x 2280mAh, quay liên tục thêm 4-5 tiếng, dock hiển thị % pin",
    recommendedReason: "Giúp bạn thoải mái tác nghiệp trọn vẹn cả ngày ngoài trời mà không lo cạn pin",
  },
  {
    id: "addon_lens_2470",
    name: "Ống kính Sony FE 24-70mm f/2.8 GM II",
    category: "Ống kính",
    dailyRate: 300000,
    discountedRate: 250000,
    depositAmount: 5000000,
    specification: "Tiêu cự đa dụng 24-70mm, khẩu lớn f/2.8 toàn dải, bokeh tuyệt đẹp",
    recommendedReason: "Ống kính chụp tiệc, kỷ yếu, sự kiện và phỏng vấn đa năng nhất",
  },
  {
    id: "addon_gimbal_rs3",
    name: "Gimbal Chống Rung DJI RS 3 Combo",
    category: "Chống rung",
    dailyRate: 220000,
    discountedRate: 180000,
    depositAmount: 3000000,
    specification: "Tải trọng 3kg, cánh tay trục carbon, motor Focus khóa trục tự động",
    recommendedReason: "Cảnh quay chuyển động mượt mà như điện ảnh, đi bộ quay không rung",
  },
  {
    id: "addon_tripod_benro",
    name: "Chân Máy Quay Benro Video Tripod Đầu Dầu",
    category: "Chân máy",
    dailyRate: 75000,
    discountedRate: 60000,
    depositAmount: 800000,
    specification: "Đầu dầu Pan/Tilt mượt mà, tải trọng 5kg, chiều cao 1.56m",
    recommendedReason: "Cố định góc máy phỏng vấn, quay livestream chuẩn xác không rung lắc",
  },
];

interface Props {
  baseEquipmentName?: string;
  baseDailyRate?: number;
}

export const EquipmentAddonsSelector: React.FC<Props> = ({
  baseEquipmentName = "Máy ảnh chuyên nghiệp",
  baseDailyRate = 350000,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(["addon_sd_128", "addon_bat_fz100"]);
  const [days, setDays] = useState<number>(2);

  const toggleAddon = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedAddons = AVAILABLE_ADDONS.filter((item) => selectedIds.includes(item.id));
  const baseCost = baseDailyRate * days;
  const addonsOriginalCost = selectedAddons.reduce((sum, item) => sum + item.dailyRate * days, 0);
  const addonsDiscountedCost = selectedAddons.reduce((sum, item) => sum + item.discountedRate * days, 0);
  const totalSavings = addonsOriginalCost - addonsDiscountedCost;
  const totalCombo = baseCost + addonsDiscountedCost;
  const totalAddonDeposit = selectedAddons.reduce((sum, item) => sum + item.depositAmount, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              ⚡ ƯU ĐÃI THUÊ COMBO
            </span>
            <span className="text-xs font-semibold text-emerald-600">Tiết kiệm 15% giá phụ kiện</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Gợi ý phụ kiện nên thuê kèm với {baseEquipmentName}
          </h3>
          <p className="text-xs text-slate-500">
            Tích chọn phụ kiện để máy hoạt động trọn vẹn, hệ thống tự động áp dụng giá chiết khấu combo.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <label className="text-xs font-medium text-slate-600">Số ngày thuê:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value={1}>1 ngày</option>
            <option value={2}>2 ngày</option>
            <option value={3}>3 ngày (Cuối tuần)</option>
            <option value={5}>5 ngày</option>
            <option value={7}>7 ngày (1 tuần)</option>
          </select>
        </div>
      </div>

      {/* Danh sách phụ kiện */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        {AVAILABLE_ADDONS.map((addon) => {
          const isChecked = selectedIds.includes(addon.id);
          return (
            <div
              key={addon.id}
              onClick={() => toggleAddon(addon.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                isChecked
                  ? "bg-sky-50/60 border-sky-400 shadow-sm"
                  : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {addon.category}
                  </span>
                  <div className="text-right">
                    <span className="text-xs line-through text-slate-400 mr-1.5">
                      {addon.dailyRate.toLocaleString("vi-VN")} đ
                    </span>
                    <span className="text-xs font-bold text-sky-700">
                      {addon.discountedRate.toLocaleString("vi-VN")} đ/ngày
                    </span>
                  </div>
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">{addon.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{addon.specification}</p>
                <p className="text-[10px] text-amber-700 font-medium mt-1 bg-amber-50/80 p-1 rounded">
                  💡 {addon.recommendedReason}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Thanh tổng kết giá Combo */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <div className="text-left w-full sm:w-auto">
          <div className="text-xs text-slate-400">
            Đã chọn: <span className="font-semibold text-white">{selectedIds.length} phụ kiện</span> kèm máy ({days} ngày)
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-extrabold text-amber-400">
              {totalCombo.toLocaleString("vi-VN")} đ
            </span>
            {totalSavings > 0 && (
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                Tiết kiệm: -{totalSavings.toLocaleString("vi-VN")} đ
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Tiền cọc phụ kiện: {totalAddonDeposit.toLocaleString("vi-VN")} đ (hoàn cọc 100% khi trả đủ)
          </div>
        </div>

        <button
          type="button"
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
        >
          Đặt Thuê Trọn Gói Combo Này →
        </button>
      </div>
    </div>
  );
};

export default EquipmentAddonsSelector;
