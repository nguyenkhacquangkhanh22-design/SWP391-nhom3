const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const bcrypt = require("bcrypt");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const OwnerProfile = require("../src/models/OwnerProfile");

async function run() {
  console.log("Connecting to database...");
  await connectDB();

  const passwordHash = await bcrypt.hash("Password123@", 12);
  const now = new Date();

  // 1. Tạo hoặc cập nhật tài khoản Owner đã KYC (owner_kyc@test.com)
  let owner = await User.findOne({ email: "owner_kyc@test.com" });
  if (!owner) {
    owner = new User({
      User_Id: `USR-OWNER-KYC-${Date.now().toString().slice(-4)}`,
      name: "Trần Văn Tuấn (Owner Đã KYC)",
      email: "owner_kyc@test.com",
    });
  }
  owner.password_hash = passwordHash;
  owner.role = "owner";
  owner.status = "active";
  owner.trust_score = 100;
  owner.phone = "0912345678";
  owner.address = "123 Quốc lộ 1A, Cái Bè, Tiền Giang";
  owner.kycStatus = "verified";
  owner.kycDocument = {
    idNumber: "079098123456",
    idCardFront: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
    idCardBack: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
    selfiePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
    submittedAt: now,
    verifiedAt: now,
  };
  await owner.save();
  console.log("✅ Đã tạo/cập nhật Owner KYC: owner_kyc@test.com / Password123@");

  // Tạo/cập nhật OwnerProfile tương ứng
  let ownerProfile = await OwnerProfile.findOne({ user_id: owner._id });
  if (!ownerProfile) {
    ownerProfile = new OwnerProfile({
      user_id: owner._id,
    });
  }
  ownerProfile.shop_name = "Cửa hàng Nông cơ Tuấn Phát";
  ownerProfile.phone = "0912345678";
  ownerProfile.identity_card = "079098123456";
  ownerProfile.address = "123 Quốc lộ 1A, Cái Bè, Tiền Giang";
  ownerProfile.identity_card_front = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600";
  ownerProfile.identity_card_back = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600";
  ownerProfile.bank_name = "Ngân hàng TMCP Quân đội (MB Bank)";
  ownerProfile.bank_account_number = "0912345678";
  ownerProfile.bank_account_holder = "TRAN VAN TUAN";
  ownerProfile.status = "approved";
  await ownerProfile.save();
  console.log("✅ Đã cập nhật OwnerProfile cho Owner KYC!");

  // 2. Tạo hoặc cập nhật tài khoản Customer/Renter đã KYC (customer_kyc@test.com)
  let customer = await User.findOne({ email: "customer_kyc@test.com" });
  if (!customer) {
    customer = new User({
      User_Id: `USR-CUST-KYC-${Date.now().toString().slice(-4)}`,
      name: "Lê Thị Mai (Customer Đã KYC)",
      email: "customer_kyc@test.com",
    });
  }
  customer.password_hash = passwordHash;
  customer.role = "user";
  customer.status = "active";
  customer.trust_score = 98;
  customer.phone = "0987654321";
  customer.address = "456 Đường Hùng Vương, TP Mỹ Tho, Tiền Giang";
  customer.kycStatus = "verified";
  customer.kycDocument = {
    idNumber: "082199876543",
    idCardFront: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
    idCardBack: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
    selfiePhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600",
    submittedAt: now,
    verifiedAt: now,
  };
  await customer.save();
  console.log("✅ Đã tạo/cập nhật Customer KYC: customer_kyc@test.com / Password123@");

  // 3. Tiện tay cập nhật luôn tài khoản mẫu cũ (owner@test.com và renter@test.com) sang verified
  const oldOwner = await User.findOne({ email: "owner@test.com" });
  if (oldOwner) {
    oldOwner.kycStatus = "verified";
    if (!oldOwner.kycDocument) oldOwner.kycDocument = {};
    oldOwner.kycDocument.idNumber = "079099888777";
    oldOwner.kycDocument.verifiedAt = now;
    await oldOwner.save();
    console.log("✅ Đã cập nhật owner@test.com sang trạng thái KYC: verified");
  }

  const oldRenter = await User.findOne({ email: "renter@test.com" });
  if (oldRenter) {
    oldRenter.kycStatus = "verified";
    if (!oldRenter.kycDocument) oldRenter.kycDocument = {};
    oldRenter.kycDocument.idNumber = "079099111222";
    oldRenter.kycDocument.verifiedAt = now;
    await oldRenter.save();
    console.log("✅ Đã cập nhật renter@test.com sang trạng thái KYC: verified");
  }

  console.log("\n🎉 HOÀN TẤT TẠO TÀI KHOẢN ĐÃ KYC!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Lỗi:", err);
  process.exit(1);
});

