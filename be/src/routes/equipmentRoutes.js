const express = require("express");
const equipmentController = require("../controllers/equipmentController");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// UC_G02, UC_R04, UC_R05: GET /api/equipment (Tìm kiếm & lọc thiết bị)
router.get("/", asyncHandler(equipmentController.searchEquipment));

// POST /api/equipment/ai-filter (AI Assistant lọc thiết bị thông minh)
router.post("/ai-filter", asyncHandler(equipmentController.aiFilterEquipment));

// UC_G03, UC_R06: GET /api/equipment/:id (Xem chi tiết thiết bị, tiền cọc, Owner)
router.get("/:id", asyncHandler(equipmentController.getEquipmentById));

module.exports = router;
