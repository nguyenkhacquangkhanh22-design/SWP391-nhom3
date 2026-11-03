const express = require("express");
const moderatorController = require("../controllers/moderatorController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Cho phép cả Rental Moderator và System Admin (Người quản lý web)
router.use(
  authenticate,
  authorize("rentalmoderator", "rental_moderator", "rental moderator", "systemadmin", "admin")
);

// Bước 2: Quản lý web xem yêu cầu thuê từ Renter và chuyển tiếp cho Owner duyệt
router.get("/rental-requests", asyncHandler(moderatorController.listRentalRequests));
router.patch("/rental-requests/:id/forward", asyncHandler(moderatorController.forwardRentalRequest));

// Bước 4: Quản lý web duyệt Hợp đồng của Owner và gửi cho Người thuê ký tên
router.get("/contracts", asyncHandler(moderatorController.listContracts));
router.patch("/contracts/:id/review", asyncHandler(moderatorController.reviewContract));

// Bước 5: Rental Moderator đối chiếu & xác nhận thanh toán QR của Renter
router.get("/payments", asyncHandler(moderatorController.listPayments));
router.patch("/payments/:id/verify", asyncHandler(moderatorController.verifyPayment));

router.get("/equipments", asyncHandler(moderatorController.listEquipments));
router.get("/handover-records", asyncHandler(moderatorController.listHandoverRecords));
router.patch("/handover-records/:id/review", asyncHandler(moderatorController.reviewHandoverRecord));
router.get("/status-requests", asyncHandler(moderatorController.listStatusRequests));
router.patch("/status-requests/:id/review", asyncHandler(moderatorController.reviewStatusRequest));
router.get("/contract-templates", asyncHandler(moderatorController.listTemplates));
router.post("/contract-templates", asyncHandler(moderatorController.createTemplate));
router.post("/contract-templates/:id/versions", asyncHandler(moderatorController.createTemplateVersion));
router.patch("/contract-templates/:id/publish", asyncHandler(moderatorController.publishTemplate));
router.patch("/contract-templates/:id/retire", asyncHandler(moderatorController.retireTemplate));
router.post("/support-tickets", asyncHandler(moderatorController.submitSupportTicket));

// Quản lý web (Moderator) xác nhận danh tính (KYC) của Owner & Renter
// Yêu cầu giải ngân / thanh toán tiền cho Owner khi khách nhận hàng
router.get("/payouts", asyncHandler(moderatorController.listPayoutRequests));
router.patch("/payouts/:id/review", asyncHandler(moderatorController.reviewPayoutRequest));

router.get("/kyc-submissions", asyncHandler(moderatorController.listKycSubmissions));
router.patch("/kyc-submissions/:userId/review", asyncHandler(moderatorController.reviewKycSubmission));

module.exports = router;
