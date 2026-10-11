const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

router.post(
  "/register/send-otp",
  authLimiter,
  otpSendLimiter,
  requireObjectBody,
  asyncHandler(authController.sendRegistrationOtp),
);
router.post(
  "/register/verify-otp",
  authLimiter,
  otpVerifyLimiter,
  requireObjectBody,
  asyncHandler(authController.verifyRegistrationOtp),
);
router.post("/register", authLimiter, requireObjectBody, asyncHandler(authController.register));
router.post("/login", authLimiter, requireObjectBody, asyncHandler(authController.login));
router.post("/google", authLimiter, requireObjectBody, asyncHandler(authController.googleLogin));
router.post("/forgot-password", authLimiter, requireObjectBody, asyncHandler(authController.forgotPassword));
router.post("/reset-password", authLimiter, requireObjectBody, asyncHandler(authController.resetPassword));
router.post("/logout", authenticate, asyncHandler(authController.logout));
router.post(
  "/change-password",
  authenticate,
  requireObjectBody,
  asyncHandler(authController.changePassword),
);
router.get("/profile", authenticate, asyncHandler(authController.getProfile));
router.patch(
  "/profile",
  authenticate,
  requireObjectBody,
  asyncHandler(authController.updateProfile),
);

module.exports = router;
