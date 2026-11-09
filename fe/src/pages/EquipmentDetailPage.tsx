import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import Navbar from "../components/Navbar";
import { smartEquipApi } from "../services/smartEquipApi";
import type { Equipment } from "../types/smartequip";

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccessData, setRequestSuccessData] = useState<{ message: string } | null>(null);

  // Form booking state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || "");
  const [renterNote, setRenterNote] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Zoom & Lightbox states (khi nào người dùng bấm vào ảnh mới kích hoạt phóng to)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxPos, setLightboxPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imagesList = equipment?.images && equipment.images.length > 0 ? equipment.images : [];
  const currentImgUrl = imagesList.length > 0 ? imagesList[selectedImageIndex % imagesList.length] : "";

  const handleOpenZoom = () => {
    setIsLightboxOpen(true);
    setLightboxScale(1.6);
    setLightboxPos({ x: 0, y: 0 });
  };

  const handlePrevLightboxImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (imagesList.length === 0) return;
    setSelectedImageIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
    setLightboxScale(1);
    setLightboxPos({ x: 0, y: 0 });
  };

  const handleNextLightboxImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (imagesList.length === 0) return;
    setSelectedImageIndex((prev) => (prev + 1) % imagesList.length);
    setLightboxScale(1);
    setLightboxPos({ x: 0, y: 0 });
  };

  const handleLightboxWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setLightboxScale((prev) => {
      const next = prev + (e.deltaY < 0 ? 0.25 : -0.25);
      const clamped = Math.max(1, Math.min(4.5, Number(next.toFixed(2))));
      if (clamped === 1) setLightboxPos({ x: 0, y: 0 });
      return clamped;
    });
  };

  const handleMouseDownLightbox = (e: React.MouseEvent) => {
    if (lightboxScale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - lightboxPos.x, y: e.clientY - lightboxPos.y });
    }
  };

  const handleMouseMoveLightbox = (e: React.MouseEvent) => {
    if (isDragging && lightboxScale > 1) {
      setLightboxPos({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUpLightbox = () => {
    setIsDragging(false);
  };

  const handleDoubleClickLightbox = () => {
    if (lightboxScale > 1) {
      setLightboxScale(1);
      setLightboxPos({ x: 0, y: 0 });
    } else {
      setLightboxScale(2.5);
    }
  };

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
        setLightboxScale(1);
        setLightboxPos({ x: 0, y: 0 });
      } else if (e.key === "ArrowRight") {
        handleNextLightboxImage();
      } else if (e.key === "ArrowLeft") {
        handlePrevLightboxImage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, imagesList.length]);

  // Modal ký hợp đồng sau khi tạo đơn thành công

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    smartEquipApi
      .getEquipmentById(id)
      .then((res) => setEquipment(res.data))
      .catch((err) => setError(err.message || "Không thể tải chi tiết thiết bị"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.address && !deliveryAddress) {
      setDeliveryAddress(user.address);
    }
  }, [user]);

  // Tính toán số ngày và số tiền tự động
  let totalDays = 0;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end > start) {
      totalDays = Math.ceil(
        Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
  }

  const dailyRate = equipment?.dailyRate || (equipment as any)?.pricing?.price_per_day || 0;

  // Giảm giá thuê dài ngày (>= 7 ngày giảm 10%, >= 30 ngày giảm 20%)
  let discountRate = 0;
  let discountLabel = "";
  if (totalDays >= 30) {
    discountRate = 0.2;
    discountLabel = "Giảm 20% (Thuê dài hạn >= 30 ngày)";
  } else if (totalDays >= 7) {
    discountRate = 0.1;
    discountLabel = "Giảm 10% (Thuê tuần >= 7 ngày)";
  }

  const subtotalRentalFee = dailyRate * totalDays;
  const discountAmount = Math.round(subtotalRentalFee * discountRate);
  const rentalFee = subtotalRentalFee - discountAmount;
  const totalAmount = rentalFee;

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!user || !token) {
      navigate("/login");
      return;
    }

    if (!startDate || !endDate) {
      setFormError("Vui lòng chọn ngày bắt đầu và ngày trả thiết bị.");
      return;
    }

    if (totalDays <= 0) {
      setFormError("Ngày kết thúc phải sau ngày bắt đầu ít nhất 1 ngày.");
      return;
    }

    if (!deliveryAddress.trim()) {
      setFormError("Vui lòng nhập địa chỉ nhận thiết bị.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await smartEquipApi.createRentalRequest(token, {
        equipmentId: equipment!._id,
        startDate,
        endDate,
        deliveryAddress: deliveryAddress.trim(),
        renterNote: renterNote.trim(),
      });
      setRequestSuccessData({
        message:
          res.message ||
          "Yêu cầu thuê đã được gửi thành công. Vui lòng chờ Chủ thiết bị (Owner) phê duyệt trước khi ký hợp đồng và thanh toán.",
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Không thể tạo yêu cầu thuê thiết bị",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
        <Navbar />
        <div className="max-w-xl mx-auto my-20 p-8 bg-[#141d2d] border border-[#223049] rounded-2xl text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-white">Không tìm thấy thiết bị</h2>
          <p className="text-slate-400 text-sm">
            {error || "Thiết bị có thể đã được gỡ hoặc không khả dụng."}
          </p>
          <Link
            to="/equipment"
            className="inline-block px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm"
          >
            ← Quay lại danh sách thiết bị
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
          <Link to="/" className="hover:text-white">
            Trang chủ
          </Link>
          <span>/</span>
          <Link to="/equipment" className="hover:text-white">
            Danh sách thiết bị
          </Link>
          <span>/</span>
          <span className="text-orange-400 truncate max-w-sm">
            {equipment.title}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Images, Specs & Description */}
          <div className="lg:col-span-7 space-y-6">
            {/* Main Image (Bấm vào để kích hoạt phóng to) */}
            <div
              className="aspect-video w-full bg-[#141d2d] border border-[#223049] hover:border-orange-500/50 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-lg select-none cursor-pointer transition-colors group"
              onClick={handleOpenZoom}
              title="Bấm vào để phóng to xem chi tiết ảnh sản phẩm"
            >
              {currentImgUrl ? (
                <>
                  <img
                    src={currentImgUrl}
                    alt={equipment.title}
                    draggable={false}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />

                  {imagesList.length > 1 && (
                    <>
                      <button
                        type="button"
                        title="Ảnh trước"
                        aria-label="Ảnh trước"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 hover:bg-orange-600 text-white font-bold text-2xl flex items-center justify-center transition-all border border-white/25 shadow-xl z-20 cursor-pointer"
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        title="Ảnh tiếp theo"
                        aria-label="Ảnh tiếp theo"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex((prev) => (prev + 1) % imagesList.length);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 hover:bg-orange-600 text-white font-bold text-2xl flex items-center justify-center transition-all border border-white/25 shadow-xl z-20 cursor-pointer"
                      >
                        ›
                      </button>

                      <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/80 backdrop-blur-sm text-xs font-semibold text-white border border-white/20 z-20 pointer-events-none">
                        📷 {(selectedImageIndex % imagesList.length) + 1} / {imagesList.length}
                      </div>
                    </>
                  )}

                  {/* Click to Zoom Hint Pill */}
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-medium text-slate-200 border border-white/15 flex items-center gap-1.5 transition-all duration-200 z-20 shadow-md group-hover:bg-orange-600 group-hover:text-white">
                    <span>🔍</span>
                    <span>Bấm vào ảnh để phóng to & soi chi tiết</span>
                  </div>

                  {/* Expand button top right */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenZoom();
                    }}
                    className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/75 hover:bg-orange-600 text-white flex items-center justify-center text-sm font-bold border border-white/20 transition-all z-20 shadow-lg cursor-pointer"
                    title="Phóng to ảnh toàn màn hình"
                  >
                    ⛶
                  </button>
                </>
              ) : (
                <div className="text-6xl text-slate-600">📷</div>
              )}
              <div className="absolute top-4 left-4 flex gap-2 z-10 pointer-events-none">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#0f1623]/80 backdrop-blur-sm text-orange-400 border border-[#28354c]">
                  {equipment.category}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-950/80 backdrop-blur-sm text-emerald-400 border border-emerald-800">
                  {equipment.condition === "like-new"
                    ? "Như mới (Like New)"
                    : "Hoạt động tốt"}
                </span>
              </div>
            </div>

            {/* Thumbnail Gallery Strip */}
            {equipment.images && equipment.images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {equipment.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-20 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                      idx === (selectedImageIndex % equipment.images.length)
                        ? "border-orange-500 scale-105 shadow-md shadow-orange-500/30"
                        : "border-[#223049] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Brand header */}
            <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-6 space-y-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {equipment.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span>
                  Hãng:{" "}
                  <strong className="text-white">
                    {equipment.brand || "Chính hãng"}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Model:{" "}
                  <strong className="text-white">
                    {equipment.modelNumber || "N/A"}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Vị trí:{" "}
                  <strong className="text-white">
                    {equipment.location?.city || "TP. Hồ Chí Minh"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-6 space-y-3">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Mô tả chi tiết & Tình trạng thiết bị
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {equipment.description ||
                  "Thiết bị được kiểm tra kỹ lưỡng trước khi bàn giao, sẵn sàng phục vụ cho các dự án quay chụp, sự kiện và công việc công nghệ của bạn."}
              </p>
            </div>

            {/* Owner & Trust Score Info */}
            <div className="bg-[#141d2d] border border-[#223049] rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Chủ sở hữu thiết bị (Owner)
              </h2>
              <div className="flex items-center gap-4 p-4 bg-[#1a2538] rounded-xl border border-[#263550]">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-lg text-white shadow-md">
                  {equipment.owner?.name
                    ? equipment.owner.name[0].toUpperCase()
                    : "O"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-white truncate">
                    {equipment.owner?.name || "Chủ thiết bị uy tín"}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="text-emerald-400 font-semibold">
                      🛡️ Đã định danh KYC
                    </span>
                    <span>•</span>
                    <span>
                      Điểm uy tín:{" "}
                      <strong className="text-amber-400 font-bold">
                        {equipment.owner?.trust_score ?? 100}/100
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form Chọn Ngày & Tính Tạm Tổng Tiền */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#141d2d] border border-[#263550] rounded-2xl p-6 shadow-xl space-y-6 sticky top-24">
              <div className="pb-4 border-b border-[#212c42]">
                <span className="text-xs text-slate-400 block mb-1">
                  Bảng giá niêm yết
                </span>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-orange-400">
                      {dailyRate.toLocaleString("vi-VN")} đ
                    </span>
                    <span className="text-xs text-slate-400"> /ngày</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    Cọc: Miễn phí (0 đ)
                  </span>
                </div>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  ⚠️ {formError}
                </div>
              )}

              {/* Booking Form */}
              <form onSubmit={handleCreateRental} className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Ngày bắt đầu *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#1a2538] border border-[#283754] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Ngày trả máy *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-[#1a2538] border border-[#283754] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Địa chỉ giao nhận thiết bị *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Số nhà, đường, phường/quận..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-[#1a2538] border border-[#283754] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                {/* Renter Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Ghi chú cho Chủ thiết bị (Tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Thời gian hẹn nhận máy, yêu cầu thêm phụ kiện..."
                    value={renterNote}
                    onChange={(e) => setRenterNote(e.target.value)}
                    className="w-full bg-[#1a2538] border border-[#283754] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Component Tự Động Tính Tạm Tổng Tiền */}
                <div className="bg-[#101725] p-4 rounded-xl border border-[#1e2a40] space-y-2.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Đơn giá ngày:</span>
                    <span className="text-white font-medium">
                      {dailyRate.toLocaleString("vi-VN")} đ
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Số ngày thuê:</span>
                    <span className="text-white font-bold">
                      {totalDays} ngày
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Tiền thuê gốc ({totalDays} x Đơn giá):</span>
                    <span className="text-white font-medium">
                      {subtotalRentalFee.toLocaleString("vi-VN")} đ
                    </span>
                  </div>

                  {/* Giảm giá dài ngày */}
                  {discountAmount > 0 ? (
                    <div className="flex justify-between text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                      <span>🏷️ {discountLabel}:</span>
                      <span>-{discountAmount.toLocaleString("vi-VN")} đ</span>
                    </div>
                  ) : totalDays > 0 && totalDays < 7 ? (
                    <p className="text-[11px] text-amber-400/80 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      💡 Mẹo: Thuê từ 7 ngày để được giảm ngay 10% tiền thuê!
                    </p>
                  ) : null}

                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Tiền cọc thiết bị:</span>
                    <span className="text-emerald-400 font-medium">
                      Miễn phí (0 đ)
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[#202c42] flex justify-between items-baseline">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Tổng cộng tạm tính:
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (Tiền thuê sau giảm • Không cần cọc)
                      </span>
                    </div>
                    <span className="text-2xl font-extrabold text-orange-400">
                      {totalAmount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || totalDays <= 0}
                  className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    "Đang gửi yêu cầu thuê..."
                  ) : (
                    <>
                      <span>📋</span>
                      <span>Tạo yêu cầu thuê & Ký hợp đồng</span>
                    </>
                  )}
                </button>

                {!user && (
                  <p className="text-center text-[11px] text-slate-400">
                    * Bạn sẽ được chuyển tới trang Đăng nhập trước khi gửi yêu cầu.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Interactive Lightbox Modal with Mouse Wheel Zoom & Drag to Pan */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none"
          onClick={() => {
            setIsLightboxOpen(false);
            setLightboxScale(1);
            setLightboxPos({ x: 0, y: 0 });
          }}
        >
          {/* Top Header Bar */}
          <div
            className="flex items-center justify-between text-white z-20 pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm sm:text-base text-orange-400">
                {equipment.title}
              </span>
              {imagesList.length > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-300 font-medium">
                  Ảnh {(selectedImageIndex % imagesList.length) + 1} / {imagesList.length}
                </span>
              )}
            </div>

            {/* Zoom Controls & Close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLightboxScale((s) => {
                    const next = Math.max(1, Number((s - 0.3).toFixed(2)));
                    if (next <= 1) setLightboxPos({ x: 0, y: 0 });
                    return next;
                  });
                }}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center transition-all"
                title="Thu nhỏ"
              >
                −
              </button>
              <span className="text-xs font-mono font-semibold px-2 text-slate-200 min-w-[55px] text-center">
                {Math.round(lightboxScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setLightboxScale((s) => Math.min(4.5, Number((s + 0.3).toFixed(2))))}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center transition-all"
                title="Phóng to"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightboxScale(1);
                  setLightboxPos({ x: 0, y: 0 });
                }}
                className="px-3 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-200 flex items-center justify-center transition-all ml-1"
                title="Đặt lại kích thước ban đầu"
              >
                ↺ 100%
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLightboxOpen(false);
                  setLightboxScale(1);
                  setLightboxPos({ x: 0, y: 0 });
                }}
                className="px-3.5 h-9 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-sm flex items-center justify-center transition-all ml-2"
                title="Đóng (Phím Esc)"
              >
                ✕ Đóng
              </button>
            </div>
          </div>

          {/* Main Lightbox Viewport with Wheel Zoom & Drag to Pan */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden relative my-2"
            onWheel={handleLightboxWheel}
            onMouseDown={handleMouseDownLightbox}
            onMouseMove={handleMouseMoveLightbox}
            onMouseUp={handleMouseUpLightbox}
            onDoubleClick={handleDoubleClickLightbox}
            style={{
              cursor: lightboxScale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
            }}
          >
            {currentImgUrl ? (
              <img
                src={currentImgUrl}
                alt={equipment.title}
                draggable={false}
                className="max-h-[78vh] max-w-[88vw] object-contain transition-transform duration-75 select-none"
                style={{
                  transform: `translate(${lightboxPos.x}px, ${lightboxPos.y}px) scale(${lightboxScale})`,
                }}
              />
            ) : null}

            {/* Nav Prev / Next in Lightbox */}
            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevLightboxImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-orange-600 text-white font-bold text-3xl flex items-center justify-center transition-all border border-white/20 shadow-2xl z-20"
                  title="Ảnh trước (Phím mũi tên trái)"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleNextLightboxImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-orange-600 text-white font-bold text-3xl flex items-center justify-center transition-all border border-white/20 shadow-2xl z-20"
                  title="Ảnh tiếp theo (Phím mũi tên phải)"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Bottom Hint & Thumbnails */}
          <div
            className="text-center pt-2 text-xs text-slate-400 z-20 flex flex-col items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="flex flex-wrap items-center justify-center gap-2 bg-black/60 px-4 py-1.5 rounded-full border border-white/10 text-[11px] sm:text-xs">
              <span>💡 <b>Cuộn chuột</b> để phóng to / thu nhỏ</span>
              <span>•</span>
              <span><b>Kéo giữ chuột</b> để di chuyển khi đang phóng to</span>
              <span>•</span>
              <span><b>Nháy đúp</b> để đổi 100% ↔ 250%</span>
            </p>
            {imagesList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-xl pb-1">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setLightboxScale(1);
                      setLightboxPos({ x: 0, y: 0 });
                    }}
                    className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      idx === (selectedImageIndex % imagesList.length)
                        ? "border-orange-500 scale-105 shadow-md shadow-orange-500/40"
                        : "border-white/20 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Popup Modal: Yêu cầu thuê thành công */}
      {requestSuccessData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#141d2d] border border-[#273650] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Glowing Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              ✓
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Gửi Yêu Cầu Thuê Thành Công!
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {requestSuccessData.message}
            </p>

            <div className="bg-[#0b101b] border border-[#223049] rounded-xl p-3.5 mb-6 text-left space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Thiết bị:</span>
                <span className="text-white font-medium truncate max-w-[220px]">
                  {equipment?.title}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Thời gian thuê:</span>
                <span className="text-orange-400 font-semibold">
                  {totalDays} ngày ({startDate} → {endDate})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Tổng chi phí:</span>
                <span className="text-emerald-400 font-bold">
                  {totalAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate("/rentals")}
                className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>Xem lịch sử đơn thuê</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestSuccessData(null)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm rounded-xl transition border border-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
