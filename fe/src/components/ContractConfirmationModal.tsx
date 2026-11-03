import { useState } from "react";
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [handwrittenSignature, setHandwrittenSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"contract" | "payment">("contract");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  if (!isOpen) return null;

  // Chi tiết thanh toán chuyển khoản VietQR MB Bank
  const bankName = "MB Bank (Ngân hàng TMCP Quân Đội)";
  const accountNumber = "111105056666";
  const accountHolder = "NGUYEN KHAC QUANG KHANH";
  const contractCode = rental.contract?.contractNumber || `HD-${rental.rentalCode}`;
  const transferContent = `THUE ${contractCode}`;
  const totalAmountToPay = rental.totalAmount || (rental.rentalFee + (rental.shippingFee || 0)); // KHÔNG CẦN TIỀN CỌC! (Tiền thuê + phí vận chuyển)

  const vietQrDynamicUrl = `https://img.vietqr.io/image/MB-${accountNumber}-compact2.png?amount=${totalAmountToPay}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

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

  const handleCompleteSignAndPay = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Luôn cập nhật và xác nhận chữ ký tay điện tử
      if (handwrittenSignature || signerName.trim()) {
        try {
          await smartEquipApi.confirmContract(token, rental._id, {
            termsAccepted: true,
            renterSignature: signerName.trim() || renterName,
            digitalSignature: handwrittenSignature || rental.contract?.digitalSignature || "",
          });
        } catch (signErr: any) {
          console.warn("Ký hợp đồng notice:", signErr?.message);
        }
      }

      // 2. Xác nhận thanh toán qua chuyển khoản VietQR kèm ảnh biên lai & bảo tồn chữ ký
      await smartEquipApi.payRental(token, rental._id, {
        paymentMethod: "bank_transfer",
        receiptImage: receiptImage || undefined,
        digitalSignature: handwrittenSignature || undefined,
        renterSignature: signerName.trim() || undefined,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hoàn tất xác nhận thanh toán");
      setLoading(false);
    }
  };

  const renterName =
    typeof rental.renter === "object" && rental.renter !== null
      ? rental.renter.name
      : "Người thuê SmartEquip";

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
                  : "Thanh Toán Tiền Thuê Chuyển Khoản (VietQR MB Bank)"}
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
            <span>Thanh toán VietQR (Không cọc)</span>
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

        {/* STEP 2: THANH TOÁN CHUYỂN KHOẢN VIETQR (KHÔNG CỌC) */}
        {step === "payment" && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* VietQR Container */}
            <div className="flex flex-col items-center justify-center bg-[#0d1422] p-4 rounded-xl border border-[#202d44]">
              <div className="relative bg-white p-2 rounded-xl shadow-lg border-2 border-orange-500/40 w-[200px] h-[200px] flex items-center justify-center overflow-hidden">
                <img
                  src={vietQrDynamicUrl}
                  alt="Mã QR VietQR MB Bank"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== "/vietqr-mb.jpg") {
                      target.src = "/vietqr-mb.jpg";
                      target.className = "w-[200px] h-[250px] object-cover object-top";
                    }
                  }}
                />
              </div>
              <span className="text-[10px] text-emerald-400 mt-1 font-semibold">✓ Mã QR chuẩn gọn MB Bank</span>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Mở ứng dụng Ngân hàng của bạn quét mã VietQR để thanh toán tiền thuê
              </p>
            </div>

            {/* Số tiền thanh toán */}
            <div className="bg-gradient-to-r from-orange-950/40 via-amber-950/30 to-orange-950/40 p-3 rounded-xl border border-orange-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-orange-300 block">Số tiền thanh toán:</span>
                <span className="text-xl font-extrabold text-orange-400">
                  {totalAmountToPay.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  ✓ Không cần tiền cọc
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Chỉ thanh toán phí thuê</p>
              </div>
            </div>

            {/* Bảng thông tin tài khoản MB Bank */}
            {/* Upload ảnh biên lai chuyển khoản (Yêu cầu 2) */}
            <div className="bg-[#101725] p-3.5 rounded-xl border border-[#212d42] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>📸</span>
                  <span>Ảnh chụp biên lai chuyển khoản thành công:</span>
                </label>
                <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                  Gửi để Quản lý duyệt nhanh
                </span>
              </div>

              {receiptImage ? (
                <div className="p-2 rounded-xl border border-emerald-500/40 bg-[#0d1422] flex items-center gap-3">
                  <img
                    src={receiptImage}
                    alt="Biên lai chuyển khoản"
                    className="w-16 h-16 object-cover rounded-lg border border-[#263752]"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-emerald-400 block">✓ Đã đính kèm ảnh biên lai</span>
                    <button
                      type="button"
                      onClick={() => setReceiptImage(null)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold underline mt-1"
                    >
                      Gỡ ảnh / Chọn ảnh khác
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[#283852] hover:border-orange-500/60 rounded-xl cursor-pointer bg-[#0c1322] hover:bg-[#131d30] transition-all">
                  <span className="text-lg">📷</span>
                  <span className="text-xs text-slate-300 font-medium mt-1">Bấm để tải ảnh chụp màn hình bill ngân hàng</span>
                  <span className="text-[10px] text-slate-500">JPG, PNG, WEBP (Tối đa 10MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onloadend = () => setReceiptImage(r.result as string);
                      r.readAsDataURL(f);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="bg-[#111927] p-3.5 rounded-xl border border-[#212d42] space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#1b263b]">
                <span className="text-slate-400">Ngân hàng:</span>
                <span className="font-bold text-white text-right">{bankName}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b263b]">
                <span className="text-slate-400">Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-orange-300 text-sm">{accountNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(accountNumber, "stk")}
                    className="px-2 py-0.5 bg-[#1f2b3e] hover:bg-orange-600 text-slate-300 hover:text-white rounded text-[10px] font-semibold transition-all"
                  >
                    {copiedField === "stk" ? "✓ Đã chép" : "Sao chép"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#1b263b]">
                <span className="text-slate-400">Chủ tài khoản:</span>
                <span className="font-bold text-white">{accountHolder}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Nội dung chuyển khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-400">{transferContent}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(transferContent, "memo")}
                    className="px-2 py-0.5 bg-[#1f2b3e] hover:bg-emerald-600 text-slate-300 hover:text-white rounded text-[10px] font-semibold transition-all"
                  >
                    {copiedField === "memo" ? "✓ Đã chép" : "Sao chép"}
                  </button>
                </div>
              </div>
            </div>

            {/* Banner tải / lưu hợp đồng PDF */}
            <div className="p-3 bg-[#0d1525] border border-[#202e48] rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl">📄</span>
                <div>
                  <span className="text-xs font-bold text-white block">Hợp đồng điện tử kèm chữ ký tay</span>
                  <span className="text-[11px] text-slate-400">Bạn có thể mở kiểm tra và tải file PDF về máy</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 hover:text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                <span>🖨️</span>
                <span>Lưu file PDF</span>
              </button>
            </div>

            {/* Xem trước chữ ký đã vẽ nền trắng */}
            {handwrittenSignature && (
              <div className="p-2.5 rounded-xl bg-[#0c1322] border border-[#1e2a40] flex items-center justify-between text-xs">
                <span className="text-slate-400">Chữ ký tay của bạn (Nền trắng):</span>
                <div className="bg-white p-1 rounded-lg border border-slate-300 shadow-sm flex items-center justify-center">
                  <img
                    src={handwrittenSignature}
                    alt="Chữ ký đã vẽ"
                    className="h-9 max-w-[170px] object-contain block"
                  />
                </div>
              </div>
            )}

            {/* Footer Buttons Step 2 */}
            <div className="pt-3 border-t border-[#212c42] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep("contract")}
                disabled={loading}
                className="px-4 py-2 bg-[#1b2436] hover:bg-[#25324c] text-slate-300 font-semibold rounded-xl text-xs transition-all"
              >
                ← Quay lại hợp đồng
              </button>
              <button
                type="button"
                onClick={handleCompleteSignAndPay}
                disabled={loading}
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span>Đang ghi nhận chữ ký & thanh toán...</span>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Xác nhận Ký & Đã Chuyển Khoản Thành Công</span>
                  </>
                )}
              </button>
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
