import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Brand from "../components/Brand";
import Feedback from "../components/Feedback";
import PasswordInput from "../components/PasswordInput";
import { authApi } from "../services/authApi";
import { ownerApi } from "../services/ownerApi";
import type { UserNotification } from "../types/auth";
import type { RentalContract, RentalRequest } from "../types/owner";

export default function ProfilePage() {
  const { user, token, isLoading, signOut, saveUser, changePassword } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const [markingNotificationId, setMarkingNotificationId] = useState("");

  // Renter's rental requests & contracts
  const [myRequests, setMyRequests] = useState<RentalRequest[]>([]);
  const [myContracts, setMyContracts] = useState<RentalContract[]>([]);
  const [viewingContract, setViewingContract] = useState<RentalContract | null>(null);
  const [renterSignatureNote, setRenterSignatureNote] = useState(
    "Tôi (Người thuê) đã đọc kỹ điều khoản Hợp đồng đã được Quản lý web phê duyệt và đồng ý ký tên xác nhận."
  );
  const [isSigningContract, setIsSigningContract] = useState(false);

  const loadRentalsAndNotifications = useCallback(() => {
    if (!token) return;
    authApi
      .getNotifications(token)
      .then(({ notifications: items }) => setNotifications(items))
      .catch((requestError: unknown) => {
        setNotificationError(
          requestError instanceof Error ? requestError.message : "Không thể tải thông báo."
        );
      });

    ownerApi
      .getMyRentals(token)
      .then(({ requests, contracts }) => {
        setMyRequests(requests || []);
        setMyContracts(contracts || []);
      })
      .catch(() => {
        // Ignore if not applicable
      });
  }, [token]);

  useEffect(() => {
    loadRentalsAndNotifications();
  }, [loadRentalsAndNotifications]);

  if (isLoading) return <div className="app-loading">Đang tải tài khoản...</div>;
  if (!user || !token) return <Navigate to="/login" replace />;

  const accessToken = token;
  const rawRole = (user.role || "").toLowerCase();
  const normalizedRole = rawRole.replace(/[\s_-]/g, "");

  const roleBadgeLabel =
    rawRole === "systemadmin"
      ? "QUẢN TRỊ HỆ THỐNG • ADMIN"
      : rawRole === "owner"
      ? "NGƯỜI CHO THUÊ • OWNER"
      : normalizedRole === "rentalmoderator"
      ? "QUẢN LÝ WEB • MODERATOR"
      : "KHÁCH THUÊ • RENTER";

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const contractsWaitingMySignature = myContracts.filter((c) => c.status === "moderator_approved");

  async function handleSignContract(contract: RentalContract) {
    setIsSigningContract(true);
    setError("");
    setSuccess("");
    try {
      const res = await ownerApi.signMyContract(
        accessToken,
        contract._id,
        renterSignatureNote.trim() || `Ký xác nhận bởi ${user?.name}`
      );
      setSuccess(res.message);
      setViewingContract(null);
      loadRentalsAndNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ký hợp đồng thất bại.");
    } finally {
      setIsSigningContract(false);
    }
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSavingProfile(true);
    try {
      const result = await authApi.updateProfile(accessToken, name);
      saveUser(result.user);
      setSuccess("Thông tin hồ sơ đã được cập nhật.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Không thể cập nhật hồ sơ."
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setSuccess("Mật khẩu đã đổi. Phiên đăng nhập đã được cập nhật.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đổi mật khẩu.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleLogout() {
    setError("");
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? `Không thể xác nhận đăng xuất với máy chủ: ${logoutError.message}`
          : "Không thể xác nhận đăng xuất với máy chủ."
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="profile-page">
      {/* Top Header Bar */}
      <header className="profile-header">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <Brand compact />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "999px",
              background: "rgba(249, 115, 22, 0.14)",
              border: "1px solid rgba(249, 115, 22, 0.32)",
              color: "#fb923c",
              fontSize: "0.73rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            {roleBadgeLabel}
          </span>
        </div>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/equipments"
            className="button button-quiet"
            style={{
              width: "auto",
              minHeight: "40px",
              padding: "0 16px",
              borderRadius: "10px",
              fontSize: "0.85rem",
            }}
          >
            🔍 Chợ thiết bị
          </Link>

          {rawRole === "systemadmin" && (
            <Link
              to="/admin"
              className="button button-secondary"
              style={{
                width: "auto",
                minHeight: "40px",
                padding: "0 18px",
                borderRadius: "10px",
                fontSize: "0.85rem",
              }}
            >
              ⚙️ Trang Quản trị
            </Link>
          )}

          {(normalizedRole === "rentalmoderator" || rawRole === "systemadmin") && (
            <Link
              to="/moderator"
              className="button button-primary"
              style={{
                width: "auto",
                minHeight: "40px",
                padding: "0 18px",
                borderRadius: "10px",
                fontSize: "0.85rem",
              }}
            >
              ⚖️ Quản lý web (Duyệt YC & Hợp đồng)
            </Link>
          )}

          {rawRole === "owner" && (
            <Link
              to="/owner"
              className="button button-primary"
              style={{
                width: "auto",
                minHeight: "40px",
                padding: "0 18px",
                borderRadius: "10px",
                fontSize: "0.85rem",
                boxShadow: "0 4px 14px rgba(249, 115, 22, 0.3)",
              }}
            >
              💼 Cổng Người cho thuê
            </Link>
          )}

          {rawRole !== "owner" &&
            rawRole !== "systemadmin" &&
            normalizedRole !== "rentalmoderator" && (
              <Link
                to="/register-owner"
                className="button button-primary"
                style={{
                  width: "auto",
                  minHeight: "40px",
                  padding: "0 18px",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                }}
              >
                🚀 Đăng ký Owner
              </Link>
            )}

          <button
            className="button button-quiet"
            style={{
              width: "auto",
              minHeight: "40px",
              padding: "0 16px",
              borderRadius: "10px",
              fontSize: "0.85rem",
              color: "#fda4af",
              borderColor: "rgba(244, 63, 94, 0.3)",
            }}
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất ↗"}
          </button>
        </nav>
      </header>

      <div className="profile-content" style={{ paddingTop: "38px" }}>
        {/* Profile Hero Banner */}
        <div
          className="profile-intro"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            padding: "26px 28px",
            borderRadius: "18px",
            background: "linear-gradient(135deg, #172135 0%, #121a2b 100%)",
            border: "1px solid #253047",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.22)",
            marginBottom: "28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                fontWeight: 800,
                boxShadow: "0 8px 20px rgba(249, 115, 22, 0.3)",
                flexShrink: 0,
              }}
            >
              {(user.name || "U").trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="form-kicker" style={{ color: "#fb923c" }}>
                TÀI KHOẢN CỦA BẠN
              </span>
              <h1 style={{ margin: "4px 0 6px", fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
                Xin chào, {user.name}
              </h1>
              <p style={{ margin: 0, color: "#94a0b2", fontSize: "0.9rem" }}>
                {user.email} • Quản lý đơn thuê thiết bị, ký hợp đồng điện tử và cài đặt tài khoản.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                borderRadius: "12px",
                background: "#0f1623",
                border: "1px solid #253047",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "#94a0b2", textTransform: "uppercase" }}>
                Hợp đồng chờ ký
              </div>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: contractsWaitingMySignature.length > 0 ? "#fb923c" : "#10b981",
                }}
              >
                {contractsWaitingMySignature.length}
              </div>
            </div>
            <div
              style={{
                padding: "10px 16px",
                borderRadius: "12px",
                background: "#0f1623",
                border: "1px solid #253047",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "#94a0b2", textTransform: "uppercase" }}>
                Thông báo mới
              </div>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: unreadCount > 0 ? "#fb923c" : "#10b981",
                }}
              >
                {unreadCount}
              </div>
            </div>
          </div>
        </div>

        <Feedback message={error} />
        <Feedback message={success} type="success" />

        {/* RENTER SECTION: MY RENTALS & CONTRACTS SENT BY MODERATOR FOR SIGNING */}
        <section
          className="settings-card"
          id="my-rentals"
          style={{ marginBottom: "24px", border: contractsWaitingMySignature.length > 0 ? "1px solid rgba(249, 115, 22, 0.55)" : undefined }}
        >
          <div className="settings-heading" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div className="settings-icon">📜</div>
              <div>
                <h2>Đơn thuê thiết bị & Hợp đồng chờ Người thuê ký tên</h2>
                <p>
                  Quy trình: <strong>1. Bạn gửi YC cho Quản lý web</strong> ➔{" "}
                  <strong>2. Quản lý web gửi Owner duyệt</strong> ➔{" "}
                  <strong>3. Owner lập HĐ gửi Quản lý web duyệt</strong> ➔{" "}
                  <strong>4. Quản lý web gửi cho bạn ký tên</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="button button-quiet"
              style={{ width: "auto", minHeight: "36px", padding: "0 14px", fontSize: "0.82rem" }}
              onClick={loadRentalsAndNotifications}
            >
              Làm mới ⟳
            </button>
          </div>

          {/* Contracts sent to Renter */}
          {myContracts.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1rem", color: "#fb923c", margin: "0 0 12px" }}>
                ✍️ Hợp đồng thuê gửi từ Quản lý web ({myContracts.length})
              </h3>
              <div style={{ display: "grid", gap: "12px" }}>
                {myContracts.map((c) => {
                  const isWaitingSign = c.status === "moderator_approved";
                  const isSigned = c.renter_signature?.signed || ["signed", "active", "completed"].includes(c.status);
                  return (
                    <div
                      key={c._id}
                      style={{
                        padding: "16px 18px",
                        borderRadius: "14px",
                        background: isWaitingSign ? "rgba(249, 115, 22, 0.1)" : "#0f1623",
                        border: isWaitingSign
                          ? "1px solid rgba(249, 115, 22, 0.45)"
                          : "1px solid #253047",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "14px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span className="contract-code-tag">{c.contract_code}</span>
                          <strong style={{ color: "#fff", fontSize: "1rem" }}>{c.title}</strong>
                          <span className={`status-badge status-${c.status}`}>
                            {isWaitingSign
                              ? "🔔 Quản lý web đã duyệt & gửi — Chờ bạn ký tên!"
                              : isSigned
                              ? "✅ Bạn đã ký tên hoàn tất"
                              : c.status === "pending_approval"
                              ? "⏳ Owner đã lập HĐ — Chờ Quản lý web duyệt"
                              : c.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.84rem", color: "#94a0b2", marginTop: "6px" }}>
                          Thiết bị: <strong style={{ color: "#e2e8f0" }}>{c.equipment_id?.title}</strong> • Thời gian:{" "}
                          {new Date(c.start_date).toLocaleDateString("vi-VN")} ➔{" "}
                          {new Date(c.end_date).toLocaleDateString("vi-VN")} • Tiền thuê:{" "}
                          <strong style={{ color: "#10b981" }}>{c.rental_price.toLocaleString("vi-VN")} đ</strong> (Cọc:{" "}
                          {c.deposit_amount.toLocaleString("vi-VN")} đ)
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        {isWaitingSign ? (
                          <button
                            type="button"
                            className="button button-primary"
                            style={{ width: "auto", minHeight: "40px", padding: "0 18px", fontSize: "0.86rem" }}
                            onClick={() => setViewingContract(c)}
                          >
                            ✍️ Xem & Ký tên Hợp đồng ngay
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="button button-secondary"
                            style={{ width: "auto", minHeight: "38px", padding: "0 14px", fontSize: "0.82rem" }}
                            onClick={() => setViewingContract(c)}
                          >
                            👁️ Xem hợp đồng
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rental Requests sent by Renter */}
          <div>
            <h3 style={{ fontSize: "0.95rem", color: "#cbd5e1", margin: "0 0 10px" }}>
              📬 Yêu cầu thuê đã gửi của bạn ({myRequests.length})
            </h3>
            {myRequests.length === 0 ? (
              <p className="notification-empty">
                Bạn chưa gửi yêu cầu thuê nào. Hãy vào{" "}
                <Link to="/equipments" style={{ color: "#fb923c", fontWeight: 600 }}>
                  Chợ thiết bị
                </Link>{" "}
                để chọn thiết bị và bấm gửi yêu cầu thuê.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {myRequests.map((r) => (
                  <div
                    key={r._id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "#0f1623",
                      border: "1px solid #253047",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <strong style={{ color: "#fb923c" }}>{r.request_code}</strong>
                        <span style={{ color: "#fff", fontWeight: 600 }}>
                          {r.equipment_id?.title || "Thiết bị"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#94a0b2", marginTop: "4px" }}>
                        {new Date(r.start_date).toLocaleDateString("vi-VN")} ➔{" "}
                        {new Date(r.end_date).toLocaleDateString("vi-VN")} • Tiền thuê:{" "}
                        <strong style={{ color: "#10b981" }}>{r.rental_fee.toLocaleString("vi-VN")} đ</strong>
                      </div>
                    </div>

                    <span className={`status-badge status-${r.status}`}>
                      {r.status === "pending_moderator"
                        ? "⏳ Bước 1: Đã gửi Quản lý web (Chờ chuyển cho Owner)"
                        : r.status === "pending"
                        ? "📤 Bước 2: Quản lý web đã gửi cho Owner (Chờ Owner duyệt)"
                        : r.status === "approved"
                        ? "✅ Bước 3: Owner đã duyệt (Đang lập Hợp đồng gửi Quản lý web)"
                        : r.status === "contract_created"
                        ? "📜 Đã có Hợp đồng (Xem mục Hợp đồng phía trên)"
                        : r.status === "moderator_rejected"
                        ? "❌ Quản lý web từ chối"
                        : r.status === "rejected"
                        ? "❌ Owner từ chối"
                        : r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="settings-card notification-panel" id="notifications">
          <div className="settings-heading">
            <div className="settings-icon">✉</div>
            <div>
              <h2>Thông báo hệ thống & Kiểm duyệt</h2>
              <p>Cập nhật về kiểm duyệt hợp đồng, biên bản bàn giao và yêu cầu thiết bị.</p>
            </div>
          </div>
          <Feedback message={notificationError} />
          {notifications.length === 0 && !notificationError && (
            <p className="notification-empty">Bạn chưa có thông báo mới.</p>
          )}
          <div className="notification-list">
            {notifications.map((notification) => (
              <article
                className={`notification-item ${notification.read_at ? "" : "unread"}`}
                key={notification._id}
              >
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <time>{new Date(notification.createdAt).toLocaleString("vi-VN")}</time>
                </div>
                {!notification.read_at && (
                  <button
                    className="button button-quiet"
                    style={{ width: "auto", minHeight: "36px", padding: "0 14px", fontSize: "0.8rem" }}
                    disabled={markingNotificationId === notification._id}
                    onClick={() => {
                      setMarkingNotificationId(notification._id);
                      void authApi
                        .markNotificationRead(token, notification._id)
                        .then(({ notification: updated }) => {
                          setNotifications((current) =>
                            current.map((item) => (item._id === updated._id ? updated : item))
                          );
                          setNotificationError("");
                        })
                        .catch((requestError: unknown) =>
                          setNotificationError(
                            requestError instanceof Error
                              ? requestError.message
                              : "Không thể đánh dấu thông báo đã đọc."
                          )
                        )
                        .finally(() => setMarkingNotificationId(""));
                    }}
                  >
                    {markingNotificationId === notification._id ? "Đang lưu..." : "Đánh dấu đã đọc"}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <div className="profile-grid">
          <section className="settings-card">
            <div className="settings-heading">
              <div className="settings-icon">✳</div>
              <div>
                <h2>Thông tin cá nhân</h2>
                <p>Cập nhật tên hiển thị của bạn.</p>
              </div>
            </div>
            <form className="auth-form" onSubmit={handleUpdateProfile}>
              <div className="field">
                <label htmlFor="profile-name">Họ và tên</label>
                <input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="profile-email">Địa chỉ email</label>
                <input id="profile-email" value={user.email} disabled />
              </div>
              <div className="account-meta">
                <span>Mã tài khoản</span>
                <code>{user.User_Id}</code>
              </div>
              <button className="button button-primary" disabled={isSavingProfile}>
                {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          </section>

          <section className="settings-card">
            <div className="settings-heading">
              <div className="settings-icon settings-icon-lock">⌑</div>
              <div>
                <h2>Bảo mật</h2>
                <p>Đổi mật khẩu để bảo vệ tài khoản.</p>
              </div>
            </div>
            <form className="auth-form" onSubmit={handleChangePassword}>
              <PasswordInput
                label="Mật khẩu hiện tại"
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
              <PasswordInput
                label="Mật khẩu mới"
                name="newPassword"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              <button className="button button-secondary" disabled={isChangingPassword}>
                {isChangingPassword ? "Đang cập nhật..." : "Đổi mật khẩu"}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* MODAL FOR RENTER TO VIEW & SIGN CONTRACT */}
      {viewingContract && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "780px" }}>
            <div className="owner-modal-header">
              <h3>
                📜 Hợp đồng thuê thiết bị {viewingContract.contract_code} (v{viewingContract.version})
              </h3>
              <button className="close-modal-btn" onClick={() => setViewingContract(null)}>
                ✕
              </button>
            </div>

            <div
              style={{
                background: "#0b101b",
                padding: "18px",
                borderRadius: "10px",
                maxHeight: "340px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: "0.84rem",
                color: "#e2e8f0",
                lineHeight: 1.6,
                border: "1px solid var(--border)",
              }}
            >
              {viewingContract.terms_content}
            </div>

            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                background: "#131c2e",
                borderRadius: "10px",
                border: "1px solid var(--border)",
              }}
            >
              {viewingContract.renter_signature?.signed || viewingContract.status === "signed" ? (
                <div style={{ color: "#10b981", fontWeight: 700 }}>
                  ✅ Bạn đã ký tên xác nhận Hợp đồng này
                  {viewingContract.renter_signature?.signed_at &&
                    ` vào lúc ${new Date(viewingContract.renter_signature.signed_at).toLocaleString("vi-VN")}`}
                  .
                </div>
              ) : viewingContract.status === "moderator_approved" ? (
                <div>
                  <div style={{ fontWeight: 700, color: "#10b981", marginBottom: "8px" }}>
                    ✅ Hợp đồng đã được Owner lập và Quản lý web phê duyệt gửi tới bạn!
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label className="field-label">Xác nhận chữ ký số của Người thuê (Bên B) *</label>
                    <input
                      className="input-field"
                      type="text"
                      value={renterSignatureNote}
                      onChange={(e) => setRenterSignatureNote(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ width: "auto", background: "#10b981", color: "#fff" }}
                    disabled={isSigningContract}
                    onClick={() => void handleSignContract(viewingContract)}
                  >
                    {isSigningContract
                      ? "Đang thực hiện ký tên..."
                      : `✍️ Ký tên xác nhận Hợp đồng (${user.name})`}
                  </button>
                </div>
              ) : (
                <div style={{ color: "#7dd3fc", fontSize: "0.88rem" }}>
                  ⏳ Hợp đồng đang chờ Quản lý web kiểm duyệt trước khi gửi cho bạn ký tên.
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-quiet"
                style={{ width: "auto" }}
                onClick={() => setViewingContract(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
