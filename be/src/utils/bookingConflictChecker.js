const Rental = require("../models/Rental");
const RentalRequest = require("../models/RentalRequest");
const Equipment = require("../models/Equipment");

const ACTIVE_RENTAL_STATUSES = [
  "APPROVED",
  "approved",
  "CONTRACT_PENDING",
  "contract_pending",
  "CONTRACT_SIGNED",
  "contract_signed",
  "PAYMENT_PENDING",
  "payment_pending",
  "PAYMENT_VERIFYING",
  "payment_verifying",
  "PAID",
  "ACTIVE",
  "CONFIRMED",
  "confirmed",
  "in_progress",
];

const ACTIVE_REQUEST_STATUSES = [
  "approved",
  "contract_drafted",
  "contract_created",
  "signed",
];

/**
 * Kiểm tra xem khoảng thời gian [startDate, endDate] của equipmentId có bị trùng lặp với đơn thuê khác không
 */
async function checkBookingConflict({
  equipmentId,
  startDate,
  endDate,
  excludeRentalId = null,
  excludeRequestId = null,
  excludeReferenceCode = null,
}) {
  if (!equipmentId || !startDate || !endDate) return { hasConflict: false };

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { hasConflict: false };
  }

  // 1. Kiểm tra trong model Rental
  const rentalFilter = {
    equipment: equipmentId,
    status: { $in: ACTIVE_RENTAL_STATUSES },
    startDate: { $lte: end },
    endDate: { $gte: start },
  };
  if (excludeRentalId) {
    rentalFilter._id = { $ne: excludeRentalId };
  }
  if (excludeReferenceCode) {
    rentalFilter.rentalCode = { $ne: excludeReferenceCode };
  }
  const conflictingRental = await Rental.findOne(rentalFilter).populate("renter", "name phone");
  if (conflictingRental) {
    const sStr = new Date(conflictingRental.startDate).toLocaleDateString("vi-VN");
    const eStr = new Date(conflictingRental.endDate).toLocaleDateString("vi-VN");
    return {
      hasConflict: true,
      conflictType: "rental",
      conflictingRecord: conflictingRental,
      message: `Thiết bị đã có đơn thuê #${conflictingRental.rentalCode} (${sStr} - ${eStr}) được duyệt trước đó. Không thể duyệt trùng lịch thuê!`,
    };
  }

  // 2. Kiểm tra trong model RentalRequest
  const reqFilter = {
    equipment_id: equipmentId,
    status: { $in: ACTIVE_REQUEST_STATUSES },
    start_date: { $lte: end },
    end_date: { $gte: start },
  };
  if (excludeRequestId) {
    reqFilter._id = { $ne: excludeRequestId };
  }
  if (excludeReferenceCode) {
    reqFilter.request_code = { $ne: excludeReferenceCode };
  }
  const conflictingReq = await RentalRequest.findOne(reqFilter);
  if (conflictingReq) {
    const sStr = new Date(conflictingReq.start_date).toLocaleDateString("vi-VN");
    const eStr = new Date(conflictingReq.end_date).toLocaleDateString("vi-VN");
    return {
      hasConflict: true,
      conflictType: "rental_request",
      conflictingRecord: conflictingReq,
      message: `Thiết bị đã có yêu cầu thuê #${conflictingReq.request_code} (${sStr} - ${eStr}) được duyệt trước đó. Không thể duyệt trùng lịch thuê!`,
    };
  }

  // 3. Kiểm tra trong Equipment.availability_schedule (các khoảng bị blocked hoặc booked)
  const equipment = await Equipment.findById(equipmentId);
  if (equipment && Array.isArray(equipment.availability_schedule)) {
    const conflictSchedule = equipment.availability_schedule.find((s) => {
      if (s.status !== "blocked" && s.status !== "booked") return false;
      // Bỏ qua nếu chính là bản ghi khóa của đơn này
      if (excludeReferenceCode && s.note && s.note.includes(excludeReferenceCode)) {
        return false;
      }
      const sStart = new Date(s.start_date);
      const sEnd = new Date(s.end_date);
      return start <= sEnd && end >= sStart;
    });

    if (conflictSchedule) {
      const sStr = new Date(conflictSchedule.start_date).toLocaleDateString("vi-VN");
      const eStr = new Date(conflictSchedule.end_date).toLocaleDateString("vi-VN");
      const noteStr = conflictSchedule.note ? ` (${conflictSchedule.note})` : "";
      return {
        hasConflict: true,
        conflictType: "schedule",
        conflictingRecord: conflictSchedule,
        message: `Thiết bị đã bị khóa/đặt lịch từ ${sStr} đến ${eStr}${noteStr}. Không thể duyệt đơn trùng lịch thuê!`,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Tự động khóa lịch thiết bị (trạng thái booked) khi duyệt đơn thành công
 */
async function lockEquipmentSchedule(equipmentId, startDate, endDate, referenceCode) {
  if (!equipmentId || !startDate || !endDate) return;
  try {
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) return;

    equipment.availability_schedule = equipment.availability_schedule || [];
    const noteText = `Đã duyệt đơn #${referenceCode}`;

    // Tránh ghi đè trùng lặp
    const exists = equipment.availability_schedule.some(
      (s) => s.note && s.note.includes(referenceCode)
    );
    if (!exists) {
      equipment.availability_schedule.push({
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        status: "booked",
        note: noteText,
      });
      await equipment.save();
    }
  } catch (err) {
    console.warn("Lỗi khi khóa lịch thiết bị availability_schedule:", err.message);
  }
}

/**
 * Mở khóa lịch thiết bị khi đơn bị từ chối hoặc hủy
 */
async function unlockEquipmentSchedule(equipmentId, referenceCode) {
  if (!equipmentId || !referenceCode) return;
  try {
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment || !Array.isArray(equipment.availability_schedule)) return;

    const initialLen = equipment.availability_schedule.length;
    equipment.availability_schedule = equipment.availability_schedule.filter(
      (s) => !s.note || !s.note.includes(referenceCode)
    );

    if (equipment.availability_schedule.length !== initialLen) {
      await equipment.save();
    }
  } catch (err) {
    console.warn("Lỗi khi mở khóa lịch thiết bị availability_schedule:", err.message);
  }
}

module.exports = {
  checkBookingConflict,
  lockEquipmentSchedule,
  unlockEquipmentSchedule,
};
