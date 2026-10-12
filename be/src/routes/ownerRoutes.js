const express = require("express");
const ownerController = require("../controllers/ownerController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Require authenticated user with 'owner' or 'systemadmin' role
router.use(authenticate, authorize("owner", "systemadmin"));

// 1. Dashboard Overview (UC_O01)
router.get("/overview", asyncHandler(ownerController.getOverview));

// 2. Equipment Listings (UC_O03, UC_O04, UC_O05, UC_O06, UC_O16)
router.get("/equipments", asyncHandler(ownerController.getOwnerEquipments));
router.post("/equipments", asyncHandler(ownerController.createEquipmentListing));
router.get("/equipments/:id", asyncHandler(ownerController.getEquipmentDetail));
router.put("/equipments/:id", asyncHandler(ownerController.updateEquipment));
router.patch("/equipments/:id/visibility", asyncHandler(ownerController.toggleEquipmentVisibility));
router.post("/equipments/:id/schedule", asyncHandler(ownerController.scheduleEquipmentAvailability));
router.post("/equipments/:id/status-request", asyncHandler(ownerController.submitEquipmentStatusUpdateRequest));

// 3. Rental Requests (UC_O07)
router.get("/rental-requests", asyncHandler(ownerController.getRentalRequests));
router.patch("/rental-requests/:id/respond", asyncHandler(ownerController.respondRentalRequest));

// 4. Rental Contracts (UC_O12, UC_O13, UC_O14, UC_O15)
router.get("/contracts", asyncHandler(ownerController.getContracts));
router.get("/contracts/:id", asyncHandler(ownerController.getContractDetail));
router.post("/contracts", asyncHandler(ownerController.createRentalContract));
router.put("/contracts/:id", asyncHandler(ownerController.updateDraftContract));
router.post("/contracts/:id/submit-approval", asyncHandler(ownerController.submitRentalContractForApproval));
router.post("/contracts/:id/confirm-e-contract", asyncHandler(ownerController.confirmEContract));

// 5. Handover & Return Inspection (UC_O08, UC_O09)
router.get("/contracts/:id/handover", asyncHandler(ownerController.getContractHandoverRecords));
router.post("/contracts/:id/handover", asyncHandler(ownerController.createHandoverRecord));
router.post("/contracts/:id/return-inspection", asyncHandler(ownerController.createReturnInspectionRecord));

// 6. Settlements & Revenue History (UC_O10, UC_O11)
router.get("/settlements", asyncHandler(ownerController.getSettlements));
router.get("/settlements/:contractId", asyncHandler(ownerController.getSettlementByContract));
router.post("/settlements/:contractId/confirm", asyncHandler(ownerController.confirmSettlementPayout));
router.get("/revenue-history", asyncHandler(ownerController.getRevenueAndRentalHistory));

// 7. Disputes & Support Tickets (UC_O17, UC_O18)
router.get("/disputes", asyncHandler(ownerController.getOwnerDisputes));
router.post("/disputes", asyncHandler(ownerController.submitRentalDispute));
router.get("/support-tickets", asyncHandler(ownerController.getOwnerSupportTickets));
router.post("/support-tickets", asyncHandler(ownerController.submitSupportTicket));
router.post("/support-tickets/:id/reply", asyncHandler(ownerController.replySupportTicket));

module.exports = router;
