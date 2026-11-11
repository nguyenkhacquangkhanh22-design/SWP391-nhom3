const express = require("express");
const multer = require("multer");
const aiController = require("../controllers/aiController");

const router = express.Router();

// Cấu hình multer lưu file vào memory buffer (tối đa 15MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận tệp tin hình ảnh (JPEG, PNG, WEBP)."), false);
    }
  },
});

// POST /api/ai/shot-to-gear (Public endpoint cho khách trải nghiệm tìm máy)
router.post("/shot-to-gear", upload.single("image"), aiController.shotToGear);

module.exports = router;

