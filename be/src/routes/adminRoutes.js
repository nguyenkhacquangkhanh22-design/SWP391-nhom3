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

module.exports = router;
