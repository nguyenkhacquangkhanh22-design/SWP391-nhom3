import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../../components/Brand";
import { ownerApi } from "../../services/ownerApi";
import type { Equipment } from "../../types/owner";

export default function EquipmentMarketplacePage() {
  const { user } = useAuth();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchEquipments();
  }, [category, sortBy]);

  async function fetchEquipments(overrideSearch?: string) {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      const activeSearch = overrideSearch !== undefined ? overrideSearch : search;
      if (activeSearch) params.search = activeSearch;
      if (category !== "all") params.category = category;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (sortBy) params.sortBy = sortBy;

      const data = await ownerApi.browseEquipments(params);
      setEquipments(data.equipments);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchEquipments();
  }

  function handleQuickSearch(tag: string) {
    setSearch(tag);
    fetchEquipments(tag);
  }

  function handleResetFilters() {
    setSearch("");
    setCategory("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    setTimeout(() => {
      fetchEquipments("");
    }, 0);
  }

  const isOwner = (user?.role || "").toLowerCase() === "owner";
  const hasActiveFilters = Boolean(
    search || category !== "all" || minPrice || maxPrice || sortBy !== "newest"
  );

  return (
    <div className="marketplace-wrapper">
      {/* Ambient background glow */}
      <div className="marketplace-ambient-glow" />

      {/* Top Navbar */}
      <header className="marketplace-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Brand compact />
          <span className="marketplace-header-badge">
            <span className="pulse-dot" />
            CHỢ THIẾT BỊ CHÍNH HÃNG
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user ? (
            <>
              {isOwner ? (
                <Link
                  to="/owner"
                  className="button button-primary"
                  style={{ width: "auto", fontSize: "0.85rem", padding: "8px 18px", borderRadius: "10px" }}
                >
                  Cổng Cho Thuê (Owner) 💼
                </Link>
              ) : (
                <Link
                  to="/register-owner"
                  className="button button-primary"
                  style={{ width: "auto", fontSize: "0.85rem", padding: "8px 18px", borderRadius: "10px" }}
                >
                  Trở thành Owner 🚀
                </Link>
              )}
              <Link
                to="/profile"
                className="button button-secondary"
                style={{ width: "auto", fontSize: "0.85rem", padding: "8px 16px", borderRadius: "10px" }}
              >
                👤 {user.name || "Hồ sơ"}
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="button button-quiet"
                style={{ width: "auto", fontSize: "0.85rem", padding: "8px 16px", borderRadius: "10px" }}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="button button-primary"
                style={{ width: "auto", fontSize: "0.85rem", padding: "8px 18px", borderRadius: "10px" }}
              >
                Đăng ký ngay
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="marketplace-hero">
        <div className="marketplace-hero-pill">
          ✨ Nền tảng chia sẻ thiết bị công nghệ & quay chụp uy tín
        </div>

        <h1 className="marketplace-hero-title">
          Thuê Thiết Bị Công Nghệ &{" "}
          <span className="marketplace-hero-gradient-text">Quay Chụp Đỉnh Cao</span>
        </h1>

        <p className="marketplace-hero-desc">
          Trải nghiệm máy ảnh, flycam, lens cinema và âm thanh chuyên nghiệp từ cộng đồng Creator uy tín.
          Hợp đồng điện tử minh bạch, kiểm tra bàn giao chuẩn mực.
        </p>

        {/* Search Bar Capsule */}
        <form onSubmit={handleSearchSubmit} className="marketplace-search-box">
          <span style={{ fontSize: "1.1rem", color: "#f97316", display: "flex", alignItems: "center" }}>
            🔍
          </span>
          <input
            type="text"
            className="marketplace-search-input"
            placeholder="Tìm theo tên máy ảnh, flycam, lens, thương hiệu (Sony, Canon, DJI, Rode)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                fetchEquipments("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "1rem",
              }}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
          <button type="submit" className="marketplace-search-btn">
            Tìm kiếm
          </button>
        </form>

        {/* Quick Search Suggestions */}
        <div className="marketplace-quick-tags">
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Gợi ý nhanh:</span>
          {["Sony Alpha", "DJI RS 3", "Mavic 3", "Sony 24-70mm", "Lens Canon", "Micro Rode"].map((tag) => (
            <button
              key={tag}
              type="button"
              className="quick-tag-chip"
              onClick={() => handleQuickSearch(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Trust Highlights */}
      <section className="marketplace-trust-row">
        <div className="trust-item">
          <div className="trust-icon">🛡️</div>
          <div className="trust-text">
            <h4>Bảo vệ toàn diện</h4>
            <p>Hợp đồng điện tử và bảo hiểm thiết bị minh bạch</p>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon">⚡</div>
          <div className="trust-text">
            <h4>Nghiệm thu chuẩn mực</h4>
            <p>Biên bản bàn giao và đối chiếu phụ kiện chặt chẽ</p>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon">🏆</div>
          <div className="trust-text">
            <h4>Owner uy tín</h4>
            <p>100% thiết bị chính hãng được kiểm định tình trạng</p>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon">💬</div>
          <div className="trust-text">
            <h4>Hỗ trợ 24/7</h4>
            <p>Đội ngũ Trung gian giải quyết thắc mắc & khiếu nại</p>
          </div>
        </div>
      </section>

      {/* Categories & Filter Bar */}
      <div className="marketplace-toolbar">
        <div className="marketplace-filter-card">
          {/* Category Pills Row */}
          <div className="marketplace-categories-row">
            {[
              { id: "all", label: "✨ Tất cả danh mục" },
              { id: "Máy ảnh & Ống kính", label: "📷 Máy ảnh & Lens" },
              { id: "Flycam & Drone", label: "🚁 Flycam / Drone" },
              { id: "Âm thanh & Micro", label: "🎙️ Âm thanh & Mic" },
              { id: "Ánh sáng & Studio", label: "💡 Đèn & Studio" },
              { id: "Gimbal & Chống rung", label: "🎬 Gimbal & Thiết bị phụ" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`category-pill ${category === cat.id ? "active" : ""}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Subfilters: Price Range & Sort */}
          <div className="marketplace-subfilters-row">
            <div className="price-filter-wrapper">
              <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>
                Khoảng giá:
              </span>
              <div className="price-input-box">
                <input
                  type="number"
                  placeholder="Giá từ..."
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span>đ</span>
              </div>
              <span style={{ color: "#64748b" }}>—</span>
              <div className="price-input-box">
                <input
                  type="number"
                  placeholder="Đến..."
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
                <span>đ</span>
              </div>
              <button
                type="button"
                onClick={() => fetchEquipments()}
                className="button button-secondary"
                style={{ width: "auto", padding: "7px 14px", fontSize: "0.82rem", borderRadius: "10px" }}
              >
                Áp dụng
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="button button-quiet"
                  style={{
                    width: "auto",
                    padding: "7px 12px",
                    fontSize: "0.82rem",
                    borderRadius: "10px",
                    color: "#f87171",
                  }}
                  title="Xóa tất cả bộ lọc"
                >
                  ✕ Đặt lại
                </button>
              )}
            </div>

            <div className="sort-select-box">
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Sắp xếp theo:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá thuê: Thấp đến cao</option>
                <option value="price_desc">Giá thuê: Cao đến thấp</option>
                <option value="rating">Đánh giá sao cao nhất</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment List Grid */}
      <main className="equipment-grid-container">
        {isLoading ? (
          <div className="app-loading" style={{ margin: "80px auto", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚡</div>
            Đang tải danh sách thiết bị sẵn sàng cho thuê...
          </div>
        ) : equipments.length === 0 ? (
          <div
            className="owner-section-card owner-empty-state"
            style={{
              padding: "60px 20px",
              textAlign: "center",
              background: "rgba(18, 26, 44, 0.6)",
              borderRadius: "18px",
              border: "1px dashed rgba(255, 255, 255, 0.12)",
            }}
          >
            <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "14px" }}>🔍</span>
            <h3 style={{ color: "#fff", fontSize: "1.3rem", margin: "0 0 8px" }}>
              Không tìm thấy thiết bị phù hợp
            </h3>
            <p style={{ color: "#94a3b8", maxWidth: "480px", margin: "0 auto 20px" }}>
              Hãy thử tìm kiếm với từ khóa khác, điều chỉnh khoảng giá hoặc chọn danh mục "Tất cả".
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="button button-primary"
                style={{ width: "auto", padding: "10px 24px", margin: "0 auto", borderRadius: "12px" }}
              >
                Xóa bộ lọc & Xem tất cả
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Header info */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                fontSize: "0.9rem",
                color: "#94a3b8",
              }}
            >
              <div>
                Tìm thấy <strong style={{ color: "#f97316" }}>{total}</strong> thiết bị cho thuê chất lượng cao
              </div>
              {category !== "all" && (
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  Danh mục: <span style={{ color: "#e2e8f0" }}>{category}</span>
                </div>
              )}
            </div>

            {/* Grid */}
            <div className="equipment-grid">
              {equipments.map((eq) => {
                const ownerInfo = typeof eq.owner_id === "object" && eq.owner_id !== null ? eq.owner_id : null;
                const ownerName = ownerInfo?.name || "Chủ thiết bị uy tín";
                const trustScore = ownerInfo?.trust_score ?? 98;

                return (
                  <article key={eq._id} className="equipment-card-premium">
                    {/* Media Card Preview */}
                    <div className="equipment-card-media">
                      <img
                        src={
                          eq.images?.[0] ||
                          "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
                        }
                        alt={eq.title}
                        loading="lazy"
                      />

                      {/* Category Badge */}
                      <span className="card-badge-top-left">
                        {eq.category || "Thiết bị"}
                      </span>

                      {/* Rating Badge */}
                      <span className="card-badge-top-right">
                        <span>★</span> {eq.rating ? eq.rating.toFixed(1) : "5.0"}
                      </span>

                      {/* Condition Badge */}
                      <span className="card-badge-bottom-left">
                        ✓ {eq.condition || "Mới 99%"}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="equipment-card-body">
                      {/* Brand Row */}
                      <div className="equipment-card-brand-row">
                        <span className="brand-badge">{eq.brand || "CHÍNH HÃNG"}</span>
                        <span>{eq.model_name || ""}</span>
                      </div>

                      {/* Equipment Title */}
                      <h3 className="equipment-card-title" title={eq.title}>
                        {eq.title}
                      </h3>

                      {/* Owner Trust Chip */}
                      <div className="equipment-owner-chip">
                        <div className="owner-avatar-mini">
                          {ownerName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ownerName}
                        </span>
                        <span style={{ color: "#f97316", fontSize: "0.74rem", fontWeight: 600 }}>
                          • Uy tín {trustScore}%
                        </span>
                      </div>

                      {/* Pricing & CTA Button */}
                      <div className="equipment-card-footer">
                        <div className="price-figure">
                          <span className="price-label">Giá thuê ngày</span>
                          <div style={{ display: "flex", alignItems: "baseline" }}>
                            <span className="price-amount">
                              {eq.pricing?.price_per_day?.toLocaleString("vi-VN") || 0} đ
                            </span>
                            <span className="price-unit">/ ngày</span>
                          </div>
                          {eq.pricing?.deposit_amount ? (
                            <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                              Cọc: {eq.pricing.deposit_amount.toLocaleString("vi-VN")} đ
                            </span>
                          ) : null}
                        </div>

                        <Link to={`/equipments/${eq._id}`} className="equipment-cta-btn">
                          Xem chi tiết →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
