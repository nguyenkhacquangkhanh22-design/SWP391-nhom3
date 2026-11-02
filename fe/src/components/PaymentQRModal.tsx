import { useState, type ChangeEvent, type FormEvent } from "react";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Rental } from "../types/smartequip";

interface Props {
  rental: Rental;
  token: string;
  isOpen: boolean;
  defaultSenderName?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const BANK_INFO = {
  bankName: "MB Bank (Ngân hàng Quân Đội)",
  accountHolder: "NGUYEN KHAC QUANG KHANH",
  accountNumber: "111105056666",
  qrImageUrl: "/qr-payment.jpg",
};

function compressImageToDataUrl(file: File, maxDimension = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh biên lai."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Định dạng ảnh biên lai không hợp lệ."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export default function PaymentQRModal({
  rental,
  token,
  isOpen,
  defaultSenderName = "",
  onClose,
  onSuccess,
}: Props) {
  const defaultTransferNote = `${rental.rentalCode} THANH TOAN`;
  const [senderName, setSenderName] = useState(
    rental.payment?.senderName || defaultSenderName || ""
  );
  const [transactionId, setTransactionId] = useState(
    rental.status.toUpperCase() === "PAYMENT_REJECTED" ? "" : rental.payment?.transactionId || ""
  );
  const [transferNote, setTransferNote] = useState(
    rental.payment?.transferNote || defaultTransferNote
  );
  const [proofImage, setProofImage] = useState(rental.payment?.proofImage || "");
  const [copiedField, setCopiedField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(""), 2000);
    } catch {
      // Fallback ignore
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setProofImage(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải ảnh biên lai.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!senderName.trim()) {
      setError("Vui lòng nhập họ tên người chuyển khoản để Rental Moderator đối chiếu.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await smartEquipApi.payRental(token, rental._id, {
        paymentMethod: "qr_transfer",
        senderName: senderName.trim(),
        transactionId: transactionId.trim(),
        transferNote: transferNote.trim() || defaultTransferNote,
        proofImage,
      });
      onSuccess(
        res.message ||
          "Đã gửi xác nhận thanh toán QR! Vui lòng chờ Rental Moderator đối chiếu và xác nhận."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi xác nhận thanh toán");
    } finally {
      setLoading(false);
    }
  };

  const isRejected = rental.status.toUpperCase() === "PAYMENT_REJECTED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141d2d] border border-[#263550] w-full max-w-3xl rounded-2xl p-6 shadow-2xl relative overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#212c42]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>💳</span> Thanh Toán Chuyển Khoản Mã QR (VietQR)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Mã đơn: <strong className="font-mono text-orange-400">#{rental.rentalCode}</strong> • Sau khi chuyển khoản,{" "}
              <strong className="text-sky-400">Rental Moderator</strong> sẽ đối chiếu và xác nhận đơn thuê của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1f2b3e]"
          >
            ✕
          </button>
        </div>

        {/* Rejected warning if resubmitting */}
        {isRejected && rental.payment?.moderatorNote && (
          <div className="mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
            <div className="font-bold text-rose-200">
              ⚠️ Phản hồi từ Rental Moderator (cần kiểm tra & gửi lại):
            </div>
            <div>{rental.payment.moderatorNote}</div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto my-4 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Left: VietQR Image Card */}
            <div className="md:col-span-5 bg-[#0f1624] border border-[#1f2d47] rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
              <div className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
                Quét mã VietQR • Napas 24/7
              </div>

              <div className="w-full max-w-[250px] rounded-xl overflow-hidden border-2 border-white/15 shadow-lg bg-white">
                <img
                  src={BANK_INFO.qrImageUrl}
                  alt="Mã QR Thanh Toán MB Bank - NGUYEN KHAC QUANG KHANH"
                  className="w-full h-auto object-contain block"
                />
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed">
                Mở ứng dụng Ngân hàng hoặc Ví điện tử bất kỳ để quét mã QR trên và nhập đúng số tiền, nội dung chuyển khoản bên cạnh.
              </div>
            </div>

            {/* Right: Bank Info + Amount Breakdown + Confirmation Form */}
            <form onSubmit={handleSubmit} className="md:col-span-7 space-y-3.5 text-xs">
              {/* Bank Details Box */}
              <div className="bg-[#0f1624] border border-[#1f2d47] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Ngân hàng:</span>
                  <span className="font-bold text-white">{BANK_INFO.bankName}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Chủ tài khoản:</span>
                  <span className="font-bold text-emerald-400 tracking-wide">
                    {BANK_INFO.accountHolder}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-white">
                      {BANK_INFO.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(BANK_INFO.accountNumber, "stk")}
                      className="px-2 py-0.5 rounded bg-[#1e2c46] hover:bg-[#2a3d61] text-[10px] font-semibold text-sky-300"
                    >
                      {copiedField === "stk" ? "Đã chép ✓" : "Sao chép"}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1e2a42] flex items-center justify-between gap-2">
                  <span className="text-slate-400">Số tiền cần chuyển:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-orange-400">
                      {rental.totalAmount.toLocaleString("vi-VN")} đ
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(String(rental.totalAmount), "amount")}
                      className="px-2 py-0.5 rounded bg-[#1e2c46] hover:bg-[#2a3d61] text-[10px] font-semibold text-sky-300"
                    >
                      {copiedField === "amount" ? "Đã chép ✓" : "Sao chép"}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex flex-wrap justify-between gap-2 bg-[#162136] px-3 py-1.5 rounded-lg">
                  <span>Tiền thuê ({rental.totalDays} ngày): <strong className="text-slate-200">{rental.rentalFee.toLocaleString("vi-VN")} đ</strong></span>
                  <span>Tiền cọc thiết bị: <strong className="text-slate-200">{rental.depositAmount.toLocaleString("vi-VN")} đ</strong></span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Nội dung CK bắt buộc:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {defaultTransferNote}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(defaultTransferNote, "note")}
                      className="px-2 py-0.5 rounded bg-[#1e2c46] hover:bg-[#2a3d61] text-[10px] font-semibold text-sky-300"
                    >
                      {copiedField === "note" ? "Đã chép ✓" : "Sao chép"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Confirmation Inputs */}
              <div className="bg-[#172236] border border-[#24334e] rounded-xl p-3.5 space-y-3">
                <div className="font-bold text-slate-200 uppercase text-[11px] tracking-wider">
                  Thông tin xác nhận chuyển khoản (Gửi Rental Moderator)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Họ tên người chuyển khoản *
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="VD: TRAN THI KHACH THUE"
                      className="w-full bg-[#0f1624] border border-[#2b3a56] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Mã giao dịch Ngân hàng / FT (nếu có)
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="VD: FT26306889911"
                      className="w-full bg-[#0f1624] border border-[#2b3a56] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nội dung chuyển khoản đã ghi
                  </label>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="w-full bg-[#0f1624] border border-[#2b3a56] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Ảnh chụp màn hình biên lai chuyển khoản (Khuyến khích tải lên để duyệt nhanh)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleFileChange(e)}
                    className="w-full text-[11px] text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/30 cursor-pointer"
                  />
                  {proofImage && (
                    <div className="mt-2 flex items-center gap-3 bg-[#0f1624] p-2 rounded-lg border border-[#253552]">
                      <img
                        src={proofImage}
                        alt="Biên lai chuyển khoản"
                        className="w-14 h-14 object-cover rounded border border-white/10"
                      />
                      <div className="flex-1 text-[11px] text-emerald-400 font-medium">
                        ✓ Đã đính kèm ảnh biên lai chuyển khoản
                      </div>
                      <button
                        type="button"
                        onClick={() => setProofImage("")}
                        className="text-[11px] text-rose-400 hover:underline px-2"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 bg-[#202d45] hover:bg-[#2b3c5c] text-slate-300 font-semibold rounded-xl text-xs transition-all"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <span>✅</span>
                  <span>
                    {loading
                      ? "Đang gửi xác nhận..."
                      : "Tôi đã chuyển khoản QR — Gửi Moderator xác nhận"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
