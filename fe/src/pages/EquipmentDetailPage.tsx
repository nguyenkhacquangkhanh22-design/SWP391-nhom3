import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Navbar from "../components/Navbar";
import RentalRequestModal from "../components/RentalRequestModal";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Equipment, Rental } from "../types/smartequip";

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    smartEquipApi
      .getEquipmentById(id)
      .then((res) => setEquipment(res.data))
      .catch((err) => setError(err.message || "Không thể tải chi tiết thiết bị"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleOpenRental = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setIsModalOpen(true);
  };

  const handleRentalSuccess = (_rental: Rental) => {
    setIsModalOpen(false);
    navigate("/rentals/history");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1623] text-slate-100 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen bg-[#0f1623] text-slate-100 flex flex-col font-sans">
        <Navbar />
        <div className="max-w-xl mx-auto my-20 p-8 bg-[#161f31] border border-[#243048] rounded-2xl text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-white">Không tìm thấy thiết bị</h2>
          <p className="text-slate-400 text-sm">{error || "Thiết bị có thể đã bị xóa hoặc ngưng phục vụ."}</p>
          <Link
            to="/equipment"
            className="inline-block px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm"
          >
            ← Quay lại danh sách thiết bị
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1623] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
          <Link to="/" className="hover:text-white">Trang chủ</Link>
          <span>/</span>
          <Link to="/equipment" className="hover:text-white">Thiết bị</Link>
          <span>/</span>
          <span className="text-orange-400 truncate max-w-xs">{equipment.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Images & Specs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Main Image */}
            <div className="aspect-video w-full bg-[#161f31] border border-[#232f45] rounded-2xl overflow-hidden flex items-center justify-center">
              {equipment.images && equipment.images.length > 0 ? (
                <img
                  src={equipment.images[0]}
                  alt={equipment.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-6xl text-slate-600">📷</div>
              )}
            </div>

            {/* Description */}
            <div className="bg-[#151e2f] border border-[#243048] rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Mô tả thiết bị</h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {equipment.description || "Chưa có mô tả chi tiết cho thiết bị này."}
              </p>
            </div>

            {/* Specs */}
            {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
              <div className="bg-[#151e2f] border border-[#243048] rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">Thông số kĩ thuật</h2>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(equipment.specifications).map(([key, value]) => (
                    <div key={key} className="p-3 bg-[#1c263c] rounded-xl flex flex-col">
                      <span className="text-slate-400 font-medium">{key}</span>
                      <span className="text-white font-semibold mt-1">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pricing, Owner & Action */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#161f31] border border-[#26334d] rounded-2xl p-6 space-y-6 shadow-xl">
              <div>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 inline-block mb-2">
                  {equipment.category}
                </span>
                <h1 className="text-2xl font-extrabold text-white leading-snug">
                  {equipment.title}
                </h1>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>Hãng: <strong className="text-slate-200">{equipment.brand || "Khác"}</strong></span>
                  <span>•</span>
                  <span>Model: <strong className="text-slate-200">{equipment.modelNumber || "N/A"}</strong></span>
                </div>
              </div>

              {/* Price card */}
              <div className="bg-[#121927] p-4 rounded-xl border border-[#222d42] space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400">Giá thuê mỗi ngày:</span>
                  <div>
                    <span className="text-2xl font-extrabold text-orange-400">
                      {equipment.dailyRate.toLocaleString("vi-VN")} đ
                    </span>
                    <span className="text-xs text-slate-400">/ngày</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-[#1d273a]">
                  <span className="text-xs text-slate-400">Tiền đặt cọc bảo đảm:</span>
                  <span className="text-sm font-bold text-slate-200">
                    {equipment.depositAmount.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  * Tiền cọc sẽ được hoàn trả đầy đủ ngay sau khi hoàn tất kiểm tra và trả máy.
                </p>
              </div>

              {/* Owner Info (UC_G03 & UC_R06) */}
              <div className="pt-4 border-t border-[#232e46] space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Thông tin chủ sở hữu (Owner)
                </h3>
                <div className="flex items-center gap-3 bg-[#1b253b] p-3 rounded-xl border border-[#27344e]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
                    {equipment.owner?.name ? equipment.owner.name[0].toUpperCase() : "O"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white truncate">
                      {equipment.owner?.name || "Chủ thiết bị SmartEquip"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span>Điểm uy tín: <strong className="text-emerald-400">{equipment.owner?.trust_score ?? 100}</strong></span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">Đã KYC</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  onClick={handleOpenRental}
                  className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-base shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>📅</span>
                  <span>Gửi yêu cầu thuê ngay</span>
                </button>
                {!user && (
                  <p className="text-center text-[11px] text-slate-500 mt-2">
                    Bạn cần đăng nhập trước khi tạo yêu cầu thuê thiết bị.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <RentalRequestModal
        equipment={equipment}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRentalSuccess}
      />
    </div>
  );
}
