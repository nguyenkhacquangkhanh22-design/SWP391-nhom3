import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { smartEquipApi } from "../services/smartEquipApi";
import type { SystemInfo } from "../types/smartequip";

export default function HomePage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    smartEquipApi
      .getSystemInfo()
      .then((res) => setInfo(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1623] text-slate-100 flex flex-col font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28 px-4 sm:px-6 lg:px-8 border-b border-[#202b3f] bg-gradient-to-b from-[#141d2c] via-[#0f1623] to-[#0f1623]">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-wide uppercase">
            <span>✨ Nền tảng cho thuê thiết bị công nghệ hàng đầu</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Thuê Thiết Bị Đỉnh Cao, <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              Tiết Kiệm Chi Phí Cùng SmartEquip
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-slate-300 leading-relaxed">
            {info?.platform.description ||
              "SmartEquip kết nối người sở hữu thiết bị điện tử, công nghệ, quay chụp, máy móc với những người có nhu cầu thuê trong thời gian ngắn với quy trình hợp đồng điện tử và bảo hiểm cọc an toàn."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/equipment"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-base shadow-lg shadow-orange-600/30 transition-all transform hover:-translate-y-0.5 text-center"
            >
              🔍 Khám phá thiết bị ngay
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#1b2438] hover:bg-[#232f48] border border-[#2d3a54] text-slate-200 font-semibold text-base transition-all text-center"
            >
              Đăng ký tài khoản
            </Link>
          </div>
        </div>
      </section>

      {/* Categories & Stats */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Danh Mục Thiết Bị Nổi Bật
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Hàng ngàn thiết bị sẵn sàng cho các dự án sáng tạo của bạn
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(
            info?.stats.supportedCategories || [
              "Máy ảnh & Quay phim",
              "Laptop & Công nghệ",
              "Âm thanh & Ánh sáng",
              "Thiết bị đo lường & Cơ khí",
              "Flycam & Drone",
            ]
          ).map((cat, idx) => (
            <Link
              key={idx}
              to={`/equipment?category=${encodeURIComponent(cat)}`}
              className="p-5 rounded-2xl bg-[#172033] border border-[#243048] hover:border-orange-500/50 hover:bg-[#1c273e] transition-all group flex flex-col items-center text-center gap-3 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                {idx === 0 ? "📷" : idx === 1 ? "💻" : idx === 2 ? "🎙️" : idx === 3 ? "⚙️" : "🛸"}
              </div>
              <span className="font-semibold text-sm text-slate-200 group-hover:text-white">
                {cat}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust & Protection Policies */}
      <section className="py-16 bg-[#131b29] border-y border-[#202b3f] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">
              AN TÂM TUYỆT ĐỐI
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Chính Sách Bảo Vệ Toàn Diện
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#182236] border border-[#25324c] space-y-3">
              <div className="text-3xl">📝</div>
              <h3 className="text-lg font-bold text-white">Hợp đồng điện tử minh bạch</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ký hợp đồng trực tuyến với các điều khoản bảo vệ thiết bị, thời gian giao nhận và quyền lợi hai bên có giá trị cam kết cao.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#182236] border border-[#25324c] space-y-3">
              <div className="text-3xl">🛡️</div>
              <h3 className="text-lg font-bold text-white">Xác thực KYC người thuê</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Định danh CCCD/CMND rõ ràng trước khi nhận máy, phòng ngừa rủi ro lừa đảo và đánh tráo thiết bị.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#182236] border border-[#25324c] space-y-3">
              <div className="text-3xl">💳</div>
              <h3 className="text-lg font-bold text-white">Bảo đảm tiền cọc linh hoạt</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Hệ thống giữ cọc trung gian và tự động hoàn trả nhanh chóng ngay khi thiết bị được hoàn tất kiểm tra và bàn giao.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-[#1e273a] text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 SmartEquip Platform. Hotline: {info?.contact.hotline || "1900 8888"} - Email: {info?.contact.email || "support@smartequip.vn"}
          </div>
          <div>SWP391 - Nhóm 3</div>
        </div>
      </footer>
    </div>
  );
}
