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
}

export default function ContractPdfModal({
  rental,
  isOpen,
  onClose,
  signatureUrl,
  signerName,
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

  const contractHtml = useMemo(() => {
    return buildContractHtml(rental, {
      signatureUrl,
      signerName,
      isSigned: isSignedOrOfficial,
      isOfficial: isSignedOrOfficial,
      hidePrintBar: true, // Ẩn thanh công cụ lặp lại bên trong iframe
    });
  }, [rental, signatureUrl, signerName, isSignedOrOfficial]);

  const handlePrintPdf = () => {
    openContractPdfPreview(rental, {
      signatureUrl,
      signerName,
      isSigned: true,
      isOfficial: isSignedOrOfficial,
    });
  };

  const handleDownload = () => {
    downloadContractHtml(rental, {
      signatureUrl,
      signerName,
      isSigned: true,
      isOfficial: isSignedOrOfficial,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
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
                  <span className="text-[11px] font-bold bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded-full">
                    ✓ Bản chính thức (Đã ký)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold bg-amber-950/80 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded-full">
                    📋 Bản mẫu dự thảo
                  </span>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
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
            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3.5 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-600/20 flex items-center gap-1.5"
              title="Mở hộp thoại in / Lưu file PDF"
            >
              <span>🖨️</span>
              <span>Lưu PDF / In</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-[#202e45] hover:bg-[#2b3c58] text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 border border-[#2d3e5c]"
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
