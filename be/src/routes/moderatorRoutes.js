const express = require("express");
const moderatorController = require("../controllers/moderatorController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate, authorize("rentalmoderator", "rental_moderator", "rental moderator"));

router.get("/contracts", asyncHandler(moderatorController.listContracts));
router.patch("/contracts/:id/review", asyncHandler(moderatorController.reviewContract));
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

module.exports = router;
