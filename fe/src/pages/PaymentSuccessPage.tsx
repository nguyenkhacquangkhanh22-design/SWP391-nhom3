import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get("orderCode");
  const status = searchParams.get("status");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (orderCode) {
      axios
        .get(`/api/payments/verify/${orderCode}`)
        .then((res) => {
          console.log("Xác nhận PayOS tự động thành công:", res.data);
        })
        .catch((err) => {
          console.warn("Lỗi đồng bộ PayOS:", err?.message);
        });
    }
  }, [orderCode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/rentals/history";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-16 w-full flex-1 flex items-center justify-center">
        <div className="w-full bg-[#141d2d] border border-emerald-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-emerald-950/50">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center text-4xl animate-bounce">
            ✅
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">
              Thanh Toán Thành Công!
            </h1>
            <p className="text-sm text-slate-300">
              Giao dịch của bạn đã được cổng thanh toán PayOS ghi nhận và hệ thống
              SmartEquip tự động duyệt đơn thành công!
            </p>
          </div>

          {orderCode && (
            <div className="p-4 bg-[#0d1422] border border-[#22334e] rounded-2xl text-xs space-y-1.5 text-slate-400">
              <div>
                Mã giao dịch PayOS:{" "}
                <strong className="text-orange-400 font-mono text-sm">
                  #{orderCode}
                </strong>
              </div>
              <div>
                Trạng thái PayOS:{" "}
                <span className="text-emerald-400 font-bold uppercase">
                  {status || "PAID"}
                </span>
              </div>
            </div>
          )}

          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
            🚚 Chủ máy sẽ tiến hành đóng gói và giao thiết bị theo thời gian đã thỏa
            thuận.
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              to="/rentals/history"
              className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md text-center"
            >
              Xem đơn trong Lịch sử thuê ({countdown}s) ➔
            </Link>
            <Link
              to="/"
              className="py-3 px-4 bg-[#1b263b] hover:bg-[#253552] text-slate-300 hover:text-white font-semibold rounded-xl text-xs transition-all text-center"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

