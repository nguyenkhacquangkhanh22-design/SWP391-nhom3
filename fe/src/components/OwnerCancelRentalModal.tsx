import React, { useState } from "react";
import { ownerApi } from "../services/ownerApi";

interface Props {
  isOpen: boolean;
  rentalId: string;
  rentalCode: string;
  equipmentTitle?: string;
  renterName?: string;
  isPaid?: boolean;
  totalAmount?: number;
  token: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function OwnerCancelRentalModal({
  isOpen,
  rentalId,
  rentalCode,
  equipmentTitle = "Thiết bị",
  renterName = "Khách thuê",
  isPaid = false,
  totalAmount = 0,
  token,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [reason, setReason] = useState("");
  const [isDamaged, setIsDamaged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleConfirmCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      onError("Vui lòng nhập lý do hủy đơn để thông báo cho khách thuê.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ownerApi.cancelRentalByOwner(token, rentalId, reason.trim(), isDamaged);
      onSuccess(res.message || "Đã hủy đơn thuê và gửi thông báo cho khách.");
      onClose();
    } catch (err: any) {
      onError(err?.message || "Không thể hủy đơn thuê.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="owner-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="owner-modal-card" style={{ maxWidth: "560px" }}>
        <div className="owner-modal-header">
          <h3 style={{ margin: 0, color: "#f87171", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🚫</span> Chủ máy hủy đơn / Từ chối bàn giao
          </h3>
          <button className="close-modal-btn" onClick={onClose} disabled={isSubmitting}>
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirmCancel} style={{ display: "grid", gap: "16px", marginTop: "12px" }}>
          {/* Thông tin đơn thuê */}
          <div
            style={{
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "12px 16px",
              fontSize: "0.85rem",
              display: "grid",
              gap: "6px",
            }}
          >
            <div>
              <span style={{ color: "var(--muted)" }}>Mã đơn thuê: </span>
              <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>#{rentalCode}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Thiết bị: </span>
              <strong style={{ color: "#fff" }}>{equipmentTitle}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Khách thuê: </span>
              <strong style={{ color: "#fff" }}>{renterName}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Trạng thái thanh toán: </span>
              {isPaid ? (
                <strong style={{ color: "#34d399" }}>
                  ✓ Đã thanh toán ({totalAmount.toLocaleString("vi-VN")} đ)
                </strong>
              ) : (
                <span style={{ color: "var(--muted)" }}>Chưa thanh toán</span>
              )}
            </div>
          </div>

          {/* Cảnh báo hoàn tiền nếu đã thanh toán */}
          {isPaid && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "0.83rem",
                color: "#a7f3d0",
                lineHeight: 1.5,
              }}
            >
              <strong>💰 Chính sách hoàn tiền 100%:</strong> Vì khách đã thanh toán, khi bạn xác nhận hủy đơn, hệ thống sẽ{" "}
              <strong>tự động hoàn trả ngay {totalAmount.toLocaleString("vi-VN")} đ</strong> vào Ví SmartEquip của khách thuê, đồng thời mở khóa lịch để tránh tranh chấp.
            </div>
          )}

          {/* Lý do hủy đơn */}
          <div>
            <label className="field-label" style={{ color: "#f87171" }}>
              Lý do hủy đơn & thông báo cho khách thuê *
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Ví dụ: Thiết bị bị hỏng cảm biến đột xuất trong buổi chụp trước đó, không thể kịp bảo dưỡng để bàn giao; Rơi vỡ lens..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {/* Checkbox chuyển thiết bị sang bảo trì */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              fontSize: "0.85rem",
              color: "#e2e8f0",
              background: "#1e293b",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #334155",
            }}
          >
            <input
              type="checkbox"
              checked={isDamaged}
              onChange={(e) => setIsDamaged(e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "#ef4444", cursor: "pointer" }}
            />
            <span>
              <strong>Thiết bị gặp sự cố / hư hỏng</strong> (Tự động chuyển thiết bị sang trạng thái{" "}
              <span style={{ color: "#f59e0b", fontWeight: "bold" }}>BẢO TRÌ</span> để ngừng nhận khách mới)
            </span>
          </label>

          {/* Actions */}
          <div className="modal-actions" style={{ marginTop: "8px" }}>
            <button
              type="button"
              className="button button-quiet"
              style={{ width: "auto" }}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Quay lại
            </button>
            <button
              type="submit"
              className="button"
              style={{
                width: "auto",
                background: "#dc2626",
                color: "#fff",
                fontWeight: "bold",
                border: "none",
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xử lý hủy đơn..." : "Xác nhận Hủy đơn & Thông báo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
