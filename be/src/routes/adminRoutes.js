const express = require("express");
const adminController = require("../controllers/adminController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../utils/asyncHandler");

const ownerRegistrationController = require("../controllers/ownerRegistrationController");

const router = express.Router();

// Require authenticated user with 'systemadmin' or 'admin' role
router.use(authenticate, authorize("systemadmin", "Systemadmin", "admin", "Admin"));

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

// Digital Contract Templates management (UC_A26)
router.get("/contract-templates", asyncHandler(adminController.listContractTemplates));
router.post("/contract-templates", asyncHandler(adminController.createContractTemplate));
router.put("/contract-templates/:id", asyncHandler(adminController.updateContractTemplate));
router.patch("/contract-templates/:id/status", asyncHandler(adminController.updateContractTemplateStatus));

// Equipment Status & Maintenance Requests review (UC_A27)
router.get("/equipment-status-requests", asyncHandler(adminController.listEquipmentStatusRequests));
router.patch("/equipment-status-requests/:id/review", asyncHandler(adminController.reviewEquipmentStatusRequest));

// Owner Membership management & manual grants (UC_A28)
router.get("/memberships", asyncHandler(adminController.listMemberships));
router.post("/memberships/grant", asyncHandler(adminController.grantOwnerMembership));

// Rental Settlement & Escrow Release Audit (UC_A29)
router.get("/settlements", asyncHandler(adminController.listSettlements));
router.patch("/settlements/:id/approve", asyncHandler(adminController.approveSettlement));

// Handover & Return Records inspection (UC_A30)
router.get("/handover-records", asyncHandler(adminController.listHandoverRecords));
router.patch("/handover-records/:id/review", asyncHandler(adminController.reviewHandoverRecord));

// Risk & Fraud Anomaly Monitor (UC_A31)
router.get("/risk-monitor", asyncHandler(adminController.getRiskMonitor));
router.patch("/risk-monitor/:userId/freeze", asyncHandler(adminController.freezeRiskUser));

// Standard Damage Compensation Tariffs (UC_A32)
router.get("/damage-tariffs", asyncHandler(adminController.listDamageTariffs));
router.post("/damage-tariffs", asyncHandler(adminController.createDamageTariff));
router.put("/damage-tariffs/:id", asyncHandler(adminController.updateDamageTariff));

// Equipment Maintenance & Shutter Count Tracking (UC_A33)
router.get("/maintenance-logs", asyncHandler(adminController.listMaintenanceLogs));
router.post("/maintenance-logs", asyncHandler(adminController.createMaintenanceLog));
router.patch("/maintenance-logs/:id/status", asyncHandler(adminController.updateMaintenanceLogStatus));

// Quản lý Tài chính: Duyệt Ngân hàng & Duyệt Rút tiền (Finance Manager)
const walletController = require("../controllers/walletController");
router.get("/bank-accounts/pending", asyncHandler(walletController.getPendingBankAccounts));
router.put("/bank-accounts/:userId/:accountId/approve", asyncHandler(walletController.approveBankAccount));
router.put("/bank-accounts/:userId/:accountId/reject", asyncHandler(walletController.rejectBankAccount));

router.get("/withdraw/pending", asyncHandler(walletController.getAdminWithdrawals));
router.put("/withdraw/:id/approve", asyncHandler(walletController.approveWithdrawal));
router.put("/withdraw/:id/reject", asyncHandler(walletController.rejectWithdrawal));

module.exports = router;
