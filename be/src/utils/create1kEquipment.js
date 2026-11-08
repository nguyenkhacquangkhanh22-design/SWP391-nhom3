const path = require("node:path");
const dns = require("node:dns");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
} else {
  dns.setServers(["1.1.1.1", "1.0.0.1"]);
}

const connectDB = require("../config/db");
const Equipment = require("../models/Equipment");
const User = require("../models/User");

async function main() {
  await connectDB();

  // Tìm Owner
  let owner = await User.findOne({ email: "owner@example.com" });
  if (!owner) owner = await User.findOne({ role: "owner" });
  if (!owner) owner = await User.findOne({});

  const testItemData = {
    title: "Thiết Bị Test Cổng Thanh Toán PayOS (1.000 đ/ngày)",
    description:
      "Thiết bị chuyên biệt để kiểm thử quy trình tạo mã VietQR động PayOS và webhook tự động duyệt đơn tức thì. Giá thuê chỉ 1.000 đ / ngày.",
    category: "Thiết bị Test Thanh toán",
    brand: "SmartEquip Lab",
    model_name: "PAYOS-TEST-1K",
    modelNumber: "PAYOS-1K",
    serial_number: "TEST-1000VND",
    dailyRate: 1000,
    depositAmount: 0,
    pricing: {
      price_per_day: 1000,
      price_per_hour: 1000,
      deposit_amount: 0,
      weekend_rate: 1000,
    },
    status: "available",
    approval_status: "approved",
    visibility: "published",
    isFeatured: true,
    condition: "like-new",
    location: {
      address: "Trung tâm Demo SmartEquip, Quận 1",
      city: "TP. Hồ Chí Minh",
    },
    images: [
      "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80",
    ],
    accessories: ["Cáp nguồn test", "Tài liệu hướng dẫn thanh toán PayOS"],
    rental_terms:
      "Thiết bị mẫu phục vụ kiểm thử tính năng thanh toán VietQR động 1.000đ.",
    cancellation_policy: "Miễn phí hủy trước 24 giờ.",
    owner: owner._id,
    owner_id: owner._id,
    availability_schedule: [
      {
        start_date: new Date("2025-01-01"),
        end_date: new Date("2030-12-31"),
        status: "available",
        note: "Luôn sẵn sàng test 24/7",
      },
    ],
  };

  const eq = await Equipment.findOneAndUpdate(
    { model_name: "PAYOS-TEST-1K" },
    { $set: testItemData },
    { upsert: true, new: true }
  );

  console.log("\n========================================================");
  console.log("✓ ĐÃ TẠO THÀNH CÔNG THIẾT BỊ TEST 1.000 ĐỒNG TRÊN ATLAS!");
  console.log("========================================================");
  console.log("- ID Thiết bị :", eq._id.toString());
  console.log("- Tên thiết bị:", eq.title);
  console.log("- Đơn giá ngày:", eq.dailyRate.toLocaleString("vi-VN"), "đ/ngày");
  console.log("- Chủ sở hữu  :", owner?.name || owner?.email);
  console.log("- Link xem    : http://localhost:5173/equipment/" + eq._id.toString());
  console.log("========================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Lỗi tạo thiết bị test:", err);
  process.exit(1);
});

