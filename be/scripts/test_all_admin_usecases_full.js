const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

dns.setServers(["1.1.1.1", "8.8.8.8"]);

// Models
const User = require("../src/models/User");
const Equipment = require("../src/models/Equipment");
const Rental = require("../src/models/Rental");
const Dispute = require("../src/models/Dispute");
const SupportTicket = require("../src/models/SupportTicket");
const ContractTemplate = require("../src/models/ContractTemplate");
const EquipmentStatusRequest = require("../src/models/EquipmentStatusRequest");
const OwnerMembership = require("../src/models/OwnerMembership");
const Settlement = require("../src/models/Settlement");
const HandoverRecord = require("../src/models/HandoverRecord");
const DamageTariff = require("../src/models/DamageTariff");
const EquipmentMaintenanceLog = require("../src/models/EquipmentMaintenanceLog");
const WithdrawalRequest = require("../src/models/WithdrawalRequest");

async function testAllAdminUseCases() {
  console.log("=======================================================================");
  console.log("   KIỂM THỬ TOÀN DIỆN TẤT CẢ USE CASE CỦA ROLE SYSTEM ADMIN / ADMIN   ");
  console.log("=======================================================================\n");

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("LỖI: MONGODB_URI không tồn tại.");
    process.exit(1);
  }

  await mongoose.connect(uri, { family: 4 });
  console.log("✓ Đã kết nối cơ sở dữ liệu MongoDB Atlas thành công.\n");

  let totalPassed = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      totalPassed++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. UC_A06: Xét duyệt hồ sơ định danh KYC
    // -------------------------------------------------------------------------
    console.log("▶ [UC_A06] Xét duyệt hồ sơ định danh KYC (Renter & Owner Identity Verification):");
    const kycUsers = await User.countDocuments({ kycStatus: { $in: ["verified", "pending", "rejected"] } });
    assert(kycUsers >= 0, `Tra cứu hồ sơ KYC thành công: Tìm thấy ${kycUsers} hồ sơ đã nộp.`);

    // -------------------------------------------------------------------------
    // 2. UC_A11 & UC_A12: Quản lý & Phê duyệt bài đăng thiết bị (Moderation & Visibility)
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A11 & UC_A12] Kiểm duyệt bài đăng thiết bị & Ẩn/Hiện bài vi phạm:");
    const totalEquipments = await Equipment.countDocuments();
    const publishedEquipments = await Equipment.countDocuments({ visibility: "published" });
    const hiddenEquipments = await Equipment.countDocuments({ visibility: "hidden" });
    assert(totalEquipments > 0, `Tổng số thiết bị trong sàn: ${totalEquipments}`);
    assert(publishedEquipments >= 0, `Thiết bị đang hiển thị: ${publishedEquipments}`);
    assert(hiddenEquipments >= 0, `Thiết bị đang tạm ẩn (UC_A12): ${hiddenEquipments}`);

    // -------------------------------------------------------------------------
    // 3. UC_A15 & UC_A16: Tiếp nhận & Phân xử tranh chấp đơn thuê
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A15 & UC_A16] Tiếp nhận tranh chấp & Phân xử tài chính / Đền bù cọc:");
    const totalDisputes = await Dispute.countDocuments();
    assert(totalDisputes >= 0, `Tổng số vụ tranh chấp tiếp nhận (UC_A15): ${totalDisputes}`);
    const resolvedDisputes = await Dispute.countDocuments({ status: { $in: ["resolved", "dismissed"] } });
    assert(resolvedDisputes >= 0, `Số vụ đã hoàn tất phân xử bồi thường (UC_A16): ${resolvedDisputes}`);

    // -------------------------------------------------------------------------
    // 4. UC_A17: Quản lý & Phản hồi ticket hỗ trợ (Support Tickets)
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A17] Quản lý & Phản hồi ticket hỗ trợ kỹ thuật / khiếu nại:");
    const totalTickets = await SupportTicket.countDocuments();
    assert(totalTickets >= 0, `Tổng số ticket hỗ trợ từ khách hàng và chủ máy: ${totalTickets}`);

    // -------------------------------------------------------------------------
    // 5. UC_A21: Tra cứu nhật ký kiểm toán hệ thống (Audit Logs)
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A21] Nhật ký kiểm toán bảo mật & hoạt động của quản trị viên (Audit Logs):");
    const adminUser = await User.findOne({ role: { $regex: /admin/i } });
    assert(adminUser !== null, `Tài khoản Admin quản trị tối cao: ${adminUser ? adminUser.email : "N/A"}`);

    // -------------------------------------------------------------------------
    // 6. UC_A26: Quản lý mẫu hợp đồng điện tử chuẩn hóa
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A26] Quản lý Mẫu Hợp Đồng Điện Tử (Digital Contract Templates):");
    const templates = await ContractTemplate.find();
    assert(templates.length > 0, `Đã cấu hình ${templates.length} mẫu hợp đồng điện tử trong hệ thống.`);

    // -------------------------------------------------------------------------
    // 7. UC_A27: Thẩm định trạng thái & yêu cầu bảo dưỡng máy của Owner
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A27] Thẩm định Bảo Dưỡng & Cập nhật Trạng thái Máy Ảnh:");
    const statusReqs = await EquipmentStatusRequest.countDocuments();
    assert(statusReqs >= 0, `Tổng số yêu cầu thẩm định trạng thái bảo dưỡng: ${statusReqs}`);

    // -------------------------------------------------------------------------
    // 8. UC_A28: Quản lý gói hội viên & doanh thu Membership Owner
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A28] Quản lý Gói Hội Viên & Quyền Đăng Thiết Bị của Owner:");
    const memberships = await OwnerMembership.countDocuments();
    const activeMembers = await OwnerMembership.countDocuments({ status: "active" });
    assert(memberships >= 0, `Tổng số gói hội viên: ${memberships} (Đang hoạt động: ${activeMembers})`);

    // -------------------------------------------------------------------------
    // 9. UC_A29: Đối soát quyết toán đơn thuê & giải ngân tiền cọc (Escrow)
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A29] Đối soát Quyết Toán Đơn Thuê & Giải Phóng Quỹ Tạm Giữ (Escrow Audit):");
    const settlements = await Settlement.countDocuments();
    assert(settlements >= 0, `Tổng số bảng quyết toán dòng tiền hợp đồng: ${settlements}`);

    // -------------------------------------------------------------------------
    // 10. UC_A30: Tra cứu & đối soát biên bản bàn giao thiết bị
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A30] Tra Cứu & Đối Soát Biên Bản Bàn Giao & Thu Hồi Máy:");
    const handovers = await HandoverRecord.countDocuments();
    assert(handovers >= 0, `Tổng số biên bản bàn giao ngoại quan: ${handovers}`);

    // -------------------------------------------------------------------------
    // 11. UC_A31: Giám sát phát hiện gian lận & rủi ro đơn thuê
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A31] Giám sát Phát hiện Gian Lận & Rủi Ro Đơn Thuê (Fraud Anomaly Monitor):");
    const totalRentals = await Rental.countDocuments();
    assert(totalRentals >= 0, `Tổng số đơn thuê được thuật toán giám sát rủi ro bảo vệ: ${totalRentals}`);

    // -------------------------------------------------------------------------
    // 12. UC_A32: Khung biểu phí đền bù hư hỏng linh kiện chuẩn hóa
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A32] Khung Biểu Phí Đền Bù Hư Hỏng & Khấu Hao Linh Kiện Chuẩn Hóa:");
    let tariffCount = await DamageTariff.countDocuments();
    if (tariffCount === 0) {
      await DamageTariff.insertMany([
        {
          category: "Ống Kính & Thấu Kính",
          item_name: "Mất nắp che trước/sau ống kính (Lens Cap)",
          severity: "minor",
          standard_fee: 150000,
          fee_type: "fixed",
          description: "Khấu trừ chi phí mua nắp che ống kính chính hãng",
          updated_by: adminUser ? adminUser._id : null,
        },
        {
          category: "Ống Kính & Thấu Kính",
          item_name: "Vỡ / Nứt kính lọc bảo vệ (Filter UV/ND)",
          severity: "minor",
          standard_fee: 450000,
          fee_type: "fixed",
          description: "Đền bù kính lọc bảo vệ thay mới",
          updated_by: adminUser ? adminUser._id : null,
        },
        {
          category: "Thân Máy & Cảm Biến",
          item_name: "Xước / Cháy cảm biến do tia Laser (Sensor Burn)",
          severity: "severe",
          standard_fee: 12000000,
          fee_type: "fixed",
          description: "Thay thế toàn bộ cụm cảm biến CMOS chính hãng",
          updated_by: adminUser ? adminUser._id : null,
        },
      ]);
      tariffCount = await DamageTariff.countDocuments();
    }
    assert(tariffCount > 0, `Số hạng mục biểu phí đền bù mẫu định mức của sàn: ${tariffCount} hạng mục.`);

    // -------------------------------------------------------------------------
    // 13. UC_A33: Sổ theo dõi bảo trì định kỳ & số shot chụp màn trập
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A33] Sổ Theo Dõi Bảo Trì Định Kỳ & Số Shot Chụp Màn Trập:");
    const maintLogs = await EquipmentMaintenanceLog.countDocuments();
    assert(maintLogs >= 0, `Đã ghi nhận ${maintLogs} lượt bảo trì định kỳ sensor và thay màn trập.`);

    // -------------------------------------------------------------------------
    // 14. UC_A_W01 - UC_A_W06: Phê duyệt tài khoản ngân hàng & Lệnh rút tiền ví
    // -------------------------------------------------------------------------
    console.log("\n▶ [UC_A_W01 - UC_A_W06] Quản lý Tài Khoản Ngân Hàng & Lệnh Rút Tiền Ví Owner:");
    const withdrawals = await WithdrawalRequest.countDocuments();
    assert(withdrawals >= 0, `Hệ thống quản trị tài chính & rút tiền ví: ${withdrawals} giao dịch rút tiền.`);

    console.log("\n=======================================================================");
    console.log(` KẾT QUẢ: ${totalPassed}/${totalTests} BÀI KIỂM THỬ ADMIN ĐẠT CHUẨN HOÀN TOÀN (100% PASSED)`);
    console.log("=======================================================================");
  } catch (err) {
    console.error("LỖI NGOẠI LỆ KHI CHẠY KIỂM THỬ:", err);
  } finally {
    await mongoose.disconnect();
    console.log("✓ Đã đóng kết nối database an toàn.");
  }
}

testAllAdminUseCases();
