const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const dns = require("node:dns");
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
}

const mongoose = require("mongoose");
const User = require("./models/User");
const Equipment = require("./models/Equipment");

const sampleEquipments = [
  {
    title: "Máy ảnh Sony Alpha A7 IV (Body) + Ống kính 24-70mm GM",
    description: "Máy ảnh Full-frame đa năng 33MP, quay phim 4K 60p 10-bit 4:2:2. Cảm biến sắc nét, lấy nét mắt tự động Real-time Eye AF. Đi kèm thẻ nhớ 128GB tốc độ cao và 2 pin.",
    category: "Máy ảnh & Quay phim",
    brand: "Sony",
    modelNumber: "ILCE-7M4",
    dailyRate: 450000,
    depositAmount: 15000000,
    status: "APPROVED",
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    ],
    condition: "like-new",
    isFeatured: true,
    location: { address: "123 Nguyễn Huệ, Phường Bến Nghé", city: "Quận 1, TP.HCM" },
  },
  {
    title: "Flycam DJI Mini 4 Pro Combo Plus (3 Pin + Túi đựng)",
    description: "Flycam dưới 249g cảm biến va chạm đa hướng, truyền video FHD 20km, quay video dọc 4K/60fps HDR. Pin Plus cho thời lượng bay tối đa 45 phút/pin.",
    category: "Flycam & Drone",
    brand: "DJI",
    modelNumber: "DJI-MINI4PRO",
    dailyRate: 350000,
    depositAmount: 8000000,
    status: "APPROVED",
    images: [
      "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80",
    ],
    condition: "like-new",
    isFeatured: true,
    location: { address: "45 Lê Duẩn, Phường Bến Nghé", city: "Quận 1, TP.HCM" },
  },
  {
    title: "Laptop Apple MacBook Pro 14 M3 Pro (18GB / 512GB SSD)",
    description: "MacBook Pro M3 Pro cấu hình mạnh mẽ cho dựng phim 4K, đồ họa 3D và lập trình. Màn hình Liquid Retina XDR 120Hz siêu đẹp, pin dùng liên tục 15 tiếng.",
    category: "Laptop & Công nghệ",
    brand: "Apple",
    modelNumber: "MRX33SA/A",
    dailyRate: 500000,
    depositAmount: 18000000,
    status: "APPROVED",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    ],
    condition: "like-new",
    isFeatured: true,
    location: { address: "207 Cống Quỳnh, Phường Phạm Ngũ Lão", city: "Quận 1, TP.HCM" },
  },
  {
    title: "Bộ Micro Thu Âm Không Dây DJI Mic 2 (2 TX + 1 RX)",
    description: "Micro thu âm chất lượng cao, tích hợp chống ồn thông minh Intelligent Noise Cancelling, ghi âm 32-bit float nội bộ. Khoảng cách truyền sóng ổn định lên tới 250m.",
    category: "Âm thanh & Ánh sáng",
    brand: "DJI",
    modelNumber: "DJI-MIC-2",
    dailyRate: 200000,
    depositAmount: 4000000,
    status: "APPROVED",
    images: [
      "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80",
    ],
    condition: "good",
    isFeatured: false,
    location: { address: "88 Sư Vạn Hạnh", city: "Quận 10, TP.HCM" },
  },
  {
    title: "Đèn Quay Phim Studio Aputure Amaran 200x S Bi-Color",
    description: "Đèn LED công suất 200W chuẩn Bowens mount, chỉnh nhiệt độ màu 2700K - 6500K linh hoạt. Chỉ số tái tạo màu CRI 95+, TLCI 98+ chân thực.",
    category: "Âm thanh & Ánh sáng",
    brand: "Aputure",
    modelNumber: "AMARAN-200X-S",
    dailyRate: 250000,
    depositAmount: 3500000,
    status: "APPROVED",
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    ],
    condition: "good",
    isFeatured: false,
    location: { address: "354 Điện Biên Phủ", city: "Bình Thạnh, TP.HCM" },
  },
  {
    title: "Máy Đo Khoảng Cách Laser Bosch GLM 50-27 CG (Tia xanh)",
    description: "Thước đo laser tia xanh ngoài trời đo xa tới 50m, kết nối Bluetooth truyền dữ liệu sang điện thoại. Chống nước bụi IP65 thích hợp khảo sát công trình kiến trúc.",
    category: "Thiết bị đo lường & Cơ khí",
    brand: "Bosch",
    modelNumber: "GLM-50-27-CG",
    dailyRate: 120000,
    depositAmount: 2000000,
    status: "APPROVED",
    images: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    ],
    condition: "like-new",
    isFeatured: false,
    location: { address: "12 Võ Văn Kiệt", city: "Quận 5, TP.HCM" },
  },
  {
    title: "Ống Kính Sony FE 70-200mm f/2.8 GM OSS II",
    description: "Ống kính tele zoom ngàm E siêu nhẹ, khẩu độ lớn f/2.8 toàn dải. 4 mô-tơ lấy nét tuyến tính XD cực nhanh, hệ thống chống rung quang học OSS mượt mà.",
    category: "Máy ảnh & Quay phim",
    brand: "Sony",
    modelNumber: "SEL70200GM2",
    dailyRate: 400000,
    depositAmount: 20000000,
    status: "APPROVED",
    images: [
      "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80",
    ],
    condition: "like-new",
    isFeatured: true,
    location: { address: "123 Nguyễn Huệ", city: "Quận 1, TP.HCM" },
  },
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected for seeding...");

  // Tìm hoặc tạo một user Owner đại diện
  let owner = await User.findOne({ email: "owner@smartequip.vn" });
  if (!owner) {
    owner = await User.create({
      User_Id: "OWNER-001",
      name: "SmartEquip Official Hub",
      email: "owner@smartequip.vn",
      role: "user",
      status: "active",
      trust_score: 99,
      phone: "0909123456",
      address: "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
      kycStatus: "verified",
    });
    console.log("Created official owner user:", owner.email);
  }

  // Xóa các thiết bị seed cũ nếu có và nạp mới
  await Equipment.deleteMany({ owner: owner._id });

  const equipmentsToInsert = sampleEquipments.map((item) => ({
    ...item,
    owner: owner._id,
  }));

  const inserted = await Equipment.insertMany(equipmentsToInsert);
  console.log(`Successfully seeded ${inserted.length} equipments with status APPROVED!`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
