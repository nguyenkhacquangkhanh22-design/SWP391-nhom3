const Groq = require("groq-sdk");
const Equipment = require("../models/Equipment");
const AppError = require("../utils/AppError");

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AppError(500, "GROQ_API_KEY chưa được cấu hình trên server.");
  }
  return new Groq({ apiKey });
}

/**
 * Phân tích ảnh phong cách quay chụp và đề xuất Combo thiết bị tương thích từ kho
 * @param {Object} params
 * @param {string} [params.imageUrl]
 * @param {string} [params.imageBase64]
 */
async function analyzeShotToGear({ imageUrl, imageBase64, mimeType = "image/jpeg" }) {
  const groq = getGroqClient();

  // 1. Lấy danh sách thiết bị thực tế đa dạng đang có sẵn trong kho
  const rawEquipments = await Equipment.find({
    status: { $in: ["available", "AVAILABLE", "active", "ACTIVE"] },
    visibility: { $ne: "hidden" },
  })
    .select("_id title category brand model_name dailyRate pricing specifications description images")
    .sort({ createdAt: -1 })
    .lean();

  // Deduplicate theo tên thiết bị để AI thấy được toàn bộ các dòng máy khác nhau (Canon, Sony, Fujifilm, GoPro, DJI, Blackmagic...)
  const seenTitles = new Set();
  const availableEquipments = [];
  for (const eq of rawEquipments) {
    const norm = (eq.title || "").trim().toLowerCase();
    if (!seenTitles.has(norm)) {
      seenTitles.add(norm);
      availableEquipments.push(eq);
    }
  }

  // Lọc chỉ lấy các thiết bị quay chụp, ống kính, đèn, gimbal, flycam hợp lệ
  const validGear = availableEquipments.filter(
    (e) => e.title && e.title.length > 6 && (e.brand || (e.dailyRate || 0) >= 50000)
  );

  const cameras = validGear.filter(
    (e) =>
      e.title.toLowerCase().includes("máy ảnh") ||
      e.title.toLowerCase().includes("máy quay") ||
      e.title.toLowerCase().includes("gopro") ||
      (e.category && (e.category.includes("Máy ảnh") || e.category.includes("Mirrorless")))
  );
  const accessories = validGear.filter((e) => !cameras.includes(e));

  // Ghép nối: Toàn bộ máy ảnh/máy quay đa dạng (Canon, Sony, Fujifilm, GoPro, Blackmagic) + các phụ kiện quan trọng
  const prioritized = [...cameras, ...accessories.slice(0, 10)];

  const inventorySummary = prioritized.map((eq) => ({
    id: eq._id.toString(),
    title: eq.title,
    brand: eq.brand || "",
    dailyRate: eq.dailyRate || eq.pricing?.price_per_day || 0,
    category: eq.category || "",
  }));

  // Chuẩn bị URL hình ảnh cho Groq Vision
  const effectiveImageUrl = imageBase64
    ? `data:${mimeType};base64,${imageBase64}`
    : imageUrl;

  if (!effectiveImageUrl) {
    throw new AppError(400, "Vui lòng cung cấp hình ảnh mẫu (upload file hoặc đường dẫn URL).");
  }

  const prompt = `Bạn là Giám đốc Hình ảnh (Director of Photography) & Chuyên gia Kỹ thuật Quang học của nền tảng SmartEquip.
Hãy phân tích bức ảnh/khung hình điện ảnh này và đối chiếu với DANH SÁCH THIẾT BỊ HIỆN CÓ TRONG KHO dưới đây để đề xuất Combo thiết bị cho thuê phù hợp nhất.

DANH SÁCH THIẾT BỊ HIỆN CÓ TRONG KHO CỦA CHÚNG TÔI:
${JSON.stringify(inventorySummary, null, 2)}

YÊU CẦU PHÂN TÍCH:
1. Phân tích quang học (Optical Breakdown):
   - estimated_focal_length: Tiêu cự ống kính ước tính (ví dụ: "85mm (Chân dung tele ngắn)" hoặc "35mm (Góc rộng kịch tính)").
   - estimated_aperture: Khẩu độ ước tính và đặc điểm xóa phông (ví dụ: "f/1.4 - f/1.8 (DOF mỏng, bokeh tròn mịn)").
   - lighting_setup: Phân tích hướng ánh sáng (Key light, Fill light, Rim light, ánh sáng tự nhiên hay nhân tạo).
   - motion_stability: Yêu cầu độ ổn định máy (Tripod tĩnh, Gimbal chống rung, Handheld phong cách tự nhiên).
   - color_tone: Phong cách màu sắc (Teal & Orange, Vintage, Warm Golden Hour, High Contrast Noir...).

2. So khớp thiết bị trong kho (Gear Matching):
   - Đánh giá đặc thù thể loại của bức ảnh (Chân dung nghệ thuật, Thể thao hành động/xe cộ, Màu phim hoài cổ vintage, Sân khấu concert thiếu sáng, Video điện ảnh, Toàn cảnh trên cao...).
   - Chọn ra 1 thiết bị Body/Camera phù hợp nhất từ DANH SÁCH TRÊN (phải điền đúng 'id' từ danh sách).
     * Ảnh thể thao, đua xe, hành động tốc độ cao -> Ưu tiên máy chụp siêu tốc như Canon EOS R6 Mark II (40fps) hoặc GoPro Hero 12.
     * Ảnh chân dung nghệ thuật xóa phông mịn màng -> Ưu tiên Canon EOS R5 (45MP tái tạo da đẹp) hoặc Sony Alpha A7 IV.
     * Ảnh phong cách hoài cổ, du lịch, đường phố, màu film -> Ưu tiên Fujifilm X-T5 (chuyên giả lập màu phim).
     * Ảnh sân khấu nhạc sống, concert neon, cảnh đêm thiếu sáng -> Ưu tiên Sony FX3 Cinema Line hoặc Blackmagic Pocket 6K Pro.
     * Ảnh góc rộng trên không, phong cảnh từ trên cao -> Ưu tiên Flycam DJI Mavic 3 Pro Cine hoặc Mini 4 Pro.
   - Gợi ý ống kính (Lens), hệ thống đèn và phụ kiện chân máy/gimbal đi kèm.
   - match_confidence: Điểm phần trăm tương đồng (từ 75 đến 98).
   - match_status: "EXACT_MATCH" hoặc "BEST_ALTERNATIVE".

3. Hướng dẫn thực hành (Actionable Tips):
   - shooting_tips: Lời khuyên khi setup góc máy, khoảng cách đứng so với chủ thể.
   - post_production_tips: Mẹo hậu kỳ màu sắc (Lightroom/Premiere/LUT) để đạt tone màu giống ảnh mẫu.

QUY TẮC BẮT BUỘC:
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown \`\`\`json, không kèm lời chào).
Mỗi trường giải thích ngắn gọn, súc tích (1-2 câu), không viết dài dòng.
Cấu trúc JSON đúng định dạng sau:
{
  "optical_analysis": {
    "estimated_focal_length": "...",
    "estimated_aperture": "...",
    "lighting_setup": "...",
    "motion_stability": "...",
    "color_tone": "..."
  },
  "match_confidence": 92,
  "match_status": "BEST_ALTERNATIVE",
  "match_verdict": "Lời tóm tắt 1 câu về khả năng tái hiện shot hình này với thiết bị trong kho",
  "recommended_combo": {
    "body_equipment_id": "ID_TRONG_KHO_NẾU_CÓ",
    "body_title": "Tên máy",
    "body_daily_rate": 650000,
    "body_reason": "Lý do kỹ thuật tại sao chọn máy này",
    "lens_recommendation": "Gợi ý tiêu cự & khẩu độ ống kính cần dùng",
    "lighting_recommendation": "Gợi ý loại đèn chiếu sáng",
    "stabilizer_recommendation": "Gợi ý chân máy hoặc gimbal",
    "total_estimated_rate": 850000
  },
  "shooting_tips": "Hướng dẫn góc máy và khoảng cách thực tế",
  "post_production_tips": "Hướng dẫn chỉnh màu và preset"
}`;

  async function callGroqWithRetry(retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await groq.chat.completions.create({
          model: "qwen/qwen3.8-27b",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: effectiveImageUrl },
                },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 850,
        });
      } catch (err) {
        if (err.status === 429 && attempt < retries) {
          const waitMs = 2500 * (attempt + 1);
          console.warn(`[Groq Vision] Rate limit 429, đang đợi ${waitMs}ms để tự động thử lại (Lần ${attempt + 1}/${retries})...`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        throw err;
      }
    }
  }

  const completion = await callGroqWithRetry();
  const rawContent = completion.choices[0]?.message?.content || "";
  
  // Parse JSON an toàn
  let parsedResult;
  try {
    const cleaned = rawContent
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsedResult = JSON.parse(cleaned);
  } catch (err) {
    // Dự phòng tìm đoạn JSON bên trong văn bản
    const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "");
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsedResult = JSON.parse(match[0]);
      } catch (innerErr) {
        throw new AppError(500, "Lỗi phân tích JSON từ AI: " + innerErr.message);
      }
    } else {
      throw new AppError(500, "AI không trả về đúng định dạng dữ liệu phân tích. Vui lòng thử lại với ảnh khác.");
    }
  }

  // Bổ sung thông tin chi tiết của thiết bị khớp trong kho nếu có
  if (parsedResult.recommended_combo?.body_equipment_id) {
    const matchedDoc = availableEquipments.find(
      (eq) => eq._id.toString() === parsedResult.recommended_combo.body_equipment_id
    );
    if (matchedDoc) {
      parsedResult.matched_equipment_detail = {
        _id: matchedDoc._id,
        title: matchedDoc.title,
        dailyRate: matchedDoc.dailyRate || matchedDoc.pricing?.price_per_day || 0,
        images: matchedDoc.images || [],
        brand: matchedDoc.brand,
        category: matchedDoc.category,
      };
    }
  }

  return parsedResult;
}

module.exports = {
  analyzeShotToGear,
};