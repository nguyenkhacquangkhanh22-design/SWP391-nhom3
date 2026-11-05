import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Equipment } from "../types/smartequip";

const CATEGORIES = [
  "Tất cả danh mục",
  "Máy ảnh & Quay phim",
  "Laptop & Công nghệ",
  "Âm thanh & Ánh sáng",
  "Thiết bị đo lường & Cơ khí",
  "Flycam & Drone",
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

  const keywordParam = searchParams.get("keyword") || "";
  const categoryParam = searchParams.get("category") || "all";
  const minPriceParam = searchParams.get("minPrice") || "";
  const maxPriceParam = searchParams.get("maxPrice") || "";

  const [keyword, setKeyword] = useState(keywordParam);
  const [category, setCategory] = useState(categoryParam);
  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);

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

          {/* AI Filter & Advisor Assistant Bar */}
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-950/60 via-indigo-950/50 to-slate-900 border border-purple-500/40 rounded-2xl shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <span className="text-sm font-bold text-white">
                  Trợ Lý AI Lọc & Tư Vấn Thiết Bị Thông Minh
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                  AI Powered
                </span>
              </div>
              {aiAdvice && (
                <button
                  type="button"
                  onClick={handleClearAi}
                  className="text-xs text-purple-300 hover:text-white underline self-start sm:self-auto cursor-pointer"
                >
                  ✕ Tắt lọc AI (Về mặc định)
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAiFilter();
              }}
              className="flex items-center gap-2 bg-[#0d1424] p-1.5 rounded-xl border border-purple-500/30 focus-within:border-purple-400 transition-all shadow-inner"
            >
              <span className="text-purple-400 pl-2.5">🤖</span>
              <input
                type="text"
                placeholder="Nhập nhu cầu bằng tiếng Việt (VD: Cần máy ảnh chụp kỷ yếu chân dung đẹp, combo quay vlog dưới 500k...)"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full bg-transparent border-none px-2 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-purple-600/30 whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>AI đang phân tích...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>AI Lọc Máy</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick scenario prompt chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Gợi ý nhanh:</span>
              {[
                { label: "🎬 Combo Quay Vlog Du Lịch", prompt: "Combo máy ảnh nhỏ gọn chống rung tốt để quay vlog du lịch youtube" },
                { label: "📸 Chụp Kỷ Yếu & Chân Dung", prompt: "Máy ảnh chụp chân dung kỷ yếu xóa phông đẹp sắc nét" },
                { label: "🚁 Flycam Quay Trên Cao 4K", prompt: "Flycam drone quay video 4k trên cao góc rộng" },
                { label: "🎙️ Thu Âm Podcast & Talkshow", prompt: "Bộ micro thu âm podcast phỏng vấn không dây âm thanh trong trẻo" },
                { label: "💰 Thiết bị giá rẻ dưới 300k", prompt: "Thiết bị chụp quay giá rẻ dưới 300000 đ một ngày" },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAiPrompt(chip.prompt);
                    void handleAiFilter(chip.prompt);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#141b2e] hover:bg-purple-900/40 border border-purple-500/20 hover:border-purple-400/50 text-slate-300 hover:text-purple-200 text-[11px] font-medium transition-all cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* AI Advice Box */}
            {aiAdvice && (
              <div className="mt-2 p-3 bg-purple-900/30 border border-purple-500/40 rounded-xl text-xs text-purple-200 flex items-start gap-2.5 animate-fadeIn">
                <span className="text-lg shrink-0">💡</span>
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-[12px] flex items-center gap-2">
                    <span>Lời Khuyên & Tư Vấn Từ Trợ Lý AI:</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Đã xếp hạng theo độ phù hợp
                    </span>
                  </div>
                  <p className="leading-relaxed text-slate-200">{aiAdvice}</p>
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
                      {/* Image Thumbnail */}
                      <div className="aspect-video w-full bg-[#1b273d] relative overflow-hidden flex items-center justify-center">
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="text-4xl text-slate-600">📷</div>
                        )}
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#0f1623]/80 backdrop-blur-sm text-orange-400 border border-[#28354c]">
                          {item.category}
                        </span>
                        {item.brand && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/80 backdrop-blur-sm text-slate-300 border border-slate-700">
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
                            {item.dailyRate.toLocaleString("vi-VN")} đ
                          </span>
                          <span className="text-[11px] text-slate-500"> /ngày</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            Tiền cọc
                          </span>
                          <span className="text-slate-300 font-semibold text-xs">
                            {item.depositAmount.toLocaleString("vi-VN")} đ
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
    </div>
  );
}
