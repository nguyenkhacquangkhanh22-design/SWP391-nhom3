const bcrypt = require("bcrypt");
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const OwnerProfile = require("../models/OwnerProfile");
const RentalRequest = require("../models/RentalRequest");
const RentalContract = require("../models/RentalContract");
const HandoverRecord = require("../models/HandoverRecord");
const Settlement = require("../models/Settlement");

async function seedData() {
  console.log("--- Bắt đầu nạp dữ liệu mẫu cho Owner (10 Use Cases) ---");

  // 1. Create or update Owner account (UC_O01)
  let owner = await User.findOne({ email: "owner@example.com" });
  const passwordHash = await bcrypt.hash("Owner@123456", 12);

  if (!owner) {
    owner = await User.create({
      User_Id: "USR-OWNER-01",
      name: "Nguyễn Văn Owner",
      email: "owner@example.com",
      password_hash: passwordHash,
      role: "owner",
      status: "active",
      trust_score: 98,
    });
    console.log("✓ Đã tạo tài khoản Owner: owner@example.com / Owner@123456");
  } else {
    owner.role = "owner";
    owner.password_hash = passwordHash;
    owner.status = "active";
    await owner.save();
    console.log("✓ Đã cập nhật tài khoản Owner: owner@example.com / Owner@123456");
  }

  // 2. Create sample Renter account
  let renter = await User.findOne({ email: "renter@example.com" });
  const renterHash = await bcrypt.hash("Renter@123456", 12);
  if (!renter) {
    renter = await User.create({
      User_Id: "USR-RENTER-01",
      name: "Trần Thị Khách Thuê",
      email: "renter@example.com",
      password_hash: renterHash,
      role: "user",
      status: "active",
      trust_score: 95,
    });
    console.log("✓ Đã tạo tài khoản Khách thuê: renter@example.com / Renter@123456");
  } else {
    renter.password_hash = renterHash;
    await renter.save();
  }

  // 3. Create Owner Profile (UC_O02)
  await OwnerProfile.findOneAndUpdate(
    { user_id: owner._id },
    {
      user_id: owner._id,
      shop_name: "Studio Thiết Bị Sài Gòn Pro",
      phone: "0908 123 456",
      identity_card: "079201009876",
      address: "123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh",
      identity_card_front: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop",
      identity_card_back: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop",
      bank_name: "Vietcombank",
      bank_account_number: "0071001234567",
      bank_account_holder: "NGUYEN VAN OWNER",
      status: "approved",
    },
    { upsert: true, new: true }
  );
  console.log("✓ Đã nạp hồ sơ định danh & tài khoản ngân hàng Owner (UC_O02)");

  // Clear existing owner equipments & related records to prevent duplication
  await Equipment.deleteMany({ owner_id: owner._id });
  await RentalRequest.deleteMany({ owner_id: owner._id });
  await RentalContract.deleteMany({ owner_id: owner._id });
  await HandoverRecord.deleteMany({ owner_id: owner._id });
  await Settlement.deleteMany({ owner_id: owner._id });

  // 4. Create sample Equipments (UC_O03, UC_O04, UC_O05, UC_O06)
  const eq1 = await Equipment.create({
    owner_id: owner._id,
    title: "Sony Alpha A7 IV (Body) Chuyên Nghiệp",
    category: "Máy ảnh Mirrorless",
    brand: "Sony",
    model_name: "ILCE-7M4",
    serial_number: "SN-SONY-748291",
    description: "Cảm biến Full-frame 33MP, quay 4K 60p 10-bit 4:2:2, lấy nét theo mắt thời gian thực. Máy mới 98%, hoạt động hoàn hảo.",
    specifications: [
      { key: "Cảm biến", value: "Full-Frame Exmor R CMOS 33MP" },
      { key: "Quay video", value: "4K 60p, 10-bit 4:2:2 All-Intra" },
      { key: "Chống rung", value: "5 trục SteadyShot 5.5 stops" },
      { key: "Ngàm ống kính", value: "Sony E-mount" },
    ],
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop"],
    accessories: ["2 Pin zin FZ100", "Sạc đôi nhanh", "Thẻ nhớ Sony Tough 128GB", "Dây đeo Peak Design", "Hộp chống sốc"],
    condition: "Như mới (98%)",
    pricing: {
      price_per_hour: 80000,
      price_per_day: 550000,
      deposit_amount: 5000000,
      weekend_rate: 650000,
    },
    rental_terms: "Bảo quản cẩn thận, không tự ý tháo mở thiết bị. Hoàn trả đúng hẹn theo giờ quy định.",
    cancellation_policy: "Miễn phí hủy đơn trước 24 giờ. Hủy sau thời gian này phí phạt 20% giá trị hợp đồng.",
    visibility: "published",
    status: "available",
    availability_schedule: [
      {
        start_date: new Date(Date.now() + 86400000),
        end_date: new Date(Date.now() + 86400000 * 3),
        status: "available",
        note: "Thiết bị sẵn sàng giao cho khách",
      },
      {
        start_date: new Date(Date.now() + 86400000 * 5),
        end_date: new Date(Date.now() + 86400000 * 7),
        status: "blocked",
        note: "Lịch bảo dưỡng cảm biến định kỳ (UC_O05)",
      },
    ],
  });

  const eq2 = await Equipment.create({
    owner_id: owner._id,
    title: "Ống kính Sony FE 24-70mm f/2.8 GM II",
    category: "Ống kính Lens",
    brand: "Sony",
    model_name: "SEL2470GM2",
    serial_number: "SN-GM2-993821",
    description: "Ống kính zoom tiêu chuẩn đa dụng cao cấp nhất của Sony G Master. Khẩu lớn f/2.8 sắc nét từng chi tiết, bokeh mượt mà.",
    specifications: [
      { key: "Tiêu cự", value: "24-70mm" },
      { key: "Khẩu độ tối đa", value: "f/2.8" },
      { key: "Kính lọc", value: "Phi 82mm" },
    ],
    images: ["https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&auto=format&fit=crop"],
    accessories: ["Hood zin che nắng", "Nắp trước sau", "Filter B+W nano phi 82mm", "Túi nhung chống sốc"],
    condition: "Rất tốt (95%)",
    pricing: {
      price_per_hour: 50000,
      price_per_day: 350000,
      deposit_amount: 3500000,
    },
    rental_terms: "Luôn gắn filter bảo vệ thấu kính trước trong suốt quá trình sử dụng.",
    visibility: "published",
    status: "available",
  });

  const eq3 = await Equipment.create({
    owner_id: owner._id,
    title: "Gimbal DJI RS 3 Pro Combo Quay Phim",
    category: "Gimbal & Chống rung",
    brand: "DJI",
    model_name: "RS3-PRO-COMBO",
    serial_number: "SN-DJI-882319",
    description: "Gimbal chống rung chuyên nghiệp tải trọng 4.5kg bằng sợi carbon. Khóa trục tự động, điều khiển màn hình cảm ứng OLED.",
    specifications: [
      { key: "Tải trọng", value: "4.5 kg" },
      { key: "Chất liệu", value: "Sợi carbon nguyên khối" },
      { key: "Thời lượng pin", value: "12 giờ" },
    ],
    images: ["https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80"],
    accessories: ["Tay cầm Briefcase", "Mô tơ lấy nét Focus Motor", "Bộ truyền hình ảnh RavenEye", "Vali chống sốc"],
    condition: "Hoàn hảo (99%)",
    pricing: {
      price_per_hour: 60000,
      price_per_day: 400000,
      deposit_amount: 4000000,
    },
    visibility: "published",
    status: "available",
  });
  console.log("✓ Đã nạp 3 thiết bị mẫu kèm ảnh, bảng giá & lịch trống/bận (UC_O03-UC_O06)");

  // 5. Create Intermediary Rental Requests (UC_O07)
  await RentalRequest.create({
    request_code: "REQ-IM-2026-001",
    equipment_id: eq1._id,
    owner_id: owner._id,
    renter_id: renter._id,
    renter_name: "Trần Thị Khách Thuê (Khách qua Trung Gian)",
    renter_phone: "0918 777 999",
    renter_email: "renter@example.com",
    rental_type: "daily",
    start_date: new Date(Date.now() + 86400000 * 2),
    end_date: new Date(Date.now() + 86400000 * 4),
    duration_days: 2,
    duration_hours: 48,
    rental_fee: 1100000,
    deposit_amount: 5000000,
    total_estimated_amount: 6100000,
    renter_note: "Bộ phận Trung gian hỏi: Khách cần quay TVC quảng cáo tại Đà Lạt trong 2 ngày, Owner xác nhận thiết bị có sẵn sàng cho thuê không?",
    status: "pending",
  });

  const req2 = await RentalRequest.create({
    request_code: "REQ-IM-2026-002",
    equipment_id: eq2._id,
    owner_id: owner._id,
    renter_id: renter._id,
    renter_name: "Lê Hoàng Long (Studio Cưới Sài Gòn)",
    renter_phone: "0903 888 222",
    renter_email: "long.le@example.com",
    rental_type: "daily",
    start_date: new Date(Date.now() - 86400000 * 4),
    end_date: new Date(Date.now() - 86400000 * 2),
    duration_days: 2,
    duration_hours: 48,
    rental_fee: 700000,
    deposit_amount: 3500000,
    total_estimated_amount: 4200000,
    renter_note: "Chụp album ngoại cảnh Vũng Tàu.",
    status: "approved",
    responded_at: new Date(Date.now() - 86400000 * 5),
  });
  console.log("✓ Đã nạp yêu cầu hỏi thuê từ bộ phận Trung gian (UC_O07)");

  // 6. Create Contracts & Return Inspection (UC_O09)
  const contract1 = await RentalContract.create({
    contract_code: "HD-2026-RENT-001",
    request_id: req2._id,
    title: "Hợp đồng thuê Gimbal DJI RS 3 Pro - Sự kiện âm nhạc",
    equipment_id: eq3._id,
    owner_id: owner._id,
    renter_id: renter._id,
    status: "completed",
    rental_price: 800000,
    deposit_amount: 4000000,
    start_date: new Date(Date.now() - 86400000 * 3),
    end_date: new Date(Date.now() - 86400000),
    rental_period: {
      start_date: new Date(Date.now() - 86400000 * 3),
      end_date: new Date(Date.now() - 86400000),
    },
    financials: {
      rental_fee: 800000,
      deposit_amount: 4000000,
      total_amount: 4800000,
    },
    terms_content: "Điều khoản thuê máy chuẩn sàn SWP391.",
  });

  await HandoverRecord.create({
    contract_id: contract1._id,
    equipment_id: eq3._id,
    owner_id: owner._id,
    renter_id: renter._id,
    record_type: "return",
    record_date: new Date(Date.now() - 86400000),
    physical_condition: "Trầy xước nhẹ ở góc đế gắn tripod",
    working_status: "Hoạt động tốt 100% chức năng",
    accessories_checklist: [
      { item: "2 Pin zin", checked: true },
      { item: "Sạc đôi", checked: true },
      { item: "Thẻ nhớ 128GB", checked: true },
      { item: "Dây đeo", checked: true },
    ],
    missing_items: [],
    damage_detected: "Vết xước nhẹ ở lớp sơn kim loại đáy, không ảnh hưởng kỹ thuật.",
    estimated_damage_cost: 0,
    evidence_photos: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop"],
    notes: "Khách hoàn trả đúng hẹn, phụ kiện đầy đủ. Đã nghiệm thu và gửi báo cáo cho Trung gian.",
    owner_confirmed: true,
    renter_confirmed: true,
    moderator_review: {
      status: "verified",
      note: "Trung gian đã đối chiếu biên bản hoàn trả hợp lệ.",
    },
  });
  console.log("✓ Đã nạp hợp đồng và biên bản nghiệm thu thiết bị hoàn trả (UC_O09)");

  // 7. Create Settlements (UC_O10) & Revenue History (UC_O11)
  await Settlement.create({
    settlement_code: "SETTLE-2026-001",
    contract_id: contract1._id,
    owner_id: owner._id,
    renter_id: renter._id,
    total_rental_fee: 1650000,
    platform_fee: 165000, // 10%
    deposit_paid: 5000000,
    deposit_refund_to_renter: 5000000,
    owner_payout_amount: 1485000, // 1650000 - 165000
    owner_confirmed: false,
    payout_status: "pending_owner_confirmation",
    bank_info: {
      bank_name: "Vietcombank",
      account_number: "0071001234567",
      account_holder: "NGUYEN VAN OWNER",
    },
  });

  await Settlement.create({
    settlement_code: "SETTLE-2026-002",
    contract_id: contract1._id,
    owner_id: owner._id,
    renter_id: renter._id,
    total_rental_fee: 2400000,
    platform_fee: 240000, // 10%
    deposit_paid: 4000000,
    deposit_refund_to_renter: 4000000,
    owner_payout_amount: 2160000,
    owner_confirmed: true,
    owner_confirmed_at: new Date(Date.now() - 86400000 * 3),
    payout_status: "paid",
    paid_at: new Date(Date.now() - 86400000 * 3),
    bank_info: {
      bank_name: "Vietcombank",
      account_number: "0071001234567",
      account_holder: "NGUYEN VAN OWNER",
    },
  });
  console.log("✓ Đã nạp hồ sơ quyết toán tiền & lịch sử giải ngân doanh thu (UC_O10, UC_O11)");

  console.log("--- Hoàn tất nạp dữ liệu mẫu 10 Use Cases cho Owner thành công! ---");
}

module.exports = seedData;
