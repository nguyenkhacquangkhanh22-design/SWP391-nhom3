const Rental = require("../models/Rental");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const OwnerProfile = require("../models/OwnerProfile");
const RentalRequest = require("../models/RentalRequest");
const RentalContract = require("../models/RentalContract");
const HandoverRecord = require("../models/HandoverRecord");
const Settlement = require("../models/Settlement");

async function seedData() {
  console.log("--- Bắt đầu nạp dữ liệu mẫu cho Hệ thống Thuê Thiết Bị ---");

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

  // 2b. Create sample Web Manager / Rental Moderator account
  let moderator = await User.findOne({ email: "moderator@example.com" });
  const modHash = await bcrypt.hash("Moderator@123456", 12);
  if (!moderator) {
    moderator = await User.create({
      User_Id: "USR-MOD-01",
      name: "Quản Lý Web (Rental Moderator)",
      email: "moderator@example.com",
      password_hash: modHash,
      role: "rentalmoderator",
      status: "active",
      trust_score: 100,
    });
    console.log("✓ Đã tạo tài khoản Quản lý web (Moderator): moderator@example.com / Moderator@123456");
  } else {
    moderator.role = "rentalmoderator";
    moderator.password_hash = modHash;
    moderator.status = "active";
    await moderator.save();
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
  await Rental.deleteMany({});
  await HandoverRecord.deleteMany({ owner_id: owner._id });
  await Settlement.deleteMany({ owner_id: owner._id });

  // 4. Create sample Equipments (UC_O03, UC_O04, UC_O05, UC_O06)
  const eq1 = await Equipment.create({
    owner_id: owner._id,
    title: "Sony Alpha A7 IV (Body) Chuyên Nghiệp",
    category: "Máy ảnh & Quay phim",
    dailyRate: 550000,
    depositAmount: 0,
    owner: owner._id,
    approval_status: "approved",
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
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800&auto=format&fit=crop",
    ],
    accessories: ["2 Pin zin FZ100", "Sạc đôi nhanh", "Thẻ nhớ Sony Tough 128GB", "Dây đeo Peak Design", "Hộp chống sốc"],
    condition: "Như mới (98%)",
    pricing: {
      price_per_hour: 80000,
      price_per_day: 550000,
      deposit_amount: 0,
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
    category: "Máy ảnh & Quay phim",
    dailyRate: 350000,
    depositAmount: 0,
    owner: owner._id,
    approval_status: "approved",
    brand: "Sony",
    model_name: "SEL2470GM2",
    serial_number: "SN-GM2-993821",
    description: "Ống kính zoom tiêu chuẩn đa dụng cao cấp nhất của Sony G Master. Khẩu lớn f/2.8 sắc nét từng chi tiết, bokeh mượt mà.",
    specifications: [
      { key: "Tiêu cự", value: "24-70mm" },
      { key: "Khẩu độ tối đa", value: "f/2.8" },
      { key: "Kính lọc", value: "Phi 82mm" },
    ],
    images: [
      "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop",
    ],
    accessories: ["Hood zin che nắng", "Nắp trước sau", "Filter B+W nano phi 82mm", "Túi nhung chống sốc"],
    condition: "Rất tốt (95%)",
    pricing: {
      price_per_hour: 50000,
      price_per_day: 350000,
      deposit_amount: 0,
    },
    rental_terms: "Luôn gắn filter bảo vệ thấu kính trước trong suốt quá trình sử dụng.",
    visibility: "published",
    status: "available",
  });

  const eq3 = await Equipment.create({
    owner_id: owner._id,
    title: "Gimbal DJI RS 3 Pro Combo Quay Phim",
    category: "Máy ảnh & Quay phim",
    dailyRate: 400000,
    depositAmount: 0,
    owner: owner._id,
    approval_status: "approved",
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
      deposit_amount: 0,
    },
    visibility: "published",
    status: "available",
  });
    const eq4 = await Equipment.create({
    owner_id: owner._id,
    owner: owner._id,
    title: "Flycam DJI Mini 4 Pro Combo Plus (3 Pin)",
    category: "Flycam & Drone",
    brand: "DJI",
    model_name: "DJI-MINI4PRO",
    modelNumber: "DJI-MINI4PRO",
    serial_number: "SN-DJI-443912",
    description: "Flycam dưới 249g cảm biến va chạm đa hướng, truyền video FHD 20km, quay video dọc 4K/60fps HDR. Pin Plus cho thời lượng bay tối đa 45 phút/pin.",
    images: ["https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80"],
    condition: "Như mới (99%)",
    dailyRate: 350000,
    depositAmount: 0,
    pricing: {
      price_per_hour: 50000,
      price_per_day: 350000,
      deposit_amount: 0,
    },
    visibility: "published",
    status: "available",
    approval_status: "approved",
  });

  const eq5 = await Equipment.create({
    owner_id: owner._id,
    owner: owner._id,
    title: "Laptop Apple MacBook Pro 14 M3 Pro (18GB / 512GB SSD)",
    category: "Laptop & Công nghệ",
    brand: "Apple",
    model_name: "MRX33SA/A",
    modelNumber: "MRX33SA/A",
    serial_number: "SN-MBP-992182",
    description: "MacBook Pro M3 Pro cấu hình mạnh mẽ cho dựng phim 4K, đồ họa 3D và lập trình. Màn hình Liquid Retina XDR 120Hz siêu đẹp.",
    images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"],
    condition: "Như mới (99%)",
    dailyRate: 500000,
    depositAmount: 0,
    pricing: {
      price_per_hour: 80000,
      price_per_day: 500000,
      deposit_amount: 0,
    },
    visibility: "published",
    status: "available",
    approval_status: "approved",
  });

  const eq6 = await Equipment.create({
    owner_id: owner._id,
    owner: owner._id,
    title: "Bộ Micro Thu Âm Không Dây DJI Mic 2 (2 TX + 1 RX)",
    category: "Âm thanh & Ánh sáng",
    brand: "DJI",
    model_name: "DJI-MIC2-COMBO",
    modelNumber: "DJI-MIC2-COMBO",
    serial_number: "SN-MIC2-332145",
    description: "Ghi âm nội bộ 32-bit Float chuyên nghiệp, chống ồn thông minh, truyền xa 250m. Phù hợp quay Vlog, phỏng vấn, sự kiện.",
    images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80"],
    condition: "Như mới (99%)",
    dailyRate: 200000,
    depositAmount: 0,
    pricing: {
      price_per_hour: 30000,
      price_per_day: 200000,
      deposit_amount: 0,
    },
    visibility: "published",
    status: "available",
    approval_status: "approved",
  });

  const eq7 = await Equipment.create({
    owner_id: owner._id,
    owner: owner._id,
    title: "Máy Cân Mực Laser 12 Tia Xanh Bosch GLL 3-80 CG",
    category: "Thiết bị đo lường & Cơ khí",
    brand: "Bosch",
    model_name: "GLL-3-80-CG",
    modelNumber: "GLL-3-80-CG",
    serial_number: "SN-BOSCH-662319",
    description: "Máy cân bằng tia laser 3x360 độ tia xanh nhìn rõ ngoài trời gấp 4 lần tia đỏ. Kết nối Bluetooth điều khiển qua điện thoại.",
    images: ["https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&q=80"],
    condition: "Rất tốt (95%)",
    dailyRate: 180000,
    depositAmount: 0,
    pricing: {
      price_per_hour: 25000,
      price_per_day: 180000,
      deposit_amount: 0,
    },
    visibility: "published",
    status: "available",
    approval_status: "approved",
  });
  console.log("✓ Đã nạp đầy đủ thiết bị mẫu cho tất cả danh mục (UC_O03-UC_O06)");

  // 5. Create Rental Requests demonstrating the 5-step flow:
  // Request 0: Renter vừa bấm thuê -> Đang chờ Quản lý web gửi cho Owner (pending_moderator)
  await RentalRequest.create({
    request_code: "YC-2026-MOD01",
    equipment_id: eq1._id,
    owner_id: owner._id,
    renter_id: renter._id,
    renter_name: "Trần Thị Khách Thuê",
    renter_phone: "0918 777 999",
    renter_email: "renter@example.com",
    rental_type: "daily",
    start_date: new Date(Date.now() + 86400000 * 3),
    end_date: new Date(Date.now() + 86400000 * 5),
    duration_days: 2,
    duration_hours: 48,
    rental_fee: 1100000,
    deposit_amount: 0,
    total_estimated_amount: 1100000,
    renter_note: "Em cần thuê máy Sony A7 IV quay phóng sự 2 ngày cuối tuần. Nhờ Quản lý web chuyển cho Owner duyệt giúp em.",
    status: "pending_moderator",
  });

  // Request 1: Quản lý web đã chuyển tiếp cho Owner -> Chờ Owner duyệt (pending)
  await RentalRequest.create({
    request_code: "YC-2026-OWN01",
    equipment_id: eq1._id,
    owner_id: owner._id,
    renter_id: renter._id,
    renter_name: "Trần Thị Khách Thuê",
    renter_phone: "0918 777 999",
    renter_email: "renter@example.com",
    rental_type: "daily",
    start_date: new Date(Date.now() + 86400000 * 2),
    end_date: new Date(Date.now() + 86400000 * 4),
    duration_days: 2,
    duration_hours: 48,
    rental_fee: 1100000,
    deposit_amount: 0,
    total_estimated_amount: 1100000,
    renter_note: "Khách cần quay TVC quảng cáo tại Đà Lạt trong 2 ngày.",
    moderator_id: moderator._id,
    moderator_note: "Quản lý web đã xác minh thông tin người thuê, chuyển tiếp cho Owner duyệt.",
    forwarded_to_owner_at: new Date(),
    status: "pending",
  });

  // Request 2: Owner đã duyệt -> Sẵn sàng để Owner lập hợp đồng gửi Quản lý web duyệt (approved)
  const req2 = await RentalRequest.create({
    request_code: "YC-2026-APP02",
    equipment_id: eq2._id,
    owner_id: owner._id,
    renter_id: renter._id,
    renter_name: "Trần Thị Khách Thuê",
    renter_phone: "0903 888 222",
    renter_email: "renter@example.com",
    rental_type: "daily",
    start_date: new Date(Date.now() + 86400000 * 1),
    end_date: new Date(Date.now() + 86400000 * 3),
    duration_days: 2,
    duration_hours: 48,
    rental_fee: 700000,
    deposit_amount: 0,
    total_estimated_amount: 700000,
    renter_note: "Chụp album ngoại cảnh Vũng Tàu.",
    moderator_id: moderator._id,
    moderator_note: "Quản lý web đã chuyển cho Owner.",
    forwarded_to_owner_at: new Date(Date.now() - 86400000),
    status: "approved",
    responded_at: new Date(),
  });
  console.log("✓ Đã nạp yêu cầu thuê mẫu ở từng bước (Chờ Quản lý web -> Chờ Owner duyệt -> Chờ Owner lập HĐ)");

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
    deposit_amount: 0,
    start_date: new Date(Date.now() - 86400000 * 3),
    end_date: new Date(Date.now() - 86400000),
    owner_signature: {
      signed: true,
      signed_at: new Date(Date.now() - 86400000 * 4),
      signer_name: owner.name,
    },
    renter_signature: {
      signed: true,
      signed_at: new Date(Date.now() - 86400000 * 3),
      signer_name: renter.name,
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
    platform_fee: 165000,
    deposit_paid: 0,
    deposit_refund_to_renter: 0,
    owner_payout_amount: 1485000,
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
    platform_fee: 240000,
    deposit_paid: 0,
    deposit_refund_to_renter: 0,
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

  // 8. Create sample Rentals for Renter History (demonstrating: Owner duyệt -> Ký HĐ -> Thanh toán)
  await Rental.create({
    rentalCode: "REQ-2026-PEND01",
    renter: renter._id,
    equipment: eq1._id,
    owner: owner._id,
    startDate: new Date(Date.now() + 86400000 * 3),
    endDate: new Date(Date.now() + 86400000 * 5),
    totalDays: 2,
    dailyRate: 550000,
    rentalFee: 1100000,
    depositAmount: 0,
    totalAmount: 1100000,
    status: "PENDING",
    deliveryAddress: "123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
    renterNote: "Quay phóng sự cuối tuần, nhờ Owner duyệt giúp em.",
    contract: {
      contractNumber: "HD-PEND-001",
      contractTerms: "Hợp đồng thuê thiết bị công nghệ SmartEquip.",
      termsAccepted: false,
    },
    payment: { isPaid: false, paymentStatus: "unpaid" },
  });

  await Rental.create({
    rentalCode: "REQ-2026-APPR02",
    renter: renter._id,
    equipment: eq2._id,
    owner: owner._id,
    startDate: new Date(Date.now() + 86400000 * 2),
    endDate: new Date(Date.now() + 86400000 * 4),
    totalDays: 2,
    dailyRate: 350000,
    rentalFee: 700000,
    depositAmount: 0,
    totalAmount: 700000,
    status: "APPROVED",
    deliveryAddress: "45 Lê Duẩn, Quận 1, TP.HCM",
    renterNote: "Chụp ảnh sản phẩm.",
    contract: {
      contractNumber: "HD-APPR-002",
      contractTerms: "Hợp đồng thuê thiết bị công nghệ SmartEquip.",
      termsAccepted: false,
    },
    payment: { isPaid: false, paymentStatus: "unpaid" },
  });

  await Rental.create({
    rentalCode: "REQ-2026-SIGN03",
    renter: renter._id,
    equipment: eq4._id,
    owner: owner._id,
    startDate: new Date(Date.now() + 86400000 * 1),
    endDate: new Date(Date.now() + 86400000 * 3),
    totalDays: 2,
    dailyRate: 350000,
    rentalFee: 700000,
    depositAmount: 0,
    totalAmount: 700000,
    status: "CONTRACT_SIGNED",
    deliveryAddress: "12 Nguyễn Thị Minh Khai, Quận 1, TP.HCM",
    renterNote: "Quay flycam toàn cảnh resort.",
    contract: {
      contractNumber: "HD-SIGN-003",
      contractTerms: "Hợp đồng thuê thiết bị công nghệ SmartEquip.",
      termsAccepted: true,
      renterSignature: "Trần Thị Khách Thuê",
      digitalSignature: "Trần Thị Khách Thuê",
      signedAt: new Date(Date.now() - 3600000),
    },
    payment: { isPaid: false, paymentStatus: "unpaid" },
  });

  await Rental.create({
    rentalCode: "REQ-2026-PAID04",
    renter: renter._id,
    equipment: eq5._id,
    owner: owner._id,
    startDate: new Date(Date.now()),
    endDate: new Date(Date.now() + 86400000 * 3),
    totalDays: 3,
    dailyRate: 500000,
    rentalFee: 1500000,
    depositAmount: 0,
    totalAmount: 1500000,
    status: "PAID",
    deliveryAddress: "207 Cống Quỳnh, Quận 1, TP.HCM",
    renterNote: "Dựng video 4K cho khách hàng.",
    contract: {
      contractNumber: "HD-PAID-004",
      contractTerms: "Hợp đồng thuê thiết bị công nghệ SmartEquip.",
      termsAccepted: true,
      renterSignature: "Trần Thị Khách Thuê",
      digitalSignature: "Trần Thị Khách Thuê",
      signedAt: new Date(Date.now() - 7200000),
    },
    payment: {
      isPaid: true,
      paymentStatus: "paid",
      paymentMethod: "qr_transfer",
      transactionId: "FT26306112233",
      transferNote: "REQ-2026-PAID04 THANH TOAN",
      senderName: "Trần Thị Khách Thuê",
      amountPaid: 1500000,
      paidAt: new Date(Date.now() - 3600000),
      verifiedBy: moderator._id,
      verifiedAt: new Date(Date.now() - 3600000),
      moderatorNote: "Đã đối chiếu sao kê MB Bank khớp đủ phí thuê thiết bị.",
    },
  });

  await Rental.create({
    rentalCode: "REQ-2026-VERIFY05",
    renter: renter._id,
    equipment: eq6._id,
    owner: owner._id,
    startDate: new Date(Date.now() + 86400000 * 2),
    endDate: new Date(Date.now() + 86400000 * 4),
    totalDays: 2,
    dailyRate: 200000,
    rentalFee: 400000,
    depositAmount: 0,
    totalAmount: 400000,
    status: "PAYMENT_VERIFYING",
    deliveryAddress: "88 Đồng Khởi, Quận 1, TP.HCM",
    renterNote: "Thuê bộ DJI Mic 2 thu âm phỏng vấn.",
    contract: {
      contractNumber: "HD-VERIFY-005",
      contractTerms: "Hợp đồng thuê thiết bị công nghệ SmartEquip.",
      termsAccepted: true,
      renterSignature: "Trần Thị Khách Thuê",
      digitalSignature: "Trần Thị Khách Thuê",
      signedAt: new Date(Date.now() - 1800000),
    },
    payment: {
      isPaid: false,
      paymentStatus: "verifying",
      paymentMethod: "qr_transfer",
      transactionId: "FT26306998877",
      transferNote: "REQ-2026-VERIFY05 THANH TOAN",
      senderName: "TRAN THI KHACH THUE",
      submittedAt: new Date(Date.now() - 600000),
      amountPaid: 400000,
    },
  });
  console.log("✓ Đã nạp 5 đơn thuê mẫu chuẩn chu trình: Chờ Owner duyệt -> Chờ ký HĐ -> Chờ thanh toán QR -> Chờ Moderator xác nhận -> Đã xác nhận thanh toán");


  console.log("--- Hoàn tất nạp dữ liệu mẫu thành công! ---");
}

module.exports = seedData;
