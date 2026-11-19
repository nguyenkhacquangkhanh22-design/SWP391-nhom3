const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Equipment = require("../src/models/Equipment");

async function run() {
  console.log("Connecting to database...");
  await connectDB();

  const owner = await User.findOne({ email: "owner_kyc@test.com" });
  if (!owner) {
    throw new Error("Không tìm thấy tài khoản owner_kyc@test.com");
  }

  // Tạo thiết bị mới thuộc về owner_kyc@test.com
  const newEquipment = await Equipment.create({
    owner_id: owner._id,
    owner: owner._id,
    title: "Canon EOS R5 Full-Frame 8K Chuyên Nghiệp (Kèm 2 Pin + Thẻ CFexpress)",
    category: "Máy ảnh & Quay phim",
    brand: "Canon",
    model_name: "EOS R5",
    modelNumber: "EOS-R5-BODY",
    serial_number: "SN-CANON-R5-88219",
    dailyRate: 650000,
    depositAmount: 0,
    pricing: {
      price_per_day: 650000,
      price_per_hour: 80000,
      deposit_amount: 0,
      weekend_rate: 700000,
    },
    status: "available",
    visibility: "published",
    approval_status: "approved",
    condition: "like_new",
    description:
      "Máy ảnh mirrorless cao cấp Canon EOS R5 sở hữu cảm biến Full-frame 45MP, khả năng quay video 8K RAW và 4K 120p 10-bit siêu mượt. Hệ thống lấy nét Dual Pixel CMOS AF II nhận diện mắt người và động vật thời gian thực. Máy mới 99%, hoạt động hoàn hảo, bảo dưỡng định kỳ.",
    specifications: [
      { key: "Cảm biến", value: "Full-Frame CMOS 45 Megapixels" },
      { key: "Bộ xử lý", value: "DIGIC X Image Processor" },
      { key: "Quay video", value: "8K DCI 30p RAW & 4K 120p 10-bit 4:2:2" },
      { key: "Chống rung", value: "IBIS 5 trục trong thân máy lên đến 8 stops" },
      { key: "Khe thẻ nhớ", value: "1 khe CFexpress Type B + 1 khe SD UHS-II" },
      { key: "Màn hình", value: "Cảm ứng xoay lật 3.2 inch 2.1 triệu điểm ảnh" },
    ],
    accessories: [
      "2x Pin sạc Canon LP-E6NH chính hãng",
      "1x Đốc sạc đôi nhanh chuyên dụng",
      "1x Thẻ nhớ CFexpress Type B 128GB tốc độ 1700MB/s",
      "1x Thẻ nhớ phụ SDXC SanDisk Extreme Pro 128GB",
      "1x Dây đeo máy ảnh thao tác nhanh",
      "1x Túi máy ảnh chống sốc kháng nước",
    ],
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=900&auto=format&fit=crop",
    ],
    location: {
      address: "123 Quốc lộ 1A, Cái Bè",
      city: "Tiền Giang",
    },
    isFeatured: true,
    rental_terms:
      "Người thuê cần cung cấp CCCD còn hiệu lực và ký hợp đồng thuê điện tử trên hệ thống. Kiểm tra máy kỹ lưỡng khi bàn giao và sử dụng cẩn thận theo hướng dẫn của nhà sản xuất.",
  });

  console.log("\n🎉 ĐÃ TẠO THÀNH CÔNG THIẾT BỊ MỚI CHO OWNER KYC!");
  console.log("ID thiết bị:", newEquipment._id.toString());
  console.log("Tên thiết bị:", newEquipment.title);
  console.log("Chủ sở hữu:", owner.name, `(${owner.email})`);
  console.log("Giá thuê:", newEquipment.dailyRate.toLocaleString("vi-VN"), "đ/ngày");
  console.log("Trạng thái:", newEquipment.status, `(${newEquipment.visibility})`);

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Lỗi khi tạo thiết bị:", err);
  process.exit(1);
});

