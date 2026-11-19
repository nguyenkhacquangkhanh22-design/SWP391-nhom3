const express = require("express");
const router = express.Router();
const productionPackageController = require("../controllers/productionPackageController");
const authenticate = require("../middleware/authenticate");

// Public endpoints: Lấy mẫu gói dự án & Giả lập công suất pin
router.get("/templates", productionPackageController.getSampleTemplates);
router.post("/power-simulator", productionPackageController.calculatePowerBudgetSimulator);

// Protected endpoints: Quản lý gói thuê dự án
router.get("/my-packages", authenticate, productionPackageController.getMyPackages);
router.post("/", authenticate, productionPackageController.createPackage);
router.get("/:id", authenticate, productionPackageController.getPackageById);
router.put("/:id", authenticate, productionPackageController.updatePackage);

module.exports = router;
