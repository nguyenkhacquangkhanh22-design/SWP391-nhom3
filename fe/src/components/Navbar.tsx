import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-[#121927]/90 backdrop-blur-md border-b border-[#243048]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-orange-400 transition-colors">
              Smart<span className="text-orange-500">Equip</span>
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/"
            className="text-slate-300 hover:text-white transition-colors"
          >
            Trang chủ
          </Link>
          <Link
            to="/equipment"
            className="text-slate-300 hover:text-orange-400 transition-colors"
          >
            Tìm thiết bị
          </Link>
          {user && (
            <Link
              to="/rentals/history"
              className="text-slate-300 hover:text-orange-400 transition-colors"
            >
              Lịch sử thuê
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm text-slate-200 hover:text-white bg-[#1a2336] px-3 py-1.5 rounded-lg border border-[#2b3752] hover:border-orange-500/50 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <span className="hidden sm:inline font-medium">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors px-2 py-1"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 px-4 py-1.5 rounded-lg shadow-md shadow-orange-600/20 transition-all font-semibold"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
