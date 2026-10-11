import { Outlet } from "react-router-dom";
import Brand from "../components/Brand";

export default function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <Brand compact />
        <Outlet />
        <p className="auth-legal">© 2026 SMARTEQUIP. All rights reserved.</p>
      </section>
    </main>
  );
}
