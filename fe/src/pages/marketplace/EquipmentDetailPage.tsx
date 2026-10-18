import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../../components/Brand";
import Feedback from "../../components/Feedback";
import { ownerApi } from "../../services/ownerApi";
import type { Equipment } from "../../types/owner";

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Request Rental Modal
  const [showRentModal, setShowRentModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
      setSelectedImage(data.equipment.images?.[0] || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải chi tiết thiết bị.");
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate estimated price
  function calculateTotal() {
    if (!equipment || !startDate || !endDate) return { rentalFee: 0, deposit: 0, total: 0 };
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e <= s) return { rentalFee: 0, deposit: 0, total: 0 };

    const diffMs = e.getTime() - s.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

    const isHourly = rentalType === "hourly" && equipment.pricing.price_per_hour > 0;
    const rentalFee = isHourly
      ? hours * equipment.pricing.price_per_hour
      : days * equipment.pricing.price_per_day;

    const deposit = equipment.pricing.deposit_amount;
    return { rentalFee, deposit, total: rentalFee + deposit };
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
      await ownerApi.requestRental(token, equipment._id, {
        start_date: startDate,
        end_date: endDate,
        rental_type: rentalType,
        renter_phone: renterPhone,
        renter_note: renterNote,
      });

      setSuccess("Yêu cầu thuê đã được gửi thành công! Chủ thiết bị (Owner) sẽ kiểm tra và phản hồi.");
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
        <Link to="/equipments" className="button button-primary" style={{ marginTop: "16px" }}>
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
            }}
          >
            {success}
          </div>
        )}

        {/* Main 2-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "36px" }}>
          {/* Column 1: Image Gallery */}
          <div>
            <div
              style={{
                width: "100%",
                height: "440px",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "#111827",
              }}
            >
              <img
                src={
                  selectedImage ||
                  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
                }
                alt={equipment.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Thumbnail selector */}
            {equipment.images && equipment.images.length > 1 && (
              <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                {equipment.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    style={{
                      width: "80px",
                      height: "60px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: selectedImage === img ? "2px solid var(--orange)" : "1px solid var(--border)",
                      background: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
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
                <strong style={{ color: "#fff" }}>
                  {equipment.pricing.deposit_amount.toLocaleString("vi-VN")} đ
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

            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Thiết bị: <strong style={{ color: "#fff" }}>{equipment.title}</strong>
            </p>

            <form onSubmit={handleSendRentalRequest}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">Hình thức thuê</label>
                  <select
                    className="input-field"
                    value={rentalType}
                    onChange={(e) => setRentalType(e.target.value as any)}
                  >
                    <option value="daily">Theo ngày ({equipment.pricing.price_per_day.toLocaleString("vi-VN")} đ/ngày)</option>
                    {equipment.pricing.price_per_hour > 0 && (
                      <option value="hourly">Theo giờ ({equipment.pricing.price_per_hour.toLocaleString("vi-VN")} đ/giờ)</option>
                    )}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="field-label">Thời gian bắt đầu *</label>
                    <input
                      className="input-field"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Thời gian trả máy *</label>
                    <input
                      className="input-field"
                      type="datetime-local"
                      value={endDate}
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
                      <strong style={{ color: "#fff" }}>{calculation.deposit.toLocaleString("vi-VN")} đ</strong>
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
                  {isSubmittingRent ? "Đang gửi..." : "Gửi yêu cầu thuê cho Owner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
