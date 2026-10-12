const express = require("express");
const userController = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function requireObjectBody(req, _res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return next(new AppError(400, "Request body must be a JSON object"));
  }
  next();
}

// Tất cả các route bên dưới yêu cầu Middleware authJWT (authenticate)
router.use(authenticate);

// UC_R02: GET /api/user/profile (Xem profile)
router.get("/profile", asyncHandler(userController.getProfile));

// UC_R02: PUT /api/user/profile (Cập nhật profile)
router.put("/profile", requireObjectBody, asyncHandler(userController.updateProfile));

// UC_R03: POST /api/user/kyc (Tải lên giấy tờ xác thực KYC)
router.post("/kyc", requireObjectBody, asyncHandler(userController.submitKyc));

module.exports = router;
