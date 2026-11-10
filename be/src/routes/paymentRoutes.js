const express = require("express");
const ownerMembershipController = require("../controllers/ownerMembershipController");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post("/payos/webhook", asyncHandler(ownerMembershipController.handlePayOSWebhook));

module.exports = router;
