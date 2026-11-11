const express = require("express");
const ownerController = require("../controllers/ownerController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const upload = require("../middleware/upload");
const asyncHandler = require("../utils/asyncHandler");
const ownerMembershipController = require("../controllers/ownerMembershipController");
const {
  requireActiveMembership,
  requireMembershipToPublish,
} = require("../middleware/requireOwnerMembership");

const router = express.Router();

// Require authenticated user with 'owner', 'systemadmin', or 'admin' role
router.use(authenticate, authorize("owner", "systemadmin", "admin"));

// 1. Dashboard Overview (UC_O01)
router.get("/membership", asyncHandler(ownerMembershipController.getMembership));
router.get("/membership/orders/:orderCode", asyncHandler(ownerMembershipController.getOrderStatus));
router.post("/membership/orders/:orderCode/simulate-pay", asyncHandler(ownerMembershipController.simulatePayment));
router.post("/membership/trial", asyncHandler(ownerMembershipController.startTrial));
router.post("/membership/checkout", asyncHandler(ownerMembershipController.createCheckout));
router.get("/overview", asyncHandler(ownerController.getOverview));

// 2. Equipment Listings (UC_O03, UC_O04, UC_O05, UC_O06, UC_O16)
router.post("/upload-photo", upload.single("file"), asyncHandler(ownerController.uploadEquipmentPhoto));
router.post("/upload-photos", upload.array("files", 10), asyncHandler(ownerController.uploadEquipmentPhotos));
router.get("/equipments", asyncHandler(ownerController.getOwnerEquipments));
router.post("/equipments", requireActiveMembership, asyncHandler(ownerController.createEquipmentListing));
router.get("/equipments/:id", asyncHandler(ownerController.getEquipmentDetail));
router.put("/equipments/:id", requireMembershipToPublish, asyncHandler(ownerController.updateEquipment));
router.patch("/equipments/:id/visibility", requireMembershipToPublish, asyncHandler(ownerController.toggleEquipmentVisibility));
router.post("/equipments/:id/schedule", asyncHandler(ownerController.scheduleEquipmentAvailability));
router.post("/equipments/:id/status-request", asyncHandler(ownerController.submitEquipmentStatusUpdateRequest));

// 3. Rental Requests & Direct Rental Management
router.get("/rental-requests", asyncHandler(ownerController.getRentalRequests));
router.patch("/rental-requests/:id/respond", asyncHandler(ownerController.respondRentalRequest));
router.get("/rentals", asyncHandler(ownerController.getOwnerRentals));
router.patch("/rentals/:id/respond", asyncHandler(ownerController.respondOwnerRental));
router.patch("/rentals/:id/confirm-payment", asyncHandler(ownerController.confirmOwnerRentalPayment));
router.patch("/rentals/:id/contract", asyncHandler(ownerController.updateOwnerRentalContractTerms));
router.post("/rentals/:id/cancel", asyncHandler(ownerController.cancelRentalByOwner));
router.post("/rentals/:id/review-renter", asyncHandler(ownerController.reviewRenter));

// 4. Rental Contracts (UC_O12, UC_O13, UC_O14, UC_O15)
router.get("/contracts", asyncHandler(ownerController.getContracts));
router.get("/contract-templates/published", asyncHandler(ownerController.getPublishedContractTemplates));
router.get("/contracts/:id", asyncHandler(ownerController.getContractDetail));
router.post("/contracts", asyncHandler(ownerController.createRentalContract));
router.put("/contracts/:id", asyncHandler(ownerController.updateDraftContract));
router.post("/contracts/:id/send-to-renter", asyncHandler(ownerController.sendRentalContractToRenter));
// Backward-compatible path; submitting now sends the contract directly to the renter.
router.post("/contracts/:id/submit-approval", asyncHandler(ownerController.sendRentalContractToRenter));
router.post("/contracts/:id/confirm-e-contract", asyncHandler(ownerController.confirmEContract));
router.post("/contracts/:id/cancel", asyncHandler(ownerController.cancelRentalByOwner));
router.post("/contracts/:id/review-renter", asyncHandler(ownerController.reviewRenter));

// 5. Handover & Return Inspection (UC_O08, UC_O09)
router.get("/contracts/:id/handover", asyncHandler(ownerController.getContractHandoverRecords));
router.post("/contracts/:id/handover", asyncHandler(ownerController.createHandoverRecord));
router.post("/contracts/:id/return-inspection", asyncHandler(ownerController.createReturnInspectionRecord));
router.put("/handover-records/:id", asyncHandler(ownerController.updateHandoverRecordAfterReview));

// 6. Settlements & Revenue History (UC_O10, UC_O11)
router.get("/settlements", asyncHandler(ownerController.getSettlements));
router.get("/settlements/:contractId", asyncHandler(ownerController.getSettlementByContract));
router.post("/settlements/:contractId/confirm", asyncHandler(ownerController.confirmSettlementPayout));
router.post("/settlements/:contractId/request-payout", asyncHandler(ownerController.confirmSettlementPayout));
router.get("/revenue-history", asyncHandler(ownerController.getRevenueAndRentalHistory));

// 7. Disputes & Support Tickets (UC_O17, UC_O18)
router.get("/disputes", asyncHandler(ownerController.getOwnerDisputes));
router.post("/disputes", asyncHandler(ownerController.submitRentalDispute));
router.get("/support-tickets", asyncHandler(ownerController.getOwnerSupportTickets));
router.post("/support-tickets", asyncHandler(ownerController.submitSupportTicket));
router.post("/support-tickets/:id/reply", asyncHandler(ownerController.replySupportTicket));

// 8. Ví trung gian & Rút tiền (Wallet & Withdrawals)
const walletController = require("../controllers/walletController");
router.post("/bank-accounts", asyncHandler(walletController.addBankAccount));
router.get("/bank-accounts", asyncHandler(walletController.getOwnerBankAccountsAndBalance));
router.delete("/bank-accounts/:accountId", asyncHandler(walletController.removeBankAccount));
router.post("/withdraw", asyncHandler(walletController.createWithdrawal));
router.get("/withdrawals", asyncHandler(walletController.getOwnerWithdrawals));

// 9. Lịch sử biến động số dư (UC_OWNER_08: Owner Balance History)
router.get("/wallet/transactions", asyncHandler(walletController.getOwnerTransactions));
router.get("/wallet/transactions/:id", asyncHandler(walletController.getOwnerTransactionDetail));

module.exports = router;
