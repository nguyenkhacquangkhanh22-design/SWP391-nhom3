import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get("orderCode");

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-16 w-full flex-1 flex items-center justify-center">
        <div className="w-full bg-[#141d2d] border border-rose-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-rose-950/40">
          <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-500/60 flex items-center justify-center text-4xl">
            ✕
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">
              Giao Dịch Đã Bị Hủy
            </h1>
            <p className="text-sm text-slate-300">
              Bạn đã hủy hoặc chưa hoàn tất thanh toán trên cổng PayOS. Đơn thuê của
              bạn vẫn được bảo lưu để thanh toán lại bất kỳ lúc nào.
            </p>
          </div>

          {orderCode && (
            <div className="p-3 bg-[#0d1422] border border-[#22334e] rounded-2xl text-xs text-slate-400">
              Mã giao dịch:{" "}
              <strong className="text-rose-400 font-mono">#{orderCode}</strong>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              to="/rentals/history"
              className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center"
            >
              Quay lại Lịch sử thuê để thanh toán lại ➔
            </Link>
            <Link
              to="/equipment"
              className="py-3 px-4 bg-[#1b263b] hover:bg-[#253552] text-slate-300 hover:text-white font-semibold rounded-xl text-xs transition-all text-center"
            >
              Xem thiết bị khác
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

