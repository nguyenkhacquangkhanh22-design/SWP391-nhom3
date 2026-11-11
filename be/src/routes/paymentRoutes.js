const express = require("express");
const ownerMembershipController = require("../controllers/ownerMembershipController");
const paymentController = require("../controllers/paymentController");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post("/payos/webhook", asyncHandler(ownerMembershipController.handlePayOSWebhook));

/**
 * API 1: POST /api/payments/create-payment-link
 * Tạo link thanh toán VietQR động của PayOS
 */
router.post(
  "/create-payment-link",
  asyncHandler(paymentController.createPaymentLink)
);

/**
 * API 2: POST /api/payments/webhook
 * Đón webhook do PayOS gửi về khi thanh toán thành công
 */
router.post("/webhook", asyncHandler(paymentController.webhook));

/**
 * API 3: GET /api/payments/verify/:orderCode
 * Tra cứu trạng thái thanh toán trực tiếp từ PayOS và tự động cập nhật 'PAID'
 */
router.get("/verify/:orderCode", asyncHandler(paymentController.verifyPayment));

module.exports = router;
