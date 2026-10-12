const mongoose = require("mongoose");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const User = require("../models/User");
const Equipment = require("../models/Equipment");
const RentalRequest = require("../models/RentalRequest");
const RentalContract = require("../models/RentalContract");
const HandoverRecord = require("../models/HandoverRecord");
const Settlement = require("../models/Settlement");
const OwnerApplication = require("../models/OwnerApplication");
const SupportTicket = require("../models/SupportTicket");
const Dispute = require("../models/Dispute");
const connectDB = require("../config/db");

async function seedData() {
  await connectDB();
  console.log("Connected to MongoDB for seeding...");

  // Find or create an owner user
  let owner = await User.findOne({ role: "owner" });
  if (!owner) {
    owner = await User.findOne({ role: { $in: ["user", "systemadmin"] } });
    if (owner) {
      owner.role = "owner";
      await owner.save();
      console.log(`Updated user ${owner.email} to role: owner`);
    } else {
      console.log("No user found to set as owner. Please register a user first.");
      process.exit(0);
    }
  }

  // Find or create a renter user
  let renter = await User.findOne({ _id: { $ne: owner._id } });
  if (!renter) {
    renter = owner; // Fallback
  }

  // Check if equipments already exist
  const existingEquipments = await Equipment.countDocuments({ owner_id: owner._id });
  if (existingEquipments === 0) {
    const eq1 = await Equipment.create({
      owner_id: owner._id,
      title: "Sony Alpha A7 IV (Body + Lens FE 24-70mm F2.8 GM II)",
      category: "Máy ảnh & Ống kính",
      brand: "Sony",
      model_name: "A7M4",
      serial_number: "SN-SNY-74892",
      description: "Máy ảnh full-frame chuyên nghiệp quay 4K 60p, cảm biến 33MP Exmor R. Phù hợp quay TVC, sự kiện và chụp ảnh chân dung ngoại cảnh.",
      specifications: [
        { key: "Cảm biến", value: "33 Megapixel Full-Frame Exmor R CMOS" },
        { key: "Quay phim", value: "4K 60p 10-bit 4:2:2 All-Intra" },
        { key: "Lấy nét", value: "759 điểm lấy nét theo pha, Real-time Eye AF" },
      ],
      images: [
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80",
      ],
      accessories: ["2 Pin Sony FZ100", "Sạc kép", "Thẻ nhớ Sony Tough 128GB", "Dây đeo Peak Design", "Túi đựng chống sốc"],
      condition: "Như mới (99%)",
      pricing: {
        price_per_hour: 80000,
        price_per_day: 650000,
        deposit_amount: 15000000,
        weekend_rate: 700000,
      },
      rental_terms: "Yêu cầu CCCD gắn chip gốc và kiểm tra tình trạng máy tại chỗ trước khi nhận.",
      cancellation_policy: "Hủy trước 24 giờ hoàn 100% cọc.",
      visibility: "published",
      status: "available",
      rating: 4.9,
      review_count: 14,
    });

    const eq2 = await Equipment.create({
      owner_id: owner._id,
      title: "DJI Mavic 3 Pro Cine Fly More Combo",
      category: "Flycam & Drone",
      brand: "DJI",
      model_name: "Mavic 3 Pro",
      serial_number: "SN-DJI-99812",
      description: "Drone 3 camera Hasselblad cao cấp, zoom quang 7x, Apple ProRes 422 HQ. Thời gian bay 43 phút.",
      specifications: [
        { key: "Camera chính", value: "4/3 CMOS Hasselblad 20MP" },
        { key: "Thời gian bay", value: "Tối đa 43 phút mỗi pin" },
        { key: "Khoảng cách truyền", value: "DJI O3+ lên tới 15km" },
      ],
      images: [
        "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80",
      ],
      accessories: ["3 Pin thông minh", "Bộ lọc ND 8/16/32/64", "Bộ điều khiển DJI RC Pro", "Balo chuyên dụng"],
      condition: "Tốt (95%)",
      pricing: {
        price_per_hour: 150000,
        price_per_day: 1200000,
        deposit_amount: 25000000,
      },
      rental_terms: "Chỉ cho thuê đối với phi công có kinh nghiệm bay hoặc có chứng chỉ điều khiển.",
      cancellation_policy: "Miễn phí hủy trước 48 giờ.",
      visibility: "published",
      status: "available",
      rating: 5.0,
      review_count: 8,
    });

    console.log("Created 2 sample equipments.");

    // Create a sample rental request
    const req1 = await RentalRequest.create({
      request_code: "YC-2026-98A1",
      equipment_id: eq1._id,
      owner_id: owner._id,
      renter_id: renter._id,
      renter_name: renter.name || "Nguyễn Hoàng Nam",
      renter_phone: "0912345678",
      renter_email: renter.email || "nam.nguyen@example.com",
      rental_type: "daily",
      start_date: new Date(Date.now() + 86400000),
      end_date: new Date(Date.now() + 86400000 * 3),
      duration_days: 2,
      duration_hours: 48,
      rental_fee: 1300000,
      deposit_amount: 15000000,
      total_estimated_amount: 16300000,
      renter_note: "Em thuê quay sự kiện workshop cuối tuần tại Hà Nội, xin giữ gìn máy cẩn thận.",
      status: "pending",
    });

    console.log("Created sample rental request.");
  }

  console.log("Seeding completed successfully.");
  process.exit(0);
}

if (require.main === module) {
  seedData().catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
}

module.exports = seedData;
