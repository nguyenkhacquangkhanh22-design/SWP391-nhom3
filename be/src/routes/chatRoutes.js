const express = require("express");
const chatController = require("../controllers/chatController");
const verifyToken = require("../middleware/verifyToken");
const upload = require("../middleware/upload");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(verifyToken);

router.get("/messages", asyncHandler(chatController.getConversation));
router.post("/send", asyncHandler(chatController.sendMessage));
router.post("/upload-image", upload.single("image"), asyncHandler(chatController.uploadChatImage));
router.patch("/read", asyncHandler(chatController.markAsRead));

module.exports = router;

