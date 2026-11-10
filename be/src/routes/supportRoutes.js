const express = require("express");
const rentalController = require("../controllers/rentalController");
const complaintController = require("../controllers/complaintController");
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

// UC_R15: POST /api/support/ticket (Gửi ticket hỗ trợ)
router.post("/ticket", verifyToken, requireObjectBody, asyncHandler(rentalController.createSupportTicket));
router.get("/complaints", verifyToken, asyncHandler(complaintController.listMyComplaints));
router.post("/complaints", verifyToken, requireObjectBody, asyncHandler(complaintController.createComplaint));

module.exports = router;
