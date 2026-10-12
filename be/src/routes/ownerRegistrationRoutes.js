const express = require("express");
const ownerRegistrationController = require("../controllers/ownerRegistrationController");
const authenticate = require("../middleware/authenticate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Require authenticated user (Guest who registered an account or Renter)
router.use(authenticate);

// UC_O02: Submit Owner Registration
router.post("/", asyncHandler(ownerRegistrationController.submitOwnerApplication));

// Check current user's registration status
router.get("/status", asyncHandler(ownerRegistrationController.getMyApplicationStatus));

module.exports = router;
