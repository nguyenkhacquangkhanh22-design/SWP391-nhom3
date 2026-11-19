import React, { useState, useEffect } from "react";
import type { PowerSimulatorResult } from "../../types/productionPackage";
import { productionPackageApi } from "../../services/productionPackageApi";

export const BatteryPowerCalculator: React.FC = () => {
  const [cameraWatts, setCameraWatts] = useState<number>(45);
  const [lightingWatts, setLightingWatts] = useState<number>(600);
  const [audioWatts, setAudioWatts] = useState<number>(20);
  const [shootingHours, setShootingHours] = useState<number>(12);
  const [batteryWh, setBatteryWh] = useState<number>(150);

  const [simResult, setSimResult] = useState<PowerSimulatorResult | null>(null);

  useEffect(() => {
    runSimulation();
  }, [cameraWatts, lightingWatts, audioWatts, shootingHours, batteryWh]);

  const runSimulation = async () => {
    try {
      const res = await productionPackageApi.simulatePower({
        cameraRigWatts: cameraWatts,
        lightingWatts,
        audioWatts,
        shootingHours,
        batteryType: batteryWh,
      });
      setSimResult(res);
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

  const totalWatts = cameraWatts + lightingWatts + audioWatts;
  const singlePackHours = simResult?.singleBatteryRuntimeHours || (cameraWatts > 0 ? ((batteryWh * 0.85) / cameraWatts).toFixed(1) : 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ⚡ Production Power Budget Estimator
          </div>
          <h3 className="text-lg font-bold text-slate-100 mt-1">
            Máy Tính Dự Toán Công Suất Điện & Thời Lượng Pin Đoàn Phim
          </h3>
          <p className="text-xs text-slate-400">
            Tính toán chính xác phụ tải điện, thời lượng pin V-Mount và khuyến nghị trạm sạc trường quay
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs uppercase text-slate-400 block font-medium">Tổng Công Suất Tải</span>
          <div className="text-2xl font-black text-amber-400">
            {totalWatts} <span className="text-sm font-normal text-slate-400">Watts</span>
          </div>
        </div>
      </div>

      {/* Preset Pickers */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Cấu hình Rig máy quay mẫu:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCameraWatts(25); setLightingWatts(300); }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg transition font-medium"
          >
            🎬 Sony FX3 + Gimbal + Đèn Amaran 200 (Run & Gun)
          </button>
          <button
            onClick={() => { setCameraWatts(55); setLightingWatts(900); }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg transition font-medium"
          >
            📽️ Sony FX6 + Monitor + Aputure 600d (Commercial TVC)
          </button>
          <button
            onClick={() => { setCameraWatts(95); setLightingWatts(2400); }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg transition font-medium"
          >
            🎞️ RED / ARRI + Teradek + Dàn đèn 1200d (Phim Điện Ảnh)
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
        {/* Camera Rig Watts */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-semibold">Tổ Máy Quay (Body + Monitor + Wireless):</span>
            <span className="text-cyan-400 font-bold">{cameraWatts} W</span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={cameraWatts}
            onChange={(e) => setCameraWatts(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Lighting Watts */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-semibold">Tổ Ánh Sáng (Đèn Key, Fill, Background LED):</span>
            <span className="text-amber-400 font-bold">{lightingWatts} W</span>
          </div>
          <input
            type="range"
            min="0"
            max="3000"
            step="50"
            value={lightingWatts}
            onChange={(e) => setLightingWatts(parseInt(e.target.value, 10))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Audio & Grip Watts */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-semibold">Tổ Âm Thanh & Phụ Kiện (Wireless, Gimbal):</span>
            <span className="text-purple-400 font-bold">{audioWatts} W</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={audioWatts}
            onChange={(e) => setAudioWatts(parseInt(e.target.value, 10))}
            className="w-full accent-purple-400 cursor-pointer"
          />
        </div>

        {/* Shooting Hours */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-semibold">Thời Gian Quay Mỗi Ngày:</span>
            <span className="text-emerald-400 font-bold">{shootingHours} Giờ</span>
          </div>
          <input
            type="range"
            min="4"
            max="20"
            step="1"
            value={shootingHours}
            onChange={(e) => setShootingHours(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        {/* Battery Capacity Type */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-semibold">Dung Lượng Pin V-Mount Lựa Chọn:</span>
            <span className="text-indigo-400 font-bold">{batteryWh} Wh</span>
          </div>
          <div className="flex gap-2">
            {[99, 150, 220, 290].map((wh) => (
              <button
                key={wh}
                onClick={() => setBatteryWh(wh)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  batteryWh === wh
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {wh}Wh {wh === 99 ? "✈️" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kết quả phân tích */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Thời lượng 1 viên pin */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center">
          <span className="text-[11px] text-slate-400 uppercase block font-medium">Thời Lượng 1 Viên Pin</span>
          <div className="text-3xl font-black text-cyan-400 mt-1">
            ~{singlePackHours}
            <span className="text-sm font-normal text-slate-400"> giờ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cấp nguồn cho toàn bộ Rig máy</p>
        </div>

        {/* Số pin V-Mount cần mang theo */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center">
          <span className="text-[11px] text-slate-400 uppercase block font-medium">Khuyến Nghị Số Viên Pin</span>
          <div className="text-3xl font-black text-emerald-400 mt-1">
            {simResult?.recommendedBatteryCount || Math.ceil(shootingHours / (Number(singlePackHours) || 1)) + 1}
            <span className="text-sm font-normal text-slate-400"> viên {batteryWh}Wh</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Đủ quay liên tục kèm 1 bộ sạc đôi</p>
        </div>

        {/* Năng lượng cả ngày */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center">
          <span className="text-[11px] text-slate-400 uppercase block font-medium">Tổng Năng Lượng 1 Ngày</span>
          <div className="text-3xl font-black text-amber-400 mt-1">
            {(simResult?.powerStrategy.dailyTotalWattHours || Math.round(totalWatts * shootingHours * 1.25)) / 1000}
            <span className="text-sm font-normal text-slate-400"> kWh</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Đã tính hệ số an toàn sạc xả 125%</p>
        </div>
      </div>

      {/* Lời khuyên nguồn điện an toàn */}
      {simResult?.powerStrategy && (
        <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-bold">
            <span>🛡️</span>
            <span>Khuyến Nghị Nguồn Điện Hiện Trường:</span>
          </div>
          <div className="text-slate-200">
            <strong>Nguồn đề xuất:</strong> {simResult.powerStrategy.powerSourceRecommendation}
          </div>
          <p className="text-slate-400">
            <strong>Lưu ý an toàn:</strong> {simResult.powerStrategy.safetyAdvice}
          </p>
        </div>
      )}
    </div>
  );
};

export default BatteryPowerCalculator;
