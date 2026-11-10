import React, { useState } from "react";
import axios from "axios";

interface PaymentButtonProps {
  rentalId: string;
  amount: number;
  description?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Component nút bấm thanh toán PayOS VietQR
 * Khi click -> gọi API POST /api/payments/create-payment-link
 * Nhận được checkoutUrl -> chuyển hướng người dùng sang trang thanh toán của PayOS
 */
export default function PaymentButton({
  rentalId,
  amount,
  description,
  className,
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loading) return;

    setLoading(true);
    try {
      // Gọi API POST /api/payments/create-payment-link
      const response = await axios.post("/api/payments/create-payment-link", {
        rentalId,
        amount,
        description: description || `TT don ${rentalId.slice(-6)}`,
      });

      const { checkoutUrl } = response.data;

      if (checkoutUrl) {
        if (onSuccess) onSuccess();
        // Chuyển hướng người dùng sang trang thanh toán PayOS để quét mã VietQR tự động
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Không nhận được link thanh toán từ PayOS");
      }
    } catch (err: any) {
      console.error("Lỗi tạo liên kết thanh toán PayOS:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Không thể kết nối đến cổng thanh toán PayOS";
      alert(`⚠️ ${errorMsg}`);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={loading}
      className={
        className ||
        "px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
      }
      title="Thanh toán qua cổng PayOS VietQR tự động duyệt đơn"
    >
      <span>{loading ? "⏳" : "💳"}</span>
      <span>
        {loading ? "Đang tạo mã VietQR..." : "Thanh toán qua mã VietQR"}
      </span>
    </button>
  );
}

