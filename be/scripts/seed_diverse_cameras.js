require("dotenv").config();
const mongoose = require("mongoose");
const Equipment = require("../src/models/Equipment");
const User = require("../src/models/User");

async function seedDiverseGear() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  let owner = await User.findOne({ email: "owner@example.com" });
  if (!owner) {
    owner = await User.findOne({ role: "owner" });
  }

  const diverseEquipments = [
    {
      title: "Máy ảnh Canon EOS R5 Full-Frame 45MP (Body) Chuyên Nghiệp",
      category: "Máy ảnh & Quay phim",
      brand: "Canon",
      model_name: "EOS R5",
      dailyRate: 650000,
      pricing: { price_per_day: 650000 },
      status: "available",
      visibility: "published",
      approval_status: "approved",
      images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop"],
      description: "Cảm biến Full-Frame 45MP siêu nét, khả năng tái tạo màu da người (skin-tone) tuyệt hảo, chuyên trị chân dung nghệ thuật và chụp thương mại cao cấp.",
      specifications: [
        { key: "Cảm biến", value: "Full-frame 45MP CMOS" },
        { key: "Quay phim", value: "8K RAW 30p, 4K 120p" },
        { key: "Mục đích tối ưu", value: "Chân dung nghệ thuật, Studio cao cấp, Commercial" }
      ],
      owner: owner?._id,
      owner_id: owner?._id,
    },
    {
      title: "Máy ảnh Canon EOS R6 Mark II Siêu Tốc 40fps Chuyên Thể Thao & Action",
      category: "Máy ảnh & Quay phim",
      brand: "Canon",
      model_name: "EOS R6 Mark II",
      dailyRate: 480000,
      pricing: { price_per_day: 480000 },
      status: "available",
      visibility: "published",
      approval_status: "approved",
      images: ["https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop"],
      description: "Tốc độ chụp liên tục cực nhanh 40 fps màn trập điện tử, hệ thống Dual Pixel AF II bám nét xe đua, vận động viên và động vật chuyển động nhanh hoàn hảo.",
      specifications: [
        { key: "Tốc độ chụp", value: "40 khung hình/giây (fps)" },
        { key: "Lấy nét", value: "Bám nét AI xe cộ, động vật, mắt người" },
        { key: "Mục đích tối ưu", value: "Thể thao tốc độ cao, Đua xe, Action, Động vật hoang dã" }
      ],
      owner: owner?._id,
      owner_id: owner?._id,
    },
    {
      title: "Máy ảnh Fujifilm X-T5 Cổ Điển & Màu Film Nghệ Thuật (Body)",
      category: "Máy ảnh & Quay phim",
      brand: "Fujifilm",
      model_name: "X-T5",
      dailyRate: 380000,
      pricing: { price_per_day: 380000 },
      status: "available",
      visibility: "published",
      approval_status: "approved",
      images: ["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop"],
      description: "Tích hợp 19 chế độ giả lập màu phim huyền thoại (Classic Chrome, Nostalgic Neg), thiết kế hoài cổ analog, chuyên phong cách Streetlife, Vintage và Du lịch.",
      specifications: [
        { key: "Cảm biến", value: "40.2MP X-Trans CMOS 5 HR" },
        { key: "Giả lập phim", value: "19 Film Simulation modes" },
        { key: "Mục đích tối ưu", value: "Màu Film Vintage, Đường phố, Du lịch nghệ thuật" }
      ],
      owner: owner?._id,
      owner_id: owner?._id,
    },
    {
      title: "Máy quay điện ảnh Sony FX3 Cinema Line Full-Frame Siêu Nhạy Sáng",
      category: "Máy ảnh & Quay phim",
      brand: "Sony",
      model_name: "FX3",
      dailyRate: 850000,
      pricing: { price_per_day: 850000 },
      status: "available",
      visibility: "published",
      approval_status: "approved",
      images: ["https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop"],
      description: "Dòng Cinema Line chuyên nghiệp với dải ISO mở rộng 409.600, S-Cinetone chuẩn màu Hollywood, tối ưu tuyệt đỉnh cho Concert sân khấu thiếu sáng và MV ca nhạc.",
      specifications: [
        { key: "ISO tối đa", value: "409.600 Low-light siêu nhạy sáng" },
        { key: "Profile màu", value: "S-Cinetone, S-Log3 15+ stops dynamic range" },
        { key: "Mục đích tối ưu", value: "Sân khấu concert, Cảnh đêm ánh sáng yếu, MV ca nhạc" }
      ],
      owner: owner?._id,
      owner_id: owner?._id,
    },
    {
      title: "Camera hành trình GoPro Hero 12 Black Chống Nước 5.3K 60fps",
      category: "Máy ảnh & Quay phim",
      brand: "GoPro",
      model_name: "Hero 12",
      dailyRate: 180000,
      pricing: { price_per_day: 180000 },
      status: "available",
      visibility: "published",
      approval_status: "approved",
      images: ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop"],
      description: "Chống rung HyperSmooth 6.0 góc siêu rộng Max Lens Mod 2.0, chống nước 10m không cần vỏ, lý tưởng cho thể thao mạo hiểm, lặn biển và góc nhìn thứ nhất (POV).",
      specifications: [
        { key: "Góc quay", value: "Ultra-wide 177 độ" },
        { key: "Chống rung", value: "HyperSmooth 6.0 + Horizon Lock 360" },
        { key: "Mục đích tối ưu", value: "Thể thao mạo hiểm, POV, Lặn biển, Gắn xe" }
      ],
      owner: owner?._id,
      owner_id: owner?._id,
    },
    {
      title: "Ống kính chân dung Canon RF 85mm f/1.2 L USM Huyền Thoại",
      category: "Máy ảnh & Quay phim",
      brand: "Canon",
      model_name: "RF 85mm f/1.2 L",
      dailyRate: 400000,
      pricing: { price_per_day: 400000 },
      status: "available",
      visibility: "published",
      approval_status: "approved",
      images: ["https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&auto=format&fit=crop"],
      description: "Ống kính chân dung cao cấp nhất của Canon với khẩu độ siêu lớn f/1.2, thấu kính quang học BR khử viền tím, tạo bokeh mịn màng như kem tan.",
      specifications: [
        { key: "Tiêu cự", value: "85mm (Chân dung chuẩn)" },
        { key: "Khẩu độ lớn nhất", value: "f/1.2 (Xóa phông cực đại)" }
      ],
      owner: owner?._id,
      owner_id: owner?._id,
    },
    {
      title: "Chân máy quay chuyên nghiệp Carbon Fiber Benro BV4-PRO",
      category: "Gimbal & Chân máy",
      brand: "Benro",
      model_name: "BV4-PRO",
      dailyRate: 120000,
      pricing: { price_per_day: 120000 },
      status: "available",
      visibility: "published",
      approval_status: "approved",
      images: ["https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?w=800&auto=format&fit=crop"],
      description: "Chân máy sợi Carbon siêu nhẹ chịu tải 4kg, đầu dầu Fluid Head xoay mượt mà, đảm bảo khung hình tĩnh tuyệt đối chống rung lắc.",
      specifications: [
        { key: "Chất liệu", value: "Carbon Fiber 8 lớp" },
        { key: "Đầu dầu", value: "Fluid Head Pan/Tilt mượt mà" }
      ],
      owner: owner?._id,
      owner_id: owner?._id,
    }
  ];

  for (const item of diverseEquipments) {
    const existing = await Equipment.findOne({ title: item.title });
    if (!existing) {
      await Equipment.create(item);
      console.log("✓ Added:", item.title);
    } else {
      existing.status = "available";
      existing.visibility = "published";
      await existing.save();
      console.log("✓ Updated:", item.title);
    }
  }

  // Also make sure all existing hidden equipment in DB is set to published so AI and marketplace see them!
  const updatedAll = await Equipment.updateMany(
    { status: { $in: ["available", "AVAILABLE", "active", "ACTIVE"] } },
    { $set: { visibility: "published", status: "available" } }
  );
  console.log(`✓ Updated ${updatedAll.modifiedCount} equipments to published.`);

  await mongoose.disconnect();
  console.log("Done seeding diverse equipment.");
}

seedDiverseGear().catch(console.error);

