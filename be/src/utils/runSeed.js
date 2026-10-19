const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const connectDB = require("../config/db");
const seedData = require("./seedData");

async function run() {
  await connectDB();
  await seedData();
  console.log("\n=================================");
  console.log(" DỮ LIỆU ĐÃ ĐƯỢC NẠP THÀNH CÔNG! ");
  console.log("=================================\n");
  console.log("Tài khoản Owner đăng nhập:");
  console.log("- Email: owner@example.com");
  console.log("- Mật khẩu: Owner@123456\n");
  console.log("Tài khoản Khách thuê (Renter):");
  console.log("- Email: renter@example.com");
  console.log("- Mật khẩu: Renter@123456\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("Lỗi khi nạp dữ liệu:", err);
  process.exit(1);
});
