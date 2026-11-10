import React, { useState } from "react";
import { ownerApi } from "../services/ownerApi";

interface Props {
  isOpen: boolean;
  rentalId: string;
  rentalCode: string;
  renterName?: string;
  equipmentTitle?: string;
  token: string;
  initialReview?: {
    rating?: number;
    equipmentPreservation?: string;
    onTimeReturn?: boolean;
    comment?: string;
  };
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function OwnerReviewRenterModal({
  isOpen,
  rentalId,
  rentalCode,
  renterName = "Khách thuê",
  equipmentTitle = "Thiết bị",
  token,
  initialReview,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [rating, setRating] = useState<number>(initialReview?.rating || 5);
  const [preservation, setPreservation] = useState<string>(
    initialReview?.equipmentPreservation || "good"
  );
  const [onTimeReturn, setOnTimeReturn] = useState<boolean>(
    initialReview?.onTimeReturn !== undefined ? initialReview.onTimeReturn : true
  );
  const [comment, setComment] = useState<string>(initialReview?.comment || "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Tính trước điểm uy tín cộng/trừ dự kiến
  let estimatedDelta = 0;
  if (rating === 5) estimatedDelta += 3;
  else if (rating === 4) estimatedDelta += 1;
  else if (rating === 2) estimatedDelta -= 3;
  else if (rating === 1) estimatedDelta -= 6;

  if (onTimeReturn) estimatedDelta += 1;
  else estimatedDelta -= 2;

  if (preservation === "excellent") estimatedDelta += 2;
  else if (preservation === "poor") estimatedDelta -= 4;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await ownerApi.reviewRenter(token, rentalId, {
        rating,
        equipment_preservation: preservation,
        on_time_return: onTimeReturn,
        comment,
      });
      onSuccess(res.message || "Đã gửi đánh giá uy tín khách thuê thành công!");
      onClose();
    } catch (err: any) {
      onError(err?.message || "Không thể gửi đánh giá khách thuê.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="owner-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="owner-modal-card" style={{ maxWidth: "560px" }}>
        <div className="owner-modal-header">
          <h3 style={{ margin: 0, color: "#fbbf24", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⭐</span> Đánh giá khách thuê & Chấm điểm uy tín
          </h3>
          <button className="close-modal-btn" onClick={onClose} disabled={isSubmitting}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px", marginTop: "12px" }}>
          {/* Thông tin giao dịch */}
          <div
            style={{
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "12px 16px",
              fontSize: "0.85rem",
              display: "grid",
              gap: "4px",
            }}
          >
            <div>
              <span style={{ color: "var(--muted)" }}>Khách thuê (Người nhận đánh giá): </span>
              <strong style={{ color: "#38bdf8" }}>{renterName}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Thiết bị đã thuê: </span>
              <strong style={{ color: "#fff" }}>{equipmentTitle}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Mã đơn thuê: </span>
              <strong style={{ color: "#94a3b8", fontFamily: "monospace" }}>#{rentalCode}</strong>
            </div>
          </div>

          {/* 1. Chọn số sao */}
          <div>
            <label className="field-label" style={{ marginBottom: "6px" }}>
              1. Mức độ hài lòng tổng thể đối với khách thuê *
            </label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "2rem",
                    color: star <= rating ? "#f59e0b" : "#475569",
                    transition: "transform 0.15s",
                    padding: "2px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  ★
                </button>
              ))}
              <span style={{ marginLeft: "10px", fontSize: "0.9rem", color: "#fbbf24", fontWeight: "bold" }}>
                {rating === 5
                  ? "5/5 - Rất tuyệt vời"
                  : rating === 4
                  ? "4/5 - Tốt"
                  : rating === 3
                  ? "3/5 - Bình thường"
                  : rating === 2
                  ? "2/5 - Chưa hài lòng"
                  : "1/5 - Kém"}
              </span>
            </div>
          </div>

          {/* 2. Tiêu chí giữ gìn thiết bị */}
          <div>
            <label className="field-label">2. Tình trạng giữ gìn thiết bị khi hoàn trả *</label>
            <select
              className="input-field"
              value={preservation}
              onChange={(e) => setPreservation(e.target.value)}
              required
            >
              <option value="excellent">💎 Xuất sắc - Thiết bị sạch sẽ, như mới xuất kho (+2 điểm uy tín)</option>
              <option value="good">✓ Tốt - Giữ gìn cẩn thận, hoạt động chuẩn (Chuẩn)</option>
              <option value="fair">⚪ Trung bình - Có bụi bẩn hoặc trầy xước nhẹ (Không đổi)</option>
              <option value="poor">⚠️ Kém - Bụi bẩn, trầy xước nặng, thiếu phụ kiện (-4 điểm uy tín)</option>
            </select>
          </div>

          {/* 3. Đúng giờ hoàn trả */}
          <div>
            <label className="field-label">3. Thời gian trả thiết bị *</label>
            <div style={{ display: "flex", gap: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.88rem", color: "#fff" }}>
                <input
                  type="radio"
                  name="on_time_return"
                  checked={onTimeReturn === true}
                  onChange={() => setOnTimeReturn(true)}
                  style={{ accentColor: "#10b981", width: "16px", height: "16px" }}
                />
                <span>⏱️ Trả đúng hẹn / Trước thời hạn (+1 điểm uy tín)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.88rem", color: "#fff" }}>
                <input
                  type="radio"
                  name="on_time_return"
                  checked={onTimeReturn === false}
                  onChange={() => setOnTimeReturn(false)}
                  style={{ accentColor: "#ef4444", width: "16px", height: "16px" }}
                />
                <span>⏰ Trả trễ hẹn (-2 điểm uy tín)</span>
              </label>
            </div>
          </div>

          {/* 4. Nhận xét chi tiết */}
          <div>
            <label className="field-label">4. Lời nhận xét chi tiết dành cho khách</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Ví dụ: Khách bảo quản máy rất kỹ càng, giao tiếp nhã nhặn, trả máy đúng hẹn. Rất mong được tiếp tục phục vụ bạn trong những lần thuê tiếp theo!"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Dự kiến tác động điểm uy tín */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: estimatedDelta >= 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${estimatedDelta >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              fontSize: "0.84rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "#cbd5e1" }}>Dự kiến tác động điểm uy tín (Trust Score):</span>
            <strong style={{ color: estimatedDelta >= 0 ? "#34d399" : "#f87171", fontSize: "0.95rem" }}>
              {estimatedDelta >= 0 ? `+${estimatedDelta} điểm uy tín` : `${estimatedDelta} điểm uy tín`}
            </strong>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: "8px" }}>
            <button
              type="button"
              className="button button-quiet"
              style={{ width: "auto" }}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="button button-primary"
              style={{ width: "auto", background: "#f59e0b", color: "#111827", fontWeight: "bold" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang gửi đánh giá..." : "🌟 Gửi Đánh Giá & Cập Nhật Uy Tín"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

