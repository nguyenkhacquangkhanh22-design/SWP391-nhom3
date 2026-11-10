const express = require("express");
const rentalController = require("../controllers/rentalController");
const verifyToken = require("../middleware/verifyToken");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function requireObjectBody(req, _res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return next(new AppError(400, "Request body must be a JSON object"));
  }
  next();
}

// Tất cả các route thuê thiết bị yêu cầu Middleware verifyToken
router.use(verifyToken);

// UC_R07: POST /api/rentals/request (Tạo yêu cầu thuê thiết bị kèm Check Availability)
router.post("/request", requireObjectBody, asyncHandler(rentalController.createRentalRequest));


// GET /api/rentals/:id/contract-html (Xem & In hợp đồng PDF trực tiếp)
router.get("/:id/contract-html", asyncHandler(rentalController.getContractHtml));

// POST /api/rentals/:id/approve (Phê duyệt đơn thuê)
router.post("/:id/approve", asyncHandler(rentalController.approveRental));

// POST /api/rentals/:id/agree-contract (Đồng ý thỏa thuận điều khoản hợp đồng sau khi trao đổi qua chat)
router.post("/:id/agree-contract", asyncHandler(rentalController.agreeContract));

// UC_R08: POST /api/rentals/:id/confirm-contract (Ký hợp đồng điện tử)
router.post("/:id/confirm-contract", requireObjectBody, asyncHandler(rentalController.confirmContract));

// UC_R09: POST /api/rentals/:id/pay (Thanh toán tiền thuê & tiền cọc)
router.post("/:id/pay", requireObjectBody, asyncHandler(rentalController.payRental));

// UC_R10: POST /api/rentals/:id/return (Yêu cầu trả thiết bị)
router.post("/:id/return", requireObjectBody, asyncHandler(rentalController.requestReturn));

// UC_R10_EXT: POST /api/rentals/:id/extend (Gia hạn thời gian thuê)
router.post("/:id/extend", requireObjectBody, asyncHandler(rentalController.extendRental));

// UC_R11: POST /api/rentals/:id/review (Đánh giá thiết bị & chủ sở hữu)
router.post("/:id/review", requireObjectBody, asyncHandler(rentalController.reviewRental));

// POST /api/rentals/reset-history (Xóa toàn bộ lịch sử thuê để test lại)
router.post("/reset-history", asyncHandler(rentalController.resetRentalHistory));

// UC_R12: GET /api/rentals/history (Xem lịch sử yêu cầu thuê & hợp đồng)
router.get("/history", asyncHandler(rentalController.getRentalHistory));

// UC_R13: POST /api/rentals/:id/cancel (Hủy yêu cầu thuê kèm lý do)
router.post("/:id/cancel", requireObjectBody, asyncHandler(rentalController.cancelRental));

// UC_R14: POST /api/rentals/:id/dispute (Gửi khiếu nại tranh chấp đơn thuê)
router.post("/:id/dispute", requireObjectBody, asyncHandler(rentalController.submitDispute));

module.exports = router;
