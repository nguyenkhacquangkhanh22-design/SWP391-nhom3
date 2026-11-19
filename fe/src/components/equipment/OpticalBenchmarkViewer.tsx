import React, { useState, useEffect } from "react";
import type { OpticalBenchmark, ApertureTestRecord, SensorCompatibilityResult } from "../../types/opticalBenchmark";
import { opticalBenchmarkApi } from "../../services/opticalBenchmarkApi";
import LensCalibrationReportModal from "./LensCalibrationReportModal";

interface Props {
  equipmentId: string;
  equipmentTitle?: string;
}

export const OpticalBenchmarkViewer: React.FC<Props> = ({ equipmentId, equipmentTitle }) => {
  const [benchmark, setBenchmark] = useState<OpticalBenchmark | null>(null);
  const [selectedAperture, setSelectedAperture] = useState<number>(2.8);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  // Sensor compatibility calculator state
  const [sensorMp, setSensorMp] = useState<number>(45);
  const [compatibility, setCompatibility] = useState<SensorCompatibilityResult | null>(null);

  useEffect(() => {
    loadBenchmark();
  }, [equipmentId]);

  const loadBenchmark = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await opticalBenchmarkApi.getBenchmark(equipmentId);
      setBenchmark(data);
      if (data.tested_apertures && data.tested_apertures.length > 0) {
        // Mặc định chọn khẩu f/2.8 hoặc f/4.0
        const defaultAp = data.tested_apertures.find((a) => a.aperture_f_stop === 2.8 || a.aperture_f_stop === 4.0) || data.tested_apertures[0];
        setSelectedAperture(defaultAp.aperture_f_stop);
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải báo cáo kiểm định quang học");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateSensor = async (mp: number) => {
    setSensorMp(mp);
    try {
      const res = await opticalBenchmarkApi.getSensorCompatibility(equipmentId, mp);
      setCompatibility(res);
    } catch (err) {
      console.error("Lỗi tính tương thích cảm biến:", err);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Đang tải biểu đồ kiểm định quang học MTF và dữ liệu phòng Lab...</p>
      </div>
    );
  }

  if (error || !benchmark) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <p className="text-red-400 text-sm mb-2">{error || "Chưa có dữ liệu quang học"}</p>
        <button
          onClick={loadBenchmark}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  const currentApertureData: ApertureTestRecord | undefined = benchmark.tested_apertures.find(
    (a) => a.aperture_f_stop === selectedAperture
  ) || benchmark.tested_apertures[0];

  // Helper tính tọa độ vẽ đường cong MTF trong khung SVG 400x200
  // X: 0mm (Center) -> 14mm (Mid) -> 21.6mm (Corner)
  // Y: 0.0 (đáy) -> 1.0 (đỉnh)
  const getSvgY = (mtfVal: number) => 180 - mtfVal * 160;

  const mtf10 = currentApertureData ? currentApertureData.mtf_10_lp_mm : { center: 0.95, mid_frame: 0.90, corner: 0.82 };
  const mtf30 = currentApertureData ? currentApertureData.mtf_30_lp_mm : { center: 0.90, mid_frame: 0.82, corner: 0.70 };

  const path10lp = `M 40 ${getSvgY(mtf10.center)} Q 200 ${getSvgY(mtf10.mid_frame)} 360 ${getSvgY(mtf10.corner)}`;
  const path30lp = `M 40 ${getSvgY(mtf30.center)} Q 200 ${getSvgY(mtf30.mid_frame)} 360 ${getSvgY(mtf30.corner)}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl space-y-6">
      {/* Header & Tổng điểm */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
              ISO 12233 Optical Lab Certified
            </span>
            <span className="text-xs text-slate-400">Thiết bị đo: {benchmark.test_bench_serial}</span>
          </div>
          <h3 className="text-xl font-bold mt-1.5 text-slate-100">
            {benchmark.lens_model_name || equipmentTitle || "Ống kính máy ảnh"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Đo đạc kiểm định bởi: <strong className="text-slate-200">{benchmark.technician_name}</strong> • Tiêu cự thử nghiệm: {benchmark.focal_length_tested_mm}mm
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase font-medium text-slate-400">Điểm Quang Học</div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              {benchmark.overall_optical_score}
              <span className="text-sm font-normal text-slate-500">/100</span>
            </div>
          </div>
          <button
            onClick={() => setShowCertificateModal(true)}
            className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-xs font-semibold rounded-xl text-white shadow-lg shadow-indigo-500/20 transition"
          >
            Xem Chứng Thư
          </button>
        </div>
      </div>

      {/* Bộ chọn khẩu độ kiểm tra */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Chọn Khẩu Độ Phân Tích Đường Cong MTF (f-stop):
        </label>
        <div className="flex flex-wrap gap-2">
          {benchmark.tested_apertures.map((record) => (
            <button
              key={record.aperture_f_stop}
              onClick={() => setSelectedAperture(record.aperture_f_stop)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedAperture === record.aperture_f_stop
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md shadow-indigo-600/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              f/{record.aperture_f_stop}
            </button>
          ))}
        </div>
      </div>

      {/* Đồ thị MTF Curve (SVG) */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4">
        <div className="flex items-center justify-between text-xs mb-3 text-slate-300">
          <span className="font-semibold text-slate-200">
            Biểu Đồ Độ Nét & Tương Phản MTF tại f/{selectedAperture}
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-400 rounded-full inline-block" />
              10 lp/mm (Độ tương phản khung hình)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-cyan-400 rounded-full inline-block" />
              30 lp/mm (Độ sắc nét chi tiết cao)
            </span>
          </div>
        </div>

        {/* SVG Visualization */}
        <div className="relative w-full h-56 bg-slate-900/50 rounded-lg p-2 flex items-center justify-center">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            {/* Lưới tọa độ */}
            <line x1="40" y1="20" x2="360" y2="20" stroke="#334155" strokeDasharray="3 3" />
            <line x1="40" y1="60" x2="360" y2="60" stroke="#334155" strokeDasharray="3 3" />
            <line x1="40" y1="100" x2="360" y2="100" stroke="#334155" strokeDasharray="3 3" />
            <line x1="40" y1="140" x2="360" y2="140" stroke="#334155" strokeDasharray="3 3" />
            <line x1="40" y1="180" x2="360" y2="180" stroke="#475569" strokeWidth="1.5" />

            {/* Trục hoành Y labels */}
            <text x="10" y="24" fill="#64748b" fontSize="10">1.0</text>
            <text x="10" y="64" fill="#64748b" fontSize="10">0.75</text>
            <text x="10" y="104" fill="#64748b" fontSize="10">0.5</text>
            <text x="10" y="144" fill="#64748b" fontSize="10">0.25</text>
            <text x="10" y="184" fill="#64748b" fontSize="10">0.0</text>

            {/* Vạch mốc vị trí cảm biến */}
            <line x1="40" y1="20" x2="40" y2="180" stroke="#475569" strokeWidth="1.5" />
            <line x1="200" y1="20" x2="200" y2="180" stroke="#334155" strokeDasharray="2 2" />
            <line x1="360" y1="20" x2="360" y2="180" stroke="#475569" strokeWidth="1.5" />

            <text x="35" y="196" fill="#94a3b8" fontSize="10">0mm (Tâm)</text>
            <text x="180" y="196" fill="#94a3b8" fontSize="10">14mm (Giữa)</text>
            <text x="330" y="196" fill="#94a3b8" fontSize="10">21.6mm (Góc)</text>

            {/* Đường cong MTF 10 lp/mm (Màu xanh lá) */}
            <path d={path10lp} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
            <circle cx="40" cy={getSvgY(mtf10.center)} r="4" fill="#34d399" />
            <circle cx="200" cy={getSvgY(mtf10.mid_frame)} r="4" fill="#34d399" />
            <circle cx="360" cy={getSvgY(mtf10.corner)} r="4" fill="#34d399" />

            {/* Đường cong MTF 30 lp/mm (Màu xanh dương) */}
            <path d={path30lp} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
            <circle cx="40" cy={getSvgY(mtf30.center)} r="4" fill="#22d3ee" />
            <circle cx="200" cy={getSvgY(mtf30.mid_frame)} r="4" fill="#22d3ee" />
            <circle cx="360" cy={getSvgY(mtf30.corner)} r="4" fill="#22d3ee" />
          </svg>
        </div>

        {/* Bảng giá trị chi tiết */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center">
          <div className="bg-slate-900 p-2 rounded-lg">
            <span className="text-[11px] text-slate-400 block">Vùng Tâm (Center)</span>
            <span className="text-sm font-bold text-emerald-400">{(mtf10.center * 100).toFixed(0)}%</span>
            <span className="text-xs text-slate-500"> / </span>
            <span className="text-sm font-bold text-cyan-400">{(mtf30.center * 100).toFixed(0)}%</span>
          </div>
          <div className="bg-slate-900 p-2 rounded-lg">
            <span className="text-[11px] text-slate-400 block">Vùng Giữa (14mm)</span>
            <span className="text-sm font-bold text-emerald-400">{(mtf10.mid_frame * 100).toFixed(0)}%</span>
            <span className="text-xs text-slate-500"> / </span>
            <span className="text-sm font-bold text-cyan-400">{(mtf30.mid_frame * 100).toFixed(0)}%</span>
          </div>
          <div className="bg-slate-900 p-2 rounded-lg">
            <span className="text-[11px] text-slate-400 block">Góc Rìa (21.6mm)</span>
            <span className="text-sm font-bold text-emerald-400">{(mtf10.corner * 100).toFixed(0)}%</span>
            <span className="text-xs text-slate-500"> / </span>
            <span className="text-sm font-bold text-cyan-400">{(mtf30.corner * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Thông số Quang Sai, Độ Méo Hình & Lấy Nét */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quang sai viền màu */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase">Quang Sai Biên Màu (CA)</div>
          <div className="text-xl font-bold text-slate-200 mt-1">
            {benchmark.chromatic_aberration.lateral_ca_micrometers} µm
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cấp độ: <span className="text-emerald-400 font-semibold">{benchmark.chromatic_aberration.color_fringing_rating}</span> (Viền màu cực thấp)
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${benchmark.chromatic_aberration.longitudinal_ca_score}%` }}
            />
          </div>
        </div>

        {/* Độ méo hình hình học */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase">Độ Méo Hình Học (Distortion)</div>
          <div className="text-xl font-bold text-slate-200 mt-1">
            {benchmark.distortion.distortion_percentage > 0 ? "+" : ""}
            {benchmark.distortion.distortion_percentage}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kiểu méo: <span className="text-indigo-400 font-semibold">{benchmark.distortion.distortion_type}</span>
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full"
              style={{ width: `${benchmark.distortion.grid_linearity_score}%` }}
            />
          </div>
        </div>

        {/* Hiệu chuẩn lấy nét AF */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase">Độ Chuẩn Lấy Nét (AF Accuracy)</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {benchmark.autofocus_calibration.repeatability_rate_percent}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Lệch bước: <span className="text-slate-200 font-semibold">{benchmark.autofocus_calibration.af_offset_step}</span> (Chuẩn ngàm xuất xưởng)
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full"
              style={{ width: `${benchmark.autofocus_calibration.repeatability_rate_percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Máy tính mô phỏng tương thích Cảm biến (Sensor Resolving Matcher) */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-200">
              Kiểm Tra Năng Lực Phân Giải với Cảm Biến Của Bạn
            </h4>
            <p className="text-xs text-slate-400">
              Xem thấu kính này có khai thác tối đa độ nét trên máy ảnh của bạn không
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[24, 33, 45, 61].map((mp) => (
              <button
                key={mp}
                onClick={() => handleCalculateSensor(mp)}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                  sensorMp === mp
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {mp} MP
              </button>
            ))}
          </div>
        </div>

        {compatibility && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-emerald-400">
                Hiệu suất chi tiết: {compatibility.resolving_efficiency_percent}%
              </span>
              <p className="text-slate-300 mt-0.5">{compatibility.recommendation}</p>
            </div>
            <div className="text-right whitespace-nowrap">
              <span className="text-slate-400 block">Khẩu độ sắc nét nhất</span>
              <strong className="text-amber-400">{compatibility.sweet_spot_aperture}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Lab Notes */}
      <div className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
        <strong className="text-slate-300">Ghi chú phòng Lab:</strong> {benchmark.lab_notes}
      </div>

      {/* Modal Chứng thư */}
      {showCertificateModal && (
        <LensCalibrationReportModal
          equipmentId={equipmentId}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  );
};

export default OpticalBenchmarkViewer;
