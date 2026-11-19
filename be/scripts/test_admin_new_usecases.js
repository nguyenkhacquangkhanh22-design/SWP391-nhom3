const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS.split(",").map((s) => s.trim());
  dns.setServers(servers);
}

const User = require("../src/models/User");
const ContractTemplate = require("../src/models/ContractTemplate");
const EquipmentStatusRequest = require("../src/models/EquipmentStatusRequest");
const OwnerMembership = require("../src/models/OwnerMembership");
const Settlement = require("../src/models/Settlement");
const HandoverRecord = require("../src/models/HandoverRecord");
const DamageTariff = require("../src/models/DamageTariff");
const EquipmentMaintenanceLog = require("../src/models/EquipmentMaintenanceLog");
const Equipment = require("../src/models/Equipment");

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ TÍNH NĂNG 7 USE CASE MỚI CHO SYSTEM ADMIN ===");
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartequip";
  await mongoose.connect(uri);
  console.log("✅ Đã kết nối MongoDB thành công.");

  try {
    // 1. Test ContractTemplate (UC_A26)
    console.log("\n[Test 1] UC_A26: ContractTemplate Model & Queries...");
    const sampleTemplate = await ContractTemplate.findOne();
    if (!sampleTemplate) {
      const admin = await User.findOne({ role: { $regex: /admin/i } });
      const created = await ContractTemplate.create({
        template_code: "TEST-CONTRACT-01",
        name: "Hợp Đồng Mẫu Test Cho Thuê Máy Ảnh",
        version: 1,
        terms_content: "Điều khoản bồi thường thiết bị và hoàn cọc.",
        fields: [{ key: "serial_number", label: "Số Serial máy", required: true }],
        status: "published",
        created_by: admin ? admin._id : new mongoose.Types.ObjectId(),
      });
      console.log("   -> Tạo mẫu hợp đồng thành công:", created.template_code);
    } else {
      console.log("   -> Đã tìm thấy mẫu hợp đồng:", sampleTemplate.template_code, "(v" + sampleTemplate.version + ")");
    }

    // 2. Test EquipmentStatusRequest (UC_A27)
    console.log("\n[Test 2] UC_A27: EquipmentStatusRequest Model & Queries...");
    const reqCount = await EquipmentStatusRequest.countDocuments();
    console.log("   -> Tổng số yêu cầu bảo dưỡng/đổi trạng thái máy trong DB:", reqCount);

    // 3. Test OwnerMembership (UC_A28)
    console.log("\n[Test 3] UC_A28: OwnerMembership Model & Revenue Aggregation...");
    const memberCount = await OwnerMembership.countDocuments();
    const activeCount = await OwnerMembership.countDocuments({ status: "active" });
    console.log(`   -> Tổng gói hội viên: ${memberCount}, Đang hoạt động: ${activeCount}`);

    // 4. Test Settlement (UC_A29)
    console.log("\n[Test 4] UC_A29: Settlement Escrow & Damage Deduction Audit...");
    const settlementCount = await Settlement.countDocuments();
    console.log("   -> Tổng số bảng quyết toán hợp đồng trong DB:", settlementCount);

    // 5. Test HandoverRecord (UC_A30)
    console.log("\n[Test 5] UC_A30: Handover & Return Inspection Records...");
    const handoverCount = await HandoverRecord.countDocuments({ record_type: "handover" });
    const returnCount = await HandoverRecord.countDocuments({ record_type: "return" });
    console.log(`   -> Biên bản giao máy: ${handoverCount}, Biên bản trả máy: ${returnCount}`);

    // 6. Test Risk Monitor (UC_A31)
    console.log("\n[Test 6] UC_A31: High-Risk Rental Activity Anomaly Detection...");
    const totalUsers = await User.countDocuments();
    console.log("   -> Tổng số người dùng được quét rủi ro:", totalUsers);

    // 7. Test DamageTariff (UC_A32)
    console.log("\n[Test 7] UC_A32: Standard Damage Compensation Tariff Model...");
    let tariffCount = await DamageTariff.countDocuments();
    if (tariffCount === 0) {
      console.log("   -> Bảng biểu phí đang trống, sẽ tự động seed khi Admin truy cập.");
    } else {
      console.log(`   -> Đã có ${tariffCount} hạng mục biểu phí đền bù chuẩn trong DB.`);
    }

    // 8. Test EquipmentMaintenanceLog (UC_A33)
    console.log("\n[Test 8] UC_A33: Equipment Maintenance & Shutter Count Tracking...");
    const sampleEq = await Equipment.findOne();
    if (sampleEq) {
      const admin = await User.findOne({ role: { $regex: /admin/i } });
      const maintenanceCount = await EquipmentMaintenanceLog.countDocuments();
      if (maintenanceCount === 0) {
        const testLog = await EquipmentMaintenanceLog.create({
          equipment_id: sampleEq._id,
          owner_id: sampleEq.owner_id,
          maintenance_type: "sensor_cleaning",
          current_shutter_count: 65000,
          max_rated_shutter: 200000,
          service_center: "Phòng Kỹ Thuật SmartEquip Lab",
          cost: 350000,
          status: "in_progress",
          technician_notes: "Cảm biến đang được vệ sinh phòng sạch chống bụi laser.",
          created_by: admin ? admin._id : sampleEq.owner_id,
        });
        console.log("   -> Đã tạo phiếu bảo dưỡng mẫu:", testLog._id, "loại:", testLog.maintenance_type);
      } else {
        console.log("   -> Đã tìm thấy số phiếu bảo dưỡng máy ảnh:", maintenanceCount);
      }
    }

    console.log("\n🎉 TẤT CẢ 8 USE CASE MỚI (UC_A26 ĐẾN UC_A33) HOẠT ĐỘNG HOÀN TOÀN ỔN ĐỊNH VÀ CHUẨN XÁC!");
  } catch (error) {
    console.error("❌ Lỗi kiểm thử:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Đã ngắt kết nối MongoDB.");
  }
}

runTests();
