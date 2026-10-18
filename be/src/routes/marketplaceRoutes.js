const express = require("express");
const marketplaceController = require("../controllers/marketplaceController");
const authenticate = require("../middleware/authenticate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// UC_O19: Browse & Search Equipment (Public)
router.get("/", asyncHandler(marketplaceController.browseEquipments));

// UC_O20: View Equipment Details (Public)
router.get("/:id", asyncHandler(marketplaceController.getEquipmentPublicDetail));

// Submit rental request (Authenticated user)
router.post("/:id/request-rental", authenticate, asyncHandler(marketplaceController.requestRental));

module.exports = router;
