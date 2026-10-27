const express = require("express");
const adminController = require("../controllers/adminController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../utils/asyncHandler");

const ownerRegistrationController = require("../controllers/ownerRegistrationController");

const router = express.Router();

// Require authenticated user with 'systemadmin' role
router.use(authenticate, authorize("systemadmin", "Systemadmin"));

router.get("/overview", asyncHandler(adminController.getOverview));
router.patch("/users/:userId/role", asyncHandler(adminController.updateUserRole));
router.patch("/users/:userId/status", asyncHandler(adminController.updateUserStatus));

// Owner registration applications review (UC_O02)
router.get("/owner-applications", asyncHandler(ownerRegistrationController.adminListApplications));
router.patch("/owner-applications/:id/review", asyncHandler(ownerRegistrationController.adminReviewApplication));

// Support tickets review & response (UC_A17)
router.get("/support-tickets", asyncHandler(adminController.listSupportTickets));
router.post("/support-tickets/:id/reply", asyncHandler(adminController.replySupportTicket));
router.patch("/support-tickets/:id/status", asyncHandler(adminController.updateSupportTicketStatus));

// Equipment listings moderation & visibility control (UC_A11 & UC_A12)
router.get("/equipments", asyncHandler(adminController.listEquipments));
router.patch("/equipments/:id/approval", asyncHandler(adminController.reviewEquipmentApproval));
router.patch("/equipments/:id/visibility", asyncHandler(adminController.updateEquipmentVisibility));

// Rental disputes & deposit deduction/refund (UC_A15 & UC_A16)
router.get("/disputes", asyncHandler(adminController.listDisputes));
router.get("/disputes/:id", asyncHandler(adminController.getDisputeDetail));
router.patch("/disputes/:id/resolve", asyncHandler(adminController.resolveDispute));

// KYC Renter submissions review (UC_A06)
router.get("/kyc-submissions", asyncHandler(adminController.listKycSubmissions));
router.patch("/kyc-submissions/:userId/review", asyncHandler(adminController.reviewKycSubmission));

// Audit logs lookup (UC_A21)
router.get("/audit-logs", asyncHandler(adminController.listAuditLogs));

module.exports = router;
