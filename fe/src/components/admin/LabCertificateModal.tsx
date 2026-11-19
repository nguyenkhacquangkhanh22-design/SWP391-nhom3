import React, { useState, useEffect } from "react";
import type { QualityCertificateData } from "../../types/labMaintenance";
import { labMaintenanceApi } from "../../services/labMaintenanceApi";

interface Props {
  orderId: string;
  onClose: () => void;
}

export const LabCertificateModal: React.FC<Props> = ({ orderId, onClose }) => {
  const [cert, setCert] = useState<QualityCertificateData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCertificate();
  }, [orderId]);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      const data = await labMaintenanceApi.getCertificate(orderId);
      setCert(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải chứng thư");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/50 rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-6 sm:p-8 space-y-6">
        {/* Certificate Decorative Border */}
        <div className="absolute inset-2 border-2 border-dashed border-cyan-900/40 rounded-2xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
            ★ ISO 14644-1 Cleanroom Quality Certificate
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-teal-300 to-emerald-400 font-serif">
            CHỨNG THƯ BẢO DƯỠNG PHÒNG SẠCH ISO CLASS 5
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Mã phiếu xuất xưởng: <strong className="text-cyan-300">{cert?.work_order_code || "LAB-WO"}</strong>
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Đang tải chứng thư xuất xưởng phòng sạch...</p>
          </div>
        ) : error || !cert ? (
          <div className="py-8 text-center text-red-400 text-sm">
            {error || "Chưa có chứng thư cho phiếu này"}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Spec Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">Thiết Bị Căn Chỉnh:</span>
                <strong className="text-slate-100 text-sm">{cert.equipment_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Số Seri Thân Máy:</span>
                <strong className="text-amber-300 font-mono text-sm">{cert.serial_number}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Tiêu Chuẩn Buồng Xử Lý:</span>
                <span className="text-emerald-400 font-semibold">{cert.cleanroom_class}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Mật Độ Hạt Bụi Đạt Được:</span>
                <span className="text-cyan-300 font-mono">{cert.particle_count_achieved}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Bụi Cảm Biến (Trước $\rightarrow$ Sau):</span>
                <span className="text-slate-200 font-bold">
                  {cert.sensor_dust_before} hạt $\rightarrow$ <span className="text-emerald-400">{cert.sensor_dust_after} hạt (0 hạt)</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Sai Số Ngàm Flange Depth:</span>
                <span className="text-emerald-400 font-semibold">{cert.flange_focal_error}</span>
              </div>
            </div>

            {/* Verdict Box with Stamp */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-cyan-950/30 to-slate-900 border border-cyan-900/40 rounded-xl">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Kết Luận Kỹ Sư Trưởng
                </span>
                <p className="text-xs text-slate-200 font-medium mt-1 leading-relaxed max-w-sm">
                  "{cert.verdict}"
                </p>
                <div className="mt-2 text-xs text-cyan-400 font-semibold">
                  Điểm quang học xuất xưởng: <strong>{cert.sharpness_score}</strong>
                </div>
              </div>

              {/* Lab Seal Stamp */}
              <div className="w-24 h-24 border-4 border-dashed border-cyan-500/80 rounded-full flex flex-col items-center justify-center p-2 text-center rotate-[-10deg] select-none shadow-lg">
                <span className="text-[8px] font-bold text-cyan-400 uppercase">SMARTEQUIP</span>
                <span className="text-xs font-black text-cyan-300 tracking-wider">ISO CLASS 5</span>
                <span className="text-[8px] text-emerald-400 font-mono">CERTIFIED</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Mã chứng chỉ điện tử:</span>
                <strong className="text-cyan-400 font-mono">{cert.certificate_id}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Kỹ sư quang học:</span>
                <strong className="text-slate-200 font-serif italic text-sm">{cert.technician}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            In Chứng Thư PDF
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-600/30 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabCertificateModal;
