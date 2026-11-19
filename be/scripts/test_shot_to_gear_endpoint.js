require("dotenv").config();
const mongoose = require("mongoose");
const aiService = require("../src/services/aiService");

async function testBackendShotToGear() {
  console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG CHỨC NĂNG SHOT-TO-GEAR (GROQ AI) ===");
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartequip";
  console.log("1. Kết nối MongoDB:", mongoUri);
  await mongoose.connect(mongoUri);
  console.log("✓ Đã kết nối MongoDB thành công.");

  const sampleImageUrl = "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80";
  console.log("2. Gửi ảnh mẫu tới aiService.analyzeShotToGear...");
  console.log("   URL:", sampleImageUrl);

  const startTime = Date.now();
  const result = await aiService.analyzeShotToGear({
    imageUrl: sampleImageUrl,
  });
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`✓ AI phản hồi thành công trong ${duration}s!`);
  console.log("\n--- KẾT QUẢ PHÂN TÍCH QUANG HỌC (OPTICAL BREAKDOWN) ---");
  console.log("Tiêu cự ước tính:", result.optical_analysis?.estimated_focal_length);
  console.log("Khẩu độ ước tính:", result.optical_analysis?.estimated_aperture);
  console.log("Hệ thống ánh sáng:", result.optical_analysis?.lighting_setup);
  console.log("Độ ổn định máy:", result.optical_analysis?.motion_stability);
  console.log("Tone màu:", result.optical_analysis?.color_tone);

  console.log("\n--- KẾT QUẢ KHỚP THIẾT BỊ TRONG KHO (GEAR MATCHING) ---");
  console.log("Độ tự tin khớp:", result.match_confidence + "%");
  console.log("Trạng thái khớp:", result.match_status);
  console.log("Nhận định AI:", result.match_verdict);
  console.log("Thiết bị được đề xuất:", result.recommended_combo?.body_title);
  console.log("Giá thuê dự kiến:", result.recommended_combo?.body_daily_rate, "VNĐ/ngày");
  console.log("Lý do chọn máy:", result.recommended_combo?.body_reason);
  console.log("Gợi ý Lens:", result.recommended_combo?.lens_recommendation);
  console.log("Gợi ý Đèn:", result.recommended_combo?.lighting_recommendation);
  console.log("Gợi ý Gimbal/Tripod:", result.recommended_combo?.stabilizer_recommendation);
  if (result.matched_equipment_detail) {
    console.log("✓ Tìm thấy Equipment trong CSDL MongoDB:", {
      id: result.matched_equipment_detail._id,
      title: result.matched_equipment_detail.title,
      category: result.matched_equipment_detail.category,
    });
  }

  console.log("\n--- HƯỚNG DẪN THỰC HÀNH & HẬU KỲ ---");
  console.log("Mẹo chụp góc máy:", result.shooting_tips);
  console.log("Mẹo hậu kỳ màu sắc:", result.post_production_tips);

  await mongoose.disconnect();
  console.log("\n=== KIỂM THỬ THÀNH CÔNG 100% ===");
}

testBackendShotToGear().catch((err) => {
  console.error("❌ Lỗi kiểm thử:", err);
  process.exit(1);
});

