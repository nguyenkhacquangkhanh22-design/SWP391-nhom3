import React, { useState } from "react";
import { ownerApi } from "../../services/ownerApi";

interface Props {
  rental: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export default function OwnerDamageReportModal({
  rental,
  isOpen,
  onClose,
  onSuccess,
  token,
}: Props) {
  const [damageLevel, setDamageLevel] = useState<"MINOR" | "SEVERE" | "TOTAL_LOSS">("MINOR");
  const [reason, setReason] = useState("");
  const [claimedAmount, setClaimedAmount] = useState<number>(200000);
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !rental) return null;

  const rentalCode = rental.rentalCode || rental.rental_code || (rental._id ? rental._id.slice(-8).toUpperCase() : "");
  const equipmentTitle =
    typeof rental.equipment === "object" && rental.equipment?.title
      ? rental.equipment.title
      : typeof rental.equipmentId === "object" && rental.equipmentId?.title
      ? rental.equipmentId.title
      : typeof rental.equipment_id === "object" && rental.equipment_id?.title
      ? rental.equipment_id.title
      : rental.equipmentTitle || "Thiết bị";

  const renterName =
    typeof rental.renter === "object" && rental.renter?.name
      ? rental.renter.name
      : typeof rental.renterId === "object" && rental.renterId?.name
      ? rental.renterId.name
      : typeof rental.renter_id === "object" && rental.renter_id?.name
      ? rental.renter_id.name
      : "Khách thuê";

  // Calculate 24h deadline from return time or completion
  const returnTimestamp = rental.returnedAt || rental.returnTime || rental.endDate || rental.end_date;
  const returnDate = returnTimestamp ? new Date(returnTimestamp) : new Date();
  const deadlineDate = new Date(returnDate.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const isExpired24h = Boolean(rental.returnedAt && now.getTime() > deadlineDate.getTime());
  const remainingHours = Math.max(0, Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const remainingMinutes = Math.max(0, Math.floor(((deadlineDate.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60)));

  const handleAddImageUrl = () => {
    if (!customImageUrl.trim()) return;
    setEvidenceImages((prev) => [...prev, customImageUrl.trim()]);
    setCustomImageUrl("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setEvidenceImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isExpired24h) {
      setError("Đã quá thời hạn 24 giờ kể từ khi xác nhận nhận lại thiết bị. Không thể gửi khiếu nại.");
      return;
    }

    if (!reason.trim()) {
      setError("Vui lòng nhập mô tả chi tiết lỗi hoặc sự cố hư hỏng phát sinh.");
      return;
    }

    if (evidenceImages.length === 0) {
      setError("Bắt buộc phải tải lên ít nhất 1 hình ảnh hoặc video bằng chứng hư hỏng.");
      return;
    }

    if (!claimedAmount || claimedAmount <= 0) {
      setError("Vui lòng nhập số tiền yêu cầu bồi thường hợp lệ (VNĐ).");
      return;
    }

    setSubmitting(true);
    try {
      await ownerApi.submitRentalDamageReport(token, rental._id, {
        damageLevel,
        reason: reason.trim(),
        evidenceImages,
        claimedAmount,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi khiếu nại hư hỏng.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-orange-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-950/60 via-[#1e293b] to-[#0f172a] border-b border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xl">
              ⚠️
            </span>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Khiếu Nại Hư Hỏng Thiết Bị
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-mono">
                  #{rentalCode}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gửi biên bản sự cố và yêu cầu bồi thường tới Quản trị viên (Admin) xem xét
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 24-hour Notice Badge */}
        <div className="px-5 py-3 border-b border-slate-800 bg-[#090e17]">
          {isExpired24h ? (
            <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
              <span className="text-lg">❌</span>
              <div>
                <strong>Đã hết hạn khiếu nại:</strong> Quá 24 giờ kể từ thời điểm nhận lại thiết bị.
                Bạn không thể tạo khiếu nại cho đơn này nữa.
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-emerald-400 font-semibold">✓ Thiết bị:</span>
                <strong className="text-white truncate max-w-xs">{equipmentTitle}</strong>
                <span className="text-slate-500">• Khách: {renterName}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                <span>⏱️</span>
                <span>Hạn khiếu nại (24h): Còn {remainingHours}h {remainingMinutes}m</span>
              </div>
            </div>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[calc(85vh-160px)]">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Mức độ hư hỏng */}
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
              1. Mức độ hư hỏng thiết bị <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDamageLevel("MINOR")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  damageLevel === "MINOR"
                    ? "bg-emerald-950/40 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500"
                    : "bg-[#162032] border-slate-700/80 text-slate-400 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-400">🟢 Nhẹ</span>
                  {damageLevel === "MINOR" && <span className="text-xs text-emerald-400">✓ Chọn</span>}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Trầy xước bề mặt, bong sơn nhẹ, vết ố bẩn khó tẩy rửa.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDamageLevel("SEVERE")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  damageLevel === "SEVERE"
                    ? "bg-amber-950/40 border-amber-500 text-white shadow-lg ring-1 ring-amber-500"
                    : "bg-[#162032] border-slate-700/80 text-slate-400 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-400">🟡 Nặng</span>
                  {damageLevel === "SEVERE" && <span className="text-xs text-amber-400">✓ Chọn</span>}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Móp méo vỏ, gãy chốt, ống kính nứt/mờ, thiếu phụ kiện đi kèm.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDamageLevel("TOTAL_LOSS")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  damageLevel === "TOTAL_LOSS"
                    ? "bg-red-950/40 border-red-500 text-white shadow-lg ring-1 ring-red-500"
                    : "bg-[#162032] border-slate-700/80 text-slate-400 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-red-400">🔴 Hỏng hoàn toàn</span>
                  {damageLevel === "TOTAL_LOSS" && <span className="text-xs text-red-400">✓ Chọn</span>}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Không khởi động, rơi nát vỡ, chập cháy, hư hại toàn bộ bo mạch.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Chi tiết sự cố */}
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
              2. Mô tả chi tiết lỗi / sự cố phát sinh <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Thiết bị khi nhận lại bị móp cạnh dưới bên phải, kính ngắm có vết xước sâu không có trong biên bản bàn giao lúc đầu..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131d2e] border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-orange-500 leading-relaxed resize-none"
            />
          </div>

          {/* 3. Bằng chứng hình ảnh / video (Bắt buộc tối thiểu 1) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                3. Bằng chứng thực tế (Bắt buộc ≥ 1 ảnh) <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Đã thêm: <strong className="text-orange-400">{evidenceImages.length}</strong> ảnh
              </span>
            </div>

            {/* Input upload & URL */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <label className="px-4 py-2 bg-[#1c2a40] hover:bg-[#253754] text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer flex items-center justify-center gap-2 transition-colors">
                <span>📁 Tải ảnh từ máy</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="Hoặc dán URL ảnh/video bằng chứng..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#131d2e] border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Thêm
                </button>
              </div>
            </div>

            {/* Thumbnails preview */}
            {evidenceImages.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 p-3 rounded-xl bg-[#0b101b] border border-slate-800">
                {evidenceImages.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={img} alt={`Bằng chứng ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-red-600/90 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-red-500/30 rounded-xl text-center text-xs text-red-300/80 bg-red-950/10">
                Chưa có ảnh bằng chứng nào. Vui lòng tải lên ảnh chụp thực tế lúc nhận máy.
              </div>
            )}
          </div>

          {/* 4. Số tiền yêu cầu bồi thường */}
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
              4. Số tiền yêu cầu bồi thường / Sửa chữa dự kiến <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={50000}
                value={claimedAmount}
                onChange={(e) => setClaimedAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 pl-4 pr-16 rounded-xl bg-[#131d2e] border border-slate-700 text-emerald-400 font-bold text-base focus:outline-none focus:border-orange-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                VNĐ
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-[11px] text-slate-500 self-center">Chọn nhanh:</span>
              {[100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setClaimedAmount(amt)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    claimedAmount === amt
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-[#1c2a40] text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {amt.toLocaleString("vi-VN")} đ
                </button>
              ))}
            </div>
          </div>

          {/* Workflow Notice */}
          <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 text-slate-300 text-[11px] leading-relaxed space-y-1">
            <div className="font-semibold text-blue-300 flex items-center gap-1.5">
              <span>ℹ️</span> Quy trình xử lý tranh chấp:
            </div>
            <div>
              1. Sau khi gửi, đơn thuê sẽ chuyển sang trạng thái <strong>"Đang tranh chấp"</strong> và tạm khóa thanh toán.
            </div>
            <div>
              2. Hệ thống gửi thông báo tới Người thuê và Quản trị viên (Admin).
            </div>
            <div>
              3. Admin sẽ thẩm định bằng chứng, liên hệ đối chất và đưa ra phán quyết hoàn tiền/bồi thường theo quy định.
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-[#1c2a40] hover:bg-[#253754] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || isExpired24h}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{submitting ? "⏳ Đang gửi khiếu nại..." : "🚀 Gửi khiếu nại lên Admin"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

