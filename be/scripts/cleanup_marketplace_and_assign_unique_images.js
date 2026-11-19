require("dotenv").config();
const mongoose = require("mongoose");
const Equipment = require("../src/models/Equipment");
const Rental = require("../src/models/Rental");

const UNIQUE_IMAGE_CATALOG = [
  {
    pattern: /Canon EOS R5/i,
    image: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Máy ảnh Canon EOS R5 Full-Frame 45MP (Body) Chuyên Nghiệp",
  },
  {
    pattern: /Canon EOS R6/i,
    image: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Máy ảnh Canon EOS R6 Mark II Siêu Tốc 40fps Chuyên Thể Thao & Action",
  },
  {
    pattern: /Sony Alpha A7 IV|Sony A7 IV/i,
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Máy ảnh Sony Alpha A7 IV (Body) Chuyên Nghiệp",
  },
  {
    pattern: /Fujifilm X-T5/i,
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Máy ảnh Fujifilm X-T5 Cổ Điển & Màu Film Nghệ Thuật (Body)",
  },
  {
    pattern: /Sony FX3/i,
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Máy quay điện ảnh Sony FX3 Cinema Line Full-Frame Siêu Nhạy Sáng",
  },
  {
    pattern: /Blackmagic Pocket/i,
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Máy quay Blackmagic Pocket Cinema Camera 6K Pro",
  },
  {
    pattern: /GoPro Hero 12/i,
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Camera hành trình GoPro Hero 12 Black Chống Nước 5.3K 60fps",
  },
  {
    pattern: /DJI RS 3/i,
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Gimbal chống rung DJI RS 3 Pro Combo Đầy Đủ",
  },
  {
    pattern: /Sony FE 24-70mm/i,
    image: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Ống kính Sony FE 24-70mm f/2.8 GM II Cao Cấp",
  },
  {
    pattern: /Canon RF 85mm/i,
    image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Ống kính chân dung Canon RF 85mm f/1.2 L USM Huyền Thoại",
  },
  {
    pattern: /Mavic 3 Pro/i,
    image: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Flycam DJI Mavic 3 Pro Cine Combo 3 Pin Thông Minh",
  },
  {
    pattern: /Mini 4 Pro/i,
    image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Flycam siêu nhẹ DJI Mini 4 Pro (Nhỏ gọn 249g)",
  },
  {
    pattern: /Amaran 200d/i,
    image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Đèn quay Studio Aputure Amaran 200d LED Light",
  },
  {
    pattern: /Wireless GO II/i,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Bộ Micro thu âm không dây Rode Wireless GO II (2 TX + 1 RX)",
  },
  {
    pattern: /DJI Mic 2/i,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Bộ Micro Thu Âm Không Dây DJI Mic 2 (2 TX + 1 RX)",
  },
  {
    pattern: /Zoom H6/i,
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Máy ghi âm cầm tay chuyên nghiệp Zoom H6 Handy Recorder",
  },
  {
    pattern: /Zephyrus G16/i,
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Laptop Asus ROG Zephyrus G16 (RTX 4070, Core Ultra 9)",
  },
  {
    pattern: /MacBook Pro 14/i,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Laptop Apple MacBook Pro 14 M3 Pro (18GB / 512GB SSD)",
  },
  {
    pattern: /Meta Quest 3/i,
    image: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Kính thực tế ảo Meta Quest 3 512GB VR/MR Cao Cấp",
  },
  {
    pattern: /Benro BV4|Benro/i,
    image: "https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Chân máy quay chuyên nghiệp Carbon Fiber Benro BV4-PRO",
  },
  {
    pattern: /Bosch GLL/i,
    image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&auto=format&fit=crop&q=80",
    canonicalTitle: "Máy Cân Mực Laser 12 Tia Xanh Bosch GLL 3-80 CG",
  },
];

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Get all active rented equipment IDs so we never break existing rentals
  const rentedIds = (await Rental.distinct("equipment")).map((id) => id.toString());
  console.log(`Preserving ${rentedIds.length} equipments tied to active rentals.`);

  // Hide garbage test items like 'sonny', 'laptop'
  await Equipment.updateMany(
    { title: { $in: ["sonny", "laptop"] } },
    { $set: { visibility: "hidden" } }
  );

  let publishedCount = 0;
  let hiddenDuplicatesCount = 0;

  for (const item of UNIQUE_IMAGE_CATALOG) {
    // Find all matching equipment for this model
    const matches = await Equipment.find({
      title: item.pattern,
      status: { $in: ["available", "AVAILABLE", "active", "ACTIVE"] },
    }).sort({ createdAt: -1 });

    if (matches.length === 0) continue;

    // Pick 1 authoritative document (prefer one that is rented, or the first one)
    let primary = matches.find((m) => rentedIds.includes(m._id.toString())) || matches[0];

    // Update primary with unique verified image
    primary.images = [item.image];
    primary.title = item.canonicalTitle;
    primary.visibility = "published";
    primary.status = "available";
    primary.membership_hidden = false;
    primary.hidden_reason = "";
    await primary.save();
    publishedCount++;
    console.log(`✓ Published unique: [${primary.title}] with image: ${item.image.substring(0, 50)}...`);

    // Hide any other duplicate copies of this exact same model
    for (const dup of matches) {
      if (dup._id.toString() !== primary._id.toString()) {
        dup.images = [item.image]; // also update image so if someone opens direct link it's nice
        dup.visibility = "hidden"; // hide from marketplace listing
        await dup.save();
        hiddenDuplicatesCount++;
      }
    }
  }

  console.log(`\n=== KẾT QUẢ DỌN DẸP HÌNH ẢNH & SẢN PHẨM ===`);
  console.log(`- Sản phẩm duy nhất, độc bản hiển thị trên sàn: ${publishedCount} sản phẩm.`);
  console.log(`- Bản sao trùng lặp đã được ẩn khỏi Marketplace: ${hiddenDuplicatesCount} sản phẩm.`);

  await mongoose.disconnect();
}

cleanup().catch(console.error);

