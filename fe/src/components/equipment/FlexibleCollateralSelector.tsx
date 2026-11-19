import React, { useState } from "react";

interface Props {
  equipmentValue?: number; // Retail market value of equipment, e.g. 35.000.000 VND
}

export const FlexibleCollateralSelector: React.FC<Props> = ({ equipmentValue = 35000000 }) => {
  const [selectedPlan, setSelectedPlan] = useState<"cash" | "chip_id" | "asset">("chip_id");

  const plans = {
    cash: {
      id: "cash",
      title: "Phương Án 1: Cọc 100% Tiền Mặt / Chuyển Khoản",
      badge: "Duyệt Nhanh 5 Phút",
      badgeColor: "bg-blue-100 text-blue-800",
      cashRate: 1.0,
      cashNeeded: equipmentValue,
      saved: 0,
      documents: ["Đối chiếu bản gốc CCCD và trả lại ngay", "Không giữ bất kỳ giấy tờ nào của khách"],
      refundPolicy: "Hoàn tiền cọc 100% qua số tài khoản ngân hàng trong vòng 2 giờ sau khi trả máy.",
      bestFor: "Khách vãng lai, doanh nghiệp làm việc qua hóa đơn, hoặc người không muốn gửi lại giấy tờ.",
    },
    chip_id: {
      id: "chip_id",
      title: "Phương Án 2: Cọc CCCD Gắn Chip (Giảm 75% Tiền Cọc)",
      badge: "Phổ Biến & Khuyên Dùng",
      badgeColor: "bg-emerald-100 text-emerald-800",
      cashRate: 0.25,
      cashNeeded: Math.round(equipmentValue * 0.25),
      saved: Math.round(equipmentValue * 0.75),
      documents: [
        "Bản gốc Căn cước công dân gắn chip (Lưu tại két sắt an toàn của shop)",
        "Bản gốc Giấy phép lái xe (GPLX A1/A2/B2)",
        "Xác thực tài khoản VNeID cấp 2 trên điện thoại",
      ],
      refundPolicy: "Trả lại toàn bộ giấy tờ gốc và hoàn 100% tiền cọc ngay khi kiểm tra hoàn tất bàn giao.",
      bestFor: "Nhiếp ảnh gia tự do, sinh viên, người quay phim cá nhân muốn tối ưu dòng tiền.",
    },
    asset: {
      id: "asset",
      title: "Phương Án 3: Thế Chấp Tài Sản Tương Đương (0% Tiền Mặt)",
      badge: "Không Cần Tiền Mặt",
      badgeColor: "bg-purple-100 text-purple-800",
      cashRate: 0.0,
      cashNeeded: 0,
      saved: equipmentValue,
      documents: [
        "Laptop có giá trị tương đương (MacBook Pro / Dell XPS) kèm củ cáp sạc",
        "HOẶC Xe máy chính chủ kèm Cà vẹt xe gốc (Gửi tại hầm giữ xe có camera 24/7)",
        "Hai bên cùng ký biên bản niêm phong tài sản có dán tem bảo mật",
      ],
      refundPolicy: "Bàn giao lại nguyên trạng tài sản và tem niêm phong ngay khi trả máy.",
      bestFor: "Khách quay gấp dự án ngoài giờ, chưa gom đủ tiền mặt, có phương tiện cá nhân đảm bảo.",
    },
  };

  const current = plans[selectedPlan];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
        <div>
          <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">
            🛡️ CHÍNH SÁCH ĐẢM BẢO TÀI SẢN
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5">
            Tùy Chọn Hình Thức Đặt Cọc Linh Hoạt
          </h3>
          <p className="text-xs text-slate-500">
            Giá trị thiết bị ước tính: <span className="font-bold text-slate-800">{equipmentValue.toLocaleString("vi-VN")} đ</span>. Chọn hình thức phù hợp với bạn:
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-500">Tiền mặt cọc yêu cầu:</span>
          <div className="text-xl font-extrabold text-emerald-600">
            {current.cashNeeded.toLocaleString("vi-VN")} đ
          </div>
        </div>
      </div>

      {/* 3 Thẻ lựa chọn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
        {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => {
          const item = plans[key];
          const isSelected = selectedPlan === key;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedPlan(key)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-white border-sky-500 ring-2 ring-sky-500/20 shadow-md"
                  : "bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                  <input
                    type="radio"
                    name="collateralPlan"
                    checked={isSelected}
                    onChange={() => setSelectedPlan(key)}
                    className="text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.title}</h4>
                <div className="my-2.5">
                  <span className="text-xs text-slate-400">Tiền mặt cọc:</span>
                  <div className="text-lg font-black text-slate-900">
                    {item.cashNeeded.toLocaleString("vi-VN")} đ
                  </div>
                  {item.saved > 0 && (
                    <span className="text-[11px] font-bold text-emerald-600">
                      Tiết kiệm: -{item.saved.toLocaleString("vi-VN")} đ
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-1">
                👉 {item.bestFor}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chi tiết giấy tờ cần mang theo */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
          <span>📋</span> Giấy tờ / Thủ tục cần chuẩn bị cho: <span className="text-sky-600">{current.title}</span>
        </h5>
        <ul className="space-y-1.5 pl-2">
          {current.documents.map((doc, idx) => (
            <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>{doc}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>🔒 Cam kết hoàn cọc: <strong className="text-slate-700">{current.refundPolicy}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default FlexibleCollateralSelector;
