const aiService = require("../services/aiService");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const aiController = {
  /**
   * POST /api/ai/shot-to-gear
   * Phân tích ảnh phong cách quay chụp -> Đề xuất Combo thiết bị cho thuê
   */
  shotToGear: asyncHandler(async (req, res) => {
    let imageBase64;
    let mimeType = "image/jpeg";
    let imageUrl = req.body?.imageUrl;

    if (req.file) {
      imageBase64 = req.file.buffer.toString("base64");
      mimeType = req.file.mimetype || "image/jpeg";
    } else if (req.body?.imageBase64) {
      imageBase64 = req.body.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      if (req.body.mimeType) mimeType = req.body.mimeType;
    }

    if (!imageBase64 && !imageUrl) {
      throw new AppError(400, "Vui lòng chọn ảnh tải lên hoặc cung cấp đường dẫn ảnh (URL).");
    }

    const result = await aiService.analyzeShotToGear({
      imageUrl,
      imageBase64,
      mimeType,
    });

    res.json({
      success: true,
      message: "AI đã phân tích thành công thông số quang học & khớp thiết bị!",
      data: result,
    });
  }),
};

module.exports = aiController;

