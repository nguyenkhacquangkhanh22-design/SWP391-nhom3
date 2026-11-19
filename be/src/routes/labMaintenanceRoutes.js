const express = require("express");
const router = express.Router();
const labMaintenanceController = require("../controllers/labMaintenanceController");
const authenticate = require("../middleware/authenticate");

// Public endpoints: Xem tổng quan trạng thái buồng sạch & chứng thư
router.get("/metrics", labMaintenanceController.getLabMetricsOverview);
router.get("/certificate/:id", labMaintenanceController.generateQualityCertificate);

// Protected endpoints: Quản lý bảng Kanban bảo dưỡng
router.get("/kanban", authenticate, labMaintenanceController.getKanbanBoard);
router.get("/work-orders/:id", authenticate, labMaintenanceController.getWorkOrderById);
router.post("/work-orders", authenticate, labMaintenanceController.createWorkOrder);
router.patch("/work-orders/:id/status", authenticate, labMaintenanceController.updateKanbanStatus);
router.patch("/work-orders/:id/checklist/:stepNumber", authenticate, labMaintenanceController.updateChecklistStep);

module.exports = router;
