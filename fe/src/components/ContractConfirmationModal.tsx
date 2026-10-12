import { useState } from "react";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Rental } from "../types/smartequip";

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
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Vui lòng tích đồng ý với các điều khoản của hợp đồng.");
      return;
    }
    if (!signature.trim()) {
      setError("Vui lòng nhập chữ ký / Họ và tên để ký hợp đồng điện tử.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await smartEquipApi.confirmContract(token, rental._id, {
        termsAccepted: true,
        digitalSignature: signature.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể ký hợp đồng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#172033] border border-[#27344d] w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#25324c]">
          <div>
            <h2 className="text-lg font-bold text-white">
              Hợp Đồng Điện Tử Thuê Thiết Bị
            </h2>
            <p className="text-xs text-orange-400 mt-0.5">
              Mã đơn: {rental.rentalCode} | Mã HĐ: {rental.contract?.contractNumber || "HD-SMARTEQUIP"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#202c42]"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Contract Text Body */}
        <div className="flex-1 overflow-y-auto my-4 p-4 rounded-xl bg-[#121927] border border-[#202c40] text-xs text-slate-300 space-y-3 leading-relaxed">
          <div className="text-center pb-2 border-b border-[#232f45]">
            <h3 className="font-bold text-sm text-white uppercase">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h3>
            <p className="text-[11px] text-slate-400">Độc lập - Tự do - Hạnh phúc</p>
            <h4 className="font-extrabold text-sm text-orange-400 mt-2">
              HỢP ĐỒNG THUÊ THIẾT BỊ CÔNG NGHỆ ĐIỆN TỬ
            </h4>
          </div>

          <div>
            <p><strong>BÊN CHO THUÊ (Chủ thiết bị):</strong> {rental.owner?.name}</p>
            <p><strong>BÊN THUÊ (Khách hàng):</strong> {typeof rental.renter === "object" ? rental.renter.name : "Người thuê"}</p>
          </div>

          <div className="p-3 bg-[#192338] rounded-lg border border-[#263550] space-y-1">
            <p><strong>Thiết bị:</strong> {rental.equipment?.title}</p>
            <p><strong>Thời gian thuê:</strong> Từ {new Date(rental.startDate).toLocaleDateString("vi-VN")} đến {new Date(rental.endDate).toLocaleDateString("vi-VN")} ({rental.totalDays} ngày)</p>
            <p><strong>Tiền thuê:</strong> {rental.rentalFee.toLocaleString("vi-VN")} đ</p>
            <p><strong>Tiền đặt cọc:</strong> {rental.depositAmount.toLocaleString("vi-VN")} đ</p>
            <p><strong>Tổng thanh toán:</strong> {rental.totalAmount.toLocaleString("vi-VN")} đ</p>
          </div>

          <div className="space-y-1 pt-2">
            <h5 className="font-bold text-white">ĐIỀU KHOẢN VÀ NGHĨA VỤ:</h5>
            <ol className="list-decimal pl-4 space-y-1 text-slate-400">
              <li>Bên Thuê cam kết sử dụng thiết bị đúng mục đích, giữ gìn nguyên trạng linh kiện và phụ kiện đi kèm.</li>
              <li>Bên Thuê chịu trách nhiệm bồi thường nếu thiết bị bị rơi vỡ, vô nước hoặc hư hỏng do lỗi chủ quan.</li>
              <li>Tiền đặt cọc sẽ được hoàn trả đầy đủ trong vòng 24 giờ sau khi Bên Cho Thuê xác nhận thiết bị hoạt động bình thường.</li>
              <li>Hợp đồng điện tử này có giá trị ràng buộc trách nhiệm pháp lý kể từ thời điểm ký.</li>
            </ol>
          </div>
        </div>

        {/* Sign form */}
        <form onSubmit={handleSignContract} className="pt-2 border-t border-[#25324c] space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="rounded accent-orange-500 w-4 h-4"
            />
            <span>Tôi đã đọc kỹ và đồng ý với tất cả điều khoản hợp đồng trên.</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Ký tên điện tử (Nhập đầy đủ Họ và tên) *
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-[#202a3f] hover:bg-[#2b3752] text-slate-300 font-semibold rounded-xl text-xs transition-all"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={loading || !termsAccepted || !signature.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/30"
              >
                {loading ? "Đang xử lý..." : "✍️ Ký & Xác nhận hợp đồng"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
