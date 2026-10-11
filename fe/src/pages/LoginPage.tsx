import { useCallback, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Brand from "../components/Brand";
import Feedback from "../components/Feedback";
import GoogleSignInButton from "../components/GoogleSignInButton";
import PasswordInput from "../components/PasswordInput";
import { authApi } from "../services/authApi";

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError("");
      const result = await authApi.googleLogin(credential);
      signIn(result.token, result.user, rememberMe);
    },
    [rememberMe, signIn],
  );
  const showGoogleError = useCallback((message: string) => setError(message), []);

  if (user) {
    const isAdmin = (user.role || "").toLowerCase() === "systemadmin";
    return <Navigate to={isAdmin ? "/admin" : "/profile"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await authApi.login({ email, password });
      signIn(result.token, result.user, rememberMe);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Đăng nhập thất bại. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="desktop-brand">
        <Brand compact />
      </div>
      <div className="form-heading">
        <span className="form-kicker">CHÀO MỪNG BẠN TRỞ LẠI</span>
        <h2>Đăng nhập</h2>
        <p>Đăng nhập để tiếp tục hành trình cùng cộng đồng.</p>
      </div>

      <Feedback message={error} />
      <form className="auth-form" onSubmit={handleSubmit}>
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
        <PasswordInput
          label="Mật khẩu"
          name="password"
          autoComplete="current-password"
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <div className="form-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>
        <button className="button button-primary" disabled={isSubmitting}>
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <div className="separator"><span>hoặc tiếp tục với</span></div>
      <GoogleSignInButton
        onCredential={handleGoogleCredential}
        onError={showGoogleError}
      />
      <p className="switch-auth">
        Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
      </p>
    </div>
  );
}
