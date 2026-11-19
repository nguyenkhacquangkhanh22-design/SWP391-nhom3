import React, { useState } from "react";

interface EquipmentStat {
  id: string;
  name: string;
  dailyRate: number;
  rentalsCount: number;
  rentalsSinceLastClean: number;
  daysRented: number;
  totalDays: number;
  revenue: number;
  lastCleanedDate: string;
  needsCleaning: boolean;
  cleanNote: string;
}

const INITIAL_STATS: EquipmentStat[] = [
  {
    id: "eq_sony_a7m4",
    name: "Sony Alpha 7 IV (A7M4)",
    dailyRate: 350000,
    rentalsCount: 18,
    rentalsSinceLastClean: 9, // Alert threshold: 10
    daysRented: 19,
    totalDays: 30,
    revenue: 6650000,
    lastCleanedDate: "15/10/2026",
    needsCleaning: true,
    cleanNote: "Đã qua 9 chuyến thuê. Đề xuất soi đèn kiểm tra bụi sensor & sấy hạt hút ẩm tủ.",
  },
  {
    id: "eq_canon_r6m2",
    name: "Canon EOS R6 Mark II",
    dailyRate: 360000,
    rentalsCount: 12,
    rentalsSinceLastClean: 3,
    daysRented: 14,
    totalDays: 30,
    revenue: 5040000,
    lastCleanedDate: "05/11/2026",
    needsCleaning: false,
    cleanNote: "Máy hoạt động hoàn hảo, cảm biến sạch sẽ (còn 7 lượt thuê trước kỳ bảo dưỡng).",
  },
  {
    id: "eq_sony_2470gm",
    name: "Ống kính Sony FE 24-70mm f/2.8 GM II",
    dailyRate: 250000,
    rentalsCount: 24,
    rentalsSinceLastClean: 11, // Over 10 threshold!
    daysRented: 22,
    totalDays: 30,
    revenue: 5500000,
    lastCleanedDate: "28/09/2026",
    needsCleaning: true,
    cleanNote: "VƯỢT NGƯỠNG 10 CHUYẾN! Cần vệ sinh thấu kính trước/sau và khử mốc tủ chống ẩm ngay.",
  },
  {
    id: "eq_dji_rs3",
    name: "Gimbal Chống Rung DJI RS 3 Pro",
    dailyRate: 180000,
    rentalsCount: 15,
    rentalsSinceLastClean: 4,
    daysRented: 16,
    totalDays: 30,
    revenue: 2880000,
    lastCleanedDate: "02/11/2026",
    needsCleaning: false,
    cleanNote: "Cụm mô tơ 3 trục cân bằng êm, chưa phát hiện độ rơ.",
  },
];

export const OwnerEquipmentAnalyticsTab: React.FC = () => {
  const [stats, setStats] = useState<EquipmentStat[]>(INITIAL_STATS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleConfirmCleaned = (id: string, name: string) => {
    const today = new Date().toLocaleDateString("vi-VN");
    setStats((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              rentalsSinceLastClean: 0,
              needsCleaning: false,
              lastCleanedDate: today,
              cleanNote: "Đã làm sạch cảm biến & sấy hạt chống ẩm ngày " + today,
            }
          : item
      )
    );

    setToastMessage(`Đã ghi nhận bảo dưỡng thành công cho ${name}. Bộ đếm chuyến đã được đặt lại 0!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const totalRevenue = stats.reduce((sum, item) => sum + item.revenue, 0);
  const totalRentals = stats.reduce((sum, item) => sum + item.rentalsCount, 0);
  const avgOccupancy = Math.round(
    stats.reduce((sum, item) => sum + (item.daysRented / item.totalDays) * 100, 0) / stats.length
  );
  const alertsCount = stats.filter((item) => item.needsCleaning).length;

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white hover:text-emerald-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Thẻ KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Doanh thu tháng này</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalRevenue.toLocaleString("vi-VN")} đ
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">↑ +14.2% so với tháng trước</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Tỷ lệ kín lịch thuê</div>
          <div className="text-2xl font-black text-sky-600 mt-1">{avgOccupancy}%</div>
          <div className="text-[11px] text-slate-500 mt-1">Trung bình 18.2 ngày thuê/máy</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Tổng lượt bàn giao</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalRentals} lượt</div>
          <div className="text-[11px] text-slate-500 mt-1">Trên 4 thiết bị đang niêm yết</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Nhắc nhở bảo dưỡng</div>
          <div className={`text-2xl font-black mt-1 ${alertsCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {alertsCount} thiết bị
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            {alertsCount > 0 ? "Cần vệ sinh bụi / sấy ẩm" : "Mọi thiết bị đều đạt chuẩn"}
          </div>
        </div>
      </div>

      {/* Bảng chi tiết hiệu suất & nhắc bảo dưỡng */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Sổ Theo Dõi Tần Suất Thuê & Nhắc Vệ Sinh Cảm Biến Định Kỳ
            </h3>
            <p className="text-xs text-slate-500">
              Quy tắc thực tế: Sau mỗi 8-10 lượt thuê hoặc 30 ngày, hệ thống nhắc nhở Owner kiểm tra bụi cảm biến & tủ ẩm.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-sky-100 text-sky-800 rounded-full">
            Chu kỳ bảo dưỡng: 10 chuyến thuê
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                <th className="p-3.5">Thiết bị</th>
                <th className="p-3.5">Giá thuê/ngày</th>
                <th className="p-3.5 text-center">Tỷ lệ kín lịch</th>
                <th className="p-3.5 text-right">Doanh thu tích lũy</th>
                <th className="p-3.5 text-center">Số chuyến từ lần rửa trước</th>
                <th className="p-3.5">Lần vệ sinh gần nhất</th>
                <th className="p-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((item) => {
                const occupancy = Math.round((item.daysRented / item.totalDays) * 100);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div>{item.name}</div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                        {item.cleanNote}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-700 font-semibold">
                      {item.dailyRate.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="font-extrabold text-slate-800">{occupancy}%</div>
                      <div className="text-[10px] text-slate-400">{item.daysRented}/{item.totalDays} ngày</div>
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-emerald-700">
                      {item.revenue.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          item.rentalsSinceLastClean >= 10
                            ? "bg-rose-100 text-rose-800 animate-pulse"
                            : item.rentalsSinceLastClean >= 8
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.rentalsSinceLastClean} / 10 chuyến
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{item.lastCleanedDate}</td>
                    <td className="p-3.5 text-center">
                      {item.needsCleaning ? (
                        <button
                          type="button"
                          onClick={() => handleConfirmCleaned(item.id, item.name)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-sm text-[11px] transition-all"
                        >
                          ✓ Đã làm sạch & sấy ẩm
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          Đã sạch sẽ
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerEquipmentAnalyticsTab;
