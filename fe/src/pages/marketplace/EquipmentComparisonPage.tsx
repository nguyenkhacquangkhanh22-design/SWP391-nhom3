import React, { useState } from "react";
import { Link } from "react-router-dom";
import Brand from "../../components/Brand";
import EquipmentComparisonModal from "../../components/marketplace/EquipmentComparisonModal";

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
  reviewCount: number;
  strengths: string[];
  bestFor: string;
  imageUrl: string;
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
    reviewCount: 142,
    strengths: ["Lấy nét mắt người/chim/thú siêu nhạy", "Màu da S-Cinetone nịnh mắt", "Kho lens Sony FE phong phú nhất"],
    bestFor: "Chụp tiệc, sự kiện, TVC và sáng tạo YouTube/TikTok",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80",
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
    reviewCount: 98,
    strengths: ["Chống rung 8 stop quay cầm tay không rung", "Chụp liên tiếp 40fps màn trập điện tử", "Quay 4K 60p không bị crop góc"],
    bestFor: "Thể thao, chim muông, đám cưới phóng sự và MV ca nhạc",
    imageUrl: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=400&q=80",
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
    reviewCount: 115,
    strengths: ["Giả lập màu film huyền thoại (Classic Chrome)", "Độ phân giải 40MP siêu nét", "Body hoài cổ, nhỏ gọn dễ mang du lịch"],
    bestFor: "Chụp đường phố, chân dung nghệ thuật, du lịch và thời trang",
    imageUrl: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=400&q=80",
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
    reviewCount: 64,
    strengths: ["Quay đêm ISO 12800 mịn như ban ngày", "Quạt làm mát quay cả ngày không sợ quá nhiệt", "Tay cầm XLR âm thanh chuyên nghiệp"],
    bestFor: "Làm phim ngắn, phim tài liệu, MV và TVC quảng cáo cao cấp",
    imageUrl: "https://images.unsplash.com/photo-1589872516421-255d6fc57116?auto=format&fit=crop&w=400&q=80",
  },
};

export const EquipmentComparisonPage: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>(["sony-a7-iv", "canon-eos-r6-ii", "fujifilm-x-t5"]);
  const [showModal, setShowModal] = useState(false);

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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Brand />
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
            CÔNG CỤ SO SÁNH THIẾT BỊ
          </span>
        </div>
        <Link
          to="/marketplace"
          className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5"
        >
          ← Quay lại Chợ thiết bị
        </Link>
      </div>

      <div className="max-w-7xl mx-auto mt-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            So Sánh Thông Số & Giá Thuê Trực Diện
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Đối chiếu chi tiết giữa các dòng máy quay chụp hàng đầu để chọn chiếc máy phù hợp nhất với dự án của bạn.
          </p>
        </div>

        {/* Bộ chọn máy */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <span className="text-xs text-slate-400 mr-2">Chọn 2 đến 3 máy:</span>
          {Object.values(CAMERAS).map((cam) => {
            const isSelected = selectedIds.includes(cam.id);
            return (
              <button
                key={cam.id}
                onClick={() => toggleSelect(cam.id)}
                className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                  isSelected
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {cam.name}
              </button>
            );
          })}
        </div>

        {/* Bảng ma trận so sánh */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase w-1/4">
                    Tiêu chí kỹ thuật
                  </th>
                  {comparedList.map((cam) => (
                    <th key={cam.id} className="p-4 w-1/3 align-top">
                      <div className="text-[11px] font-bold text-sky-400 uppercase">{cam.brand}</div>
                      <div className="text-base font-extrabold text-white mt-0.5">{cam.name}</div>
                      <div className="text-xs text-amber-400 font-semibold mt-1">
                        ★ {cam.rating} ({cam.reviewCount} đánh giá)
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {/* Giá thuê */}
                <tr className="bg-sky-950/30">
                  <td className="p-4 font-bold text-slate-300">Giá thuê / 24 giờ</td>
                  {comparedList.map((cam) => (
                    <td key={cam.id} className="p-4">
                      <div className="text-xl font-black text-amber-400">
                        {cam.dailyRate.toLocaleString("vi-VN")} đ
                      </div>
                      <div className="text-[11px] text-slate-400">Đã gồm VAT & bảo hiểm cơ bản</div>
                    </td>
                  ))}
                </tr>

                {/* Tiền cọc */}
                <tr>
                  <td className="p-4 font-bold text-slate-300">Tiền cọc ưu đãi (CCCD)</td>
                  {comparedList.map((cam) => (
                    <td key={cam.id} className="p-4">
                      <div className="font-bold text-emerald-400 text-sm">
                        {cam.chipDepositCash.toLocaleString("vi-VN")} đ
                      </div>
                      <div className="text-[11px] text-slate-500 line-through">
                        Cọc tiền mặt gốc: {cam.depositCash.toLocaleString("vi-VN")} đ
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Cảm biến */}
                <tr>
                  <td className="p-4 font-bold text-slate-300">Cảm biến hình ảnh</td>
                  {comparedList.map((cam) => (
                    <td key={cam.id} className="p-4 font-medium text-slate-200">
                      {cam.sensor}
                    </td>
                  ))}
                </tr>

                {/* Quay video */}
                <tr className="bg-slate-800/40">
                  <td className="p-4 font-bold text-slate-300">Quay Video tối đa</td>
                  {comparedList.map((cam) => (
                    <td key={cam.id} className="p-4 font-medium text-slate-200">
                      {cam.video}
                    </td>
                  ))}
                </tr>

                {/* Chống rung */}
                <tr>
                  <td className="p-4 font-bold text-slate-300">Chống rung IBIS</td>
                  {comparedList.map((cam) => (
                    <td key={cam.id} className="p-4 font-medium text-slate-200">
                      {cam.ibis}
                    </td>
                  ))}
                </tr>

                {/* Khe cắm thẻ & Trọng lượng */}
                <tr>
                  <td className="p-4 font-bold text-slate-300">Lưu trữ & Trọng lượng</td>
                  {comparedList.map((cam) => (
                    <td key={cam.id} className="p-4 text-slate-300">
                      <div>{cam.cardSlots}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Trọng lượng body: {cam.weight}</div>
                    </td>
                  ))}
                </tr>

                {/* Điểm mạnh */}
                <tr className="bg-amber-950/20">
                  <td className="p-4 font-bold text-slate-300">Điểm mạnh nhất</td>
                  {comparedList.map((cam) => (
                    <td key={cam.id} className="p-4">
                      <ul className="space-y-1">
                        {cam.strengths.map((s, idx) => (
                          <li key={idx} className="text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* Khuyên dùng cho */}
                <tr>
                  <td className="p-4 font-bold text-slate-300">Mục đích tối ưu</td>
                  {comparedList.map((cam) => (
                    <td key={cam.id} className="p-4 font-semibold text-sky-300">
                      {cam.bestFor}
                    </td>
                  ))}
                </tr>

                {/* Nút thuê */}
                <tr>
                  <td className="p-4"></td>
                  {comparedList.map((cam) => (
                    <td key={cam.id} className="p-4">
                      <Link
                        to="/marketplace"
                        className="block w-full py-2.5 text-center bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                      >
                        Đặt Thuê Máy Này →
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EquipmentComparisonModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultIds={selectedIds}
      />
    </div>
  );
};

export default EquipmentComparisonPage;
