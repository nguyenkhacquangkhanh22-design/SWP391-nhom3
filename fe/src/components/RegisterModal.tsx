import { useState, type FormEvent } from "react";
import Brand from "./Brand";
import Feedback from "./Feedback";
import PasswordInput from "./PasswordInput";
import { authApi } from "../services/authApi";
import { useAuth } from "../app/AuthProvider";

type RegistrationStep = "email" | "otp" | "details";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSuccess }: RegisterModalProps) {
  const { signIn } = useAuth();
  const [step, setStep] = useState<RegistrationStep>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  function resetForm() {
    setStep("email");
    setName("");
    setEmail("");
    setOtp("");
    setVerificationToken("");
    setPassword("");
    setError("");
    setNotice("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const result = await authApi.sendRegistrationOtp(email);
      setStep("otp");
      setNotice(result.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi mã xác minh. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const result = await authApi.verifyRegistrationOtp(email, otp);
      setVerificationToken(result.verificationToken);
      setStep("details");
      setNotice("Email đã được xác minh thành công. Hãy hoàn tất thông tin tài khoản.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Mã xác minh không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const result = await authApi.register({
        name,
        email,
        password,
        verificationToken,
      });
      signIn(result.token, result.user);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Tạo tài khoản thất bại. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const result = await authApi.sendRegistrationOtp(email);
      setOtp("");
      setNotice(result.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi lại mã OTP.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <Brand />
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stepper indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span className={step === "email" ? "text-indigo-600 font-bold" : "text-slate-600"}>1. Nhập Email</span>
            <span>→</span>
            <span className={step === "otp" ? "text-indigo-600 font-bold" : "text-slate-600"}>2. Xác thực OTP</span>
            <span>→</span>
            <span className={step === "details" ? "text-indigo-600 font-bold" : "text-slate-600"}>3. Tạo mật khẩu</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{
                width: step === "email" ? "33.3%" : step === "otp" ? "66.6%" : "100%",
              }}
            />
          </div>
        </div>

        {/* Body content */}
        <div className="p-6">
          <Feedback type="error" message={error} />
          <Feedback type="success" message={notice} />

          {/* BƯỚC 1: Nhập email gửi OTP */}
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Chúng tôi sẽ gửi mã xác thực 6 chữ số đến email này.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {isSubmitting ? "Đang gửi mã..." : "Gửi mã xác thực OTP"}
              </button>
            </form>
          )}

          {/* BƯỚC 2: Nhập mã OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Mã OTP 6 số
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  placeholder="123456"
                  required
                  className="w-full px-4 py-2.5 text-center text-xl tracking-widest font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
                <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                  <span>Gửi tới: <b className="text-slate-700">{email}</b></span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSubmitting}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Gửi lại mã
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                >
                  Đổi email
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || otp.length < 6}
                  className="flex-[2] py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors text-sm shadow-sm"
                >
                  {isSubmitting ? "Đang xác nhận..." : "Xác nhận OTP"}
                </button>
              </div>
            </form>
          )}

          {/* BƯỚC 3: Điền tên & mật khẩu để tạo tài khoản */}
          {step === "details" && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm transition-all"
                />
              </div>

              <div>
                <PasswordInput
                  label="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !name || password.length < 6}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {isSubmitting ? "Đang hoàn tất..." : "Hoàn tất đăng ký"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
