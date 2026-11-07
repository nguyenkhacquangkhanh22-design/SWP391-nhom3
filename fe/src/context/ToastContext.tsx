import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../services/socket";
import { useAuth } from "../app/AuthProvider";

export type ToastType =
  | "rental_created"
  | "rental_approved"
  | "payment_submitted"
  | "payment_approved"
  | "success"
  | "error"
  | "warning"
  | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  link?: string;
  rentalCode?: string;
  duration?: number; // ms, default 6500ms
  createdAt: number;
}

export interface ShowToastOptions {
  type?: ToastType;
  title: string;
  message: string;
  link?: string;
  rentalCode?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => string;
  removeToast: (id: string) => void;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global fallback handler for outside React tree if ever needed
let globalShowToast: ((options: ShowToastOptions) => string) | null = null;
export function showAppToast(options: ShowToastOptions): string {
  if (globalShowToast) {
    return globalShowToast(options);
  }
  return "";
}

/**
 * Phát âm thanh thông báo chime tổng hợp qua Web Audio API
 * Tự động tạo chuông ngân êm tai không cần tải file mp3 bên ngoài
 */
function playChime(type: ToastType) {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "rental_approved" || type === "payment_approved" || type === "success") {
      // 3 nốt chuông thành công tươi vui (C5 -> E5 -> G5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.start(now);
      osc.stop(now + 0.65);
    } else if (type === "rental_created" || type === "payment_submitted") {
      // Chuông ping 2 nốt báo đơn mới / chuyển tiền (D5 -> A5)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.12); // A5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === "error") {
      // Âm báo lỗi 2 nốt trầm
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(240, now + 0.14);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Chuông nốt dịu nhẹ
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch {
    // Trình duyệt chặn autoplay khi chưa có tương tác
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ShowToastOptions): string => {
      // Khóa định danh duy nhất để chống nảy thông báo trùng lặp 2 lần
      const dedupeKey = options.rentalCode
        ? `${options.type || "info"}#${options.rentalCode}`
        : `${options.type || "info"}#${options.title}#${options.message}`;

      const now = Date.now();
      const lastShown = recentToastsRef.current.get(dedupeKey) || 0;
      // Nếu cùng 1 thông báo vừa hiển thị trong vòng 6 giây -> Chặn tuyệt đối
      if (now - lastShown < 6000) {
        return "";
      }
      recentToastsRef.current.set(dedupeKey, now);

      const id = `toast-${now}-${Math.random().toString(36).substring(2, 7)}`;
      const duration = options.duration ?? 6500;
      const newToast: ToastItem = {
        id,
        type: options.type || "info",
        title: options.title,
        message: options.message,
        link: options.link,
        rentalCode: options.rentalCode,
        duration,
        createdAt: now,
      };

      setToasts((prev) => {
        // Kiểm tra chặn nếu thông báo tương tự đang hiển thị trên màn hình
        const isAlreadyVisible = prev.some(
          (t) =>
            t.type === newToast.type &&
            ((t.rentalCode && newToast.rentalCode && t.rentalCode === newToast.rentalCode) ||
              (t.title === newToast.title && t.message === newToast.message))
        );
        if (isAlreadyVisible) {
          return prev;
        }
        const updated = [newToast, ...prev];
        return updated.slice(0, 4);
      });

      // Phát âm thanh chuông thông báo
      playChime(newToast.type);

      // Tự động đóng sau khoảng thời gian duration
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  // Thiết lập lắng nghe Realtime Socket.IO
  useEffect(() => {
    const socket = getSocket();
    const userObj = user as unknown as { _id?: string; id?: string };
    const mongoId = String(userObj?._id || userObj?.id || "");
    const userCode = String(user?.User_Id || "");
    const userRole = (user?.role || "").toLowerCase().replace(/[\s_-]/g, "");

    const isOwner =
      userRole === "owner" ||
      userRole === "moderator" ||
      userRole === "rentalmoderator" ||
      userRole === "systemadmin";

    const isCustomer =
      userRole === "user" ||
      userRole === "renter" ||
      userRole === "customer" ||
      (!isOwner && userRole !== "systemadmin");

    // Tham gia phòng của user theo cả MongoDB _id và User_Id
    if (mongoId) {
      socket.emit("join", `user:${mongoId}`);
    }
    if (userCode) {
      socket.emit("join", `user:${userCode}`);
    }
    if (user?.role) {
      socket.emit("join", user.role);
    }
    socket.emit("join", "rentals");

    // 1. Nhận thông báo trực tiếp từ kênh cá nhân `notification:toast`
    const handleNotificationToast = (data: {
      type?: ToastType;
      title?: string;
      message?: string;
      link?: string;
      rentalCode?: string;
      rentalId?: string;
      ownerId?: string;
      renterId?: string;
    }) => {
      // Các loại sự kiện này đã được xử lý bởi kênh chuyên biệt bên dưới, tránh trùng lặp 2 lần
      if (
        data.type === "rental_created" ||
        data.type === "rental_approved" ||
        data.type === "payment_submitted" ||
        data.type === "payment_approved"
      ) {
        return;
      }

      showToast({
        type: data.type || "info",
        title: data.title || "Thông báo SmartEquip",
        message: data.message || "",
        link: data.link,
        rentalCode: data.rentalCode,
      });
    };

    // 2. Khi khách gửi đơn thuê mới -> Báo cho CHỦ MÁY (Owner)
    const handleRentalCreated = (data: {
      ownerId?: string;
      ownerUserCode?: string;
      renterId?: string;
      renterUserCode?: string;
      rentalCode?: string;
      equipmentTitle?: string;
      renterName?: string;
      rentalId?: string;
      title?: string;
      message?: string;
      link?: string;
    }) => {
      // Bỏ qua nếu người tạo là chính mình (Khách thuê đã có thông báo local)
      if (
        (data.renterId && (data.renterId === mongoId || data.renterId === userCode)) ||
        (data.renterUserCode && (data.renterUserCode === mongoId || data.renterUserCode === userCode))
      ) {
        return;
      }

      const isTargetOwner =
        (data.ownerId && (data.ownerId === mongoId || data.ownerId === userCode)) ||
        (data.ownerUserCode && (data.ownerUserCode === mongoId || data.ownerUserCode === userCode)) ||
        isOwner;

      if (isTargetOwner) {
        showToast({
          type: "rental_created",
          title: data.title || "📬 BẠN CÓ ĐƠN THUÊ MỚI!",
          message:
            data.message ||
            `Khách thuê ${data.renterName || "khách hàng"} vừa gửi yêu cầu thuê thiết bị "${
              data.equipmentTitle || "thiết bị"
            }" (Mã: #${data.rentalCode || ""}).`,
          link: data.link || "/owner",
          rentalCode: data.rentalCode,
        });
      }
    };

    // 3. Khi đơn thuê được duyệt -> BÁO CHO BÊN KHÁCH (Renter), KHÔNG báo cho bên Owner
    const handleRentalApproved = (data: {
      renterId?: string;
      renterUserCode?: string;
      ownerId?: string;
      ownerName?: string;
      rentalCode?: string;
      equipmentTitle?: string;
      rentalId?: string;
      title?: string;
      message?: string;
      link?: string;
    }) => {
      // Tuyệt đối không hiện thông báo này cho Owner đã duyệt đơn
      if (
        (data.ownerId && (data.ownerId === mongoId || data.ownerId === userCode)) ||
        (isOwner && !isCustomer)
      ) {
        return;
      }

      const isTargetRenter =
        (data.renterId && (data.renterId === mongoId || data.renterId === userCode)) ||
        (data.renterUserCode && (data.renterUserCode === mongoId || data.renterUserCode === userCode)) ||
        isCustomer;

      if (isTargetRenter) {
        showToast({
          type: "rental_approved",
          title: data.title || "🎉 ĐƠN THUÊ ĐÃ ĐƯỢC DUYỆT!",
          message:
            data.message ||
            `Chủ máy đã duyệt đơn thuê #${data.rentalCode || ""} cho "${
              data.equipmentTitle || "thiết bị"
            }"! Bạn có thể ký hợp đồng & thanh toán ngay.`,
          link: data.link || "/rentals/history",
          rentalCode: data.rentalCode,
        });
      }
    };

    // 4. Khi khách đã chuyển tiền chờ owner duyệt -> Báo cho CHỦ MÁY (Owner)
    const handlePaymentSubmitted = (data: {
      ownerId?: string;
      ownerUserCode?: string;
      renterId?: string;
      renterUserCode?: string;
      rentalCode?: string;
      renterName?: string;
      amount?: number;
      rentalId?: string;
      title?: string;
      message?: string;
      link?: string;
    }) => {
      // Bỏ qua nếu là người vừa gửi chuyển khoản (Khách thuê)
      if (
        (data.renterId && (data.renterId === mongoId || data.renterId === userCode)) ||
        (data.renterUserCode && (data.renterUserCode === mongoId || data.renterUserCode === userCode))
      ) {
        return;
      }

      const isTargetOwner =
        (data.ownerId && (data.ownerId === mongoId || data.ownerId === userCode)) ||
        (data.ownerUserCode && (data.ownerUserCode === mongoId || data.ownerUserCode === userCode)) ||
        isOwner;

      if (isTargetOwner) {
        showToast({
          type: "payment_submitted",
          title: data.title || "💳 KHÁCH ĐÃ CHUYỂN TIỀN!",
          message:
            data.message ||
            `Khách thuê ${data.renterName || ""} đã gửi biên lai chuyển khoản đơn #${
              data.rentalCode || ""
            }. Vui lòng kiểm tra và duyệt tiền!`,
          link: data.link || "/owner",
          rentalCode: data.rentalCode,
        });
      }
    };

    // 5. Khi owner đã duyệt tiền (Đã thanh toán thành công) -> BÁO CHO BÊN KHÁCH (Renter)
    const handlePaymentApproved = (data: {
      renterId?: string;
      renterUserCode?: string;
      ownerId?: string;
      rentalCode?: string;
      equipmentTitle?: string;
      rentalId?: string;
      title?: string;
      message?: string;
      link?: string;
    }) => {
      // Tuyệt đối không hiện thông báo này cho Owner đã duyệt tiền
      if (
        (data.ownerId && (data.ownerId === mongoId || data.ownerId === userCode)) ||
        (isOwner && !isCustomer)
      ) {
        return;
      }

      const isTargetRenter =
        (data.renterId && (data.renterId === mongoId || data.renterId === userCode)) ||
        (data.renterUserCode && (data.renterUserCode === mongoId || data.renterUserCode === userCode)) ||
        isCustomer;

      if (isTargetRenter) {
        showToast({
          type: "payment_approved",
          title: data.title || "✅ THANH TOÁN THÀNH CÔNG!",
          message:
            data.message ||
            `Chủ máy đã xác nhận nhận tiền cho đơn #${data.rentalCode || ""}. Đơn thuê đã hoàn tất thanh toán, sẵn sàng bàn giao!`,
          link: data.link || "/rentals/history",
          rentalCode: data.rentalCode,
        });
      }
    };

    socket.on("notification:toast", handleNotificationToast);
    socket.on("rental:created", handleRentalCreated);
    socket.on("rental:approved", handleRentalApproved);
    socket.on("payment:submitted", handlePaymentSubmitted);
    socket.on("payment:approved", handlePaymentApproved);

    return () => {
      socket.off("notification:toast", handleNotificationToast);
      socket.off("rental:created", handleRentalCreated);
      socket.off("rental:approved", handleRentalApproved);
      socket.off("payment:submitted", handlePaymentSubmitted);
      socket.off("payment:approved", handlePaymentApproved);
    };
  }, [user, showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toasts }}>
      {children}

      {/* Floating Realtime Toast Container ở góc trên cùng bên phải */}
      <div
        className="fixed top-5 right-5 z-[9999999] flex flex-col gap-3.5 max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
            onNavigate={(path) => navigate(path)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Cấu hình giao diện và màu sắc cho từng loại thông báo
function getToastConfig(type: ToastType) {
  switch (type) {
    case "rental_created":
      return {
        bgGradient: "bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800",
        border: "border-blue-400/40 shadow-blue-900/40",
        iconBg: "bg-white/20 text-white",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        accentText: "text-blue-100",
        badge: "ĐƠN THUÊ MỚI",
        barColor: "bg-cyan-300",
      };
    case "rental_approved":
      return {
        bgGradient: "bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800",
        border: "border-emerald-400/40 shadow-emerald-900/40",
        iconBg: "bg-white/20 text-white",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        accentText: "text-emerald-100",
        badge: "ĐÃ PHÊ DUYỆT",
        barColor: "bg-emerald-300",
      };
    case "payment_submitted":
      return {
        bgGradient: "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700",
        border: "border-amber-400/40 shadow-orange-900/40",
        iconBg: "bg-white/20 text-white",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
        accentText: "text-amber-100",
        badge: "CHUYỂN KHOẢN CHỜ DUYỆT",
        barColor: "bg-amber-300",
      };
    case "payment_approved":
      return {
        bgGradient: "bg-gradient-to-r from-green-700 via-emerald-700 to-green-800",
        border: "border-green-400/50 shadow-green-900/50",
        iconBg: "bg-white/20 text-white",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ),
        accentText: "text-green-100",
        badge: "THANH TOÁN THÀNH CÔNG",
        barColor: "bg-emerald-300",
      };
    case "error":
      return {
        // Màu đỏ giống hệt ảnh mẫu của người dùng
        bgGradient: "bg-gradient-to-r from-[#e11d48] via-[#dc2626] to-[#b91c1c]",
        border: "border-red-400/50 shadow-red-900/50",
        iconBg: "bg-white text-red-600",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        accentText: "text-red-100",
        badge: "CẢNH BÁO",
        barColor: "bg-white",
      };
    default:
      return {
        bgGradient: "bg-gradient-to-r from-slate-800 via-slate-850 to-slate-900",
        border: "border-slate-600/50 shadow-black/40",
        iconBg: "bg-blue-500/20 text-blue-400",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        accentText: "text-slate-300",
        badge: "THÔNG BÁO",
        barColor: "bg-blue-400",
      };
  }
}

function ToastCard({
  toast,
  onClose,
  onNavigate,
}: {
  toast: ToastItem;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const config = getToastConfig(toast.type);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const totalDuration = toast.duration || 6500;
    const intervalTime = 50;
    const step = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        return next <= 0 ? 0 : next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [toast.duration]);

  const handleCardClick = () => {
    if (toast.link) {
      onNavigate(toast.link);
      onClose();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border ${config.border} ${config.bgGradient} text-white shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:brightness-105 animate-in slide-in-from-top-3 fade-in duration-300 group ${
        toast.link ? "cursor-pointer" : ""
      }`}
      role="alert"
    >
      <div className="p-4 sm:p-4.5 flex items-start gap-3.5">
        {/* Biểu tượng thông báo */}
        <div
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold shadow-md ${config.iconBg}`}
        >
          {config.icon}
        </div>

        {/* Nội dung chi tiết */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-extrabold text-[13px] sm:text-sm tracking-wide uppercase leading-tight">
              {toast.title}
            </h4>
            {config.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/25 text-white/90 border border-white/10 uppercase tracking-wider">
                {config.badge}
              </span>
            )}
          </div>

          <p className={`text-xs sm:text-[13px] leading-relaxed font-medium line-clamp-3 ${config.accentText}`}>
            {toast.message}
          </p>

          {/* Nút điều hướng nếu có link */}
          {toast.link && (
            <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-white underline decoration-white/50 hover:decoration-white transition-all">
              <span>Xem chi tiết đơn hàng</span>
              <span>➔</span>
            </div>
          )}
        </div>

        {/* Nút đóng góc trên bên phải giống hình mẫu */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="shrink-0 -mr-1 -mt-1 text-white/70 hover:text-white hover:bg-black/20 rounded-lg p-1 text-sm font-bold transition-colors w-7 h-7 flex items-center justify-center"
          title="Đóng thông báo"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      {/* Thanh đếm ngược tiến trình thời gian biến mất dưới đáy */}
      <div className="h-1 w-full bg-black/20 overflow-hidden">
        <div
          className={`h-full ${config.barColor} transition-[width] duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
