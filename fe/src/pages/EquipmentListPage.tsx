import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ShotToGearModal from "../components/ai/ShotToGearModal";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Equipment } from "../types/smartequip";

const CATEGORIES = [
  "Tất cả danh mục",
  "Máy ảnh & Ống kính",
  "Máy ảnh & Quay phim",
  "Laptop & Công nghệ",
  "Laptop & Thiết bị dựng",
  "Flycam & Drone",
  "Âm thanh & Micro",
  "Ánh sáng & Studio",
  "Gimbal & Chân máy",
  "Thiết bị đo lường & Cơ khí",
  "Phụ kiện khác",
];

const PRICE_PRESETS = [
  { label: "Tất cả mức giá", min: "", max: "" },
  { label: "Dưới 200.000 đ", min: "0", max: "200000" },
  { label: "200.000 - 500.000 đ", min: "200000", max: "500000" },
  { label: "500.000 - 1.000.000 đ", min: "500000", max: "1000000" },
  { label: "Trên 1.000.000 đ", min: "1000000", max: "" },
];

export default function EquipmentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI Filter / Assistant State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiMatches, setAiMatches] = useState<Record<string, { score: number; reason: string }> | null>(null);
  const [isShotModalOpen, setIsShotModalOpen] = useState(false);

  const keywordParam = searchParams.get("keyword") || "";
  const categoryParam = searchParams.get("category") || "all";
  const minPriceParam = searchParams.get("minPrice") || "";
  const maxPriceParam = searchParams.get("maxPrice") || "";

  const [keyword, setKeyword] = useState(keywordParam);
  const [category, setCategory] = useState(categoryParam);
  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});

  const handlePrevImage = (itemId: string, total: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCardImageIndices((prev) => {
      const cur = prev[itemId] || 0;
      return { ...prev, [itemId]: (cur - 1 + total) % total };
    });
  };

  const handleNextImage = (itemId: string, total: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCardImageIndices((prev) => {
      const cur = prev[itemId] || 0;
      return { ...prev, [itemId]: (cur + 1) % total };
    });
  };

  const fetchEquipments = () => {
    setLoading(true);
    setError("");
    smartEquipApi
      .getEquipments({
        keyword: keywordParam,
        category: categoryParam === "Tất cả danh mục" ? "all" : categoryParam,
        minPrice: minPriceParam ? Number(minPriceParam) : undefined,
        maxPrice: maxPriceParam ? Number(maxPriceParam) : undefined,
      })
      .then((res) => setEquipments(res.data))
      .catch((err) => setError(err.message || "Không thể tải danh sách thiết bị"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEquipments();
  }, [keywordParam, categoryParam, minPriceParam, maxPriceParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter(keyword, category, minPrice, maxPrice);
  };

  const applyFilter = (k: string, c: string, min: string, max: string) => {
    const params: Record<string, string> = {};
    if (k) params.keyword = k;
    if (c && c !== "Tất cả danh mục" && c !== "all") params.category = c;
    if (min) params.minPrice = min;
    if (max) params.maxPrice = max;
    setSearchParams(params);
  };

  const handleCategorySelect = (selectedCat: string) => {
    const val = selectedCat === "Tất cả danh mục" ? "all" : selectedCat;
    setCategory(val);
    applyFilter(keyword, val, minPrice, maxPrice);
  };

  const handlePricePreset = (min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
    applyFilter(keyword, category, min, max);
  };

  const handleReset = () => {
    setKeyword("");
    setCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setSearchParams({});
    setAiAdvice(null);
    setAiMatches(null);
  };

  const handleAiFilter = async (customPrompt?: string) => {
    const promptToUse = (typeof customPrompt === "string" ? customPrompt : aiPrompt).trim();
    if (!promptToUse) return;

    setAiLoading(true);
    setError("");
    try {
      const res = await smartEquipApi.aiFilterEquipment({
        prompt: promptToUse,
        category: categoryParam !== "Tất cả danh mục" && categoryParam !== "all" ? categoryParam : undefined,
      });

      if (res && res.data) {
        setEquipments(res.data);
        setAiAdvice(res.aiAdvice || null);
        const map: Record<string, { score: number; reason: string }> = {};
        if (Array.isArray(res.matchedItems)) {
          res.matchedItems.forEach((item: any) => {
            const id = item.equipment?._id || item.equipment?.id;
            if (id) {
              map[id] = { score: item.matchScore, reason: item.matchReason };
            }
          });
        }
        setAiMatches(map);
      }
    } catch (err: any) {
      setError(err?.message || "Trợ lý AI gặp sự cố khi phân tích. Vui lòng thử lại.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearAi = () => {
    setAiPrompt("");
    setAiAdvice(null);
    setAiMatches(null);
    fetchEquipments();
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Top Header & Search Bar */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Thuê Thiết Bị Công Nghệ
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Dành cho Guest & Renter: Tra cứu máy ảnh, flycam, laptop với thủ tục hợp đồng điện tử bảo đảm
              </p>
            </div>
            <div className="text-xs text-slate-400 bg-[#162032] px-3.5 py-2 rounded-xl border border-[#223049] self-start md:self-auto">
              Tìm thấy <strong className="text-orange-400">{equipments.length}</strong> thiết bị sẵn sàng thuê
            </div>
          </div>

          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 bg-[#141d2d] p-2 rounded-2xl border border-[#223049] shadow-lg focus-within:border-orange-500/60 transition-all"
          >
            <span className="text-slate-400 pl-3 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm thiết bị theo tên, dòng máy, thương hiệu (Sony, MacBook, DJI...)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-transparent border-none px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-orange-600/30 whitespace-nowrap"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Smart Suggest & Photo Matcher Assistant Bar */}
          <div className="mt-4 p-4 sm:p-5 bg-[#141d2d] border border-[#223049] rounded-2xl shadow-lg space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Tư Vấn Thiết Bị Theo Nhu Cầu Dự Án
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      Smart Suggest
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Nhập mô tả dự án hoặc tải ảnh phong cách bạn muốn quay để hệ thống tự động lọc combo tối ưu
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setIsShotModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1b263b] hover:bg-[#23324d] border border-[#2c3e5e] hover:border-orange-500/40 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  title="Tải ảnh hoặc chọn khung hình mẫu để tìm thiết bị"
                >
                  <svg className="w-3.5 h-3.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Tìm theo ảnh mẫu</span>
                </button>

                {aiAdvice && (
                  <button
                    type="button"
                    onClick={handleClearAi}
                    className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 transition-colors cursor-pointer"
                  >
                    ✕ Đặt lại
                  </button>
                )}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAiFilter();
              }}
              className="flex items-center gap-2 bg-[#0d1424] p-1.5 rounded-xl border border-[#223049] focus-within:border-orange-500/50 transition-all shadow-inner"
            >
              <div className="pl-2.5 text-slate-500">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Nhập yêu cầu (ví dụ: máy ảnh quay vlog du lịch nhỏ gọn, combo chụp kỷ yếu chân dung ngoại cảnh, flycam 4K...)"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full bg-transparent border-none px-2 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-orange-600/20 whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Đang lọc...</span>
                  </>
                ) : (
                  <span>Gợi ý máy</span>
                )}
              </button>
            </form>

            {/* Quick scenario prompt chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Nhu cầu phổ biến:</span>
              {[
                { label: "Quay Vlog du lịch", prompt: "Combo máy ảnh nhỏ gọn chống rung tốt để quay vlog du lịch youtube" },
                { label: "Chụp kỷ yếu & chân dung", prompt: "Máy ảnh chụp chân dung kỷ yếu xóa phông đẹp sắc nét" },
                { label: "Flycam quay 4K", prompt: "Flycam drone quay video 4k trên cao góc rộng" },
                { label: "Thu âm podcast & talkshow", prompt: "Bộ micro thu âm podcast phỏng vấn không dây âm thanh trong trẻo" },
                { label: "Ngân sách dưới 300k/ngày", prompt: "Thiết bị chụp quay giá rẻ dưới 300000 đ một ngày" },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAiPrompt(chip.prompt);
                    void handleAiFilter(chip.prompt);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#0e1626] hover:bg-[#1a253a] border border-[#223049] hover:border-orange-500/40 text-slate-300 hover:text-white text-[11px] transition-all cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* AI Advice Box */}
            {aiAdvice && (
              <div className="mt-2 p-3 bg-[#162236] border border-orange-500/30 rounded-xl text-xs text-slate-200 flex items-start gap-2.5 animate-fadeIn">
                <span className="text-orange-400 font-bold shrink-0 mt-0.5">ℹ</span>
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-[12px] flex items-center gap-2">
                    <span>Đề xuất thiết bị phù hợp nhất:</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Đã xếp hạng ưu tiên
                    </span>
                  </div>
                  <p className="leading-relaxed text-slate-300">{aiAdvice}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Layout: Sidebar Filter & Equipment Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar Filter */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-5 shadow-lg space-y-6 sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-[#212c42]">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>⚙️</span> Bộ Lọc Thiết Bị
                </h3>
                <button
                  onClick={handleReset}
                  className="text-xs text-orange-400 hover:underline font-medium"
                >
                  Xóa lọc
                </button>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Danh Mục Thiết Bị
                </label>
                <div className="space-y-1.5">
                  {CATEGORIES.map((cat, idx) => {
                    const isSelected =
                      (cat === "Tất cả danh mục" && (category === "all" || !category)) ||
                      category.toLowerCase() === cat.toLowerCase();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                            : "text-slate-400 hover:bg-[#1b273d] hover:text-slate-200"
                        }`}
                      >
                        <span>{cat}</span>
                        {isSelected && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Filter */}
              <div className="pt-4 border-t border-[#212c42]">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Khoảng Giá (VNĐ/ngày)
                </label>

                {/* Quick Presets */}
                <div className="space-y-1 mb-3">
                  {PRICE_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePricePreset(p.min, p.max)}
                      className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        minPrice === p.min && maxPrice === p.max
                          ? "text-orange-400 font-bold bg-orange-500/10"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      • {p.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Từ:</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Đến:</span>
                    <input
                      type="number"
                      placeholder="Tối đa"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-[#1b273d] border border-[#2b3a56] rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => applyFilter(keyword, category, minPrice, maxPrice)}
                  className="w-full mt-3 py-2 bg-[#202d45] hover:bg-[#2a3a58] text-white font-bold rounded-xl text-xs transition-all"
                >
                  Áp dụng giá
                </button>
              </div>
            </div>
          </aside>

          {/* Right Product Grid */}
          <section className="lg:col-span-3">
            {loading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-400 text-sm">Đang tải danh sách thiết bị...</p>
              </div>
            ) : error ? (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center my-6">
                {error}
              </div>
            ) : equipments.length === 0 ? (
              <div className="py-20 text-center bg-[#141d2d] rounded-2xl border border-[#223049] p-8 space-y-3">
                <div className="text-5xl">📦</div>
                <h3 className="text-lg font-bold text-white">Chưa tìm thấy thiết bị phù hợp</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Không có thiết bị nào khớp với từ khóa hoặc khoảng giá đã chọn. Thử chọn danh mục khác.
                </p>
                <button
                  onClick={handleReset}
                  className="mt-3 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs shadow-md"
                >
                  Xem tất cả thiết bị
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {equipments.map((item) => (
                  <div
                    key={item._id}
                    className="group bg-[#141d2d] border border-[#223049] rounded-2xl overflow-hidden hover:border-orange-500/60 hover:shadow-xl hover:shadow-orange-500/10 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Thumbnail with Carousel Controls */}
                      <div className="aspect-video w-full bg-[#1b273d] relative overflow-hidden flex items-center justify-center select-none">
                        {item.images && item.images.length > 0 ? (
                          <>
                            <img
                              src={item.images[cardImageIndices[item._id] || 0] || item.images[0]}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {item.images.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => handlePrevImage(item._id, item.images.length, e)}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-md transition-all opacity-80 hover:opacity-100 z-10"
                                  title="Ảnh trước"
                                >
                                  ‹
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleNextImage(item._id, item.images.length, e)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-md transition-all opacity-80 hover:opacity-100 z-10"
                                  title="Ảnh tiếp theo"
                                >
                                  ›
                                </button>
                                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-950/70 backdrop-blur-sm text-slate-200 border border-slate-700/50 z-10">
                                  📷 {((cardImageIndices[item._id] || 0) + 1)}/{item.images.length}
                                </span>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="text-4xl text-slate-600">📷</div>
                        )}
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#0f1623]/80 backdrop-blur-sm text-orange-400 border border-[#28354c] z-10">
                          {item.category}
                        </span>
                        {item.brand && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/80 backdrop-blur-sm text-slate-300 border border-slate-700 z-10">
                            {item.brand}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-base text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                          {item.description || "Thiết bị chính hãng, được kiểm tra định kỳ, đầy đủ linh phụ kiện."}
                        </p>

                        {/* AI Match Score & Recommendation Reason */}
                        {aiMatches && aiMatches[item._id] && (
                          <div className="mt-2.5 p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-[11px] text-purple-200 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-300 flex items-center gap-1">
                                <span>⭐</span>
                                <span>Phù hợp {aiMatches[item._id].score}%</span>
                              </span>
                              <span className="text-[10px] text-purple-300 font-semibold uppercase">AI Đề Xuất</span>
                            </div>
                            <p className="text-[10.5px] text-slate-300 leading-snug">{aiMatches[item._id].reason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing & CTA Button */}
                    <div className="p-4 pt-3 border-t border-[#1d273a] bg-[#121927]/60">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            Giá thuê
                          </span>
                          <span className="text-orange-400 font-extrabold text-base">
                            {(item.dailyRate || (item as any).pricing?.price_per_day || 0).toLocaleString("vi-VN")} đ
                          </span>
                          <span className="text-[11px] text-slate-500"> /ngày</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            Tiền cọc
                          </span>
                          <span className="text-emerald-400 font-semibold text-xs">
                            Miễn phí (0 đ)
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/equipment/${item._id}`}
                        className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white hover:text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20"
                      >
                        <span className="text-white font-bold">Xem chi tiết & Đặt thuê</span>
                        <span className="text-white font-bold">→</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <ShotToGearModal
        isOpen={isShotModalOpen}
        onClose={() => setIsShotModalOpen(false)}
      />
    </div>
  );
}
