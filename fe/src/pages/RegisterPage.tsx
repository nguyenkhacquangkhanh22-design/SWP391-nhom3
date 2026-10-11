import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Brand from "../components/Brand";
import Feedback from "../components/Feedback";
import PasswordInput from "../components/PasswordInput";
import { authApi } from "../services/authApi";

type RegistrationStep = "email" | "otp" | "details";

export default function RegisterPage() {
  const { user, signIn } = useAuth();
  const [step, setStep] = useState<RegistrationStep>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/profile" replace />;

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
      setNotice("Email đã được xác minh. Hãy hoàn tất thông tin tài khoản.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Mã xác minh không hợp lệ. Vui lòng thử lại.",
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
          : "Không thể gửi lại mã. Vui lòng thử lại sau.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeEmail() {
    setStep("email");
    setOtp("");
    setVerificationToken("");
    setError("");
    setNotice("");
  }

  return (
    <div className="auth-card">
      <div className="desktop-brand"><Brand compact /></div>
      <div className="form-heading">
        <span className="form-kicker">
          {step === "email"
            ? "BẮT ĐẦU HÀNH TRÌNH"
            : step === "otp"
              ? "XÁC MINH EMAIL"
              : "HOÀN TẤT ĐĂNG KÝ"}
        </span>
        <h2>
          {step === "email"
            ? "Tạo tài khoản"
            : step === "otp"
              ? "Nhập mã xác minh"
              : "Thông tin của bạn"}
        </h2>
        <p>
          {step === "email"
            ? "Nhập email để nhận mã xác minh trước khi tạo tài khoản."
            : step === "otp"
              ? `Mã xác minh gồm 6 chữ số đã được gửi tới ${email}. Mã có hiệu lực trong 10 phút.`
              : "Email đã xác minh. Hoàn tất tên và mật khẩu để tham gia cộng đồng."}
        </p>
      </div>

      <div className="registration-progress" aria-label={`Bước ${step === "email" ? 1 : step === "otp" ? 2 : 3} trên 3`}>
        {(["email", "otp", "details"] as const).map((item, index) => (
          <span
            key={item}
            className={`progress-step${step === item ? " is-current" : ""}${(["email", "otp", "details"].indexOf(step) > index) ? " is-complete" : ""}`}
          />
        ))}
      </div>

      <Feedback message={error} />
      <Feedback message={notice} type="success" />

      {step === "email" && (
        <form className="auth-form" onSubmit={handleSendOtp}>
          <div className="field">
            <label htmlFor="email">Địa chỉ email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ban@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <button className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? "Đang gửi mã..." : "Gửi mã xác minh"}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form className="auth-form" onSubmit={handleVerifyOtp}>
          <div className="field">
            <label htmlFor="otp">Mã OTP</label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="Nhập mã 6 chữ số"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </div>
          <button className="button button-primary" disabled={isSubmitting || otp.length !== 6}>
            {isSubmitting ? "Đang xác minh..." : "Xác minh email"}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
          <div className="otp-actions">
            <button className="text-button" type="button" onClick={changeEmail}>
              Đổi email
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={isSubmitting}
            >
              Gửi lại mã
            </button>
          </div>
        </form>
      )}

      {step === "details" && (
        <form className="auth-form" onSubmit={handleCreateAccount}>
          <div className="field">
            <label htmlFor="verified-email">Email đã xác minh</label>
            <input id="verified-email" type="email" value={email} disabled />
          </div>
          <div className="field">
            <label htmlFor="name">Họ và tên</label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Nguyễn Văn An"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <PasswordInput
            label="Mật khẩu"
            name="password"
            autoComplete="new-password"
            placeholder="Ít nhất 8 ký tự"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="button button-primary" disabled={isSubmitting || !verificationToken}>
            {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>
      )}

      <p className="switch-auth">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </div>
  );
}
