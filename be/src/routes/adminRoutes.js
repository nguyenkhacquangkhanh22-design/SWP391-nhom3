const express = require("express");
const adminController = require("../controllers/adminController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Require authenticated user with 'systemadmin' role
router.use(authenticate, authorize("systemadmin", "Systemadmin"));

router.get("/overview", asyncHandler(adminController.getOverview));
router.patch("/users/:userId/role", asyncHandler(adminController.updateUserRole));
router.patch("/users/:userId/status", asyncHandler(adminController.updateUserStatus));

module.exports = router;
