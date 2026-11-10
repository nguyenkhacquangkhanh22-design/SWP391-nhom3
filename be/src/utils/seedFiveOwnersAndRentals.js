const bcrypt = require("bcrypt");
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const OwnerProfile = require("../models/OwnerProfile");
const Rental = require("../models/Rental");
const RentalRequest = require("../models/RentalRequest");
const ChatMessage = require("../models/ChatMessage");

async function seedFiveOwnersAndRentals() {
  console.log("--- Bắt đầu tạo 5 Owner + Đăng sản phẩm & 5 Renter + Đơn thuê thử nghiệm ---");

  const defaultPassword = "Password123@";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. DATA 5 OWNERS
  const ownersData = [
    {
      User_Id: "USR-OWNER-HUB-01",
      name: "Hoàng Long Camera & Lens",
      email: "owner1@smartequip.vn",
      phone: "0901234501",
      address: "72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop",
      bankInfo: {
        bankName: "MB Bank (Ngân hàng Quân Đội)",
        accountNumber: "0988776655",
        accountHolder: "HOANG LONG",
        bankCode: "MB",
      },
      shop_name: "Hoàng Long Camera Pro Hub",
      equipments: [
        {
          title: "Máy ảnh Sony Alpha A7 IV (Body) Chuyên Nghiệp",
          category: "Máy ảnh & Quay phim",
          brand: "Sony",
          model_name: "ILCE-7M4",
          modelNumber: "A7M4",
          serial_number: "SN-SONY-748291",
          description: "Cảm biến Full-frame 33MP Exmor R, quay 4K 60p 10-bit 4:2:2, chống rung 5 trục, lấy nét Real-time Eye AF. Máy mới 99%, hoạt động hoàn hảo.",
          dailyRate: 450000,
          depositAmount: 0,
          pricing: { price_per_day: 450000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop",
          ],
          accessories: ["2 Pin Sony FZ100", "Sạc đôi nhanh Type-C", "Thẻ nhớ 128GB v90", "Hộp chống sốc"],
          status: "available",
          rating: 4.9,
          review_count: 28,
        },
        {
          title: "Ống kính Sony FE 24-70mm f/2.8 GM II Cao Cấp",
          category: "Máy ảnh & Quay phim",
          brand: "Sony",
          model_name: "SEL2470GM2",
          modelNumber: "2470GM2",
          serial_number: "SN-GM2-998811",
          description: "Ống kính zoom tiêu chuẩn G Master thế hệ II siêu nhẹ, độ nét xuất sắc từ tâm ra rìa, bokeh mượt mà cho quay phim và chụp chân dung.",
          dailyRate: 300000,
          depositAmount: 0,
          pricing: { price_per_day: 300000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&auto=format&fit=crop",
          ],
          accessories: ["Hood zin", "Nắp trước sau", "Filter bảo vệ B+W", "Túi nhung"],
          status: "available",
          rating: 4.8,
          review_count: 19,
        },
        {
          title: "Gimbal chống rung DJI RS 3 Pro Combo Đầy Đủ",
          category: "Máy ảnh & Quay phim",
          brand: "DJI",
          model_name: "Ronin RS3 Pro",
          modelNumber: "RS3-PRO",
          serial_number: "SN-RS3P-552233",
          description: "Tải trọng lên tới 4.5kg, trục sợi carbon siêu cứng, khóa trục tự động thông minh, màn hình cảm ứng OLED 1.8 inch.",
          dailyRate: 250000,
          depositAmount: 0,
          pricing: { price_per_day: 250000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop",
          ],
          accessories: ["Focus Motor", "RavenEye Transmission", "Briefcase Handle", "Hộp vali xốp"],
          status: "available",
          rating: 4.9,
          review_count: 14,
        },
      ],
    },
    {
      User_Id: "USR-OWNER-HUB-02",
      name: "Vũ Đình Trọng (Vũ Studio Rental)",
      email: "owner2@smartequip.vn",
      phone: "0901234502",
      address: "158 Đào Duy Anh, Phường 9, Quận Phú Nhuận, TP. Hồ Chí Minh",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop",
      bankInfo: {
        bankName: "Techcombank (Ngân hàng Kỹ Thương)",
        accountNumber: "1903668899001",
        accountHolder: "VU DINH TRONG",
        bankCode: "TCB",
      },
      shop_name: "Vũ Studio Cinematography",
      equipments: [
        {
          title: "Máy quay Blackmagic Pocket Cinema Camera 6K Pro",
          category: "Máy ảnh & Quay phim",
          brand: "Blackmagic",
          model_name: "BMPCC 6K Pro",
          modelNumber: "CINECAMPOCHDX6KP",
          serial_number: "SN-BMD-6K-44321",
          description: "Quay 6K RAW điện ảnh, kính lọc ND tích hợp 2/4/6 stops, màn hình HDR 1500 nits nghiêng được, 2 cổng âm thanh mini XLR chuyên nghiệp.",
          dailyRate: 600000,
          depositAmount: 0,
          pricing: { price_per_day: 600000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1589872766859-450fd933615f?w=800&auto=format&fit=crop",
          ],
          accessories: ["4 Pin NP-F570", "Củ sạc nguồn AC", "Khung SmallRig", "Ổ SSD Samsung T7 Shield 1TB"],
          status: "available",
          rating: 5.0,
          review_count: 16,
        },
        {
          title: "Đèn quay Studio Aputure Amaran 200d LED Light",
          category: "Âm thanh & Ánh sáng",
          brand: "Aputure",
          model_name: "Amaran 200d",
          modelNumber: "AM200D",
          serial_number: "SN-APUT-200D-12",
          description: "Công suất ánh sáng 200W Daylight 5600K cực mạnh, chỉ số hoàn màu CRI 95+, ngàm Bowens thông dụng, điều khiển qua app Sidus Link.",
          dailyRate: 180000,
          depositAmount: 0,
          pricing: { price_per_day: 180000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop",
          ],
          accessories: ["Chóa phản xạ", "Softbox Bát Giác 90cm", "Chân đèn inox cao 2.8m", "Túi đựng"],
          status: "available",
          rating: 4.8,
          review_count: 22,
        },
      ],
    },
    {
      User_Id: "USR-OWNER-HUB-03",
      name: "Lê Thị Thanh Mai (Lê Sound & Podcast)",
      email: "owner3@smartequip.vn",
      phone: "0901234503",
      address: "45 Sư Vạn Hạnh, Phường 12, Quận 10, TP. Hồ Chí Minh",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop",
      bankInfo: {
        bankName: "Vietcombank (Ngoại thương Việt Nam)",
        accountNumber: "0071001234567",
        accountHolder: "LE THI THANH MAI",
        bankCode: "VCB",
      },
      shop_name: "Lê Podcast & Sound Equipment",
      equipments: [
        {
          title: "Bộ Micro thu âm không dây Rode Wireless GO II (2 TX + 1 RX)",
          category: "Âm thanh & Ánh sáng",
          brand: "Rode",
          model_name: "Wireless GO II",
          modelNumber: "WIGO2",
          serial_number: "SN-RODE-WG2-881",
          description: "Thu âm 2 kênh cùng lúc, khoảng cách truyền 200m sóng kỹ thuật số 2.4GHz, có bộ nhớ trong thu backup hơn 40 giờ. Lọc ồn cực tốt.",
          dailyRate: 150000,
          depositAmount: 0,
          pricing: { price_per_day: 150000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop",
          ],
          accessories: ["2 Cục phát", "1 Cục nhận", "3 Bông lọc gió Deadcat", "Dây SC5 3.5mm", "Cáp Type-C/Lightning"],
          status: "available",
          rating: 4.9,
          review_count: 35,
        },
        {
          title: "Máy ghi âm cầm tay chuyên nghiệp Zoom H6 Handy Recorder",
          category: "Âm thanh & Ánh sáng",
          brand: "Zoom",
          model_name: "Zoom H6",
          modelNumber: "H6-REC",
          serial_number: "SN-ZOOM-H6-441",
          description: "Thu 6 track đồng thời, kèm capsule mic X/Y và Mid-Side hoán đổi được, 4 cổng XLR/TRS combo cắm nhạc cụ và micro phòng thu.",
          dailyRate: 180000,
          depositAmount: 0,
          pricing: { price_per_day: 180000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1519874179391-3c016ef4051a?w=800&auto=format&fit=crop",
          ],
          accessories: ["Đầu mic X/Y", "Đầu mic MS", "Thẻ nhớ 64GB", "4 Pin sạc AA", "Hộp vali chống sốc"],
          status: "available",
          rating: 4.7,
          review_count: 11,
        },
      ],
    },
    {
      User_Id: "USR-OWNER-HUB-04",
      name: "Nguyễn Hoàng Minh (Minh Tech & Drone Solutions)",
      email: "owner4@smartequip.vn",
      phone: "0901234504",
      address: "20 Cộng Hòa, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop",
      bankInfo: {
        bankName: "ACB (Ngân hàng Á Châu)",
        accountNumber: "234567899",
        accountHolder: "NGUYEN HOANG MINH",
        bankCode: "ACB",
      },
      shop_name: "Minh Drone & Flycam Center",
      equipments: [
        {
          title: "Flycam DJI Mavic 3 Pro Cine Combo 3 Pin Thông Minh",
          category: "Flycam & Drone",
          brand: "DJI",
          model_name: "Mavic 3 Pro Cine",
          modelNumber: "M3P-CINE",
          serial_number: "SN-DJI-M3P-7711",
          description: "Hệ thống 3 camera Hasselblad 4/3 CMOS, quay Apple ProRes 5.1K, zoom quang học 3x và 7x, cảm biến vật cản đa hướng an toàn tuyệt đối.",
          dailyRate: 750000,
          depositAmount: 0,
          pricing: { price_per_day: 750000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop",
          ],
          accessories: ["Tay điều khiển DJI RC Pro", "3 Pin bay 43 phút", "Hub sạc nhanh 100W", "Bộ ND Filter 4 chiếc", "Túi da"],
          status: "available",
          rating: 5.0,
          review_count: 40,
        },
        {
          title: "Flycam siêu nhẹ DJI Mini 4 Pro (Nhỏ gọn 249g)",
          category: "Flycam & Drone",
          brand: "DJI",
          model_name: "Mini 4 Pro",
          modelNumber: "MINI4P",
          serial_number: "SN-DJI-M4P-332",
          description: "Trọng lượng dưới 249g không cần xin phép bay phức tạp, cảm biến đa hướng, quay 4K 60fps HDR và quay dọc True Vertical Shooting.",
          dailyRate: 350000,
          depositAmount: 0,
          pricing: { price_per_day: 350000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&auto=format&fit=crop",
          ],
          accessories: ["Tay cầm màn hình DJI RC2", "2 Pin Plus 45 phút", "Cánh dự phòng", "Balo chống sốc"],
          status: "available",
          rating: 4.9,
          review_count: 31,
        },
      ],
    },
    {
      User_Id: "USR-OWNER-HUB-05",
      name: "Trần Gia Hưng (Gia Hưng Gaming & Creator Hub)",
      email: "owner5@smartequip.vn",
      phone: "0901234505",
      address: "88 Xô Viết Nghệ Tĩnh, Phường 21, Quận Bình Thạnh, TP. Hồ Chí Minh",
      avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop",
      bankInfo: {
        bankName: "VPBank (Việt Nam Thịnh Vượng)",
        accountNumber: "8899665544",
        accountHolder: "TRAN GIA HUNG",
        bankCode: "VPB",
      },
      shop_name: "Gia Hưng High-Tech Hub",
      equipments: [
        {
          title: "Laptop Asus ROG Zephyrus G16 (RTX 4070, Core Ultra 9)",
          category: "Laptop & Công nghệ",
          brand: "Asus",
          model_name: "ROG Zephyrus G16 OLED",
          modelNumber: "GU605MZ",
          serial_number: "SN-ROG-G16-9921",
          description: "Màn hình OLED 2.5K 240Hz màu sắc 100% DCI-P3, CPU Intel Core Ultra 9 185H, GPU RTX 4070 8GB, RAM 32GB LPDDR5X, SSD 1TB NVMe. Dựng phim 4K và gaming đỉnh cao.",
          dailyRate: 480000,
          depositAmount: 0,
          pricing: { price_per_day: 480000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop",
          ],
          accessories: ["Củ sạc 240W zin", "Chuột gaming không dây", "Túi chống sốc cao cấp"],
          status: "available",
          rating: 4.9,
          review_count: 18,
        },
        {
          title: "Kính thực tế ảo Meta Quest 3 512GB VR/MR Cao Cấp",
          category: "Laptop & Công nghệ",
          brand: "Meta",
          model_name: "Meta Quest 3",
          modelNumber: "MQ3-512G",
          serial_number: "SN-MQ3-882211",
          description: "Trải nghiệm thực tế hỗn hợp Mixed Reality sống động với camera màu Passthrough 4K, đồ họa Snapdragon XR2 Gen 2, ống kính Pancake siêu nét.",
          dailyRate: 250000,
          depositAmount: 0,
          pricing: { price_per_day: 250000, deposit_amount: 0 },
          images: [
            "https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800&auto=format&fit=crop",
          ],
          accessories: ["2 Tay cầm Touch Plus", "Dây sạc Type-C 45W", "Đệm mặt silicon kháng khuẩn", "Hộp đựng du lịch"],
          status: "available",
          rating: 4.8,
          review_count: 24,
        },
      ],
    },
  ];

  const createdOwnerUsers = [];
  const createdEquipments = [];

  for (const oData of ownersData) {
    let user = await User.findOne({ email: oData.email });
    if (!user) {
      user = await User.create({
        User_Id: oData.User_Id,
        name: oData.name,
        email: oData.email,
        password_hash: passwordHash,
        role: "owner",
        status: "active",
        trust_score: 98,
        phone: oData.phone,
        address: oData.address,
        avatarUrl: oData.avatarUrl,
        bankInfo: oData.bankInfo,
        kycStatus: "verified",
      });
    } else {
      user.role = "owner";
      user.password_hash = passwordHash;
      user.status = "active";
      user.bankInfo = oData.bankInfo;
      user.phone = oData.phone;
      user.address = oData.address;
      user.avatarUrl = oData.avatarUrl;
      await user.save();
    }
    createdOwnerUsers.push(user);

    // Upsert OwnerProfile
    await OwnerProfile.findOneAndUpdate(
      { user_id: user._id },
      {
        user_id: user._id,
        shop_name: oData.shop_name,
        phone: oData.phone,
        address: oData.address,
        identity_card: "079201" + user.User_Id.replace(/\D/g, "").padStart(6, "0"),
        bank_name: oData.bankInfo.bankName,
        bank_account_number: oData.bankInfo.accountNumber,
        bank_account_holder: oData.bankInfo.accountHolder,
        status: "approved",
      },
      { upsert: true, new: true }
    );

    // Upsert Equipments
    for (const eqData of oData.equipments) {
      let eq = await Equipment.findOne({
        owner: user._id,
        title: eqData.title,
      });

      if (!eq) {
        eq = await Equipment.create({
          ...eqData,
          owner_id: user._id,
          owner: user._id,
          status: "available",
          visibility: "published",
        });
      } else {
        Object.assign(eq, eqData);
        eq.owner_id = user._id;
        eq.owner = user._id;
        eq.status = "available";
        eq.visibility = "published";
        await eq.save();
      }
      createdEquipments.push(eq);
    }
  }

  console.log(`✓ Đã nạp thành công 5 Owner và ${createdEquipments.length} sản phẩm thiết bị.`);

  // 2. DATA 5 RENTERS
  const rentersData = [
    {
      User_Id: "USR-RENTER-VIP-01",
      name: "Nguyễn Hải Đăng",
      email: "renter1@smartequip.vn",
      phone: "0912345601",
      address: "12 Vườn Lài, Phường An Phú Đông, Quận 12, TP.HCM",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop",
    },
    {
      User_Id: "USR-RENTER-VIP-02",
      name: "Lê Bảo Ngọc",
      email: "renter2@smartequip.vn",
      phone: "0912345602",
      address: "34 Nguyễn Thị Minh Khai, Đa Kao, Quận 1, TP.HCM",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop",
    },
    {
      User_Id: "USR-RENTER-VIP-03",
      name: "Phạm Quốc Tuấn",
      email: "renter3@smartequip.vn",
      phone: "0912345603",
      address: "56 Trần Não, An Phú, TP. Thủ Đức, TP.HCM",
      avatarUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&auto=format&fit=crop",
    },
    {
      User_Id: "USR-RENTER-VIP-04",
      name: "Đỗ Thị Kim Ngân",
      email: "renter4@smartequip.vn",
      phone: "0912345604",
      address: "78 Phan Xích Long, Phường 2, Phú Nhuận, TP.HCM",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop",
    },
    {
      User_Id: "USR-RENTER-VIP-05",
      name: "Hoàng Anh Duy",
      email: "renter5@smartequip.vn",
      phone: "0912345605",
      address: "90 Điện Biên Phủ, Phường 15, Bình Thạnh, TP.HCM",
      avatarUrl: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=400&auto=format&fit=crop",
    },
  ];

  const createdRenterUsers = [];
  for (const rData of rentersData) {
    let rUser = await User.findOne({ email: rData.email });
    if (!rUser) {
      rUser = await User.create({
        User_Id: rData.User_Id,
        name: rData.name,
        email: rData.email,
        password_hash: passwordHash,
        role: "renter",
        status: "active",
        trust_score: 95,
        phone: rData.phone,
        address: rData.address,
        avatarUrl: rData.avatarUrl,
        kycStatus: "verified",
      });
    } else {
      rUser.password_hash = passwordHash;
      rUser.status = "active";
      rUser.kycStatus = "verified";
      rUser.phone = rData.phone;
      rUser.address = rData.address;
      await rUser.save();
    }
    createdRenterUsers.push(rUser);
  }
  console.log(`✓ Đã nạp thành công 5 Renter có KYC Verified.`);

  // 3. TẠO 5 ĐƠN THUÊ MẪU ĐẠI DIỆN CHO TỪNG GIAI ĐOẠN CỦA LUỒNG
  // Xóa các đơn test seed cũ nếu đã có
  await Rental.deleteMany({
    rentalCode: {
      $in: ["REQ-DEMO-01", "REQ-DEMO-02", "REQ-DEMO-03", "REQ-DEMO-04", "REQ-DEMO-05"],
    },
  });
  await RentalRequest.deleteMany({
    request_code: {
      $in: ["REQ-DEMO-01", "REQ-DEMO-02", "REQ-DEMO-03", "REQ-DEMO-04", "REQ-DEMO-05"],
    },
  });
  await ChatMessage.deleteMany({
    message: { $regex: /DEMO-MSG/i },
  });

  const now = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const fiveDaysLater = new Date(Date.now() + 5 * 86400000);

  // Đơn 1: Renter 1 thuê Sony A7 IV từ Owner 1 -> Trạng thái: PENDING (Chờ Owner duyệt)
  const eq1 = createdEquipments[0];
  const o1 = createdOwnerUsers[0];
  const r1 = createdRenterUsers[0];
  const rental1 = await Rental.create({
    rentalCode: "REQ-DEMO-01",
    renter: r1._id,
    equipment: eq1._id,
    owner: o1._id,
    startDate: tomorrow,
    endDate: fiveDaysLater,
    totalDays: 4,
    dailyRate: eq1.dailyRate,
    rentalFee: eq1.dailyRate * 4,
    depositAmount: 0,
    shippingFee: 60000,
    totalAmount: eq1.dailyRate * 4 + 60000,
    status: "PENDING",
    deliveryAddress: r1.address,
    deliveryMethod: "motorcycle",
    returnMethod: "motorcycle",
    deliveryTime: "09:00",
    returnTime: "17:00",
    renterNote: "DEMO-MSG: Máy có sẵn 2 pin zin và sạc đôi không bạn?",
    contract: {
      contractNumber: "HD-DEMO-01",
      termsAccepted: false,
    },
    payment: {
      isPaid: false,
      paymentStatus: "unpaid",
    },
  });
  await RentalRequest.create({
    request_code: "REQ-DEMO-01",
    equipment_id: eq1._id,
    owner_id: o1._id,
    renter_id: r1._id,
    renter_name: r1.name,
    renter_email: r1.email,
    renter_phone: r1.phone,
    delivery_address: r1.address,
    start_date: tomorrow,
    end_date: fiveDaysLater,
    duration_days: 4,
    rental_fee: eq1.dailyRate * 4,
    deposit_amount: 0,
    total_estimated_amount: eq1.dailyRate * 4 + 60000,
    status: "pending",
  });

  // Đơn 2: Renter 2 thuê BMPCC 6K Pro từ Owner 2 -> Trạng thái: APPROVED (Owner đã duyệt, Chờ Renter ký & chuyển khoản)
  const eq2 = createdEquipments[3];
  const o2 = createdOwnerUsers[1];
  const r2 = createdRenterUsers[1];
  const rental2 = await Rental.create({
    rentalCode: "REQ-DEMO-02",
    renter: r2._id,
    equipment: eq2._id,
    owner: o2._id,
    startDate: tomorrow,
    endDate: fiveDaysLater,
    totalDays: 4,
    dailyRate: eq2.dailyRate,
    rentalFee: eq2.dailyRate * 4,
    depositAmount: 0,
    shippingFee: 60000,
    totalAmount: eq2.dailyRate * 4 + 60000,
    status: "APPROVED",
    deliveryAddress: r2.address,
    deliveryMethod: "motorcycle",
    returnMethod: "motorcycle",
    deliveryTime: "09:00",
    returnTime: "17:00",
    contract: {
      contractNumber: "HD-DEMO-02",
      termsAccepted: false,
    },
    payment: {
      isPaid: false,
      paymentStatus: "unpaid",
    },
  });
  await RentalRequest.create({
    request_code: "REQ-DEMO-02",
    equipment_id: eq2._id,
    owner_id: o2._id,
    renter_id: r2._id,
    renter_name: r2.name,
    renter_email: r2.email,
    renter_phone: r2.phone,
    delivery_address: r2.address,
    start_date: tomorrow,
    end_date: fiveDaysLater,
    duration_days: 4,
    rental_fee: eq2.dailyRate * 4,
    deposit_amount: 0,
    total_estimated_amount: eq2.dailyRate * 4 + 60000,
    status: "approved",
  });

  // Đơn 3: Renter 3 thuê Rode Wireless GO II từ Owner 3 -> Trạng thái: PAYMENT_PENDING (Renter đã ký & gửi bill CK, Chờ Owner check duyệt tiền)
  const eq3 = createdEquipments[5];
  const o3 = createdOwnerUsers[2];
  const r3 = createdRenterUsers[2];
  const rental3 = await Rental.create({
    rentalCode: "REQ-DEMO-03",
    renter: r3._id,
    equipment: eq3._id,
    owner: o3._id,
    startDate: tomorrow,
    endDate: fiveDaysLater,
    totalDays: 4,
    dailyRate: eq3.dailyRate,
    rentalFee: eq3.dailyRate * 4,
    depositAmount: 0,
    shippingFee: 60000,
    totalAmount: eq3.dailyRate * 4 + 60000,
    status: "PAYMENT_PENDING",
    deliveryAddress: r3.address,
    deliveryMethod: "motorcycle",
    returnMethod: "motorcycle",
    deliveryTime: "09:00",
    returnTime: "17:00",
    contract: {
      contractNumber: "HD-DEMO-03",
      termsAccepted: true,
      signedAt: now,
      renterSignature: r3.name,
      digitalSignature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK8AAAA8CAYAAAC6...",
    },
    payment: {
      isPaid: false,
      paymentStatus: "pending_confirmation",
      paymentMethod: "bank_transfer",
      transactionId: "TXN-DEMO-03",
      amountPaid: eq3.dailyRate * 4 + 60000,
      transferNotifiedAt: now,
      receiptImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop",
    },
  });

  // Đơn 4: Renter 4 thuê DJI Mavic 3 Pro từ Owner 4 -> Trạng thái: PAID (Owner đã xác nhận nhận tiền, Đang giao hàng / Đang thuê)
  const eq4 = createdEquipments[7];
  const o4 = createdOwnerUsers[3];
  const r4 = createdRenterUsers[3];
  const rental4 = await Rental.create({
    rentalCode: "REQ-DEMO-04",
    renter: r4._id,
    equipment: eq4._id,
    owner: o4._id,
    startDate: now,
    endDate: fiveDaysLater,
    totalDays: 5,
    dailyRate: eq4.dailyRate,
    rentalFee: eq4.dailyRate * 5,
    depositAmount: 0,
    shippingFee: 60000,
    totalAmount: eq4.dailyRate * 5 + 60000,
    status: "PAID",
    deliveryAddress: r4.address,
    deliveryMethod: "motorcycle",
    returnMethod: "motorcycle",
    deliveryTime: "09:00",
    returnTime: "17:00",
    contract: {
      contractNumber: "HD-DEMO-04",
      termsAccepted: true,
      signedAt: now,
      renterSignature: r4.name,
    },
    payment: {
      isPaid: true,
      paymentStatus: "paid",
      paidAt: now,
      paymentMethod: "bank_transfer",
      confirmedBy: o4._id,
      amountPaid: eq4.dailyRate * 5 + 60000,
    },
  });

  // Đơn 5: Renter 5 thuê Asus ROG G16 từ Owner 5 -> Trạng thái: RETURNED (Khách báo trả đồ, đếm ngược shipper đến lấy)
  const eq5 = createdEquipments[9];
  const o5 = createdOwnerUsers[4];
  const r5 = createdRenterUsers[4];
  const rental5 = await Rental.create({
    rentalCode: "REQ-DEMO-05",
    renter: r5._id,
    equipment: eq5._id,
    owner: o5._id,
    startDate: new Date(Date.now() - 3 * 86400000),
    endDate: new Date(Date.now() + 86400000),
    totalDays: 4,
    dailyRate: eq5.dailyRate,
    rentalFee: eq5.dailyRate * 4,
    depositAmount: 0,
    shippingFee: 60000,
    totalAmount: eq5.dailyRate * 4 + 60000,
    status: "RETURNED",
    deliveryAddress: r5.address,
    deliveryMethod: "motorcycle",
    returnMethod: "motorcycle",
    deliveryTime: "09:00",
    returnTime: "17:00",
    contract: {
      contractNumber: "HD-DEMO-05",
      termsAccepted: true,
      signedAt: new Date(Date.now() - 3 * 86400000),
      renterSignature: r5.name,
    },
    payment: {
      isPaid: true,
      paymentStatus: "paid",
      amountPaid: eq5.dailyRate * 4 + 60000,
    },
    returnInfo: {
      requestedAt: now,
      returnCondition: "Máy hoạt động tốt, đầy đủ phụ kiện sạc zin và chuột.",
      returnNote: "Nhờ shipper đến lấy máy vào lúc 17h chiều giúp mình.",
      returnLocation: r5.address,
    },
  });

  // 4. TẠO MẪU TIN NHẮN CHAT & GỬI HỢP ĐỒNG GIỮA RENTER VÀ OWNER
  // Tin nhắn giữa Renter 3 và Owner 3 (kèm hợp đồng)
  await ChatMessage.create({
    rental_id: rental3._id,
    sender: r3._id,
    receiver: o3._id,
    message: "DEMO-MSG: Chào bạn, mình vừa ký hợp đồng điện tử và chuyển khoản VietQR xong rồi nhé!",
    message_type: "text",
    createdAt: new Date(Date.now() - 600000),
  });

  await ChatMessage.create({
    rental_id: rental3._id,
    sender: r3._id,
    receiver: o3._id,
    message: "DEMO-MSG: [Hợp đồng điện tử]",
    message_type: "contract",
    contract_data: {
      contract_number: "HD-DEMO-03",
      rental_code: "REQ-DEMO-03",
      equipment_title: eq3.title,
      rental_id: rental3._id,
      total_amount: rental3.totalAmount,
      status: "PAYMENT_PENDING",
      is_signed: true,
    },
    createdAt: new Date(Date.now() - 500000),
  });

  await ChatMessage.create({
    rental_id: rental3._id,
    sender: o3._id,
    receiver: r3._id,
    message: "DEMO-MSG: Chào Hải Đăng! Mình đã nhận được hợp đồng và ảnh bill chuyển khoản của bạn. Mình đang kiểm tra tài khoản Vietcombank để xác nhận ngay cho bạn nhé!",
    message_type: "text",
    createdAt: new Date(Date.now() - 300000),
  });

  console.log("✓ Đã tạo thành công 5 đơn thuê mẫu và tin nhắn chat gửi hợp đồng mẫu.");
  console.log("-----------------------------------------------------------------------");
  console.log("DANH SÁCH TÀI KHOẢN MẪU ĐỂ TEST:");
  console.log("1. Owner 1: owner1@smartequip.vn / Password123@ (MB Bank)");
  console.log("2. Owner 2: owner2@smartequip.vn / Password123@ (Techcombank)");
  console.log("3. Owner 3: owner3@smartequip.vn / Password123@ (Vietcombank)");
  console.log("4. Owner 4: owner4@smartequip.vn / Password123@ (ACB)");
  console.log("5. Owner 5: owner5@smartequip.vn / Password123@ (VPBank)");
  console.log("6. Renter 1-5: renter1@smartequip.vn -> renter5@smartequip.vn / Password123@");
  console.log("-----------------------------------------------------------------------");
}

module.exports = seedFiveOwnersAndRentals;
