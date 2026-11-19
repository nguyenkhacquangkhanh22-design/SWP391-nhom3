import React, { useState } from "react";
import { useAuth } from "../../app/AuthProvider";
import { smartEquipApi } from "../../services/smartEquipApi";

export default function AdminProfileTab() {
  const { user, token, saveUser, changePassword } = useAuth();

  // Profile edit form state
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProfileSuccess("");
    setProfileError("");

    if (!name.trim()) {
      setProfileError("Họ và tên không được để trống.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await smartEquipApi.updateUserProfile(token, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      if (res.user) {
        saveUser(res.user);
      }
      setProfileSuccess("Cập nhật thông tin hồ sơ Quản trị viên thành công!");
    } catch (err: any) {
      setProfileError(
        err.response?.data?.message ||
          (err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại.")
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không trùng khớp với mật khẩu mới.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess("Đổi mật khẩu tài khoản Quản trị viên thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.message ||
          (err instanceof Error ? err.message : "Đổi mật khẩu thất bại.")
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" style={{ marginTop: "20px" }}>
      {/* Top Banner / Summary */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#141d2d] via-[#1a2333] to-[#1e1b4b] border border-purple-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg border border-purple-400/40">
            {(user?.name || "A").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user?.name || "Quản trị viên"}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ⭐ SYSTEM ADMIN (ROOT)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>📧 {user?.email}</span>
              <span>•</span>
              <span className="font-mono text-amber-300">ID: {user?.User_Id || "SYS-ADMIN"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#0f1725] border border-slate-700/60 text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Trạng thái</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Đang hoạt động
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#0f1725] border border-slate-700/60 text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Điểm uy tín</span>
            <span className="text-xs font-bold text-amber-400 font-mono">
              ⭐ {user?.trust_score ?? 100} / 100
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Profile update & Password change */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Cập nhật thông tin hồ sơ */}
        <section className="p-6 rounded-2xl bg-[#141d2d] border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>👤</span> Thông Tin Hồ Sơ Cá Nhân
            </h3>
            <span className="text-xs text-purple-400 font-semibold">Chỉnh sửa hồ sơ</span>
          </div>

          {profileSuccess && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-medium animate-fadeIn">
              ✅ {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium animate-fadeIn">
              ⚠️ {profileError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Họ và tên Quản trị viên *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Địa chỉ Email đăng nhập (Cố định)
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1725] border border-slate-800 text-slate-400 cursor-not-allowed font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Email System Admin được bảo vệ bởi giao thức phân quyền nội bộ.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Số điện thoại liên lạc
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Địa chỉ công tác / Trụ sở
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nhập địa chỉ làm việc hoặc địa chỉ công ty..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>💾</span>
                <span>{isSavingProfile ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Form 2: Đổi mật khẩu tài khoản Admin */}
        <section className="p-6 rounded-2xl bg-[#141d2d] border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🔒</span> Bảo Mật & Đổi Mật Khẩu
            </h3>
            <span className="text-xs text-amber-400 font-semibold">Bảo mật cấp cao</span>
          </div>

          {passwordSuccess && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-medium animate-fadeIn">
              ✅ {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium animate-fadeIn">
              ⚠️ {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Mật khẩu hiện tại *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-amber-500 transition-all font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Mật khẩu mới (Tối thiểu 6 ký tự) *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-amber-500 transition-all font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Xác nhận mật khẩu mới *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-amber-500 transition-all font-mono"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-[#0f1725] border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Quy định bảo mật System Admin:</span>
              <p>• Mật khẩu nên chứa cả chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
              <p>• Không chia sẻ tài khoản quản trị cho nhân sự không có thẩm quyền.</p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>🔑</span>
                <span>{isChangingPassword ? "Đang xử lý..." : "Cập Nhật Mật Khẩu"}</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Permissions and Role Capabilities Card */}
      <section className="p-6 rounded-2xl bg-[#141d2d] border border-slate-800 shadow-lg space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>🛡️</span> Đặc Quyền Quản Trị Hệ Thống (System Admin Permissions)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0f1725] border border-slate-800 flex items-center gap-2.5">
            <span className="text-emerald-400 text-base">✓</span>
            <div>
              <div className="font-bold text-white">Quản trị Người dùng</div>
              <div className="text-[11px] text-slate-400">Phân quyền, khóa/mở khóa tài khoản</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0f1725] border border-slate-800 flex items-center gap-2.5">
            <span className="text-emerald-400 text-base">✓</span>
            <div>
              <div className="font-bold text-white">Quản lý Tài chính & Ví</div>
              <div className="text-[11px] text-slate-400">Duyệt ngân hàng & Lệnh rút tiền QR</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0f1725] border border-slate-800 flex items-center gap-2.5">
            <span className="text-emerald-400 text-base">✓</span>
            <div>
              <div className="font-bold text-white">Phê duyệt Thiết bị</div>
              <div className="text-[11px] text-slate-400">Duyệt đăng máy, kiểm soát tồn kho</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0f1725] border border-slate-800 flex items-center gap-2.5">
            <span className="text-emerald-400 text-base">✓</span>
            <div>
              <div className="font-bold text-white">Bảo dưỡng Phòng sạch ISO 5</div>
              <div className="text-[11px] text-slate-400">Điều phối Kanban, cấp chứng thư QR</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0f1725] border border-slate-800 flex items-center gap-2.5">
            <span className="text-emerald-400 text-base">✓</span>
            <div>
              <div className="font-bold text-white">Phân xử Tranh chấp</div>
              <div className="text-[11px] text-slate-400">Khấu trừ cọc, giải quyết khiếu nại</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0f1725] border border-slate-800 flex items-center gap-2.5">
            <span className="text-emerald-400 text-base">✓</span>
            <div>
              <div className="font-bold text-white">Audit Logs & Giám sát Rủi ro</div>
              <div className="text-[11px] text-slate-400">Truy vết toàn bộ nhật ký hệ thống</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
