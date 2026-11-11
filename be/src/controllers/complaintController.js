const crypto = require("crypto");
const Rental = require("../models/Rental");
const RentalContract = require("../models/RentalContract");
const SupportTicket = require("../models/SupportTicket");
const User = require("../models/User");
const UserNotification = require("../models/UserNotification");
const AppError = require("../utils/AppError");

const COMPLAINT_CATEGORY = "rental_complaint";

function generateTicketCode() {
  return `KN-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function createComplaint(req, res) {
  const { rentalId, contractId, subject, message } = req.body;

  if ((!rentalId && !contractId) || (rentalId && contractId)) {
    throw new AppError(400, "Vui lòng chọn một đơn thuê đã hoàn tất.");
  }
  if (typeof subject !== "string" || !subject.trim() || subject.trim().length > 160) {
    throw new AppError(400, "Tiêu đề khiếu nại không hợp lệ (tối đa 160 ký tự).");
  }
  if (typeof message !== "string" || !message.trim() || message.trim().length > 5000) {
    throw new AppError(400, "Nội dung khiếu nại không hợp lệ (tối đa 5000 ký tự).");
  }

  const filterId = rentalId || contractId;
  if (typeof filterId !== "string" || !/^[a-f\d]{24}$/i.test(filterId)) {
    throw new AppError(400, "Mã đơn thuê không hợp lệ.");
  }

  let rental;
  let contract;
  if (rentalId) {
    rental = await Rental.findOne({ _id: rentalId, renter: req.user._id });
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê.");
    }
    if (String(rental.status).toLowerCase() !== "completed") {
      throw new AppError(400, "Bạn chỉ có thể khiếu nại sau khi đơn thuê hoàn tất.");
    }
  } else {
    contract = await RentalContract.findOne({
      _id: contractId,
      renter_id: req.user._id,
    });
    if (!contract) {
      throw new AppError(404, "Không tìm thấy hợp đồng thuê.");
    }
    if (contract.status !== "completed") {
      throw new AppError(400, "Bạn chỉ có thể khiếu nại sau khi hợp đồng thuê hoàn tất.");
    }
  }

  const linkFilter = rentalId
    ? { rental: rental._id }
    : { contract_id: contract._id };
  const existingComplaint = await SupportTicket.findOne({
    user_id: req.user._id,
    category: COMPLAINT_CATEGORY,
    ...linkFilter,
  });
  if (existingComplaint) {
    throw new AppError(409, "Đơn thuê này đã có khiếu nại. Vui lòng theo dõi phản hồi trong lịch sử thuê.");
  }

  const ticket = await SupportTicket.create({
    ticket_code: generateTicketCode(),
    user_id: req.user._id,
    user_role: req.user.role || "renter",
    category: COMPLAINT_CATEGORY,
    subject: subject.trim(),
    message: message.trim(),
    priority: "high",
    status: "open",
    ...(rental ? { rental: rental._id } : { contract_id: contract._id }),
  });

  try {
    const moderators = await User.find({
      role: { $regex: /^(rental[_ -]?moderator|systemadmin|admin)$/i },
      status: "active",
    }).select("_id").lean();
    if (moderators.length) {
      await UserNotification.insertMany(
        moderators.map(({ _id }) => ({
          user_id: _id,
          title: `Khiếu nại mới #${ticket.ticket_code}`,
          message: `${req.user.name || "Khách hàng"} đã gửi khiếu nại: ${ticket.subject}`,
          related_record_id: ticket._id,
        })),
      );
    }
  } catch (error) {
    console.error("Failed to notify moderators about new complaint:", error);
  }

  const complaint = await SupportTicket.findById(ticket._id)
    .populate("rental", "rentalCode status")
    .populate({
      path: "contract_id",
      select: "contract_code title status equipment_id",
      populate: { path: "equipment_id", select: "title" },
    })
    .populate("replies.sender_id", "name role")
    .lean();

  res.status(201).json({
    message: "Đã gửi khiếu nại đến Rental Moderator.",
    complaint,
  });
}

async function listMyComplaints(req, res) {
  const complaints = await SupportTicket.find({
    user_id: req.user._id,
    category: COMPLAINT_CATEGORY,
  })
    .populate("rental", "rentalCode status")
    .populate({
      path: "contract_id",
      select: "contract_code title status equipment_id",
      populate: { path: "equipment_id", select: "title" },
    })
    .populate("replies.sender_id", "name role")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ complaints });
}

async function listComplaints(_req, res) {
  const complaints = await SupportTicket.find({ category: COMPLAINT_CATEGORY })
    .populate("user_id", "name email phone role")
    .populate("replies.sender_id", "name role")
    .populate({
      path: "rental",
      select: "rentalCode status equipment",
      populate: { path: "equipment", select: "title" },
    })
    .populate({
      path: "contract_id",
      select: "contract_code title status equipment_id",
      populate: { path: "equipment_id", select: "title" },
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ complaints });
}

async function replyToComplaint(req, res) {
  const { message, status } = req.body;
  if (typeof message !== "string" || !message.trim() || message.trim().length > 5000) {
    throw new AppError(400, "Nội dung phản hồi không hợp lệ (tối đa 5000 ký tự).");
  }
  if (status !== undefined && !["in_progress", "resolved"].includes(status)) {
    throw new AppError(400, "Trạng thái xử lý không hợp lệ.");
  }

  const ticket = await SupportTicket.findOne({
    _id: req.params.id,
    category: COMPLAINT_CATEGORY,
  });
  if (!ticket) {
    throw new AppError(404, "Không tìm thấy khiếu nại.");
  }
  if (["resolved", "closed"].includes(ticket.status)) {
    throw new AppError(400, "Khiếu nại đã hoàn tất, không thể gửi thêm phản hồi.");
  }

  ticket.replies.push({
    sender_id: req.user._id,
    sender_name: req.user.name || "Rental Moderator",
    sender_role: req.user.role || "rentalmoderator",
    message: message.trim(),
    created_at: new Date(),
  });
  ticket.status = status || "in_progress";
  await ticket.save();

  try {
    await UserNotification.create({
      user_id: ticket.user_id,
      title: `Phản hồi khiếu nại #${ticket.ticket_code}`,
      message: `Rental Moderator đã phản hồi khiếu nại "${ticket.subject}".`,
      related_record_id: ticket._id,
    });
  } catch (error) {
    console.error("Failed to notify renter about complaint reply:", error);
  }

  const complaint = await SupportTicket.findById(ticket._id)
    .populate("user_id", "name email phone role")
    .populate("replies.sender_id", "name role")
    .populate({
      path: "rental",
      select: "rentalCode status equipment",
      populate: { path: "equipment", select: "title" },
    })
    .populate({
      path: "contract_id",
      select: "contract_code title status equipment_id",
      populate: { path: "equipment_id", select: "title" },
    })
    .lean();

  res.json({ message: "Đã gửi phản hồi khiếu nại.", complaint });
}

module.exports = {
  createComplaint,
  listMyComplaints,
  listComplaints,
  replyToComplaint,
};
