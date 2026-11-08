import { useState } from "react";
import axios from "axios";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Rental } from "../types/smartequip";
import SignaturePad from "./SignaturePad";
import ContractPdfModal from "./ContractPdfModal";

interface Props {
  rental: Rental;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContractConfirmationModal({
  rental,
  token,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const renterName =
    typeof rental.renter === "object" && rental.renter !== null && rental.renter.name
      ? rental.renter.name
      : rental.contract?.renterSignature || "Người thuê SmartEquip";

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [handwrittenSignature, setHandwrittenSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(() => renterName !== "Người thuê SmartEquip" ? renterName : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"contract" | "payment">("contract");
  const [showPdfModal, setShowPdfModal] = useState(false);

  if (!isOpen) return null;

  const contractCode = rental.contract?.contractNumber || `HD-${rental.rentalCode}`;
  const totalAmountToPay = rental.totalAmount || (rental.rentalFee + (rental.shippingFee || 0)); // KHÔNG CẦN TIỀN CỌC! (Tiền thuê + phí vận chuyển)

  const handleGoToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Vui lòng tích chọn đồng ý với các điều khoản của hợp đồng thuê.");
      return;
    }
    if (!handwrittenSignature) {
      setError("Vui lòng vẽ chữ ký tay điện tử của bạn vào khung ký tên.");
      return;
    }
    setError("");
    setStep("payment");
  };

  const handlePayOSPayment = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      // 1. Luôn cập nhật và xác nhận chữ ký tay điện tử vào hợp đồng
      if (handwrittenSignature || signerName.trim()) {
        try {
          await smartEquipApi.confirmContract(token, rental._id, {
            termsAccepted: true,
            renterSignature: signerName.trim() || renterName,
            digitalSignature: handwrittenSignature || rental.contract?.digitalSignature || "",
          });
        } catch (signErr: any) {
          console.warn("Lưu chữ ký hợp đồng notice:", signErr?.message);
        }
      }

      // 2. Gọi thẳng API POST /api/payments/create-payment-link (chuyền vào rentalId, amount, description)
      const response = await axios.post("/api/payments/create-payment-link", {
        rentalId: rental._id,
        amount: totalAmountToPay,
        description: `TT don ${rental.rentalCode}`,
      });

      const { checkoutUrl } = response.data;
      if (checkoutUrl) {
        if (onSuccess) onSuccess();
        // Chuyển hướng người dùng sang cổng thanh toán PayOS
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Không nhận được liên kết thanh toán từ PayOS");
      }
    } catch (err: any) {
      console.error("Lỗi khởi tạo cổng thanh toán PayOS:", err);
      const errorMsg =
        err.response?.data?.message || err.message || "Không thể kết nối đến cổng thanh toán PayOS";
      setError(errorMsg);
      setLoading(false);
    }
  };

  const ownerName =
    typeof rental.owner === "object" && rental.owner !== null
      ? rental.owner.name
      : "Chủ sở hữu thiết bị";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141d2d] border border-[#263550] w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#212c42]">
          <div className="flex items-center gap-2">
            <span className="text-xl">{step === "contract" ? "✍️" : "💳"}</span>
            <div>
              <h2 className="text-base font-bold text-white">
                {step === "contract"
                  ? "Ký Hợp Đồng Thuê Điện Tử Bằng Tay"
                  : "Thanh Toán Tự Động Qua Cổng PayOS (VietQR)"}
              </h2>
              <p className="text-xs text-orange-400 mt-0.5">
                Mã đơn: <strong className="font-mono text-white">{rental.rentalCode}</strong> | Mã HĐ:{" "}
                <strong className="font-mono text-white">{contractCode}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="px-2.5 py-1.5 bg-[#1b2537] hover:bg-[#25334a] border border-[#2d3e58] text-orange-400 hover:text-orange-300 font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-sm"
              title="Mở xem trước & Lưu hợp đồng PDF"
            >
              <span>📄</span>
              <span>Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1f2b3e]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="grid grid-cols-2 gap-2 my-3 text-xs">
          <div
            className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
              step === "contract"
                ? "bg-orange-600/20 border-orange-500/50 text-orange-300 font-bold"
                : "bg-[#101726] border-[#1d273a] text-emerald-400"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-orange-500/30 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Đọc điều khoản & Ký tay</span>
          </div>

          <div
            className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
              step === "payment"
                ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300 font-bold"
                : "bg-[#101726] border-[#1d273a] text-slate-500"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>Thanh toán PayOS (VietQR)</span>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: XEM HỢP ĐỒNG & KÝ TAY */}
        {step === "contract" && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Contract Body */}
            <div className="p-4 rounded-xl bg-[#0f1624] border border-[#1e2a40] text-xs text-slate-300 space-y-3.5 leading-relaxed">
              <div className="text-center pb-2.5 border-b border-[#212d42]">
                <h3 className="font-bold text-[11px] text-slate-300 uppercase tracking-wider">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </h3>
                <p className="text-[10px] text-slate-400 italic">Độc lập - Tự do - Hạnh phúc</p>
                <h4 className="font-extrabold text-xs text-orange-400 mt-1 uppercase">
                  HỢP ĐỒNG THUÊ THIẾT BỊ ĐIỆN TỬ (CHÍNH SÁCH MIỄN CỌC)
                </h4>
              </div>

              {/* Bên A & Bên B */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-[#172236] rounded-xl border border-[#24334e]">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    BÊN CHO THUÊ (BÊN A)
                  </span>
                  <p className="font-bold text-white text-xs mt-0.5">{ownerName}</p>
                  <p className="text-[11px] text-slate-400">
                    Email: {typeof rental.owner === "object" ? rental.owner?.email : "Chủ máy"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    BÊN THUÊ (BÊN B)
                  </span>
                  <p className="font-bold text-white text-xs mt-0.5">{renterName}</p>
                  <p className="text-[11px] text-slate-400">
                    Địa chỉ nhận: {rental.deliveryAddress || "Địa chỉ mặc định"}
                  </p>
                </div>
              </div>

              {/* Thông tin thiết bị & Giá thuê */}
              <div className="p-3 bg-[#172236] rounded-xl border border-[#24334e] space-y-1.5">
                <p>
                  <strong className="text-slate-200">Thiết bị thuê:</strong>{" "}
                  <span className="text-orange-400 font-bold">{rental.equipment?.title}</span>
                </p>
                <p>
                  <strong className="text-slate-200">Thời gian thuê:</strong> Từ{" "}
                  <span className="text-white font-medium">
                    {new Date(rental.startDate).toLocaleDateString("vi-VN")}
                  </span>{" "}
                  đến{" "}
                  <span className="text-white font-medium">
                    {new Date(rental.endDate).toLocaleDateString("vi-VN")}
                  </span>{" "}
                  (Tổng cộng: <strong className="text-white">{rental.totalDays} ngày</strong>)
                </p>

                {/* Bảng giá: KHÔNG CẦN TIỀN CỌC */}
                <div className="pt-2 border-t border-[#23314c] grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Tiền thuê</span>
                    <span className="text-white font-bold">{rental.rentalFee.toLocaleString("vi-VN")} đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tiền cọc</span>
                    <span className="text-emerald-400 font-bold">0 đ (Miễn cọc)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tổng thanh toán</span>
                    <span className="text-orange-400 font-extrabold text-xs">
                      {totalAmountToPay.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Điều khoản chính */}
              <div className="space-y-1 pt-1">
                <h5 className="font-bold text-white text-[11px] uppercase tracking-wider">
                  ĐIỀU KHOẢN CAM KẾT:
                </h5>
                <ol className="list-decimal pl-4 space-y-1 text-slate-400 text-[11px]">
                  <li>
                    <strong className="text-slate-300">Chính sách miễn cọc:</strong> Hệ thống áp dụng chính sách thuê thiết bị không cần tiền cọc nhằm hỗ trợ tối đa cho khách thuê.
                  </li>
                  <li>
                    <strong className="text-slate-300">Bảo quản thiết bị:</strong> Bên Thuê cam kết sử dụng cẩn thận, đúng thông số kỹ thuật và hoàn trả đầy đủ thiết bị, linh phụ kiện đúng thời gian đã ký.
                  </li>
                  <li>
                    <strong className="text-slate-300">Bàn giao & Nghiệm thu:</strong> Hai bên kiểm tra ngoại quan máy và phụ kiện khi nhận hàng và khi trả hàng.
                  </li>
                  <li>
                    <strong className="text-slate-300">Chữ ký tay điện tử:</strong> Chữ ký tay điện tử dưới đây có giá trị pháp lý ràng buộc nghĩa vụ thực hiện hợp đồng theo Luật Giao dịch điện tử.
                  </li>
                </ol>
              </div>
            </div>

            {/* Khung ký chữ ký tay điện tử */}
            <div className="bg-[#101726] p-4 rounded-xl border border-[#212d42] space-y-2.5">
              <label className="block text-xs font-bold text-slate-200">
                ✍️ Chữ ký tay điện tử của Người thuê (Vẽ trực tiếp bằng tay hoặc chuột) *
              </label>

              <SignaturePad
                width={560}
                height={160}
                onChange={(dataUrl) => setHandwrittenSignature(dataUrl)}
              />

              <div className="pt-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Họ và tên người ký (tùy chọn xác nhận thêm):
                </label>
                <input
                  type="text"
                  placeholder={renterName}
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-[#172236] border border-[#293954] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Checkbox chấp nhận điều khoản */}
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none p-2 rounded-lg bg-[#0e1524]">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="rounded accent-orange-500 w-4 h-4 mt-0.5 cursor-pointer"
              />
              <span>
                Tôi đã đọc kỹ toàn bộ điều khoản hợp đồng thuê trên và cam kết chữ ký tay điện tử do chính tôi thực hiện.
              </span>
            </label>

            {/* Footer Buttons Step 1 */}
            <div className="pt-3 border-t border-[#212c42] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 bg-[#1c2436] hover:bg-[#25324c] text-slate-300 font-semibold rounded-xl text-xs transition-all"
                >
                  Để sau
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(true)}
                  className="px-3.5 py-2 bg-[#172235] hover:bg-[#202f48] border border-[#2a3c58] text-orange-400 hover:text-orange-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1"
                >
                  <span>📄</span>
                  <span>Xem trước PDF</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleGoToPayment}
                disabled={!termsAccepted || !handwrittenSignature}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Tiếp tục: Thanh toán VietQR</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: THANH TOÁN TỰ ĐỘNG QUA CỔNG PAYOS (VIETQR) */}
        {step === "payment" && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
            {/* Khối hiển thị Số tiền thanh toán (lấy từ dữ liệu đơn hàng) */}
            <div className="bg-gradient-to-br from-[#121c2e] via-[#16233a] to-[#111928] p-5 rounded-2xl border-2 border-emerald-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Số tiền thanh toán:
                </span>
                <span className="text-[11px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 px-2.5 py-0.5 rounded-full font-bold">
                  ✓ Miễn 100% tiền cọc
                </span>
              </div>

              <div className="flex items-baseline justify-between flex-wrap gap-2 pt-1 border-b border-[#213049] pb-3">
                <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
                  {totalAmountToPay.toLocaleString("vi-VN")} đ
                </span>
                <span className="text-xs text-slate-400">
                  (Chỉ tính phí thuê thiết bị)
                </span>
              </div>

              {/* Tóm tắt thông tin đơn hàng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 text-slate-300">
                <div className="truncate">
                  Thiết bị: <strong className="text-white">{rental.equipment?.title || "Thiết bị điện tử"}</strong>
                </div>
                <div>
                  Mã đơn: <strong className="text-orange-400 font-mono">{rental.rentalCode}</strong>
                </div>
                <div>
                  Chủ thiết bị: <strong className="text-white">{ownerName}</strong>
                </div>
                <div>
                  Mã hợp đồng: <strong className="text-slate-300 font-mono">{contractCode}</strong>
                </div>
              </div>
            </div>

            {/* Thông tin tiện ích cổng PayOS */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <span className="text-base">⚡</span>
                <span>Thanh toán tự động qua cổng PayOS (Chuẩn VietQR)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Nhấn nút bên dưới để chuyển hướng sang cổng thanh toán an toàn <strong>PayOS</strong>. Hệ thống sẽ tạo sẵn <strong>mã VietQR động</strong> đúng số tiền và tự động duyệt đơn ngay khi bạn chuyển tiền thành công!
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                <span>🏦</span>
                <span>Hỗ trợ tất cả ứng dụng ngân hàng: MB, Vietcombank, Techcombank, ACB, BIDV, VPBank, MoMo...</span>
              </div>
            </div>

            {/* Xem trước chữ ký đã vẽ */}
            {handwrittenSignature && (
              <div className="p-2.5 rounded-xl bg-[#0c1322] border border-[#1e2a40] flex items-center justify-between text-xs">
                <span className="text-slate-400">Chữ ký tay điện tử của bạn:</span>
                <div className="bg-white p-1 rounded-lg border border-slate-300 shadow-sm flex items-center justify-center">
                  <img
                    src={handwrittenSignature}
                    alt="Chữ ký đã vẽ"
                    className="h-8 max-w-[150px] object-contain block"
                  />
                </div>
              </div>
            )}

            {/* Nút bấm lớn, nổi bật ghi: "Thanh Toán Tự Động Qua PayOS" */}
            <div className="pt-3 border-t border-[#212c42] space-y-3">
              <button
                type="button"
                onClick={handlePayOSPayment}
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-base rounded-2xl transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse hover:animate-none"
              >
                <span>{loading ? "⏳" : "💳"}</span>
                <span>{loading ? "Đang kết nối cổng PayOS..." : "Thanh Toán Tự Động Qua PayOS"}</span>
                <span>➔</span>
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep("contract")}
                  disabled={loading}
                  className="px-3.5 py-1.5 text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>←</span>
                  <span>Quay lại kiểm tra hợp đồng</span>
                </button>
                <span className="text-[11px] text-slate-500">Bảo mật giao dịch VietQR 256-bit</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Xem & Tải Hợp Đồng PDF */}
      {showPdfModal && (
        <ContractPdfModal
          rental={rental}
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          signatureUrl={handwrittenSignature}
          signerName={signerName}
        />
      )}
    </div>
  );
}
