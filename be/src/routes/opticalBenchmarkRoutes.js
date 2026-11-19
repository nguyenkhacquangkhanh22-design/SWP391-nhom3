const express = require("express");
const router = express.Router();
const opticalBenchmarkController = require("../controllers/opticalBenchmarkController");
const authenticate = require("../middleware/authenticate");

// Public endpoints: Xem biểu đồ quang học và kiểm định thiết bị
router.get("/top-performers", opticalBenchmarkController.listTopPerformers);
router.get("/:equipmentId", opticalBenchmarkController.getBenchmarkByEquipment);
router.get("/:equipmentId/compatibility", opticalBenchmarkController.getSensorCompatibilityScore);
router.get("/:equipmentId/certificate", opticalBenchmarkController.getCalibrationCertificate);

// Protected endpoints: Kỹ sư/Owner cập nhật kết quả kiểm định phòng Lab
router.post("/:equipmentId", authenticate, opticalBenchmarkController.createOrUpdateBenchmark);

module.exports = router;
