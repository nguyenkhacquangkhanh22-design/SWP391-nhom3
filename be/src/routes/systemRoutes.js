const express = require("express");
const systemController = require("../controllers/systemController");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// UC_G01: GET /api/system/info
router.get("/info", asyncHandler(systemController.getSystemInfo));

module.exports = router;
