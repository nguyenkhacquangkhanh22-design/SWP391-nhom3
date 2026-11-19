require("dotenv").config();
const mongoose = require("mongoose");
const aiService = require("../src/services/aiService");

const PRESETS = [
  {
    name: "Preset 1: Chân dung Cinematic",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Preset 2: Concert Sân Khấu Low-light",
    url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Preset 3: Xe Đua & Action Tốc Độ Cao",
    url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
  },
];

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("=== BẮT ĐẦU KIỂM THỬ KHẢ NĂNG CHỌN THIẾT BỊ KHÁC NHAU CỦA AI ===");

  for (const preset of PRESETS) {
    console.log(`\n--------------------------------------------`);
    console.log(`Đang phân tích: ${preset.name}...`);
    try {
      const res = await aiService.analyzeShotToGear({ imageUrl: preset.url });
      console.log(`✓ Kết quả AI chọn:`);
      console.log(`  - Máy ảnh đề xuất: [${res.recommended_combo?.body_title}]`);
      console.log(`  - Độ tương đồng: ${res.match_confidence}% (${res.match_status})`);
      console.log(`  - Tiêu cự: ${res.optical_analysis?.estimated_focal_length}`);
      console.log(`  - Khẩu độ: ${res.optical_analysis?.estimated_aperture}`);
      console.log(`  - Ống kính kèm theo: ${res.recommended_combo?.lens_recommendation}`);
      console.log(`  - Lý do chọn: ${res.recommended_combo?.body_reason}`);
    } catch (err) {
      console.error(`Lỗi phân tích ${preset.name}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log(`\n=== HOÀN TẤT KIỂM THỬ ===`);
}

runTests().catch(console.error);

