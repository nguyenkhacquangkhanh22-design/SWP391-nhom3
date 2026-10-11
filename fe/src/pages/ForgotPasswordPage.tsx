import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import Feedback from "../components/Feedback";
import { authApi } from "../services/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const result = await authApi.forgotPassword(email);
      setSuccess(result.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi yêu cầu. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-card auth-card-small">
      <div className="desktop-brand"><Brand compact /></div>
      <Link className="back-link" to="/login">← Quay lại đăng nhập</Link>
      <div className="form-heading">
        <span className="form-kicker">KHÔI PHỤC TÀI KHOẢN</span>
        <h2>Quên mật khẩu?</h2>
        <p>Nhập email đăng ký. Nếu tài khoản tồn tại, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>
      </div>
      <Feedback message={error} />
      <Feedback message={success} type="success" />
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Địa chỉ email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ban@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <button className="button button-primary" disabled={isSubmitting}>
          {isSubmitting ? "Đang gửi..." : "Gửi liên kết đặt lại"}
          {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
      </form>
    </div>
  );
}
