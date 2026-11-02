import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../../components/Brand";
import Feedback from "../../components/Feedback";
import { ownerApi } from "../../services/ownerApi";
import type { Equipment } from "../../types/owner";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80";

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Request Rental Modal
  const [showRentModal, setShowRentModal] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(Date.now() + 86400000 * 3);
    return d.toISOString().slice(0, 10);
  });
  const [rentalType, setRentalType] = useState<"daily" | "hourly">("daily");
  const [renterPhone, setRenterPhone] = useState("");
  const [renterNote, setRenterNote] = useState("");
  const [isSubmittingRent, setIsSubmittingRent] = useState(false);

  useEffect(() => {
    if (id) {
      loadDetail(id);
    }
  }, [id]);

  async function loadDetail(equipmentId: string) {
    setIsLoading(true);
    try {
      const data = await ownerApi.getEquipmentPublicDetail(equipmentId);
      setEquipment(data.equipment);
      setCurrentImageIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải chi tiết thiết bị.");
    } finally {
      setIsLoading(false);
    }
  }

  const images =
    equipment?.images && equipment.images.length > 0
      ? equipment.images
      : [FALLBACK_IMAGE];

  const safeImageIndex = currentImageIndex < images.length ? currentImageIndex : 0;
  const selectedImage = images[safeImageIndex] || FALLBACK_IMAGE;

  const handlePrevImage = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleNextImage = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // Keyboard navigation (ArrowLeft / ArrowRight / Escape)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowLeft") {
        handlePrevImage();
      } else if (e.key === "ArrowRight") {
        handleNextImage();
      } else if (e.key === "Escape" && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevImage, handleNextImage, isLightboxOpen]);

  // Calculate estimated price
  function calculateTotal() {
    if (!equipment || !startDate || !endDate) return { rentalFee: 0, deposit: 0, total: 0 };
    const s = new Date(startDate);
    const e = new Date(rentalType === "daily" && endDate.length === 10 ? `${endDate}T23:59:59` : endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return { rentalFee: 0, deposit: 0, total: 0 };

    const diffMs = e.getTime() - s.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

    const isHourly = rentalType === "hourly" && equipment.pricing.price_per_hour > 0;
    const rentalFee = isHourly
      ? hours * equipment.pricing.price_per_hour
      : days * equipment.pricing.price_per_day;

    return { rentalFee, deposit: 0, total: rentalFee };
  }

  async function handleSendRentalRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      navigate("/login");
      return;
    }
    if (!equipment) return;

    setIsSubmittingRent(true);
    setError("");
    setSuccess("");

    try {
      const normalizedStart =
        rentalType === "daily" && startDate.length === 10 ? `${startDate}T08:00:00` : startDate;
      const normalizedEnd =
        rentalType === "daily" && endDate.length === 10 ? `${endDate}T18:00:00` : endDate;

      await ownerApi.requestRental(token, equipment._id, {
        start_date: normalizedStart,
        end_date: normalizedEnd,
        rental_type: rentalType,
        renter_phone: renterPhone,
        renter_note: renterNote,
      });

      setSuccess(
        "Đã gửi yêu cầu thuê tới Quản lý web! Quản lý web sẽ chuyển tiếp cho Chủ thiết bị (Owner) duyệt -> Owner lập Hợp đồng gửi Quản lý web duyệt -> Quản lý web gửi cho bạn ký tên tại trang Hồ sơ."
      );
      setShowRentModal(false);
      setStartDate("");
      setEndDate("");
      setRenterNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi yêu cầu thuê thất bại.");
    } finally {
      setIsSubmittingRent(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1623", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="app-loading">Đang tải chi tiết thiết bị...</div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1623", color: "#fff", padding: "40px 20px", textAlign: "center" }}>
        <h2>Không tìm thấy thiết bị</h2>
        <Link to="/equipments" className="button button-primary" style={{ marginTop: "16px", width: "auto" }}>
          Quay lại chợ thiết bị
        </Link>
      </div>
    );
  }

  const ownerInfo = typeof equipment.owner_id === "object" ? equipment.owner_id : null;
  const isOwnEquipment =
    Boolean(user && ownerInfo && (user.email === ownerInfo.email || String(ownerInfo._id) === String(user.User_Id)));
  const calculation = calculateTotal();

  return (
    <div style={{ minHeight: "100vh", background: "#0f1623", color: "var(--ink)", paddingBottom: "60px" }}>
      {/* Top Navbar */}
      <header className="marketplace-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Brand compact />
          <span className="marketplace-header-badge">
            <span className="pulse-dot" />
            THIẾT BỊ CHÍNH HÃNG
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            to="/equipments"
            className="button button-quiet"
            style={{ width: "auto", fontSize: "0.85rem", padding: "8px 16px", borderRadius: "10px" }}
          >
            ← Quay lại chợ thiết bị
          </Link>
          {user && (
            <Link
              to="/profile"
              className="button button-secondary"
              style={{ width: "auto", fontSize: "0.85rem", padding: "8px 16px", borderRadius: "10px" }}
            >
              👤 Hồ sơ
            </Link>
          )}
        </div>
      </header>

      <div style={{ maxWidth: "1200px", margin: "32px auto", padding: "0 24px" }}>
        {error && <Feedback message={error} />}
        {success && (
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              borderRadius: "10px",
              color: "#6ee7b7",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <span>{success}</span>
            <Link
              to="/profile"
              className="button button-primary"
              style={{ width: "auto", minHeight: "36px", padding: "0 14px", fontSize: "0.82rem" }}
            >
              Xem đơn thuê & Ký HĐ tại Hồ sơ →
            </Link>
          </div>
        )}

        {/* Main 2-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "36px" }}>
          {/* Column 1: Interactive Multi-Image Gallery & Specs */}
          <div>
            {/* Main Carousel Viewport */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "450px",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "#111827",
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.35)",
              }}
            >
              <img
                src={selectedImage}
                alt={`${equipment.title} - Ảnh ${safeImageIndex + 1}`}
                onClick={() => setIsLightboxOpen(true)}
                title="Bấm để phóng to xem chi tiết ảnh"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  cursor: "zoom-in",
                  transition: "opacity 0.25s ease",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                }}
              />

              {/* Top-left image counter badge */}
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  left: "14px",
                  background: "rgba(15, 22, 35, 0.85)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>📷</span>
                <span>
                  Ảnh {safeImageIndex + 1} / {images.length}
                </span>
              </div>

              {/* Top-right zoom button */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "rgba(15, 22, 35, 0.85)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#e2e8f0",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                🔍 Phóng to
              </button>

              {/* Left / Right Navigation Arrows when multiple images exist */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    aria-label="Ảnh trước"
                    title="Ảnh trước (Phím mũi tên trái ←)"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "14px",
                      transform: "translateY(-50%)",
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(15, 22, 35, 0.82)",
                      backdropFilter: "blur(6px)",
                      color: "#fff",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={handleNextImage}
                    aria-label="Ảnh tiếp theo"
                    title="Ảnh tiếp theo (Phím mũi tên phải →)"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "14px",
                      transform: "translateY(-50%)",
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(15, 22, 35, 0.82)",
                      backdropFilter: "blur(6px)",
                      color: "#fff",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    ›
                  </button>

                  {/* Bottom Dots Indicator */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "14px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      gap: "8px",
                      padding: "6px 12px",
                      borderRadius: "999px",
                      background: "rgba(15, 22, 35, 0.75)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentImageIndex(idx)}
                        aria-label={`Chuyển đến ảnh ${idx + 1}`}
                        style={{
                          width: safeImageIndex === idx ? "22px" : "8px",
                          height: "8px",
                          borderRadius: "999px",
                          border: "none",
                          padding: 0,
                          background:
                            safeImageIndex === idx
                              ? "var(--orange)"
                              : "rgba(255, 255, 255, 0.4)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip Selector */}
            {images.length > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "14px",
                  overflowX: "auto",
                  paddingBottom: "6px",
                }}
              >
                {images.map((img, i) => {
                  const isActive = safeImageIndex === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentImageIndex(i)}
                      style={{
                        position: "relative",
                        width: "88px",
                        height: "66px",
                        flexShrink: 0,
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: isActive
                          ? "2px solid var(--orange)"
                          : "1px solid var(--border)",
                        background: "#111827",
                        padding: 0,
                        cursor: "pointer",
                        opacity: isActive ? 1 : 0.65,
                        transform: isActive ? "scale(1.03)" : "scale(1)",
                        transition: "all 0.18s ease",
                      }}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${i + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          bottom: "3px",
                          right: "4px",
                          background: isActive ? "var(--orange)" : "rgba(15, 22, 35, 0.8)",
                          color: "#fff",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        {i + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Specifications Card */}
            <div
              style={{
                background: "var(--panel)",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                padding: "24px",
                marginTop: "24px",
              }}
            >
              <h3 style={{ margin: "0 0 16px", fontSize: "1.15rem", color: "#fff" }}>
                ⚙️ Thông số kỹ thuật chi tiết
              </h3>

              {equipment.specifications && equipment.specifications.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <tbody>
                    {equipment.specifications.map((spec, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 0", color: "var(--muted)", width: "40%" }}>{spec.key}</td>
                        <td style={{ padding: "10px 0", color: "#fff", fontWeight: 500 }}>{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
                  Chưa cập nhật thông số kỹ thuật chi tiết.
                </p>
              )}

              {/* Accessories Included */}
              {equipment.accessories && equipment.accessories.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ margin: "0 0 10px", color: "var(--orange)", fontSize: "0.95rem" }}>
                    🎒 Phụ kiện đi kèm:
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {equipment.accessories.map((acc, i) => (
                      <span
                        key={i}
                        style={{
                          background: "#111827",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "0.82rem",
                          border: "1px solid var(--border)",
                          color: "#e2e8f0",
                        }}
                      >
                        ✓ {acc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Details & Rental Action */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span
                style={{
                  background: "rgba(249, 115, 22, 0.15)",
                  color: "var(--orange)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {equipment.category}
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Hãng: <strong>{equipment.brand || "Chính hãng"}</strong>
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Tình trạng: <strong>{equipment.condition}</strong>
              </span>
            </div>

            <h1 style={{ color: "#fff", fontSize: "1.8rem", lineHeight: 1.3, margin: "0 0 12px" }}>
              {equipment.title}
            </h1>

            {/* Ratings & Reviews */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <span style={{ color: "#f59e0b", fontSize: "1.1rem" }}>
                {"★".repeat(Math.round(equipment.rating || 5))}
              </span>
              <span style={{ color: "#fff", fontWeight: 600 }}>{equipment.rating?.toFixed(1) || "5.0"}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                ({equipment.review_count || 12} đánh giá thuê thành công)
              </span>
            </div>

            {/* Pricing Box */}
            <div
              style={{
                background: "linear-gradient(135deg, #1a2235 0%, #152238 100%)",
                padding: "24px",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "4px" }}>
                    GIÁ THUÊ THEO NGÀY
                  </div>
                  <div style={{ color: "#10b981", fontSize: "2rem", fontWeight: 700 }}>
                    {equipment.pricing.price_per_day.toLocaleString("vi-VN")} đ
                    <span style={{ fontSize: "1rem", color: "var(--muted)", fontWeight: 400 }}> /ngày</span>
                  </div>
                </div>

                {equipment.pricing.price_per_hour > 0 && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Theo giờ:</div>
                    <div style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600 }}>
                      {equipment.pricing.price_per_hour.toLocaleString("vi-VN")} đ/h
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "14px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ color: "var(--muted)" }}>Tiền đặt cọc bảo đảm:</span>
                <strong style={{ color: "#10b981" }}>
                  Miễn phí (0 đ)
                </strong>
              </div>

              {/* Action Button */}
              <div style={{ marginTop: "20px" }}>
                {isOwnEquipment ? (
                  <Link to="/owner" className="button button-secondary" style={{ width: "100%", textAlign: "center" }}>
                    Quản lý thiết bị này trong Cổng Owner 💼
                  </Link>
                ) : (
                  <button
                    className="button button-primary"
                    style={{ width: "100%", padding: "14px", fontSize: "1rem" }}
                    onClick={() => {
                      if (!user) {
                        navigate("/login");
                      } else {
                        setShowRentModal(true);
                      }
                    }}
                  >
                    Gửi yêu cầu thuê ngay 🚀
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "1.1rem", color: "#fff", marginBottom: "8px" }}>Mô tả thiết bị</h3>
              <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0, fontSize: "0.92rem" }}>
                {equipment.description || "Chủ thiết bị chưa cung cấp mô tả chi tiết."}
              </p>
            </div>

            {/* Owner Info Card */}
            {ownerInfo && (
              <div
                style={{
                  background: "var(--panel)",
                  padding: "18px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--orange)",
                    color: "#fff",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                  }}
                >
                  {(ownerInfo.name || "O").slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong style={{ color: "#fff", fontSize: "1rem" }}>{ownerInfo.name}</strong>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        background: "rgba(16, 185, 129, 0.2)",
                        color: "#10b981",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontWeight: 600,
                      }}
                    >
                      ✓ Đã xác thực
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    Chủ sở hữu thiết bị • Điểm uy tín: <strong>{ownerInfo.trust_score || 100} / 100</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rental Terms & Cancellation Policy */}
            <div
              style={{
                background: "#111827",
                padding: "18px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "var(--orange)" }}>📋 Điều khoản thuê:</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{equipment.rental_terms}</p>
              </div>
              <div>
                <strong style={{ color: "var(--orange)" }}>🛡️ Chính sách hủy đơn:</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{equipment.cancellation_policy}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX VIEWER FOR RENTER */}
      {isLightboxOpen && (
        <div
          className="owner-modal-overlay"
          style={{ background: "rgba(5, 8, 15, 0.92)", zIndex: 200 }}
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", color: "#fff" }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                {equipment.title} — Ảnh {safeImageIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ✕ Đóng (Esc)
              </button>
            </div>

            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevImage}
                  style={{
                    position: "absolute",
                    left: "-56px",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(15, 22, 35, 0.85)",
                    color: "#fff",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  ‹
                </button>
              )}

              <img
                src={selectedImage}
                alt={equipment.title}
                style={{
                  maxWidth: "82vw",
                  maxHeight: "74vh",
                  objectFit: "contain",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                }}
              />

              {images.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextImage}
                  style={{
                    position: "absolute",
                    right: "-56px",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(15, 22, 35, 0.85)",
                    color: "#fff",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  ›
                </button>
              )}
            </div>

            {images.length > 1 && (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", maxWidth: "85vw", padding: "4px" }}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentImageIndex(idx)}
                    style={{
                      width: "70px",
                      height: "52px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: safeImageIndex === idx ? "2px solid var(--orange)" : "1px solid rgba(255,255,255,0.2)",
                      padding: 0,
                      cursor: "pointer",
                      opacity: safeImageIndex === idx ? 1 : 0.55,
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Request Rental Form */}
      {showRentModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "560px" }}>
            <div className="owner-modal-header">
              <h3>📬 Gửi yêu cầu thuê thiết bị</h3>
              <button className="close-modal-btn" onClick={() => setShowRentModal(false)}>
                ✕
              </button>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "0.86rem", marginTop: 0, lineHeight: 1.5 }}>
              Thiết bị: <strong style={{ color: "#fff" }}>{equipment.title}</strong>
              <br />
              Quy trình: <strong style={{ color: "#fb923c" }}>1. Gửi YC cho Quản lý web</strong> ➔{" "}
              <strong style={{ color: "#38bdf8" }}>2. Quản lý web gửi Owner duyệt</strong> ➔{" "}
              <strong style={{ color: "#a78bfa" }}>3. Owner lập HĐ gửi Quản lý web duyệt</strong> ➔{" "}
              <strong style={{ color: "#10b981" }}>4. Quản lý web gửi cho bạn ký tên</strong>.
            </p>

            <form onSubmit={handleSendRentalRequest}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">Hình thức thuê</label>
                  <select
                    className="input-field"
                    value={rentalType}
                    onChange={(e) => {
                      const nextType = e.target.value as "daily" | "hourly";
                      setRentalType(nextType);
                      if (nextType === "daily") {
                        setStartDate((prev) => (prev ? prev.slice(0, 10) : new Date(Date.now() + 86400000).toISOString().slice(0, 10)));
                        setEndDate((prev) => (prev ? prev.slice(0, 10) : new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)));
                      } else {
                        setStartDate((prev) => (prev.length === 10 ? `${prev}T08:00` : prev));
                        setEndDate((prev) => (prev.length === 10 ? `${prev}T18:00` : prev));
                      }
                    }}
                  >
                    <option value="daily">Theo ngày ({equipment.pricing.price_per_day.toLocaleString("vi-VN")} đ/ngày)</option>
                    {equipment.pricing.price_per_hour > 0 && (
                      <option value="hourly">Theo giờ ({equipment.pricing.price_per_hour.toLocaleString("vi-VN")} đ/giờ)</option>
                    )}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="field-label">
                      {rentalType === "daily" ? "Ngày bắt đầu thuê *" : "Thời gian bắt đầu *"}
                    </label>
                    <input
                      className="input-field"
                      type={rentalType === "daily" ? "date" : "datetime-local"}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">
                      {rentalType === "daily" ? "Ngày trả máy *" : "Thời gian trả máy *"}
                    </label>
                    <input
                      className="input-field"
                      type={rentalType === "daily" ? "date" : "datetime-local"}
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Số điện thoại liên hệ *</label>
                  <input
                    className="input-field"
                    type="tel"
                    placeholder="Số điện thoại nhận máy"
                    value={renterPhone}
                    onChange={(e) => setRenterPhone(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Ghi chú cho Owner (Mục đích thuê, địa điểm bàn giao...)</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Ví dụ: Em thuê quay sự kiện cuối tuần tại Hà Nội, xin bàn giao trực tiếp tại studio..."
                    value={renterNote}
                    onChange={(e) => setRenterNote(e.target.value)}
                  />
                </div>

                {/* Estimation preview */}
                {startDate && endDate && (
                  <div style={{ background: "#111827", padding: "14px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "6px" }}>
                      <span style={{ color: "var(--muted)" }}>Tiền thuê dự kiến:</span>
                      <strong style={{ color: "#10b981" }}>{calculation.rentalFee.toLocaleString("vi-VN")} đ</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "6px" }}>
                      <span style={{ color: "var(--muted)" }}>Tiền đặt cọc cam kết:</span>
                      <strong style={{ color: "#10b981" }}>Miễn phí (0 đ)</strong>
                    </div>
                    <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "6px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                      <span style={{ color: "#fff", fontWeight: 600 }}>Tổng dự kiến:</span>
                      <strong style={{ color: "var(--orange)" }}>{calculation.total.toLocaleString("vi-VN")} đ</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowRentModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmittingRent}>
                  {isSubmittingRent ? "Đang gửi..." : "Gửi yêu cầu thuê cho Quản lý web"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
