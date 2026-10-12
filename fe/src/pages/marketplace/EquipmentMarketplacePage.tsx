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

  async function fetchEquipments() {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
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

  const isOwner = (user?.role || "").toLowerCase() === "owner";

  return (
    <div style={{ minHeight: "100vh", background: "#0f1623", color: "var(--ink)", paddingBottom: "60px" }}>
      {/* Top Navbar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 36px",
          borderBottom: "1px solid var(--border)",
          background: "#131b2e",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Brand compact />
          <span
            style={{
              fontSize: "0.75rem",
              background: "rgba(249, 115, 22, 0.15)",
              color: "var(--orange)",
              padding: "4px 10px",
              borderRadius: "20px",
              fontWeight: 600,
              border: "1px solid rgba(249, 115, 22, 0.3)",
            }}
          >
            UC_O19 • CHỢ THIẾT BỊ CÔNG KHAI
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user ? (
            <>
              {isOwner ? (
                <Link to="/owner" className="button button-primary" style={{ fontSize: "0.85rem" }}>
                  Cổng Cho Thuê (Owner) 💼
                </Link>
              ) : (
                <Link to="/register-owner" className="button button-primary" style={{ fontSize: "0.85rem" }}>
                  Trở thành Owner 🚀
                </Link>
              )}
              <Link to="/profile" className="button button-secondary" style={{ fontSize: "0.85rem" }}>
                Hồ sơ cá nhân
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="button button-quiet" style={{ fontSize: "0.85rem" }}>
                Đăng nhập
              </Link>
              <Link to="/register" className="button button-primary" style={{ fontSize: "0.85rem" }}>
                Đăng ký tài khoản
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Search Section */}
      <div
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(249, 115, 22, 0.12) 0%, transparent 70%)",
          padding: "40px 20px 28px",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#fff", fontSize: "2.2rem", marginBottom: "8px" }}>
          Thuê Thiết Bị Công Nghệ & Quay Chụp Đỉnh Cao
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: "560px", margin: "0 auto 28px", lineHeight: 1.6 }}>
          Tìm kiếm máy ảnh, flycam, lens, mic thu âm và thiết bị studio chính hãng từ các Owner uy tín. Hợp đồng điện tử minh bạch, bảo vệ quyền lợi 100%.
        </p>

        {/* Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            display: "flex",
            gap: "10px",
            background: "#1a2235",
            padding: "8px",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          }}
        >
          <input
            type="text"
            className="input-field"
            placeholder="Tìm theo tên máy ảnh, flycam, thương hiệu (Sony, Canon, DJI)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", background: "transparent", fontSize: "1rem" }}
          />
          <button type="submit" className="button button-primary" style={{ minWidth: "120px" }}>
            Tìm kiếm 🔍
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}>
        {/* Filters and Sorting bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            padding: "16px 0",
            borderBottom: "1px solid var(--border)",
            marginBottom: "28px",
          }}
        >
          {/* Categories Buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "Tất cả" },
              { id: "Máy ảnh & Ống kính", label: "📷 Máy ảnh & Lens" },
              { id: "Flycam & Drone", label: "🚁 Flycam / Drone" },
              { id: "Âm thanh & Micro", label: "🎙️ Âm thanh & Mic" },
              { id: "Ánh sáng & Studio", label: "💡 Đèn & Studio" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`button ${category === cat.id ? "button-primary" : "button-quiet"}`}
                style={{ fontSize: "0.85rem", padding: "8px 14px", borderRadius: "20px" }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Price Range Filter & Sort By */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="number"
                placeholder="Giá từ..."
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="input-field"
                style={{ width: "95px", padding: "6px 10px", fontSize: "0.82rem" }}
              />
              <span style={{ color: "var(--muted)" }}>-</span>
              <input
                type="number"
                placeholder="Đến..."
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="input-field"
                style={{ width: "95px", padding: "6px 10px", fontSize: "0.82rem" }}
              />
              <button
                type="button"
                onClick={fetchEquipments}
                className="button button-secondary"
                style={{ padding: "6px 12px", fontSize: "0.82rem" }}
              >
                Lọc giá
              </button>
            </div>

            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Sắp xếp:</span>
            <select
              className="input-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: "auto", padding: "6px 12px", fontSize: "0.85rem" }}
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá thuê: Thấp đến cao</option>
              <option value="price_desc">Giá thuê: Cao đến thấp</option>
              <option value="rating">Đánh giá cao nhất</option>
            </select>
          </div>
        </div>

        {/* Results grid */}
        {isLoading ? (
          <div className="app-loading" style={{ margin: "60px auto" }}>
            Đang tải danh sách thiết bị công khai...
          </div>
        ) : equipments.length === 0 ? (
          <div className="owner-section-card owner-empty-state">
            <span style={{ fontSize: "3rem" }}>🔍</span>
            <h3>Không tìm thấy thiết bị phù hợp</h3>
            <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "16px" }}>
              Hiển thị <strong>{total}</strong> thiết bị cho thuê khả dụng
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "24px",
              }}
            >
              {equipments.map((eq) => (
                <div
                  key={eq._id}
                  style={{
                    background: "var(--panel)",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                >
                  <div style={{ position: "relative", width: "100%", height: "200px" }}>
                    <img
                      src={
                        eq.images?.[0] ||
                        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
                      }
                      alt={eq.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        background: "rgba(15, 22, 35, 0.8)",
                        color: "var(--orange)",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {eq.category}
                    </span>

                    <span
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        right: "10px",
                        background: "rgba(0,0,0,0.75)",
                        color: "#fff",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                      }}
                    >
                      ⭐ {eq.rating?.toFixed(1) || "5.0"}
                    </span>
                  </div>

                  <div style={{ padding: "18px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <h3
                      style={{
                        margin: "0 0 6px",
                        fontSize: "1.05rem",
                        color: "#fff",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {eq.title}
                    </h3>

                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "14px" }}>
                      {eq.brand} • {eq.condition}
                    </div>

                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Giá thuê ngày</div>
                        <strong style={{ color: "#10b981", fontSize: "1.15rem" }}>
                          {eq.pricing.price_per_day.toLocaleString("vi-VN")} đ
                        </strong>
                      </div>

                      <Link
                        to={`/equipments/${eq._id}`}
                        className="button button-primary"
                        style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                      >
                        Xem chi tiết (UC_O20) →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
