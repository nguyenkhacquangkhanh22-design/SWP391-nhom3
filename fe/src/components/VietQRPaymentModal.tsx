import { useState } from "react";

interface VietQRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: (receiptImage?: string) => Promise<void> | void;
  amount: number;
  rentalCode: string;
  contractCode?: string;
  equipmentTitle?: string;
  loading?: boolean;
}

export default function VietQRPaymentModal({
  isOpen,
  onClose,
  onConfirmPayment,
  amount,
  rentalCode,
  contractCode,
  equipmentTitle,
  loading = false,
}: VietQRPaymentModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const bankName = "MB Bank (Ngân hàng TMCP Quân Đội)";
  const accountNumber = "111105056666";
  const accountHolder = "NGUYEN KHAC QUANG KHANH";
  const transferContent = `THUE ${contractCode || rentalCode}`;

  // VietQR Dynamic URL with specific amount and memo
  const vietQrDynamicUrl = `https://img.vietqr.io/image/MB-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141d2d] border border-[#263550] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#212c42]">
          <div className="flex items-center gap-2">
            <span className="text-xl">💳</span>
            <div>
              <h3 className="text-base font-bold text-white">Thanh Toán Chuyển Khoản VietQR</h3>
              <p className="text-xs text-orange-400">
                Miễn phí cọc • Mã đơn: <strong className="font-mono text-white">{rentalCode}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1f2b3e]"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* QR Code container */}
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
            <p className="text-[11px] text-slate-400 mt-2.5 text-center flex items-center gap-1.5">
              <span>📱</span>
              <span>Quét mã trên bằng bất kỳ ứng dụng ngân hàng nào (App MB, Vietcombank, Momo...)</span>
            </p>
          </div>

          {/* Amount Badge */}
          <div className="bg-gradient-to-r from-orange-950/40 via-amber-950/30 to-orange-950/40 p-3 rounded-xl border border-orange-500/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-orange-300 block">Số tiền cần thanh toán:</span>
              <span className="text-xl font-extrabold text-orange-400">
                {amount.toLocaleString("vi-VN")} đ
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                ✓ Tiền cọc: 0 đ (Miễn cọc)
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Chỉ thu phí thuê thực tế</p>
            </div>
          </div>

          {/* Transfer Info Details */}
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

          <div className="bg-[#111927] p-3.5 rounded-xl border border-[#212d42] space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Thông tin tài khoản nhận tiền</span>
              <span className="text-slate-500 font-normal normal-case">Nhấp vào để sao chép</span>
            </h4>

            {/* Ngân hàng */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#1b263b]">
              <span className="text-slate-400">Ngân hàng:</span>
              <span className="font-bold text-white text-right">{bankName}</span>
            </div>

            {/* Số tài khoản */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#1b263b]">
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

            {/* Tên chủ tài khoản */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#1b263b]">
              <span className="text-slate-400">Chủ tài khoản:</span>
              <span className="font-bold text-white">{accountHolder}</span>
            </div>

            {/* Nội dung chuyển khoản */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Nội dung CK:</span>
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

          {equipmentTitle && (
            <p className="text-[11px] text-slate-400 italic text-center">
              Thuê thiết bị: <span className="text-slate-300 font-medium">{equipmentTitle}</span>
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#212c42] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-[#1b2436] hover:bg-[#25324c] text-slate-300 font-semibold rounded-xl text-xs transition-all"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => onConfirmPayment(receiptImage || undefined)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <span>Đang xác nhận...</span>
            ) : (
              <>
                <span>✅</span>
                <span>Tôi đã chuyển khoản thành công</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

