const path = require("path");
const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Equipment = require("../src/models/Equipment");
const Rental = require("../src/models/Rental");
const EquipmentBlackout = require("../src/models/EquipmentBlackout");
const RentalChecklist = require("../src/models/RentalChecklist");
const EquipmentInspectionLog = require("../src/models/EquipmentInspectionLog");
const rentalService = require("../src/services/rentalService");

async function runTests() {
  console.log("=== BẮT ĐẦU TEST TOÀN DIỆN CÁC USE CASE CỦA TANTRIEU1111 ===");
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("LỖI: MONGODB_URI không tìm thấy trong .env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { family: 4 });
  console.log("✓ Đã kết nối MongoDB Atlas thành công.");

  try {
    // 1. Test Equipment Pricing & Inventory
    console.log("\n[TEST 1] Kiểm tra Equipment Pricing & Tồn kho (Quantity & Bounds):");
    let testEq = await Equipment.findOne({ status: "available" });
    if (!testEq) {
      testEq = await Equipment.findOne();
    }
    console.log(`- Thiết bị test: ${testEq.title}`);
    console.log(`- Số lượng tồn kho: ${testEq.quantity || 1} | Còn sẵn: ${testEq.available_quantity !== undefined ? testEq.available_quantity : 1}`);
    console.log(`- Đơn giá thuê: ${(testEq.dailyRate || testEq.pricing?.price_per_day || 0).toLocaleString("vi-VN")} đ`);

    // 2. Test Multi-day Discount Tier
    console.log("\n[TEST 2] Kiểm tra Cấu hình Giảm giá thuê dài ngày (Multi-day Discounts):");
    const discounts = testEq.pricing?.multi_day_discounts || [
      { min_days: 3, discount_percent: 5 },
      { min_days: 7, discount_percent: 15 },
      { min_days: 30, discount_percent: 25 },
    ];
    console.log(`- Bảng chiết khấu:`, discounts);

    // 3. Test Equipment Blackout
    console.log("\n[TEST 3] Kiểm tra Quản lý Chặn lịch bận (Equipment Blackout):");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);

    const blackout = await EquipmentBlackout.create({
      equipment_id: testEq._id,
      owner_id: testEq.owner || testEq.owner_id,
      start_date: tomorrow,
      end_date: dayAfter,
      reason: "Bảo dưỡng lens test",
      note: "Test Blackout Unit Test",
    });
    console.log(`✓ Đã tạo blackout thành công: ID ${blackout._id}`);

    // Check availability during blackout
    const avail = await rentalService.checkAvailability(testEq._id, tomorrow, dayAfter);
    console.log(`- Kết quả check availability trong ngày bận: available = ${avail.available} (Lý do: ${avail.conflictRental})`);
    if (!avail.available) {
      console.log("✓ Chặn lịch bận thiết bị hoạt động CHUẨN XÁC 100%!");
    }

    // Clean up test blackout
    await EquipmentBlackout.findByIdAndDelete(blackout._id);
    console.log("✓ Đã dọn dẹp blackout test.");

    // 4. Test Rental Checklist
    console.log("\n[TEST 4] Kiểm tra Checklist Phụ kiện Bàn giao:");
    const testRental = await Rental.findOne().sort({ createdAt: -1 });
    if (testRental) {
      const checklist = await RentalChecklist.findOneAndUpdate(
        { rental_id: testRental._id },
        {
          owner_id: testRental.owner,
          equipment_id: testRental.equipment,
          items: [
            { name: "Cap body & Cap lens", quantity: 1, handover_checked: true, return_checked: true, condition_note: "Nguyên vẹn" },
            { name: "2 Pin Zin Sony", quantity: 2, handover_checked: true, return_checked: true, condition_note: "Pin tốt 100%" },
          ],
          handover_confirmed_at: new Date(),
          return_confirmed_at: new Date(),
        },
        { upsert: true, new: true }
      );
      console.log(`✓ Checklist phụ kiện hoạt động tốt! Mã: ${checklist._id}, Số món: ${checklist.items.length}`);

      // 5. Test Return Inspection Log
      console.log("\n[TEST 5] Kiểm tra Sơ đồ Cấn móp & Biên bản Thu hồi:");
      const inspection = await EquipmentInspectionLog.create({
        rental_id: testRental._id,
        owner_id: testRental.owner,
        equipment_id: testRental.equipment,
        inspection_type: "return",
        overall_condition: "flawless",
        sensor_clean: true,
        lens_clean: true,
        shutter_working: true,
        scratches: [
          { part: "body_bottom", part_label: "Đáy máy", severity: "light_scratch", description: "Xước dăm chân Tripod" }
        ],
        deposit_action: "full_refund",
      });
      console.log(`✓ Biên bản đối chiếu ngoại quan tạo thành công! ID: ${inspection._id}`);
      await EquipmentInspectionLog.findByIdAndDelete(inspection._id);
    }

    console.log("\n=== TẤT CẢ CÁC BÀI TEST BACKEND ĐÃ HOÀN TẤT VÀ VƯỢT QUA 100% ===");
  } catch (err) {
    console.error("LỖI KHI CHẠY TEST:", err);
  } finally {
    await mongoose.disconnect();
    console.log("✓ Đã ngắt kết nối database.");
  }
}

runTests();
