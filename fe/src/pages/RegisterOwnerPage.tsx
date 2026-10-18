import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Brand from "../components/Brand";
import Feedback from "../components/Feedback";
import { ownerApi } from "../services/ownerApi";
import type { OwnerApplication } from "../types/owner";

export default function RegisterOwnerPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [application, setApplication] = useState<OwnerApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [phone, setPhone] = useState("");
  const [identityCard, setIdentityCard] = useState("");
  const [address, setAddress] = useState("");
  const [shopName, setShopName] = useState("");
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState(user?.name || "");
  const [idFront, setIdFront] = useState("");
  const [idBack, setIdBack] = useState("");
  const [businessLicense, setBusinessLicense] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    ownerApi
      .getOwnerRegistrationStatus(token)
      .then((res) => {
        if (res.hasApplication && res.application) {
          setApplication(res.application);
          setPhone(res.application.phone);
          setIdentityCard(res.application.identity_card);
          setAddress(res.application.address);
          setShopName(res.application.shop_name || "");
          setBankName(res.application.bank_name);
          setBankAccountNumber(res.application.bank_account_number);
          setBankAccountHolder(res.application.bank_account_holder);
          setIdFront(res.application.identity_card_front || "");
          setIdBack(res.application.identity_card_back || "");
          setBusinessLicense(res.application.business_license || "");
          setNotes(res.application.notes || "");
        }
      })
      .catch((err) => {
        console.error("Failed to load registration status:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      navigate("/login");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const res = await ownerApi.submitOwnerRegistration(token, {
        phone,
        identity_card: identityCard,
        address,
        shop_name: shopName,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_holder: bankAccountHolder,
        identity_card_front: idFront,
        identity_card_back: idBack,
        business_license: businessLicense,
        notes,
      });

      setApplication(res.application);
      setSuccess("Hồ sơ đăng ký đã được gửi thành công! System Admin sẽ phê duyệt hồ sơ của bạn.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi hồ sơ thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user || !token) {
    return (
      <main className="auth-layout" style={{ alignItems: "center", padding: "40px 20px" }}>
        <div
          className="admin-container"
          style={{
            maxWidth: "540px",
            background: "var(--panel)",
            padding: "36px",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <Brand compact />
          <h2 style={{ color: "#fff", marginTop: "24px", marginBottom: "12px" }}>
            Đăng ký trở thành Người cho thuê (Owner)
          </h2>
          <p style={{ color: "var(--muted)", marginBottom: "28px", lineHeight: 1.6 }}>
            Để gửi hồ sơ và mở gian hàng cho thuê thiết bị điện tử, bạn cần có tài khoản trên nền tảng.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link to="/login" className="button button-primary">
              Đăng nhập ngay
            </Link>
            <Link to="/register" className="button button-secondary">
              Tạo tài khoản mới
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isAlreadyOwner = (user.role || "").toLowerCase() === "owner";

  return (
    <div style={{ minHeight: "100vh", background: "#0f1623", color: "var(--ink)", paddingBottom: "60px" }}>
      {/* Top Navbar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 32px",
          borderBottom: "1px solid var(--border)",
          background: "#131b2e",
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
            UC_O02 • ĐĂNG KÝ OWNER
          </span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Link to="/equipments" className="button button-quiet" style={{ fontSize: "0.85rem" }}>
            Chợ thiết bị 🔍
          </Link>
          <Link to="/profile" className="button button-secondary" style={{ fontSize: "0.85rem" }}>
            Hồ sơ cá nhân
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: "860px", margin: "36px auto", padding: "0 20px" }}>
        {/* Hero Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #1c263d 0%, #172a3a 100%)",
            padding: "32px",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--orange)", fontWeight: 700, letterSpacing: "1px" }}>
                CHƯƠNG TRÌNH ĐỐI TÁC CHO THUÊ
              </span>
              <h1 style={{ color: "#fff", fontSize: "1.8rem", marginTop: "6px", marginBottom: "10px" }}>
                Gia nhập Mạng lưới Người cho thuê (Owner)
              </h1>
              <p style={{ color: "var(--muted)", margin: 0, lineHeight: 1.6, maxWidth: "620px" }}>
                Khai thác tối đa giá trị thiết bị công nghệ của bạn. Nền tảng hỗ trợ bảo hiểm thiết bị,
                hợp đồng điện tử chuẩn pháp lý và thanh toán an toàn qua ký quỹ.
              </p>
            </div>
            {isAlreadyOwner && (
              <Link to="/owner" className="button button-primary" style={{ whiteSpace: "nowrap" }}>
                Vào Cổng Owner 💼
              </Link>
            )}
          </div>

          {/* Application Status Alert */}
          {application && (
            <div
              style={{
                marginTop: "24px",
                padding: "16px 20px",
                borderRadius: "12px",
                background:
                  application.status === "approved"
                    ? "rgba(16, 185, 129, 0.15)"
                    : application.status === "pending"
                    ? "rgba(245, 158, 11, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                border: `1px solid ${
                  application.status === "approved"
                    ? "#10b981"
                    : application.status === "pending"
                    ? "#f59e0b"
                    : "#ef4444"
                }`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.4rem" }}>
                  {application.status === "approved"
                    ? "✅"
                    : application.status === "pending"
                    ? "⏳"
                    : "❌"}
                </span>
                <div>
                  <strong style={{ color: "#fff", fontSize: "1rem" }}>
                    {application.status === "approved"
                      ? "Hồ sơ của bạn đã được System Admin phê duyệt!"
                      : application.status === "pending"
                      ? "Hồ sơ đang chờ System Admin xét duyệt"
                      : "Hồ sơ đăng ký bị từ chối"}
                  </strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "var(--muted)" }}>
                    {application.status === "approved" &&
                      "Bạn hiện có đầy đủ quyền đăng bài, quản lý yêu cầu thuê và lập hợp đồng."}
                    {application.status === "pending" &&
                      "Hồ sơ của bạn đã được ghi nhận vào hệ thống. System Admin sẽ kiểm tra và kích hoạt quyền cho bạn sớm nhất."}
                    {application.status === "rejected" &&
                      `Lý do từ chối: ${application.admin_note || "Không đủ thông tin xác thực"}. Bạn có thể chỉnh sửa lại hồ sơ bên dưới và nộp lại.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Feedback message={error} />
        {success && (
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              borderRadius: "10px",
              color: "#6ee7b7",
              marginBottom: "24px",
            }}
          >
            {success}
          </div>
        )}

        {/* Application Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "var(--panel)",
            padding: "36px",
            borderRadius: "16px",
            border: "1px solid var(--border)",
          }}
        >
          <h2 style={{ fontSize: "1.3rem", color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span>📄</span> Thông tin định danh & Tài khoản giải ngân
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label className="field-label">Họ và tên người đăng ký</label>
              <input
                className="input-field"
                type="text"
                value={user.name}
                disabled
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>
            <div>
              <label className="field-label">Email tài khoản</label>
              <input
                className="input-field"
                type="email"
                value={user.email}
                disabled
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>

            <div>
              <label className="field-label">
                Số điện thoại liên hệ <span style={{ color: "var(--orange)" }}>*</span>
              </label>
              <input
                className="input-field"
                type="tel"
                placeholder="Ví dụ: 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="field-label">
                Số CCCD / CMND gắn chip <span style={{ color: "var(--orange)" }}>*</span>
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="12 chữ số trên CCCD"
                value={identityCard}
                onChange={(e) => setIdentityCard(e.target.value)}
                required
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">
                Địa chỉ thường trú / Điểm giao dịch bàn giao <span style={{ color: "var(--orange)" }}>*</span>
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="field-label">Tên gian hàng / Studio (tùy chọn)</label>
              <input
                className="input-field"
                type="text"
                placeholder="Ví dụ: Hà Nội Camera Rental"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">
                Ngân hàng nhận giải ngân <span style={{ color: "var(--orange)" }}>*</span>
              </label>
              <select
                className="input-field"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                style={{ background: "#111827", color: "#fff" }}
              >
                <option value="Vietcombank">Vietcombank</option>
                <option value="MBBank">MBBank (Ngân hàng Quân đội)</option>
                <option value="Techcombank">Techcombank</option>
                <option value="VPBank">VPBank</option>
                <option value="BIDV">BIDV</option>
                <option value="VietinBank">VietinBank</option>
                <option value="ACB">ACB</option>
                <option value="TPBank">TPBank</option>
              </select>
            </div>

            <div>
              <label className="field-label">
                Số tài khoản ngân hàng <span style={{ color: "var(--orange)" }}>*</span>
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="Số tài khoản chính xác"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="field-label">
                Chủ tài khoản ngân hàng <span style={{ color: "var(--orange)" }}>*</span>
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="NGUYEN VAN A (in hoa không dấu)"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                required
              />
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "28px 0" }} />

          <h3 style={{ fontSize: "1.1rem", color: "#fff", marginBottom: "16px" }}>
            📸 Hình ảnh hồ sơ & Giấy tờ xác thực
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label className="field-label">URL Ảnh mặt trước CCCD</label>
              <input
                className="input-field"
                type="url"
                placeholder="https://... ảnh mặt trước"
                value={idFront}
                onChange={(e) => setIdFront(e.target.value)}
              />
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                Hỗ trợ dán link ảnh minh chứng từ Cloudinary/Imgur hoặc demo
              </span>
            </div>

            <div>
              <label className="field-label">URL Ảnh mặt sau CCCD</label>
              <input
                className="input-field"
                type="url"
                placeholder="https://... ảnh mặt sau"
                value={idBack}
                onChange={(e) => setIdBack(e.target.value)}
              />
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                Rõ ràng số CCCD và đặc điểm nhận dạng
              </span>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">Link Giấy phép kinh doanh / Chứng chỉ liên quan (nếu có)</label>
              <input
                className="input-field"
                type="url"
                placeholder="https://... liên kết tài liệu"
                value={businessLicense}
                onChange={(e) => setBusinessLicense(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">Ghi chú bổ sung cho Quản trị viên</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Kinh nghiệm cho thuê thiết bị, danh mục dự kiến cho thuê, v.v."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: "32px", display: "flex", gap: "16px", alignItems: "center" }}>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting || isLoading}
              style={{ minWidth: "220px", padding: "14px 28px" }}
            >
              {isSubmitting
                ? "Đang gửi hồ sơ..."
                : application?.status === "pending"
                ? "Cập nhật lại hồ sơ"
                : "Gửi hồ sơ đăng ký Owner 🚀"}
            </button>
            <Link to="/profile" className="button button-quiet">
              Hủy bỏ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
