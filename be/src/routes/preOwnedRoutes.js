const express = require("express");
const router = express.Router();
const preOwnedController = require("../controllers/preOwnedController");
const authenticate = require("../middleware/authenticate");

// Public endpoints: Xem danh sách máy cũ & định giá
router.get("/listings", preOwnedController.getListings);
router.get("/listings/:id", preOwnedController.getListingById);
router.get("/valuation-models", preOwnedController.getSupportedValuationModels);
router.post("/calculate-valuation", preOwnedController.calculateValuation);

// Protected endpoints: Đăng bán máy thanh lý
router.post("/listings", authenticate, preOwnedController.createListing);

module.exports = router;
