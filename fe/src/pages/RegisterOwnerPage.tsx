import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Navbar from "../components/Navbar";
import Brand from "../components/Brand";
import Feedback from "../components/Feedback";
import ImageUploadField, {
  isPdfDocument,
  openDocumentDataUrl,
  processDocumentFile,
} from "../components/ImageUploadField";
import { ownerApi } from "../services/ownerApi";
import type { OwnerApplication } from "../types/owner";

const BANK_OPTIONS = [
  { value: "Vietcombank", label: "Vietcombank (VCB)" },
  { value: "MBBank", label: "MBBank (Ngân hàng Quân đội)" },
  { value: "Techcombank", label: "Techcombank (TCB)" },
  { value: "VPBank", label: "VPBank" },
  { value: "BIDV", label: "BIDV" },
  { value: "VietinBank", label: "VietinBank" },
  { value: "ACB", label: "ACB (Á Châu)" },
  { value: "TPBank", label: "TPBank" },
  { value: "Sacombank", label: "Sacombank" },
  { value: "VIB", label: "VIB (Quốc tế)" },
];

const MAX_CERTIFICATES = 3;

export default function RegisterOwnerPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const certInputRef = useRef<HTMLInputElement | null>(null);

  const [application, setApplication] = useState<OwnerApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string } | null>(null);

  // Form states
  const [phone, setPhone] = useState("");
  const [identityCard, setIdentityCard] = useState("");
  const [address, setAddress] = useState("");
  const [shopName, setShopName] = useState("");
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState(user?.name || "");
  const [idFront, setIdFront] = useState("");
  const [idBack, setIdBack] = useState("");
  const [businessLicense, setBusinessLicense] = useState("");
  const [certificates, setCertificates] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    ownerApi
      .getOwnerRegistrationStatus(token)
      .then((res) => {
        if (res.hasApplication && res.application) {
          const app = res.application;
          setApplication(app);
          setPhone(app.phone || "");
          setIdentityCard(app.identity_card || "");
          setAddress(app.address || "");
          setShopName(app.shop_name || "");
          setBankName(app.bank_name || "Vietcombank");
          setBankAccountNumber(app.bank_account_number || "");
          setBankAccountHolder(app.bank_account_holder || "");
          setIdFront(app.identity_card_front || "");
          setIdBack(app.identity_card_back || "");
          setBusinessLicense(app.business_license || "");
          setCertificates(Array.isArray(app.certificates) ? app.certificates : []);
          setNotes(app.notes || "");
        } else if (user) {
          // Tự động điền sẵn từ thông tin hồ sơ/KYC nếu khách đã khai báo trước đó
          setPhone((prev) => prev || user.phone || "");
          setAddress((prev) => prev || user.address || "");
          setBankAccountHolder((prev) => prev || user.name || "");
          if (user.kycDocument) {
            setIdentityCard((prev) => prev || user.kycDocument?.idNumber || "");
            setIdFront((prev) => prev || user.kycDocument?.idCardFront || "");
            setIdBack((prev) => prev || user.kycDocument?.idCardBack || "");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load registration status:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, user]);

  async function handleCertificatesUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_CERTIFICATES - certificates.length;
    if (remainingSlots <= 0) {
      setError(`Bạn chỉ có thể tải lên tối đa ${MAX_CERTIFICATES} ảnh/tệp chứng chỉ bổ sung.`);
      return;
    }

    setError("");
    setIsUploadingCert(true);
    try {
      const processed: string[] = [];
      for (const file of files.slice(0, remainingSlots)) {
        const result = await processDocumentFile(file, true);
        processed.push(result);
      }
      setCertificates((prev) => [...prev, ...processed].slice(0, MAX_CERTIFICATES));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xử lý tệp chứng chỉ.");
    } finally {
      setIsUploadingCert(false);
      if (certInputRef.current) {
        certInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      navigate("/login");
      return;
    }

    setError("");
    setSuccess("");

    if (!phone.trim() || !identityCard.trim() || !address.trim()) {
      setError("Vui lòng điền đầy đủ Số điện thoại, Số CCCD và Địa chỉ giao dịch.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!bankAccountNumber.trim() || !bankAccountHolder.trim()) {
      setError("Vui lòng điền đầy đủ Số tài khoản và Tên chủ tài khoản ngân hàng.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!idFront.trim() || !idBack.trim()) {
      setError("Vui lòng tải lên đầy đủ Ảnh mặt trước và Ảnh mặt sau CCCD để xác thực danh tính.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ownerApi.submitOwnerRegistration(token, {
        phone: phone.trim(),
        identity_card: identityCard.trim(),
        address: address.trim(),
        shop_name: shopName.trim(),
        bank_name: bankName,
        bank_account_number: bankAccountNumber.trim(),
        bank_account_holder: bankAccountHolder.trim(),
        identity_card_front: idFront,
        identity_card_back: idBack,
        business_license: businessLicense,
        certificates,
        notes: notes.trim(),
      });

      setApplication(res.application);
      setSuccess("Hồ sơ đăng ký đã được gửi thành công! System Admin sẽ kiểm tra và phê duyệt sớm nhất.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi hồ sơ thất bại. Vui lòng thử lại.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-[#0f1623] text-slate-100">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-[#141d2d] border border-[#25334d] rounded-2xl p-8 text-center shadow-2xl space-y-5">
            <div className="flex justify-center">
              <Brand compact />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">
                Đăng ký trở thành Người cho thuê (Owner)
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Để gửi hồ sơ định danh và mở gian hàng cho thuê thiết bị trên SmartEquip, bạn cần đăng nhập vào tài khoản cá nhân trước.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link
                to="/login"
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-600/25"
              >
                Đăng nhập ngay
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 bg-[#1b273d] hover:bg-[#243451] text-slate-200 border border-[#2f4162] font-semibold rounded-xl text-sm transition-all"
              >
                Tạo tài khoản mới
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isAlreadyOwner = (user.role || "").toLowerCase() === "owner";
  const isReadOnly =
    application?.status === "pending" ||
    application?.status === "approved" ||
    isAlreadyOwner;

  // Progress checklist state
  const step1Done = Boolean(phone.trim() && identityCard.trim().length >= 9 && address.trim());
  const step2Done = Boolean(bankName && bankAccountNumber.trim() && bankAccountHolder.trim());
  const step3CccdDone = Boolean(idFront.trim() && idBack.trim());
  const step3DocsDone = Boolean(businessLicense.trim() || certificates.length > 0);
  const completedRequiredCount = [step1Done, step2Done, step3CccdDone].filter(Boolean).length;
  const progressPercent = Math.round((completedRequiredCount / 3) * 100);

  return (
    <div className="min-h-screen bg-[#0f1623] text-slate-100 pb-16">
      <Navbar />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 space-y-6">
        {/* Hero Banner */}
        <section className="bg-gradient-to-br from-[#192338] via-[#152236] to-[#121b2c] border border-[#25334d] rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold tracking-wider uppercase">
                <span>🤝</span> Chương trình Đối tác Cho thuê
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Gia nhập Mạng lưới Người cho thuê (Owner)
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Biến thiết bị công nghệ nhàn rỗi thành thu nhập thụ động bền vững với hợp đồng điện tử chuẩn pháp lý và bảo vệ thanh toán qua ký quỹ.
              </p>
            </div>

            {isAlreadyOwner && (
              <Link
                to="/owner"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-600/25 transition-all"
              >
                <span>💼</span>
                <span>Vào Cổng Owner</span>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1522]/80 border border-[#24324c] text-xs text-slate-300">
              <span>🛡️</span> Bảo vệ ký quỹ Escrow
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1522]/80 border border-[#24324c] text-xs text-slate-300">
              <span>📜</span> Hợp đồng điện tử chuẩn pháp lý
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1522]/80 border border-[#24324c] text-xs text-slate-300">
              <span>💸</span> Giải ngân minh bạch qua ngân hàng
            </span>
          </div>

          {/* Application Status Alert */}
          {application && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                application.status === "approved"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                  : application.status === "pending"
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                  : "bg-rose-500/10 border-rose-500/40 text-rose-200"
              }`}
            >
              <span className="text-2xl shrink-0 leading-none mt-0.5">
                {application.status === "approved"
                  ? "✅"
                  : application.status === "pending"
                  ? "⏳"
                  : "❌"}
              </span>
              <div className="space-y-1 text-sm">
                <div className="font-bold text-white">
                  {application.status === "approved"
                    ? "Hồ sơ của bạn đã được System Admin phê duyệt!"
                    : application.status === "pending"
                    ? "Hồ sơ đang chờ System Admin xét duyệt"
                    : "Hồ sơ đăng ký cần chỉnh sửa / bị từ chối"}
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  {application.status === "approved" &&
                    "Tài khoản của bạn đã có đầy đủ quyền đăng thiết bị, quản lý yêu cầu thuê và lập hợp đồng."}
                  {application.status === "pending" &&
                    "Thông tin và hình ảnh giấy tờ của bạn đã được tiếp nhận. Quản trị viên sẽ kiểm tra và kích hoạt quyền Owner trong thời gian sớm nhất."}
                  {application.status === "rejected" &&
                    `Lý do từ chối: ${application.admin_note || "Chưa đủ thông tin xác thực"}. Bạn có thể cập nhật lại thông tin/ảnh bên dưới và gửi lại.`}
                </p>
              </div>
            </div>
          )}
        </section>

        <Feedback message={error} />
        {success && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm flex items-center gap-2.5">
            <span className="text-lg">🎉</span>
            <span>{success}</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-10 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Đang tải thông tin hồ sơ đăng ký...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Main Form (9 cols) */}
            <form onSubmit={handleSubmit} className="lg:col-span-8 xl:col-span-9 space-y-6">
              {/* Row 1: Section 1 & Section 2 side-by-side on wide screens */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              {/* Section 1: Thông tin định danh & Liên hệ */}
              <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-5 sm:p-6 shadow-lg space-y-5 flex flex-col justify-between">
                <div className="flex items-start gap-3 pb-4 border-b border-[#202d45]">
                  <span className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 font-extrabold text-sm flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Thông tin định danh & Gian hàng
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Thông tin cá nhân phải khớp với giấy tờ tùy thân để đảm bảo tính pháp lý hợp đồng.
                    </p>
                  </div>
                </div>

                {/* Compact Verified Account Summary */}
                <div className="bg-[#0e1522] border border-[#1f2c43] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-orange-400">
                      {(user.name || "U").charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-white font-bold">{user.name}</div>
                      <div className="text-slate-400">{user.email}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] font-medium">
                    🔒 Tài khoản đăng ký
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Số điện thoại liên hệ <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Ví dụ: 0912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isReadOnly}
                      required
                      className="w-full bg-[#0f1623] border border-[#2a3852] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-60 text-sm transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Số CCCD / CMND gắn chip <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="12 chữ số trên CCCD"
                      value={identityCard}
                      onChange={(e) => setIdentityCard(e.target.value.replace(/[^0-9A-Za-z]/g, ""))}
                      disabled={isReadOnly}
                      required
                      className="w-full bg-[#0f1623] border border-[#2a3852] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-60 text-sm font-mono transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Địa chỉ thường trú / Điểm giao dịch bàn giao <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={isReadOnly}
                      required
                      className="w-full bg-[#0f1623] border border-[#2a3852] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-60 text-sm transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Tên gian hàng / Studio <span className="text-slate-500 font-normal">(Tùy chọn)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Sài Gòn Camera Rental, Studio Ánh Sáng Pro..."
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full bg-[#0f1623] border border-[#2a3852] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-60 text-sm transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Tài khoản ngân hàng nhận giải ngân */}
              <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-5 sm:p-6 shadow-lg space-y-5 flex flex-col justify-between">
                <div className="flex items-start gap-3 pb-4 border-b border-[#202d45]">
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold text-sm flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Tài khoản ngân hàng nhận giải ngân
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Doanh thu cho thuê thiết bị sẽ được rút hoặc tự động đối soát về tài khoản chính chủ này.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Ngân hàng thụ hưởng <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full bg-[#0f1623] border border-[#2a3852] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500 disabled:opacity-60 text-sm transition-colors"
                    >
                      {BANK_OPTIONS.map((bank) => (
                        <option key={bank.value} value={bank.value}>
                          {bank.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Số tài khoản ngân hàng <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập chính xác số tài khoản"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value.replace(/\s+/g, ""))}
                      disabled={isReadOnly}
                      required
                      className="w-full bg-[#0f1623] border border-[#2a3852] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-60 text-sm font-mono transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Tên chủ tài khoản ngân hàng <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="NGUYEN VAN A (nên ghi in hoa không dấu, trùng tên CCCD)"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      disabled={isReadOnly}
                      required
                      className="w-full bg-[#0f1623] border border-[#2a3852] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-60 text-sm uppercase transition-colors"
                    />
                  </div>
                </div>
              </div>
              </div>

              {/* Section 3: Tải ảnh CCCD & Giấy phép kinh doanh / Chứng chỉ */}
              <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
                <div className="flex items-start gap-3 pb-4 border-b border-[#202d45]">
                  <span className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 font-extrabold text-sm flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Tải ảnh CCCD & Giấy phép kinh doanh / Chứng chỉ
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bấm trực tiếp vào từng ô để chọn ảnh từ máy tính hoặc điện thoại. Dữ liệu ảnh được bảo mật tuyệt đối.
                    </p>
                  </div>
                </div>

                {/* CCCD Front & Back (Required) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                      🪪 Ảnh Căn cước công dân (CCCD)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Chụp rõ 4 góc, không bị lóa sáng
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUploadField
                      id="owner-cccd-front"
                      label="Ảnh mặt trước CCCD"
                      value={idFront}
                      onChange={setIdFront}
                      required={true}
                      disabled={isReadOnly}
                      placeholder="https://.../cccd-mat-truoc.jpg"
                    />
                    <ImageUploadField
                      id="owner-cccd-back"
                      label="Ảnh mặt sau CCCD"
                      value={idBack}
                      onChange={setIdBack}
                      required={true}
                      disabled={isReadOnly}
                      placeholder="https://.../cccd-mat-sau.jpg"
                    />
                  </div>
                </div>

                {/* Business License & Certificates */}
                <div className="pt-4 border-t border-[#202d45] space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      📜 Giấy phép kinh doanh & Chứng chỉ hành nghề
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300">
                      Khuyên dùng cho Studio / Hộ kinh doanh
                    </span>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    <ImageUploadField
                      id="owner-business-license"
                      label="Ảnh Giấy phép kinh doanh / Giấy đăng ký hộ KD"
                      value={businessLicense}
                      onChange={setBusinessLicense}
                      required={false}
                      acceptPdf={true}
                      disabled={isReadOnly}
                      hint="Ảnh chụp hoặc PDF"
                      placeholder="https://.../giay-phep-kinh-doanh.jpg"
                    />

                    {/* Multi-certificate upload (max 3) */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <span>Ảnh Chứng chỉ kỹ thuật / Tài liệu khác</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            (Tùy chọn • Tối đa {MAX_CERTIFICATES} tệp)
                          </span>
                        </label>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {certificates.length}/{MAX_CERTIFICATES}
                        </span>
                      </div>

                      <input
                        ref={certInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={handleCertificatesUpload}
                        disabled={isReadOnly || isUploadingCert}
                        className="hidden"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {certificates.map((item, idx) => {
                          const isPdf = isPdfDocument(item);
                          return (
                            <div
                              key={idx}
                              className="relative group rounded-xl border border-[#2a3852] bg-[#131b2c] p-2.5 flex items-center gap-2.5"
                            >
                              {isPdf ? (
                                <button
                                  type="button"
                                  onClick={() => openDocumentDataUrl(item)}
                                  className="w-16 h-14 rounded-lg border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-950/50 flex flex-col items-center justify-center shrink-0 cursor-pointer"
                                  title="Mở file PDF"
                                >
                                  <span className="text-lg">📄</span>
                                  <span className="text-[9px] font-bold text-indigo-300">PDF</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setZoomImage({
                                      src: item,
                                      title: `Chứng chỉ / Tài liệu #${idx + 1}`,
                                    })
                                  }
                                  className="w-16 h-14 rounded-lg overflow-hidden border border-[#303f5c] bg-[#0c1322] shrink-0 cursor-zoom-in"
                                  title="Phóng to ảnh"
                                >
                                  <img
                                    src={item}
                                    alt={`Chứng chỉ ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              )}

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="text-[11px] font-semibold text-emerald-400">
                                  ✓ Tài liệu #{idx + 1}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {isPdf ? "Tài liệu PDF" : "Bấm ảnh để xem"}
                                </div>
                              </div>

                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCertificates((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="w-6 h-6 rounded-lg bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[11px] font-bold shrink-0 cursor-pointer"
                                  title="Xóa tài liệu này"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {!isReadOnly && certificates.length < MAX_CERTIFICATES && (
                          <button
                            type="button"
                            onClick={() => certInputRef.current?.click()}
                            disabled={isUploadingCert}
                            className="border-2 border-dashed border-[#2b3a54] hover:border-sky-500/60 bg-[#141d2e] hover:bg-[#182338] rounded-xl py-4 px-3 flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer min-h-[112px] sm:col-span-2"
                          >
                            <span className="text-2xl text-sky-400">
                              {isUploadingCert ? "⏳" : "🏅"}
                            </span>
                            <span className="text-xs font-semibold text-slate-300">
                              {isUploadingCert ? "Đang tải..." : "+ Tải ảnh chứng chỉ / tài liệu"}
                            </span>
                            <span className="text-[11px] text-slate-500">Hỗ trợ JPG, PNG, WEBP hoặc PDF</span>
                          </button>
                        )}
                      </div>

                      {isReadOnly && certificates.length === 0 && (
                        <div className="text-xs text-slate-500 italic bg-[#0e1522] border border-[#1f2c43] rounded-xl px-3.5 py-2.5">
                          Không có tệp chứng chỉ bổ sung nào được đính kèm.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Ghi chú bổ sung cho Quản trị viên <span className="text-slate-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Kinh nghiệm cho thuê thiết bị, danh mục thiết bị dự kiến đăng tải, thời gian hoạt động..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full bg-[#0f1623] border border-[#2a3852] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-60 text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141d2d] border border-[#223049] rounded-2xl p-5 shadow-lg">
                {isReadOnly ? (
                  <>
                    <div className="text-xs text-slate-300 flex items-center gap-2">
                      <span>{application?.status === "approved" || isAlreadyOwner ? "✅" : "⏳"}</span>
                      <span>
                        {application?.status === "approved" || isAlreadyOwner
                          ? "Hồ sơ đã được phê duyệt. Chúc bạn kinh doanh hiệu quả!"
                          : "Hồ sơ đã nộp thành công và đang chờ System Admin xét duyệt."}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      className="px-5 py-2.5 bg-[#1d2940] hover:bg-[#273754] text-white font-semibold rounded-xl text-xs text-center border border-[#314366] transition-colors whitespace-nowrap"
                    >
                      ← Quay lại Trang cá nhân
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-400">
                      Bằng việc gửi hồ sơ, bạn cam kết mọi thông tin và giấy tờ cung cấp là chính xác.
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                      <Link
                        to="/profile"
                        className="px-5 py-2.5 bg-[#1b273d] hover:bg-[#243451] text-slate-200 font-semibold rounded-xl text-sm border border-[#2f4162] transition-colors whitespace-nowrap text-center"
                      >
                        Hủy bỏ
                      </Link>
                      <button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-600/25 transition-all whitespace-nowrap cursor-pointer"
                      >
                        {isSubmitting
                          ? "Đang gửi hồ sơ..."
                          : application?.status === "rejected"
                          ? "Cập nhật & Nộp lại hồ sơ 🚀"
                          : "Gửi hồ sơ đăng ký Owner 🚀"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </form>

            {/* Right Helpful Checklist Sidebar (3 cols) */}
            <aside className="lg:col-span-4 xl:col-span-3 space-y-5 lg:sticky lg:top-24">
              <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📋</span> Tiến độ hoàn thiện hồ sơ
                  </h3>
                  <span className="text-xs font-extrabold text-orange-400">{progressPercent}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-[#0e1522] rounded-full overflow-hidden border border-[#1f2c43]">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <ul className="space-y-3 text-xs pt-1">
                  <li className="flex items-start gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        step1Done
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {step1Done ? "✓" : "1"}
                    </span>
                    <div>
                      <div className={step1Done ? "text-emerald-300 font-semibold" : "text-slate-300 font-semibold"}>
                        Thông tin định danh & Địa chỉ
                      </div>
                      <div className="text-[11px] text-slate-400">Số ĐT, CCCD và điểm bàn giao</div>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        step2Done
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {step2Done ? "✓" : "2"}
                    </span>
                    <div>
                      <div className={step2Done ? "text-emerald-300 font-semibold" : "text-slate-300 font-semibold"}>
                        Tài khoản nhận giải ngân
                      </div>
                      <div className="text-[11px] text-slate-400">Ngân hàng, STK & Chủ tài khoản</div>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        step3CccdDone
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {step3CccdDone ? "✓" : "3"}
                    </span>
                    <div>
                      <div className={step3CccdDone ? "text-emerald-300 font-semibold" : "text-slate-300 font-semibold"}>
                        Ảnh CCCD mặt trước & mặt sau
                      </div>
                      <div className="text-[11px] text-slate-400">Bắt buộc để kích hoạt tài khoản</div>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        step3DocsDone
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}
                    >
                      {step3DocsDone ? "✓" : "+"}
                    </span>
                    <div>
                      <div className={step3DocsDone ? "text-sky-300 font-semibold" : "text-slate-400 font-medium"}>
                        Giấy phép KD / Chứng chỉ
                      </div>
                      <div className="text-[11px] text-slate-500">Tùy chọn • Giúp tăng độ tin cậy</div>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-5 shadow-lg space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>💡</span> Mẹo giúp hồ sơ được duyệt nhanh
                </h3>
                <ul className="space-y-2 text-slate-300 leading-relaxed list-disc pl-4">
                  <li>Chụp ảnh CCCD gốc đủ ánh sáng, rõ cả 4 góc và không bị mờ chữ.</li>
                  <li>Tên chủ tài khoản ngân hàng nên trùng khớp với tên trên CCCD.</li>
                  <li>Nếu bạn là cửa hàng hoặc studio, hãy tải lên ảnh Giấy phép kinh doanh hoặc chứng chỉ liên quan để được ưu tiên xét duyệt.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Modal phóng to ảnh chứng chỉ */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#111827] border border-[#2a3852] rounded-2xl p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#223049]">
              <span className="text-xs font-bold text-slate-200">{zoomImage.title}</span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>
            <img
              src={zoomImage.src}
              alt={zoomImage.title}
              className="w-full max-h-[75vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
