import { useEffect, useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Navbar from "../components/Navbar";
import Feedback from "../components/Feedback";
import PasswordInput from "../components/PasswordInput";
import { smartEquipApi } from "../services/smartEquipApi";
import { authApi } from "../services/authApi";
import type { UserNotification } from "../types/auth";

export default function ProfilePage() {
  const { user, token, isLoading, saveUser, changePassword, signOut } = useAuth();

  // Profile fields (UC_R02)
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // KYC fields (UC_R03)
  const [idNumber, setIdNumber] = useState(user?.kycDocument?.idNumber || "");
  const [idCardFront, setIdCardFront] = useState("");
  const [idCardBack, setIdCardBack] = useState("");
  const [selfiePhoto, setSelfiePhoto] = useState("");
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

  // Notifications (UC_RM)
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const [markingNotificationId, setMarkingNotificationId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi
      .getNotifications(token)
      .then(({ notifications: items }) => setNotifications(items))
      .catch((requestError: unknown) => {
        setNotificationError(
          requestError instanceof Error ? requestError.message : "Không thể tải thông báo."
        );
      });
  }, [token]);

  if (isLoading) return <div className="app-loading">Đang tải tài khoản...</div>;
  if (!user || !token) return <Navigate to="/login" replace />;

  const accessToken = token;

  // Cập nhật Profile (UC_R02)
  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSavingProfile(true);
    try {
      const result = await smartEquipApi.updateUserProfile(accessToken, {
        name,
        phone,
        address,
      });
      saveUser(result.user);
      setSuccess("Thông tin hồ sơ đã được cập nhật.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật hồ sơ."
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Đổi mật khẩu
  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setSuccess("Mật khẩu đã đổi thành công.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể đổi mật khẩu."
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  // Nộp hồ sơ KYC (UC_R03)
  async function handleSubmitKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!idNumber.trim()) {
      setError("Vui lòng nhập số CMND/CCCD.");
      return;
    }
    if (!idCardFront.trim() || !idCardBack.trim()) {
      setError("Vui lòng cung cấp link ảnh mặt trước và mặt sau CMND/CCCD.");
      return;
    }

    setIsSubmittingKyc(true);
    try {
      const result = await smartEquipApi.submitKyc(accessToken, {
        idNumber,
        idCardFront,
        idCardBack,
        selfiePhoto,
      });
      saveUser(result.user);
      setSuccess("Hồ sơ xác thực KYC đã được gửi! Đang chờ quản trị viên phê duyệt.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi hồ sơ xác thực KYC."
      );
    } finally {
      setIsSubmittingKyc(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  }

  const kycStatus = user.kycStatus || "unverified";
  const kycBadge = {
    unverified: { text: "Chưa xác thực", bg: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
    pending: { text: "Đang chờ duyệt", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    verified: { text: "Đã xác thực ✅", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    rejected: { text: "Bị từ chối ❌", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  }[kycStatus];

  const role = (user.role || "").toLowerCase();
  const isAdmin = role === "systemadmin";
  const isOwner = role === "owner";
  const isModerator = role.replace(/[\s_-]/g, "") === "rentalmoderator";

  return (
    <div className="min-h-screen bg-[#0f1623] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#222d42]">
          <div>
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">
              HỒ SƠ CÁ NHÂN & ĐỊNH DANH
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1">
              Xin chào, {user.name}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Quản lý thông tin tài khoản, độ tin cậy và hồ sơ xác thực danh tính (KYC)
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/equipments"
              className="px-3.5 py-2 bg-[#1b253b] hover:bg-[#232f48] border border-[#2d3a54] text-slate-200 rounded-xl text-xs font-semibold transition-all"
            >
              Chợ thiết bị 🔍
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all"
              >
                Trang Quản trị ⚙️
              </Link>
            )}

            {isOwner && (
              <Link
                to="/owner"
                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold transition-all"
              >
                Cổng Người cho thuê 💼
              </Link>
            )}

            {isModerator && (
              <Link
                to="/moderator"
                className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all"
              >
                Không gian kiểm duyệt ⚖️
              </Link>
            )}

            {!isOwner && !isAdmin && !isModerator && (
              <Link
                to="/register-owner"
                className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/40 rounded-xl text-xs font-bold transition-all"
              >
                Đăng ký Owner 🚀
              </Link>
            )}

            <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${kycBadge.bg}`}>
              KYC: {kycBadge.text}
            </div>

            <button
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all"
            >
              {isLoggingOut ? "Đang thoát..." : "Đăng xuất"}
            </button>
          </div>
        </div>

        <Feedback message={error} />
        <Feedback message={success} type="success" />

        {/* Notifications Panel (UC_RM) */}
        <div className="bg-[#151e2f] border border-[#243048] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222d42]">
            <div className="flex items-center gap-2">
              <span className="text-lg">✉️</span>
              <div>
                <h2 className="text-base font-bold text-white">Thông báo hệ thống</h2>
                <p className="text-slate-400 text-xs">Cập nhật kiểm duyệt hợp đồng, biên bản giao nhận và thiết bị</p>
              </div>
            </div>
            {notifications.filter((n) => !n.read_at).length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {notifications.filter((n) => !n.read_at).length} chưa đọc
              </span>
            )}
          </div>

          <Feedback message={notificationError} />

          {notifications.length === 0 && !notificationError ? (
            <p className="text-slate-500 text-xs py-2 text-center">Bạn chưa có thông báo mới.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-4 transition-all ${
                    notification.read_at
                      ? "bg-[#101726]/60 border-[#1f293d] text-slate-400"
                      : "bg-[#1a253c] border-orange-500/30 text-slate-200"
                  }`}
                >
                  <div className="space-y-1">
                    <strong className="block text-white text-sm">{notification.title}</strong>
                    <p className="text-slate-300">{notification.message}</p>
                    <time className="text-[11px] text-slate-500">
                      {new Date(notification.createdAt).toLocaleString("vi-VN")}
                    </time>
                  </div>
                  {!notification.read_at && (
                    <button
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
                      className="px-2.5 py-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/40 rounded-lg text-[11px] font-semibold whitespace-nowrap"
                    >
                      {markingNotificationId === notification._id ? "Đang lưu..." : "Đánh dấu đã đọc"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Profile Info & Change Password (UC_R02) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Update Profile Card */}
            <div className="bg-[#151e2f] border border-[#243048] rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👤</span> Thông tin tài khoản
              </h2>

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Email (Cố định)</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full bg-[#141b2b] border border-[#232d42] rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="VD: 0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Địa chỉ giao nhận</label>
                  <input
                    type="text"
                    placeholder="VD: Số 45, Đường 3/2, Quận 10, TP.HCM"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-[#222d42]">
                  <span>Mã tài khoản:</span>
                  <code className="text-orange-400 font-mono">{user.User_Id}</code>
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-orange-600/30"
                >
                  {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi thông tin"}
                </button>
              </form>
            </div>

            {/* Change Password Card */}
            <div className="bg-[#151e2f] border border-[#243048] rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔒</span> Đổi mật khẩu
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                <div>
                  <PasswordInput
                    id="current-password"
                    label="Mật khẩu hiện tại"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <PasswordInput
                    id="new-password"
                    label="Mật khẩu mới (tối thiểu 8 ký tự)"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full py-2.5 bg-[#202b40] hover:bg-[#2a3854] text-slate-200 font-bold rounded-xl text-xs transition-all border border-[#2d3a54]"
                >
                  {isChangingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: KYC Verification (UC_R03) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#151e2f] border border-[#243048] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🪪</span> Xác thực danh tính (KYC)
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${kycBadge.bg}`}>
                  {kycBadge.text}
                </span>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed">
                Người thuê cần hoàn tất xác thực giấy tờ tùy thân CCCD/CMND để tạo độ tin cậy và đủ điều kiện thuê các thiết bị có giá trị cao.
              </p>

              {kycStatus === "verified" ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2">
                    <span>✨</span> Tài khoản của bạn đã được chứng nhận KYC thành công!
                  </div>
                  <p className="text-slate-400">
                    Số định danh: <strong>{user.kycDocument?.idNumber || "Đã lưu"}</strong>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitKyc} className="space-y-4 text-xs pt-2">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">
                      Số CCCD / CMND *
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 079099001234"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      disabled={kycStatus === "pending"}
                      className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">
                      Link ảnh mặt trước CCCD *
                    </label>
                    <input
                      type="url"
                      placeholder="https://.../id_front.jpg"
                      value={idCardFront}
                      onChange={(e) => setIdCardFront(e.target.value)}
                      disabled={kycStatus === "pending"}
                      className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">
                      Link ảnh mặt sau CCCD *
                    </label>
                    <input
                      type="url"
                      placeholder="https://.../id_back.jpg"
                      value={idCardBack}
                      onChange={(e) => setIdCardBack(e.target.value)}
                      disabled={kycStatus === "pending"}
                      className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">
                      Link ảnh chân dung selfie (Tùy chọn)
                    </label>
                    <input
                      type="url"
                      placeholder="https://.../selfie.jpg"
                      value={selfiePhoto}
                      onChange={(e) => setSelfiePhoto(e.target.value)}
                      disabled={kycStatus === "pending"}
                      className="w-full bg-[#1b253b] border border-[#2d3a54] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingKyc || kycStatus === "pending"}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/30"
                  >
                    {isSubmittingKyc
                      ? "Đang gửi hồ sơ..."
                      : kycStatus === "pending"
                      ? "Hồ sơ đang chờ duyệt..."
                      : "Gửi hồ sơ xác thực KYC"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
