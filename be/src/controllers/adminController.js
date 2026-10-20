const User = require("../models/User");
const Equipment = require("../models/Equipment");
const SupportTicket = require("../models/SupportTicket");
const UserNotification = require("../models/UserNotification");
const AppError = require("../utils/AppError");

async function getOverview(req, res) {
  const [totalUsers, activeUsers, adminCount, recentUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({
      role: { $regex: /^systemadmin$/i },
    }),
    User.find({}, { password_hash: 0, password_reset_token_hash: 0, google_id: 0 })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  res.json({
    stats: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      adminCount,
    },
    users: recentUsers,
  });
}

async function updateUserRole(req, res) {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || typeof role !== "string") {
    throw new AppError(400, "Role is required and must be a string");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  user.role = role.trim();
  await user.save();

  res.json({
    message: "User role updated successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
}

async function updateUserStatus(req, res) {
  const { userId } = req.params;
  const { status } = req.body;

  if (!status || !["active", "blocked", "inactive"].includes(status)) {
    throw new AppError(400, "Valid status ('active', 'blocked', 'inactive') is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (String(user._id) === String(req.user._id)) {
    throw new AppError(400, "You cannot alter your own account status");
  }

  user.status = status;
  if (status !== "active") {
    // Invalidate sessions immediately if deactivated/blocked
    user.token_version = (user.token_version || 0) + 1;
  }
  await user.save();

  res.json({
    message: `User status changed to ${status}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
}

// UC_A17: List support tickets with filter, search and stats
async function listSupportTickets(req, res) {
  const { status, category, priority, search } = req.query;
  const filter = {};

  if (status && status !== "all") {
    filter.status = status;
  }
  if (category && category !== "all") {
    filter.category = category;
  }
  if (priority && priority !== "all") {
    filter.priority = priority;
  }
  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { ticket_code: { $regex: q, $options: "i" } },
      { subject: { $regex: q, $options: "i" } },
      { message: { $regex: q, $options: "i" } },
    ];
  }

  const [tickets, stats] = await Promise.all([
    SupportTicket.find(filter)
      .populate("user_id", "name email role")
      .populate("replies.sender_id", "name email role")
      .sort({ createdAt: -1 })
      .lean(),
    Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: "open" }),
      SupportTicket.countDocuments({ status: "in_progress" }),
      SupportTicket.countDocuments({ status: "resolved" }),
      SupportTicket.countDocuments({ status: "closed" }),
    ]).then(([total, open, in_progress, resolved, closed]) => ({
      total,
      open,
      in_progress,
      resolved,
      closed,
    })),
  ]);

  res.json({ tickets, stats });
}

// UC_A17: Reply to support ticket and optionally update status
async function replySupportTicket(req, res) {
  const { id } = req.params;
  const { message, nextStatus } = req.body;

  if (!message || !message.trim()) {
    throw new AppError(400, "Nội dung phản hồi không được để trống");
  }

  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw new AppError(404, "Không tìm thấy yêu cầu hỗ trợ");
  }

  ticket.replies.push({
    sender_id: req.user._id,
    sender_name: req.user.name || "System Admin",
    sender_role: "systemadmin",
    message: message.trim(),
    created_at: new Date(),
  });

  if (nextStatus && ["open", "in_progress", "resolved", "closed"].includes(nextStatus)) {
    ticket.status = nextStatus;
  } else if (ticket.status === "open") {
    ticket.status = "in_progress";
  }

  await ticket.save();

  // Create user notification (UC_RM12)
  try {
    const preview = message.trim().slice(0, 100) + (message.trim().length > 100 ? "..." : "");
    await UserNotification.create({
      user_id: ticket.user_id,
      title: `[Hỗ trợ] Phản hồi mới cho yêu cầu #${ticket.ticket_code}`,
      message: `Quản trị viên đã phản hồi: "${preview}"`,
      related_record_id: ticket._id,
    });
  } catch (err) {
    console.error("Failed to notify user:", err);
  }

  const updatedTicket = await SupportTicket.findById(id)
    .populate("user_id", "name email role")
    .populate("replies.sender_id", "name email role")
    .lean();

  // Realtime notification via Socket.IO
  try {
    const { getIO } = require("../config/socket");
    getIO().emit("ticket:replied", {
      ticketId: id.toString(),
      ticket: updatedTicket,
      reply: updatedTicket.replies[updatedTicket.replies.length - 1],
      senderRole: "systemadmin",
    });
  } catch (err) {
    console.error("Socket emit ticket:replied failed:", err.message);
  }

  res.json({
    message: "Đã gửi phản hồi thành công.",
    ticket: updatedTicket,
  });
}

// UC_A17: Update support ticket status directly
async function updateSupportTicketStatus(req, res) {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!status || !["open", "in_progress", "resolved", "closed"].includes(status)) {
    throw new AppError(400, "Trạng thái không hợp lệ ('open', 'in_progress', 'resolved', 'closed')");
  }

  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw new AppError(404, "Không tìm thấy yêu cầu hỗ trợ");
  }

  ticket.status = status;
  if (note && note.trim()) {
    ticket.replies.push({
      sender_id: req.user._id,
      sender_name: req.user.name || "System Admin",
      sender_role: "systemadmin",
      message: `[Cập nhật trạng thái sang ${status}]: ${note.trim()}`,
      created_at: new Date(),
    });
  }

  await ticket.save();

  // Notify user
  try {
    await UserNotification.create({
      user_id: ticket.user_id,
      title: `[Hỗ trợ] Yêu cầu #${ticket.ticket_code} đã cập nhật trạng thái`,
      message: `Trạng thái yêu cầu hỗ trợ của bạn đã được chuyển sang "${status}".`,
      related_record_id: ticket._id,
    });
  } catch (err) {
    console.error("Failed to notify user:", err);
  }

  const updatedTicket = await SupportTicket.findById(id)
    .populate("user_id", "name email role")
    .populate("replies.sender_id", "name email role")
    .lean();

  // Realtime notification via Socket.IO
  try {
    const { getIO } = require("../config/socket");
    getIO().emit("ticket:status_updated", {
      ticketId: id.toString(),
      status,
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error("Socket emit ticket:status_updated failed:", err.message);
  }

  res.json({
    message: `Đã cập nhật trạng thái yêu cầu sang "${status}".`,
    ticket: updatedTicket,
  });
}

// =============================================================================
// UC_A11 & UC_A12: Equipment Listings Moderation & Visibility Control
// =============================================================================
async function listEquipments(req, res) {
  const { search, category, approvalStatus, visibility, sortBy } = req.query;

  const query = {};

  if (approvalStatus && approvalStatus !== "all") {
    if (approvalStatus === "approved") {
      query.approval_status = { $in: ["approved", undefined] };
    } else {
      query.approval_status = approvalStatus;
    }
  }

  if (visibility && visibility !== "all") {
    query.visibility = visibility;
  }

  if (category && category !== "all") {
    query.category = { $regex: new RegExp(category, "i") };
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), "i");
    query.$or = [
      { title: searchRegex },
      { brand: searchRegex },
      { model_name: searchRegex },
      { category: searchRegex },
      { serial_number: searchRegex },
    ];
  }

  let sort = { createdAt: -1 };
  if (sortBy === "price_asc") sort = { "pricing.price_per_day": 1 };
  if (sortBy === "price_desc") sort = { "pricing.price_per_day": -1 };
  if (sortBy === "rating") sort = { rating: -1 };

  const [equipments, totalCount, pendingCount, approvedCount, rejectedCount, hiddenCount] =
    await Promise.all([
      Equipment.find(query)
        .populate("owner_id", "name email phone trust_score")
        .populate("moderated_by", "name email role")
        .sort(sort)
        .lean(),
      Equipment.countDocuments(),
      Equipment.countDocuments({ approval_status: "pending" }),
      Equipment.countDocuments({ approval_status: { $in: ["approved", undefined] } }),
      Equipment.countDocuments({ approval_status: "rejected" }),
      Equipment.countDocuments({ visibility: "hidden" }),
    ]);

  res.json({
    equipments,
    stats: {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      hidden: hiddenCount,
    },
  });
}

async function reviewEquipmentApproval(req, res) {
  const { id } = req.params;
  const { approval_status, rejection_reason } = req.body;

  if (!["approved", "rejected"].includes(approval_status)) {
    throw new AppError(400, "Trạng thái xét duyệt phải là 'approved' hoặc 'rejected'");
  }

  if (approval_status === "rejected" && (!rejection_reason || !rejection_reason.trim())) {
    throw new AppError(400, "Vui lòng nhập lý do từ chối bài đăng thiết bị");
  }

  const equipment = await Equipment.findById(id);
  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị");
  }

  equipment.approval_status = approval_status;
  equipment.rejection_reason = approval_status === "rejected" ? rejection_reason.trim() : "";
  equipment.moderated_by = req.user._id;
  equipment.moderated_at = new Date();

  // If approved, ensure it's published unless owner set it to draft
  if (approval_status === "approved" && equipment.visibility !== "draft") {
    equipment.visibility = "published";
  }

  await equipment.save();

  // Notify owner
  try {
    const notifyTitle = approval_status === "approved"
      ? `Bài đăng "${equipment.title}" đã được duyệt`
      : `Bài đăng "${equipment.title}" đã bị từ chối`;
    const notifyMessage = approval_status === "approved"
      ? `Quản trị viên đã phê duyệt bài đăng "${equipment.title}". Thiết bị hiện đã sẵn sàng trên sàn!`
      : `Bài đăng "${equipment.title}" bị từ chối xét duyệt với lý do: ${rejection_reason}`;

    await UserNotification.create({
      user_id: equipment.owner_id,
      title: notifyTitle,
      message: notifyMessage,
      related_record_id: equipment._id,
    });
  } catch (err) {
    console.error("Failed to notify owner about equipment review:", err);
  }

  const populatedEquipment = await Equipment.findById(id)
    .populate("owner_id", "name email phone trust_score")
    .populate("moderated_by", "name email role")
    .lean();

  // Socket realtime
  try {
    const { getIO } = require("../config/socket");
    getIO().emit("equipment:moderated", {
      equipmentId: id.toString(),
      equipment: populatedEquipment,
      action: approval_status,
      message: `Bài đăng "${equipment.title}" vừa được cập nhật sang trạng thái "${approval_status}".`,
    });
  } catch (err) {
    console.error("Socket emit equipment:moderated failed:", err);
  }

  res.json({
    message: approval_status === "approved"
      ? `Đã phê duyệt bài đăng "${equipment.title}" thành công.`
      : `Đã từ chối bài đăng "${equipment.title}".`,
    equipment: populatedEquipment,
  });
}

async function updateEquipmentVisibility(req, res) {
  const { id } = req.params;
  const { visibility, reason } = req.body;

  if (!["published", "hidden"].includes(visibility)) {
    throw new AppError(400, "Trạng thái hiển thị phải là 'published' hoặc 'hidden'");
  }

  const equipment = await Equipment.findById(id);
  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị");
  }

  equipment.visibility = visibility;
  if (visibility === "hidden") {
    equipment.hidden_reason = (reason || "").trim();
  } else {
    equipment.hidden_reason = "";
  }

  await equipment.save();

  // Notify owner if hidden
  if (visibility === "hidden") {
    try {
      await UserNotification.create({
        user_id: equipment.owner_id,
        title: `Bài đăng "${equipment.title}" đã bị ẩn khỏi sàn`,
        message: `Quản trị viên đã tạm ẩn bài đăng "${equipment.title}" do vi phạm quy định. Lý do: ${reason || "Không tuân thủ quy định đăng tin"}`,
        related_record_id: equipment._id,
      });
    } catch (err) {
      console.error("Failed to notify owner about equipment hidden:", err);
    }
  }

  const populatedEquipment = await Equipment.findById(id)
    .populate("owner_id", "name email phone trust_score")
    .populate("moderated_by", "name email role")
    .lean();

  // Socket realtime
  try {
    const { getIO } = require("../config/socket");
    getIO().emit("equipment:visibility_changed", {
      equipmentId: id.toString(),
      equipment: populatedEquipment,
      visibility,
      message: visibility === "hidden"
        ? `Bài đăng "${equipment.title}" đã bị ẩn khỏi sàn.`
        : `Bài đăng "${equipment.title}" đã được khôi phục công khai.`,
    });
  } catch (err) {
    console.error("Socket emit equipment:visibility_changed failed:", err);
  }

  res.json({
    message: visibility === "hidden"
      ? `Đã ẩn bài đăng "${equipment.title}" khỏi sàn.`
      : `Đã khôi phục hiển thị bài đăng "${equipment.title}".`,
    equipment: populatedEquipment,
  });
}

module.exports = {
  getOverview,
  updateUserRole,
  updateUserStatus,
  listSupportTickets,
  replySupportTicket,
  updateSupportTicketStatus,
  listEquipments,
  reviewEquipmentApproval,
  updateEquipmentVisibility,
};
