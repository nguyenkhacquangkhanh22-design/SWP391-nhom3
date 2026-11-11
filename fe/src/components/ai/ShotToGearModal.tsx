import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { aiApi, type ShotToGearResponse } from "../../services/aiApi";

interface ShotToGearModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_SHOTS = [
  {
    id: "portrait",
    title: "Chân dung Cinematic",
    subtitle: "Xóa phông mượt, bokeh tròn mịn",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=75",
    badge: "Portrait 85mm",
  },
  {
    id: "concert",
    title: "Concert Ánh Sáng Yếu",
    subtitle: "Sân khấu nhạc sống, neon rực rỡ",
    url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=75",
    badge: "Low Light / ISO Cao",
  },
  {
    id: "action",
    title: "Thể Thao & Action",
    subtitle: "Chuyển động tốc độ cao, góc rộng",
    url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=75",
    badge: "High-Speed Shutter",
  },
  {
    id: "product",
    title: "Studio & Thiết Bị Pro",
    subtitle: "Tông màu Noir, chi tiết sắc nét",
    url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=75",
    badge: "Commercial Studio",
  },
];

export default function ShotToGearModal({ isOpen, onClose }: ShotToGearModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShotToGearResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"combo" | "analysis" | "tips">("combo");

  if (!isOpen) return null;

  const handleSelectPreset = (url: string) => {
    setSelectedImage(url);
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn tệp tin hình ảnh hợp lệ (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Kích thước ảnh tối đa 15MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setSelectedImage(objectUrl);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage && !selectedFile) {
      setError("Vui lòng tải lên một bức ảnh hoặc chọn một ảnh phong cách mẫu.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let data: ShotToGearResponse;
      if (selectedFile) {
        data = await aiApi.shotToGear({ file: selectedFile });
      } else if (selectedImage) {
        data = await aiApi.shotToGear({ imageUrl: selectedImage });
      } else {
        throw new Error("Không có dữ liệu ảnh.");
      }
      setResult(data);
      setActiveTab("combo");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi phân tích ảnh.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  const handleBookEquipment = (id?: string) => {
    onClose();
    if (id) {
      navigate(`/equipment/${id}`);
    } else {
      navigate("/equipment");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#0f172a] border border-[#243452] rounded-2xl shadow-2xl overflow-hidden text-slate-200">

        {/* Header - Cinema Studio Style */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#202c42] bg-[#111927]">
          <div className="flex items-center gap-3.5">
            {/* Camera Iris / Optical Viewfinder Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1c273c] to-[#141d2d] border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm shadow-orange-500/10 shrink-0">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" className="opacity-40" />
                <circle cx="12" cy="12" r="4" strokeWidth="2" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="1.5" />
                <path
                  d="m4.93 4.93 2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                  className="opacity-50"
                />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Smart Match</span>
                  <span className="text-slate-600 font-normal">/</span>
                  <span className="text-slate-200 font-medium text-sm sm:text-base">
                    Tái Hiện Khung Hình Điện Ảnh
                  </span>
                </h2>
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#182337] border border-[#2b3a55] text-[10px] text-slate-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Optical Vision Pro</span>
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Bóc tách tiêu cự, khẩu độ và ánh sáng từ khung hình mẫu để gợi ý combo máy cho thuê tối ưu từ kho SmartEquip
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1a2438] border border-transparent hover:border-[#2b3a55] transition-all cursor-pointer shrink-0 ml-2"
            title="Đóng cửa sổ"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Body - Scrollable with min-h-0 so it doesn't push the footer */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs sm:text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            /* Upload & Preset View - 2 Columns on Desktop for perfect balance */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              {/* Left Column: Image Preview or Upload Dropzone */}
              <div className="md:col-span-5 flex flex-col">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Ảnh khung hình mẫu:</span>
                  {selectedImage && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-purple-400 hover:text-purple-300 text-[11px] underline cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex-1 border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center min-h-[180px] sm:min-h-[220px] ${selectedImage
                      ? "border-purple-500/60 bg-black/50"
                      : "border-slate-700 hover:border-purple-500/50 bg-[#141d2d]/60 hover:bg-[#141d2d]"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {selectedImage ? (
                    <div className="relative w-full h-full min-h-[200px] flex items-center justify-center p-2 bg-black/40">
                      <img
                        src={selectedImage}
                        alt="Selected shot"
                        className="max-h-[220px] w-auto max-w-full object-contain rounded-lg shadow-md"
                      />
                      {isLoading && (
                        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                          <div className="relative w-full max-w-[200px] h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400 w-1/2 animate-[pulse_1s_infinite] rounded-full" />
                          </div>
                          <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs sm:text-sm">
                            <span className="animate-spin text-base">⚙️</span>
                            <span>Đang giải mã quang học...</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1">
                            Ước tính tiêu cự, khẩu độ & đối chiếu kho máy
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white px-2 py-1 rounded text-[11px] backdrop-blur-sm border border-slate-700"
                      >
                        Đổi ảnh
                      </button>
                    </div>
                  ) : (
                    <div className="py-6 px-3 text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
                        📷
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-200 mb-1">
                        Kéo thả hoặc nhấp để tải ảnh
                      </p>
                      <p className="text-[11px] text-slate-400">
                        JPG, PNG, WebP (Tối đa 15MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: 4 Presets Selection */}
              <div className="md:col-span-7 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Hoặc chọn phong cách điện ảnh mẫu:
                  </h3>
                  <span className="text-[11px] text-purple-400 font-medium">Thử nhanh 1-chạm</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 flex-1">
                  {PRESET_SHOTS.map((preset) => {
                    const isSelected = selectedImage === preset.url;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`group relative rounded-xl overflow-hidden border p-2 cursor-pointer transition-all flex flex-col ${isSelected
                            ? "border-purple-500 bg-purple-500/15 shadow-md shadow-purple-500/25 ring-1 ring-purple-500"
                            : "border-slate-800 hover:border-slate-600 bg-[#141d2d]/60 hover:bg-[#141d2d]"
                          }`}
                      >
                        <div className="aspect-[16/10] rounded-lg overflow-hidden mb-1.5 bg-slate-900 relative">
                          <img
                            src={preset.url}
                            alt={preset.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] sm:text-[9px] text-slate-200 font-medium px-1.5 py-0.5 rounded">
                            {preset.badge}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {preset.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {preset.subtitle}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-4 animate-fade-in">
              {/* Top Banner Verdict */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#162032] border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-lg sm:text-xl shrink-0">
                    🎯
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] sm:text-xs font-extrabold uppercase px-2 py-0.5 rounded-full border ${result.match_status === "EXACT_MATCH"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}
                      >
                        {result.match_status === "EXACT_MATCH"
                          ? "Khớp chính xác (Exact Match)"
                          : "Khớp tương đồng tối ưu (Best Alternative)"}
                      </span>
                      <span className="text-xs font-bold text-purple-300">
                        {result.match_confidence}% Tương đồng
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-100 mt-1">
                      {result.match_verdict}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800/60 transition-all shrink-0 cursor-pointer"
                >
                  🔄 Thử ảnh khác
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("combo")}
                  className={`pb-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "combo"
                      ? "text-purple-400 border-b-2 border-purple-400"
                      : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <span>🎥</span>
                  <span>Combo đề xuất trong kho</span>
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`pb-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "analysis"
                      ? "text-purple-400 border-b-2 border-purple-400"
                      : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <span>🔬</span>
                  <span>Thông số quang học</span>
                </button>
                <button
                  onClick={() => setActiveTab("tips")}
                  className={`pb-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "tips"
                      ? "text-purple-400 border-b-2 border-purple-400"
                      : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <span>💡</span>
                  <span>Mẹo bấm máy & LUT</span>
                </button>
              </div>

              {/* Tab 1: Recommended Combo */}
              {activeTab === "combo" && (
                <div className="space-y-3.5">
                  <div className="p-4 rounded-xl bg-[#141f33] border border-indigo-500/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3.5 w-full sm:w-auto">
                      {result.matched_equipment_detail?.images?.[0] ? (
                        <img
                          src={result.matched_equipment_detail.images[0]}
                          alt={result.recommended_combo.body_title}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-slate-900 border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                          📷
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                            Thân máy chính (Body)
                          </span>
                          {result.matched_equipment_detail?.brand && (
                            <span className="text-[10px] text-slate-400">
                              {result.matched_equipment_detail.brand}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                          {result.recommended_combo.body_title}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                          {result.recommended_combo.body_reason}
                        </p>
                        <div className="text-sm font-extrabold text-orange-400 mt-1">
                          {result.recommended_combo.body_daily_rate?.toLocaleString("vi-VN")} đ
                          <span className="text-xs font-normal text-slate-400">/ngày</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleBookEquipment(result.recommended_combo.body_equipment_id)
                      }
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition-all shrink-0 hover:scale-[1.02] cursor-pointer"
                    >
                      🚀 Thuê ngay máy này
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#131b2c] border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 mb-1">
                        <span>🔍</span>
                        <span>Ống kính (Lens) gợi ý</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {result.recommended_combo.lens_recommendation}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#131b2c] border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-1">
                        <span>💡</span>
                        <span>Đèn chiếu sáng (Light)</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {result.recommended_combo.lighting_recommendation}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#131b2c] border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 mb-1">
                        <span>⚖️</span>
                        <span>Chống rung (Gimbal / Tripod)</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {result.recommended_combo.stabilizer_recommendation}
                      </p>
                    </div>
                  </div>

                  {result.match_status === "BEST_ALTERNATIVE" && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2">
                      <span className="text-sm shrink-0">💡</span>
                      <div>
                        <span className="font-bold">Lưu ý chuyên môn: </span>
                        Hệ thống đã tự động chọn máy tương đồng tối ưu nhất trong kho SmartEquip. Chỉ cần setup đúng ống kính và ánh sáng như hướng dẫn, bạn sẽ đạt 90%+ chất lượng tương đương.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Optical Breakdown */}
              {activeTab === "analysis" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#131b2c] border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tiêu cự ước tính (Focal Length)
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                      {result.optical_analysis.estimated_focal_length}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#131b2c] border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Khẩu độ & Độ sâu trường ảnh (Aperture / DOF)
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                      {result.optical_analysis.estimated_aperture}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#131b2c] border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Hệ thống ánh sáng (Lighting Setup)
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                      {result.optical_analysis.lighting_setup}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#131b2c] border border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Độ ổn định máy (Motion Stability)
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                      {result.optical_analysis.motion_stability}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#131b2c] border border-slate-800 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tone màu & Phong cách (Color Grading Style)
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                      {result.optical_analysis.color_tone}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Actionable Production Tips */}
              {activeTab === "tips" && (
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-[#131b2c] border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 mb-1">
                      <span>🎬</span>
                      <span>Mẹo bấm máy tại hiện trường</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {result.shooting_tips}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#131b2c] border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 mb-1">
                      <span>🎞️</span>
                      <span>Mẹo hậu kỳ màu sắc (Lightroom / Premiere LUT)</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {result.post_production_tips}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer Action Bar - Fixed Height */}
        <div className="shrink-0 px-5 sm:px-6 py-3 border-t border-[#1e293b] bg-[#0c1322] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Vận hành bởi Groq LPUs siêu tốc & Kho máy SmartEquip MongoDB</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {!result && (
              <button
                type="button"
                disabled={!selectedImage || isLoading}
                onClick={handleAnalyze}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-2 shadow-lg transition-all cursor-pointer ${!selectedImage || isLoading
                    ? "bg-slate-700 opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 shadow-purple-600/30 hover:scale-[1.02]"
                  }`}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    <span>Đang giải mã quang học...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Bắt đầu phân tích & khớp máy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
