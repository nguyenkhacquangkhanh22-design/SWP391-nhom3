const Rental = require("../models/Rental");
const RentalContract = require("../models/RentalContract");
const UserNotification = require("../models/UserNotification");

const REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function notifyIfNotSent(userId, recordId, title, message) {
  const existingNotification = await UserNotification.findOne({
    user_id: userId,
    related_record_id: recordId,
    title,
  }).select("_id");

  if (!existingNotification) {
    await UserNotification.create({
      user_id: userId,
      related_record_id: recordId,
      title,
      message,
    });
  }
}

async function sendReturnReminders() {
  const tomorrowStart = new Date();
  tomorrowStart.setHours(0, 0, 0, 0);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrowStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  const endDateFilter = { $gte: tomorrowStart, $lt: dayAfterTomorrow };

  const [contracts, rentals] = await Promise.all([
    RentalContract.find({
      status: "active",
      end_date: endDateFilter,
    }).select("_id contract_code renter_id end_date"),
    Rental.find({
      status: { $in: ["PAID", "ACTIVE", "confirmed", "in_progress"] },
      endDate: endDateFilter,
    }).select("_id rentalCode renter endDate"),
  ]);

  await Promise.all([
    ...contracts.map((contract) =>
      notifyIfNotSent(
        contract.renter_id,
        contract._id,
        `⏰ Nhắc trả thiết bị ngày mai #${contract.contract_code}`,
        `Hợp đồng ${contract.contract_code} đến hạn trả thiết bị vào ${new Date(contract.end_date).toLocaleString("vi-VN")}. Vui lòng liên hệ Owner để thống nhất thời gian và địa điểm trả.`,
      ),
    ),
    ...rentals.map((rental) =>
      notifyIfNotSent(
        rental.renter,
        rental._id,
        `⏰ Nhắc trả thiết bị ngày mai #${rental.rentalCode}`,
        `Đơn thuê ${rental.rentalCode} đến hạn trả thiết bị vào ${new Date(rental.endDate).toLocaleString("vi-VN")}. Vui lòng gửi yêu cầu hoàn trả và liên hệ Owner.`,
      ),
    ),
  ]);
}

function startRentalReminderService() {
  const run = () => {
    sendReturnReminders().catch((error) => {
      console.error("Failed to send rental return reminders:", error);
    });
  };

  run();
  const interval = setInterval(run, REMINDER_INTERVAL_MS);
  interval.unref();
}

module.exports = { startRentalReminderService, sendReturnReminders };
