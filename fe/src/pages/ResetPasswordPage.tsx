import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Brand from "../components/Brand";
import Feedback from "../components/Feedback";
import PasswordInput from "../components/PasswordInput";
import { authApi } from "../services/authApi";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const emailFromLink = searchParams.get("email") || "";
  const resetToken = searchParams.get("token") || "";
  const [email, setEmail] = useState(emailFromLink);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!resetToken) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ hoặc bị thiếu token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await authApi.resetPassword({
        email,
        token: resetToken,
        newPassword: password,
      });
      setSuccess(result.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-card auth-card-small">
      <div className="desktop-brand"><Brand compact /></div>
      <div className="form-heading">
        <span className="form-kicker">BẢO MẬT TÀI KHOẢN</span>
        <h2>Đặt mật khẩu mới</h2>
        <p>Chọn mật khẩu mới có ít nhất 8 ký tự.</p>
      </div>
      <Feedback message={error} />
      <Feedback message={success} type="success" />
      {success ? (
        <Link className="button button-primary button-link" to="/login">
          Đến trang đăng nhập <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Địa chỉ email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <PasswordInput
            label="Mật khẩu mới"
            name="newPassword"
            autoComplete="new-password"
            minLength={8}
            placeholder="Ít nhất 8 ký tự"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <PasswordInput
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <button className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>
      )}
    </div>
  );
}
