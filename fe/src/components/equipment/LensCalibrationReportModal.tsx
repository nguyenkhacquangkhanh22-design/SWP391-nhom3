import React, { useState, useEffect } from "react";
import type { CalibrationCertificate } from "../../types/opticalBenchmark";
import { opticalBenchmarkApi } from "../../services/opticalBenchmarkApi";

interface Props {
  equipmentId: string;
  onClose: () => void;
}

export const LensCalibrationReportModal: React.FC<Props> = ({ equipmentId, onClose }) => {
  const [cert, setCert] = useState<CalibrationCertificate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCertificate();
  }, [equipmentId]);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      const data = await opticalBenchmarkApi.getCertificate(equipmentId);
      setCert(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải chứng thư kiểm định");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 p-6 sm:p-8 space-y-6">
        {/* Certificate Frame Pattern */}
        <div className="absolute inset-0 border-8 border-indigo-950/40 pointer-events-none m-2 rounded-xl" />

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
            ★ SmartEquip Optical Metrology Lab
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-serif">
            CHỨNG NHẬN HIỆU CHUẨN QUANG HỌC
          </h2>
          <p className="text-xs text-slate-400">
            Certificate of Optical Calibration & MTF Verification
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Đang tải chứng thư phòng Lab...</p>
          </div>
        ) : error || !cert ? (
          <div className="py-8 text-center text-red-400 text-sm">
            {error || "Chưa có chứng thư kiểm định cho thiết bị này"}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">Thiết Bị Kiểm Định:</span>
                <strong className="text-slate-100 text-sm">{cert.equipment_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Số Serial Number:</span>
                <strong className="text-amber-300 font-mono text-sm">{cert.equipment_serial}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Mã Chứng Thư:</span>
                <strong className="text-indigo-300 font-mono">{cert.certificate_id}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Ngày Cấp Chứng Nhận:</span>
                <span className="text-slate-200">{new Date(cert.issued_date).toLocaleDateString("vi-VN")}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Hiệu Chuẩn Ngàm AF:</span>
                <span className="text-emerald-400 font-semibold">
                  Offset {cert.af_micro_adjustment_offset} (Độ lặp lại {cert.repeatability_accuracy})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Thiết Bị Đo Collimator:</span>
                <span className="text-slate-300">{cert.collimator_model}</span>
              </div>
            </div>

            {/* Score & Stamp */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-xl">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  Chỉ Số Khảo Sát Thấu Kính
                </span>
                <div className="text-4xl font-black text-emerald-400 mt-1">
                  {cert.optical_score}
                  <span className="text-base text-slate-500 font-normal"> / 100</span>
                </div>
                <span className="text-xs text-emerald-300 font-medium mt-1 inline-block">
                  ✓ Đạt chuẩn khai thác cảm biến điện ảnh 8K
                </span>
              </div>

              {/* Con dấu mô phỏng */}
              <div className="w-28 h-28 border-4 border-dashed border-red-500/80 rounded-full flex flex-col items-center justify-center p-2 text-center rotate-[-12deg] select-none shadow-lg">
                <span className="text-[9px] font-bold text-red-400 uppercase">SMARTEQUIP LAB</span>
                <span className="text-xs font-black text-red-500 tracking-wider">PASSED</span>
                <span className="text-[8px] text-red-400 font-mono">ISO 12233</span>
              </div>
            </div>

            {/* Chữ ký & Đơn vị cấp */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Cơ quan chứng nhận:</span>
                <strong className="text-slate-300">{cert.issuer}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Kỹ sư kiểm định:</span>
                <strong className="text-indigo-400 font-serif italic text-sm">{cert.technician}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            In Chứng Thư PDF
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default LensCalibrationReportModal;
