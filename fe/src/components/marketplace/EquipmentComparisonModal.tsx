import React, { useState } from "react";

interface CameraItem {
  id: string;
  name: string;
  brand: string;
  sensor: string;
  video: string;
  ibis: string;
  iso: string;
  cardSlots: string;
  weight: string;
  dailyRate: number;
  depositCash: number;
  chipDepositCash: number;
  rating: number;
  strengths: string[];
  bestFor: string;
}

const CAMERAS: Record<string, CameraItem> = {
  "sony-a7-iv": {
    id: "sony-a7-iv",
    name: "Sony Alpha 7 IV (A7M4)",
    brand: "Sony",
    sensor: "33.0 MP Full-Frame Exmor R",
    video: "4K 60p (Super35 10-bit), 4K 30p 7K oversampled",
    ibis: "5.5 stops 5-axis IBIS",
    iso: "100 - 51,200",
    cardSlots: "2 khe (1x CFexpress Type A / SD + 1x SD)",
    weight: "658g",
    dailyRate: 350000,
    depositCash: 35000000,
    chipDepositCash: 8750000,
    rating: 4.9,
    strengths: ["Lấy nét mắt người/chim/thú siêu nhạy", "Màu da S-Cinetone nịnh mắt", "Kho lens Sony FE phong phú nhất"],
    bestFor: "Chụp tiệc, sự kiện, TVC và sáng tạo YouTube/TikTok",
  },
  "canon-eos-r6-ii": {
    id: "canon-eos-r6-ii",
    name: "Canon EOS R6 Mark II",
    brand: "Canon",
    sensor: "24.2 MP Full-Frame CMOS",
    video: "4K 60p không crop 6K oversampled, FHD 180p",
    ibis: "Lên tới 8.0 stops IBIS (kèm lens IS)",
    iso: "100 - 102,400",
    cardSlots: "2 khe SD UHS-II",
    weight: "670g",
    dailyRate: 360000,
    depositCash: 36000000,
    chipDepositCash: 9000000,
    rating: 4.8,
    strengths: ["Chống rung 8 stop quay cầm tay không rung", "Chụp liên tiếp 40fps màn trập điện tử", "Quay 4K 60p không bị crop góc"],
    bestFor: "Thể thao, chim muông, đám cưới phóng sự và MV ca nhạc",
  },
  "fujifilm-x-t5": {
    id: "fujifilm-x-t5",
    name: "Fujifilm X-T5",
    brand: "Fujifilm",
    sensor: "40.2 MP APS-C X-Trans HR",
    video: "6.2K 30p, 4K 60p 10-bit 4:2:2 F-Log2",
    ibis: "7.0 stops 5-axis IBIS",
    iso: "125 - 12,800",
    cardSlots: "2 khe SD UHS-II",
    weight: "557g",
    dailyRate: 280000,
    depositCash: 28000000,
    chipDepositCash: 7000000,
    rating: 4.9,
    strengths: ["Giả lập màu film huyền thoại (Classic Chrome)", "Độ phân giải 40MP siêu nét", "Body hoài cổ, nhỏ gọn dễ mang du lịch"],
    bestFor: "Chụp đường phố, chân dung nghệ thuật, du lịch và thời trang",
  },
  "sony-fx3": {
    id: "sony-fx3",
    name: "Sony FX3 Cinema Line",
    brand: "Sony",
    sensor: "12.1 MP Full-Frame (Dual Base ISO)",
    video: "4K 120p All-Intra 10-bit 4:2:2, RAW output",
    ibis: "5.5 stops Active Mode + Quạt tản nhiệt tích hợp",
    iso: "80 - 102,400 (Khử nhiễu Dual Native ISO)",
    cardSlots: "2 khe CFexpress Type A / SD UHS-II",
    weight: "715g",
    dailyRate: 650000,
    depositCash: 75000000,
    chipDepositCash: 18750000,
    rating: 5.0,
    strengths: ["Quay đêm ISO 12800 mịn như ban ngày", "Quạt làm mát quay cả ngày không sợ quá nhiệt", "Tay cầm XLR âm thanh chuyên nghiệp"],
    bestFor: "Làm phim ngắn, phim tài liệu, MV và TVC quảng cáo cao cấp",
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultIds?: string[];
}

export const EquipmentComparisonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultIds = ["sony-a7-iv", "canon-eos-r6-ii"],
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultIds);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const comparedList = selectedIds.map((id) => CAMERAS[id]).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                ⚖️ BẢNG SO SÁNH THIẾT BỊ
              </span>
              <span className="text-xs text-slate-500">Đối chiếu trực quan thông số & giá thuê</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              So Sánh Trực Diện Thiết Bị Cùng Phân Khúc
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Nút chọn máy */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Chọn 2 đến 3 máy để so sánh:</span>
          {Object.values(CAMERAS).map((cam) => {
            const isSelected = selectedIds.includes(cam.id);
            return (
              <button
                key={cam.id}
                onClick={() => toggleSelect(cam.id)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                  isSelected
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-white text-slate-700 border border-slate-300 hover:border-slate-400"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {cam.name}
              </button>
            );
          })}
        </div>

        {/* Bảng so sánh */}
        <div className="p-5 overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="p-3 text-xs font-bold text-slate-400 uppercase w-1/4">Tiêu chí</th>
                {comparedList.map((cam) => (
                  <th key={cam.id} className="p-3 text-sm font-extrabold text-slate-900 w-1/3">
                    <div className="text-xs text-sky-600 font-bold">{cam.brand}</div>
                    <div>{cam.name}</div>
                    <div className="text-xs text-amber-500 font-semibold mt-0.5">
                      ★ {cam.rating} / 5.0
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {/* Giá thuê */}
              <tr className="bg-sky-50/40">
                <td className="p-3 font-bold text-slate-700">Giá thuê / ngày</td>
                {comparedList.map((cam) => (
                  <td key={cam.id} className="p-3">
                    <span className="text-base font-black text-sky-700">
                      {cam.dailyRate.toLocaleString("vi-VN")} đ
                    </span>
                    <span className="text-[11px] text-slate-500"> / 24 giờ</span>
                  </td>
                ))}
              </tr>

              {/* Tiền cọc */}
              <tr>
                <td className="p-3 font-bold text-slate-700">Tiền cọc ưu đãi (CCCD)</td>
                {comparedList.map((cam) => (
                  <td key={cam.id} className="p-3">
                    <div className="font-bold text-emerald-700">
                      {cam.chipDepositCash.toLocaleString("vi-VN")} đ
                    </div>
                    <div className="text-[10px] text-slate-400 line-through">
                      Gốc: {cam.depositCash.toLocaleString("vi-VN")} đ
                    </div>
                  </td>
                ))}
              </tr>

              {/* Cảm biến */}
              <tr>
                <td className="p-3 font-bold text-slate-700">Cảm biến & Điểm ảnh</td>
                {comparedList.map((cam) => (
                  <td key={cam.id} className="p-3 font-medium text-slate-800">
                    {cam.sensor}
                  </td>
                ))}
              </tr>

              {/* Khả năng quay video */}
              <tr className="bg-slate-50/50">
                <td className="p-3 font-bold text-slate-700">Quay Video tối đa</td>
                {comparedList.map((cam) => (
                  <td key={cam.id} className="p-3 font-medium text-slate-800">
                    {cam.video}
                  </td>
                ))}
              </tr>

              {/* Chống rung */}
              <tr>
                <td className="p-3 font-bold text-slate-700">Chống rung Body (IBIS)</td>
                {comparedList.map((cam) => (
                  <td key={cam.id} className="p-3 font-medium text-slate-800">
                    {cam.ibis}
                  </td>
                ))}
              </tr>

              {/* Khe cắm thẻ & Trọng lượng */}
              <tr>
                <td className="p-3 font-bold text-slate-700">Khe thẻ & Trọng lượng</td>
                {comparedList.map((cam) => (
                  <td key={cam.id} className="p-3 text-slate-700">
                    <div>{cam.cardSlots}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Trọng lượng: {cam.weight}</div>
                  </td>
                ))}
              </tr>

              {/* Điểm mạnh nổi bật */}
              <tr className="bg-amber-50/30">
                <td className="p-3 font-bold text-slate-700">Điểm mạnh nhất</td>
                {comparedList.map((cam) => (
                  <td key={cam.id} className="p-3">
                    <ul className="space-y-1">
                      {cam.strengths.map((s, idx) => (
                        <li key={idx} className="text-[11px] text-slate-700 flex items-start gap-1">
                          <span className="text-amber-500 font-bold">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>

              {/* Phù hợp nhất cho */}
              <tr>
                <td className="p-3 font-bold text-slate-700">Mục đích sử dụng</td>
                {comparedList.map((cam) => (
                  <td key={cam.id} className="p-3 font-semibold text-slate-800">
                    {cam.bestFor}
                  </td>
                ))}
              </tr>

              {/* Nút hành động */}
              <tr>
                <td className="p-3"></td>
                {comparedList.map((cam) => (
                  <td key={cam.id} className="p-3">
                    <button
                      type="button"
                      onClick={() => {
                        alert(`Đã chọn thiết bị: ${cam.name}. Chuyển sang đặt thuê.`);
                        onClose();
                      }}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      Thuê Máy Này →
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EquipmentComparisonModal;
