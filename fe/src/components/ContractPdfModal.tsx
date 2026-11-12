import { useMemo } from "react";
import type { Rental } from "../types/smartequip";
import {
  buildContractHtml,
  openContractPdfPreview,
  downloadContractHtml,
} from "../utils/contractPdfGenerator";

interface Props {
  rental: Rental;
  isOpen: boolean;
  onClose: () => void;
  signatureUrl?: string | null;
  signerName?: string;
  isOwner?: boolean;
  onEditContract?: () => void;
  onAgreeToSign?: (rental: Rental) => void;
}

export default function ContractPdfModal({
  rental,
  isOpen,
  onClose,
  signatureUrl,
  signerName,
  isOwner = false,
  onEditContract,
  onAgreeToSign,
}: Props) {
  if (!isOpen) return null;

  const contractCode = rental.contract?.contractNumber || `HD-${rental.rentalCode}`;

  const isSignedOrOfficial = Boolean(
    rental.contract?.renterSignature ||
      rental.contract?.digitalSignature ||
      rental.contract?.signedAt ||
      rental.contract?.termsAccepted ||
      Boolean(signatureUrl) ||
      String(rental.status).toUpperCase() === "CONTRACT_SIGNED" ||
      String(rental.status).toUpperCase() === "PAID" ||
      String(rental.status).toUpperCase() === "ACTIVE" ||
      String(rental.status).toUpperCase() === "CONFIRMED" ||
      String(rental.status).toUpperCase() === "COMPLETED" ||
      rental.payment?.isPaid
  );

  const ownerSignature =
    rental.contract?.ownerSignature ||
    (rental as any).owner_signature?.signature_image ||
    (rental as any).contract?.owner_signature?.signature_image ||
    undefined;

  const ownerSignerName =
    rental.contract?.ownerSignerName ||
    (rental as any).owner_signature?.signer_name ||
    (typeof rental.owner === "object" ? rental.owner?.name : undefined);

  const isOwnerSigned = Boolean(
    rental.contract?.ownerSigned ||
      (rental as any).owner_signature?.signed ||
      (rental as any).contract?.owner_signature?.signed ||
      rental.contract?.contractNumber
  );

  const contractHtml = useMemo(() => {
    return buildContractHtml(rental, {
      signatureUrl,
      signerName,
      isSigned: isSignedOrOfficial,
      isOfficial: isSignedOrOfficial,
      ownerSignature,
      ownerSignerName,
      isOwnerSigned,
      hidePrintBar: true, // Ẩn thanh công cụ lặp lại bên trong iframe
    });
  }, [rental, signatureUrl, signerName, isSignedOrOfficial, ownerSignature, ownerSignerName, isOwnerSigned]);

  const handlePrintPdf = () => {
    openContractPdfPreview(rental, {
      signatureUrl,
      signerName,
      isSigned: true,
      isOfficial: isSignedOrOfficial,
      ownerSignature,
      ownerSignerName,
      isOwnerSigned,
    });
  };

  const handleDownload = () => {
    downloadContractHtml(rental, {
      signatureUrl,
      signerName,
      isSigned: true,
      isOfficial: isSignedOrOfficial,
      ownerSignature,
      ownerSignerName,
      isOwnerSigned,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#121927] border border-[#273650] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[94vh] overflow-hidden">
        {/* Top Header Bar Gọn Gàng */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#212e44] bg-[#162032] gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl">📜</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white truncate">
                  Hợp Đồng Thuê Thiết Bị
                </span>
                {isSignedOrOfficial ? (
                  <span className="text-[11px] font-bold bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                    ✓ Bản chính thức (Đã ký)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold bg-amber-950/80 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                    📋 Dự thảo hợp đồng
                  </span>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 whitespace-nowrap">
                  Miễn cọc
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Mã HĐ: <strong className="text-orange-400 font-mono">{contractCode}</strong> | Mã đơn:{" "}
                <strong className="text-slate-300 font-mono">{rental.rentalCode}</strong>
              </p>
            </div>
          </div>

          {/* Action Buttons Gọn Gàng */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Nút Chủ máy sửa hợp đồng */}
            {isOwner && onEditContract && (
              <button
                type="button"
                onClick={onEditContract}
                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap"
                title="Chỉnh sửa điều khoản hợp đồng theo thỏa thuận với khách"
              >
                <span>✏️</span>
                <span>Sửa điều khoản HĐ</span>
              </button>
            )}

            {/* Nút Khách thuê: Phải đồng ý ký HĐ trước, sau đó mới hiện Ký hợp đồng & Thanh toán */}
            {!isOwner && !rental.contract?.termsAccepted && onAgreeToSign && (
              <button
                type="button"
                onClick={() => {
                  onAgreeToSign(rental);
                  onClose();
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95 animate-pulse"
                title={rental.contract?.agreedToSign ? "Ký tên điện tử xác nhận hợp đồng & tiến hành thanh toán" : "Bấm xác nhận đồng ý điều khoản hợp đồng trước khi ký"}
              >
                <span>{rental.contract?.agreedToSign ? "✍️" : "🤝"}</span>
                <span>{rental.contract?.agreedToSign ? "Ký hợp đồng & Thanh toán" : "Đồng ý ký hợp đồng"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3.5 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-600/20 flex items-center gap-1.5 whitespace-nowrap"
              title="Mở hộp thoại in / Lưu file PDF"
            >
              <span>🖨️</span>
              <span>Lưu PDF / In</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-[#202e45] hover:bg-[#2b3c58] text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 border border-[#2d3e5c] whitespace-nowrap"
              title="Tải file hợp đồng về máy"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Tải về máy</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-base font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#22314a] transition-colors ml-1"
              title="Đóng xem trước"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thanh hướng dẫn quyền hạn: Renter vs Owner */}
        {!isOwner ? (
          <div className="px-5 py-2 bg-gradient-to-r from-amber-950/40 via-sky-950/40 to-slate-900 border-b border-sky-800/30 text-xs text-sky-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span>ℹ️</span>
              <span>
                <strong>Dành cho Người thuê:</strong> Bạn chỉ có quyền xem hợp đồng. Nếu không đồng ý điều khoản hoặc chi phí nào, hãy <strong>nhắn tin trực tiếp vào khung chat</strong> để Chủ máy điều chỉnh theo thỏa thuận.
              </span>
            </div>
            <span className="text-[10.5px] bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/30 font-semibold whitespace-nowrap">
              Quyền xem hợp đồng
            </span>
          </div>
        ) : (
          <div className="px-5 py-2 bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-slate-900 border-b border-purple-800/30 text-xs text-purple-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span>✏️</span>
              <span>
                <strong>Dành cho Chủ máy:</strong> Bạn có quyền <strong>chỉnh sửa trực tiếp</strong> các điều khoản, đơn giá, thời gian thuê nếu khách không đồng ý điều khoản nào. Nhấp nút <strong>"Sửa điều khoản HĐ"</strong> ở trên để cập nhật!
              </span>
            </div>
            <span className="text-[10.5px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-semibold whitespace-nowrap">
              Quyền chỉnh sửa của Chủ máy
            </span>
          </div>
        )}

        {/* Mẹo nhỏ hướng dẫn ngắn gọn */}
        <div className="px-5 py-1.5 bg-blue-950/30 border-b border-blue-900/20 text-[11px] text-blue-300/90 flex items-center gap-1.5">
          <span>💡</span>
          <span>Nhấp <b>"Lưu PDF / In"</b> ➔ tại ô Máy in đích (Destination) chọn <b>"Save as PDF"</b> để lưu file PDF chất lượng cao về máy.</span>
        </div>

        {/* Content IFrame previewing the clean A4 Document */}
        <div className="flex-1 bg-[#1a2232] p-2 sm:p-4 overflow-auto flex justify-center">
          <iframe
            srcDoc={contractHtml}
            title={`Hợp Đồng ${contractCode}`}
            className="w-full max-w-[850px] h-full min-h-[700px] bg-white rounded-lg shadow-2xl border border-slate-300"
          />
        </div>
      </div>
    </div>
  );
}
