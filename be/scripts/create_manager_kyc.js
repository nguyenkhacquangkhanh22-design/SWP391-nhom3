const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const bcrypt = require("bcrypt");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

async function run() {
  console.log("Connecting to database...");
  await connectDB();

  const passwordHash = await bcrypt.hash("Password123@", 12);
  const now = new Date();

  // 1. Tạo tài khoản Quản lý hệ thống (System Admin đã KYC)
  let adminKyc = await User.findOne({ email: "admin_kyc@test.com" });
  if (!adminKyc) {
    adminKyc = new User({
      User_Id: `USR-ADMIN-KYC-${Date.now().toString().slice(-4)}`,
      name: "Nguyễn Khắc Quang Khánh (Admin Đã KYC)",
      email: "admin_kyc@test.com",
    });
  }
  adminKyc.password_hash = passwordHash;
  adminKyc.role = "systemadmin";
  adminKyc.status = "active";
  adminKyc.trust_score = 100;
  adminKyc.phone = "0901234567";
  adminKyc.address = "TP. Hồ Chí Minh";
  adminKyc.kycStatus = "verified";
  adminKyc.kycDocument = {
    idNumber: "079099999999",
    idCardFront: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
    idCardBack: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
    selfiePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
    submittedAt: now,
    verifiedAt: now,
  };
  await adminKyc.save();
  console.log("✅ Đã tạo Quản lý hệ thống (System Admin KYC): admin_kyc@test.com / Password123@");

  // 2. Tạo tài khoản Quản lý web / Kiểm duyệt viên duyệt đơn (Rental Moderator đã KYC)
  let modKyc = await User.findOne({ email: "moderator_kyc@test.com" });
  if (!modKyc) {
    modKyc = new User({
      User_Id: `USR-MOD-KYC-${Date.now().toString().slice(-4)}`,
      name: "Trần Kiểm Duyệt Viên (Moderator Đã KYC)",
      email: "moderator_kyc@test.com",
    });
  }
  modKyc.password_hash = passwordHash;
  modKyc.role = "rentalmoderator";
  modKyc.status = "active";
  modKyc.trust_score = 100;
  modKyc.phone = "0909888777";
  modKyc.address = "TP. Hồ Chí Minh";
  modKyc.kycStatus = "verified";
  modKyc.kycDocument = {
    idNumber: "079088888888",
    idCardFront: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
    idCardBack: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
    selfiePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600",
    submittedAt: now,
    verifiedAt: now,
  };
  await modKyc.save();
  console.log("✅ Đã tạo Quản lý web / Moderator KYC: moderator_kyc@test.com / Password123@");

  // 3. Cập nhật luôn admin@test.com và moderator@test.com sang verified
  const oldAdmin = await User.findOne({ email: "admin@test.com" });
  if (oldAdmin) {
    oldAdmin.kycStatus = "verified";
    if (!oldAdmin.kycDocument) oldAdmin.kycDocument = {};
    oldAdmin.kycDocument.idNumber = "079099999001";
    oldAdmin.kycDocument.verifiedAt = now;
    await oldAdmin.save();
    console.log("✅ Đã cập nhật admin@test.com sang trạng thái KYC: verified");
  }

  const oldMod = await User.findOne({ email: "moderator@test.com" });
  if (oldMod) {
    oldMod.kycStatus = "verified";
    if (!oldMod.kycDocument) oldMod.kycDocument = {};
    oldMod.kycDocument.idNumber = "079088888001";
    oldMod.kycDocument.verifiedAt = now;
    await oldMod.save();
    console.log("✅ Đã cập nhật moderator@test.com sang trạng thái KYC: verified");
  }

  console.log("\n🎉 HOÀN TẤT CẤP TÀI KHOẢN QUẢN LÝ ĐÃ KYC!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Lỗi:", err);
  process.exit(1);
});

