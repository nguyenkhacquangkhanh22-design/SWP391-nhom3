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

export default function EquipmentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (keyword) params.keyword = keyword;
    if (category && category !== "Tất cả danh mục" && category !== "all") params.category = category;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    setSearchParams(params);
  };

  const handleReset = () => {
    setKeyword("");
    setCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-[#0f1623] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Header Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white">
            Danh Sách Thiết Bị Cho Thuê
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tìm kiếm thiết bị phù hợp với dự án và ngân sách của bạn
          </p>
        </div>

        {/* Filter Bar */}
        <form
          onSubmit={handleFilterSubmit}
          className="bg-[#161f31] p-5 rounded-2xl border border-[#243048] mb-10 shadow-lg flex flex-col md:flex-row gap-4 items-center"
        >
          {/* Keyword Search */}
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Từ khóa tìm kiếm
            </label>
            <input
              type="text"
              placeholder="VD: Sony A7 IV, MacBook M3, Flycam..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-56">
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Danh mục
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            >
              {CATEGORIES.map((cat, idx) => (
                <option key={idx} value={cat === "Tất cả danh mục" ? "all" : cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Min Price */}
          <div className="w-full md:w-36">
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Giá từ (VNĐ/ngày)
            </label>
            <input
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Max Price */}
          <div className="w-full md:w-36">
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Giá đến
            </label>
            <input
              type="number"
              placeholder="1,000,000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto pt-5">
            <button
              type="submit"
              className="flex-1 md:flex-initial px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-orange-600/30 whitespace-nowrap"
            >
              Lọc kết quả
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 bg-[#202a3f] hover:bg-[#2b3752] text-slate-300 font-semibold rounded-xl text-sm transition-all whitespace-nowrap"
            >
              Đặt lại
            </button>
          </div>
        </form>

        {/* Content State */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm">Đang tải thiết bị...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center my-6">
            {error}
          </div>
        ) : equipments.length === 0 ? (
          <div className="py-20 text-center bg-[#141c2c] rounded-2xl border border-[#232e44] p-8 space-y-3">
            <div className="text-5xl">📦</div>
            <h3 className="text-lg font-bold text-white">Chưa có thiết bị nào phù hợp</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Không tìm thấy thiết bị theo tiêu chí lọc hiện tại. Thử đổi từ khóa hoặc điều chỉnh khoảng giá.
            </p>
            <button
              onClick={handleReset}
              className="mt-3 px-4 py-2 bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 font-semibold rounded-lg text-xs"
            >
              Xem tất cả thiết bị
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {equipments.map((item) => (
              <Link
                key={item._id}
                to={`/equipment/${item._id}`}
                className="group bg-[#151e2f] border border-[#232e44] rounded-2xl overflow-hidden hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/5 transition-all flex flex-col"
              >
                {/* Image */}
                <div className="aspect-video w-full bg-[#1b253b] relative overflow-hidden flex items-center justify-center">
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-4xl text-slate-600">📷</div>
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#111723]/80 backdrop-blur-sm text-orange-400 border border-[#28354c]">
                    {item.category}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                      {item.description || "Thiết bị chính hãng, sẵn sàng bàn giao."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#222c42] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Giá thuê</span>
                      <span className="text-orange-400 font-extrabold text-base">
                        {item.dailyRate.toLocaleString("vi-VN")} đ
                      </span>
                      <span className="text-[10px] text-slate-500">/ngày</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Tiền cọc</span>
                      <span className="text-slate-300 font-semibold text-xs">
                        {item.depositAmount.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
