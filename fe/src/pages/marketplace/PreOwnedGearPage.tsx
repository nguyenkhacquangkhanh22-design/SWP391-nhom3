import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import type { PreOwnedListing } from "../../types/preOwned";
import { preOwnedApi } from "../../services/preOwnedApi";
import CameraTradeInModal from "../../components/marketplace/CameraTradeInModal";

export const PreOwnedGearPage: React.FC = () => {
  const [listings, setListings] = useState<PreOwnedListing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [search, setSearch] = useState<string>("");
  const [showTradeInModal, setShowTradeInModal] = useState<boolean>(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<PreOwnedListing | null>(null);

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, selectedCondition, sortBy]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await preOwnedApi.getListings({
        category: selectedCategory || undefined,
        condition_grade: selectedCondition || undefined,
        sort: sortBy,
        search: search || undefined,
      });
      setListings(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách máy cũ:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  const categories = ["Tất Cả", "Camera", "Lens", "Lighting", "Audio", "Gimbal"];
  const conditions = [
    { key: "", label: "Tất cả tình trạng" },
    { key: "like_new_99", label: "Like New 99%" },
    { key: "excellent_95", label: "Tuyệt đẹp 95%" },
    { key: "good_90", label: "Tốt 90%" },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16 space-y-8">
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl space-y-3">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              ★ Certified Pre-Owned Gear
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              Sàn Thanh Lý Máy Ảnh & Ống Kính Đã Qua Kiểm Định
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              100% thiết bị được kỹ sư SmartEquip Lab kiểm tra 28 bước, minh bạch số shot, tình trạng cảm biến và bảo hành 6 tháng toàn diện.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => setShowTradeInModal(true)}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
              >
                🔄 Định Giá & Thu Cũ Đổi Mới (Trade-In)
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tìm kiếm máy, model, hãng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium w-56"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
            >
              Tìm
            </button>
          </form>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = (cat === "Tất Cả" && !selectedCategory) || selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === "Tất Cả" ? "" : cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Condition & Sort Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500 font-medium"
            >
              {conditions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="newest">Mới đăng nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="shutter_asc">Số shot ít nhất</option>
            </select>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Đang tải danh sách thiết bị kiểm định...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <p className="text-sm">Hiện chưa có thiết bị nào phù hợp với bộ lọc</p>
            <button
              onClick={() => { setSelectedCategory(""); setSelectedCondition(""); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              Xem tất cả thiết bị
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {listings.map((item) => {
              const savings = item.original_price ? item.original_price - item.listing_price : 0;
              return (
                <div
                  key={item._id}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col group shadow-lg"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                    <img
                      src={item.images && item.images[0] ? item.images[0] : "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Certified Badge */}
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-indigo-600/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 shadow">
                      <span>✓</span>
                      <span>Certified</span>
                    </div>

                    {/* Condition Badge */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-lg">
                      {item.condition_grade === "like_new_99" ? "99% Like New" : item.condition_grade === "excellent_95" ? "95% Tuyệt Đẹp" : "90% Tốt"}
                    </div>

                    {/* Shutter Count Overlay */}
                    {item.shutter_count > 0 && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-950/80 backdrop-blur-sm text-cyan-300 text-[10px] font-mono rounded">
                        📸 {item.shutter_count.toLocaleString()} shots
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold">{item.brand} • {item.category}</div>
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-2 mt-0.5">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {item.inspection_notes}
                      </p>
                    </div>

                    {/* Price & Actions */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-base font-black text-emerald-400">
                            {item.listing_price.toLocaleString("vi-VN")} đ
                          </div>
                          {item.original_price > 0 && (
                            <div className="text-[10px] text-slate-500 line-through">
                              Mới: {item.original_price.toLocaleString("vi-VN")} đ
                            </div>
                          )}
                        </div>

                        {savings > 0 && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Tiết kiệm {(savings / 1000000).toFixed(1)}tr
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>🛡️ Bảo hành <strong>{item.smart_equip_warranty_months} tháng</strong></span>
                        <button
                          onClick={() => setSelectedItemDetail(item)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                        >
                          Chi tiết →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Trade In */}
        {showTradeInModal && (
          <CameraTradeInModal onClose={() => setShowTradeInModal(false)} />
        )}

        {/* Quick Item Detail Modal */}
        {selectedItemDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-emerald-400 font-bold uppercase">Kiểm Định SmartEquip Certified</span>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedItemDetail.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Số shot màn trập:</span>
                  <strong className="text-cyan-400 font-mono">{selectedItemDetail.shutter_count.toLocaleString()} shots</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tình trạng cảm biến:</span>
                  <span className="text-emerald-400 font-semibold">{selectedItemDetail.sensor_condition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Thời hạn bảo hành:</span>
                  <span className="text-slate-200 font-semibold">{selectedItemDetail.smart_equip_warranty_months} tháng chính hãng</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block mb-1">Phụ kiện kèm theo:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItemDetail.accessories_included.map((acc, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded text-[11px]">
                        ✓ {acc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>
                  <span className="text-xs text-slate-400 block">Giá Bán Thanh Lý</span>
                  <div className="text-2xl font-black text-emerald-400">
                    {selectedItemDetail.listing_price.toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <button
                  onClick={() => {
                    alert(`Đã liên hệ với người bán thiết bị ${selectedItemDetail.title}. Chuyên viên SmartEquip sẽ hỗ trợ kiểm tra máy trực tiếp!`);
                    setSelectedItemDetail(null);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition"
                >
                  Đặt Mua & Xem Máy Trực Tiếp
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PreOwnedGearPage;
