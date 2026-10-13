import { useEffect, useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Brand from "../components/Brand";
import Feedback from "../components/Feedback";
import PasswordInput from "../components/PasswordInput";
import { authApi } from "../services/authApi";
import type { UserNotification } from "../types/auth";

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

  useEffect(() => {
    if (!token) return;
    authApi.getNotifications(token)
      .then(({ notifications: items }) => setNotifications(items))
      .catch((requestError: unknown) => {
        setNotificationError(requestError instanceof Error ? requestError.message : "Không thể tải thông báo.");
      });
  }, [token]);

  if (isLoading) return <div className="app-loading">Đang tải tài khoản...</div>;
  if (!user || !token) return <Navigate to="/login" replace />;

  const accessToken = token;

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
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật hồ sơ.");
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
          : "Không thể xác nhận đăng xuất với máy chủ.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="profile-page">
      <header className="profile-header">
        <Brand compact />
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/equipments" className="button button-quiet" style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
            Chợ thiết bị 🔍
          </Link>
          {(user.role || "").toLowerCase() === "systemadmin" && (
            <Link to="/admin" className="button button-secondary" style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
              Trang Quản trị ⚙️
            </Link>
          )}
          {(user.role || "").toLowerCase() === "owner" && (
            <Link to="/owner" className="button button-primary" style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
              Cổng Người cho thuê 💼
            </Link>
          )}
          {(user.role || "").toLowerCase().replace(/[\s_-]/g, "") === "rentalmoderator" && (
            <Link to="/moderator" className="button button-primary" style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
              Không gian kiểm duyệt ⚖️
            </Link>
          )}
          {(user.role || "").toLowerCase() !== "owner" &&
            (user.role || "").toLowerCase() !== "systemadmin" &&
            (user.role || "").toLowerCase().replace(/[\s_-]/g, "") !== "rentalmoderator" && (
            <Link to="/register-owner" className="button button-primary" style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
              Đăng ký Owner 🚀
            </Link>
          )}
          <button
            className="button button-quiet"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>
      <div className="profile-content">
        <div className="profile-intro">
          <span className="form-kicker">TÀI KHOẢN CỦA BẠN</span>
          <h1>Xin chào, {user.name.split(" ")[0]}</h1>
          <p>Quản lý thông tin cá nhân và bảo mật tài khoản.</p>
        </div>
        <Feedback message={error} />
        <Feedback message={success} type="success" />
        <section className="settings-card notification-panel" id="notifications">
          <div className="settings-heading">
            <div className="settings-icon">✉</div>
            <div>
              <h2>Thông báo</h2>
              <p>Cập nhật về kiểm duyệt hợp đồng, biên bản và yêu cầu thiết bị.</p>
            </div>
          </div>
          <Feedback message={notificationError} />
          {notifications.length === 0 && !notificationError && (
            <p className="notification-empty">Bạn chưa có thông báo mới.</p>
          )}
          <div className="notification-list">
            {notifications.map((notification) => (
              <article className={`notification-item ${notification.read_at ? "" : "unread"}`} key={notification._id}>
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <time>{new Date(notification.createdAt).toLocaleString("vi-VN")}</time>
                </div>
                {!notification.read_at && (
                  <button
                    className="button button-quiet"
                    disabled={markingNotificationId === notification._id}
                    onClick={() => {
                      setMarkingNotificationId(notification._id);
                      void authApi.markNotificationRead(token, notification._id)
                        .then(({ notification: updated }) => {
                          setNotifications((current) => current.map((item) => item._id === updated._id ? updated : item));
                          setNotificationError("");
                        })
                        .catch((requestError: unknown) => setNotificationError(
                          requestError instanceof Error ? requestError.message : "Không thể đánh dấu thông báo đã đọc."
                        ))
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
    </main>
  );
}
