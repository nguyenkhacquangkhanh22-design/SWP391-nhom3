const User = require("../models/User");
const Equipment = require("../models/Equipment");
const SupportTicket = require("../models/SupportTicket");
const UserNotification = require("../models/UserNotification");
const Dispute = require("../models/Dispute");
const Settlement = require("../models/Settlement");
const RentalContract = require("../models/RentalContract");
const HandoverRecord = require("../models/HandoverRecord");
const AuditLog = require("../models/AuditLog");
const ContractTemplate = require("../models/ContractTemplate");
const EquipmentStatusRequest = require("../models/EquipmentStatusRequest");
const OwnerMembership = require("../models/OwnerMembership");
const DamageTariff = require("../models/DamageTariff");
const EquipmentMaintenanceLog = require("../models/EquipmentMaintenanceLog");
const { recordAuditLog } = require("../utils/auditLogger");
const AppError = require("../utils/AppError");

async function getOverview(req, res) {
  const [
    totalUsers,
    activeUsers,
    adminCount,
    pendingEquipments,
    pendingDisputes,
    pendingKyc,
    openTickets,
    activeMaintenance,
    activeTemplates,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({
      role: { $regex: /^systemadmin$/i },
    }),
    Equipment.countDocuments({ approval_status: "pending" }),
    Dispute.countDocuments({ status: { $in: ["pending_review", "investigating"] } }),
    User.countDocuments({ kycStatus: "pending" }),
    SupportTicket.countDocuments({ status: "open" }),
    EquipmentMaintenanceLog.countDocuments({ status: { $in: ["scheduled", "in_progress"] } }),
    ContractTemplate.countDocuments({ status: "published" }),
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
      pendingEquipments,
      pendingDisputes,
      pendingKyc,
      openTickets,
      activeMaintenance,
      activeTemplates,
    },
    users: recentUsers,
  });
}

async function updateUserRole(req, res) {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || typeof role !== "string") {
    throw new AppError(400, "Vui lòng chỉ định quyền hợp lệ");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "Không tìm thấy người dùng trong hệ thống");
  }

  const cleanRole = role.trim();
  const oldRoleLower = (user.role || "").toLowerCase();
  const newRoleLower = cleanRole.toLowerCase();

  // 1. Chặn tự hạ quyền của chính tài khoản đang đăng nhập
  if (user._id.toString() === req.user._id.toString() && newRoleLower !== "systemadmin") {
    throw new AppError(
      400,
      "Không thể tự hạ quyền của chính tài khoản đang đăng nhập để tránh mất quyền quản trị hệ thống."
    );
  }

  // 2. Chặn hạ quyền System Admin duy nhất còn lại trong hệ thống
  if (oldRoleLower === "systemadmin" && newRoleLower !== "systemadmin") {
    const adminCount = await User.countDocuments({
      role: { $regex: /^systemadmin$/i },
    });
    if (adminCount <= 1) {
      throw new AppError(
        400,
        "Không thể hạ quyền System Admin duy nhất còn lại trong hệ thống. Hệ thống bắt buộc phải duy trì tối thiểu 1 System Admin."
      );
    }
  }

  const oldRole = user.role;
  user.role = cleanRole;
  await user.save();

  await recordAuditLog(req, {
    action: "USER_ROLE_UPDATED",
    targetType: "User",
    targetId: user._id,
    targetLabel: `${user.name} (${user.email})`,
    details: { oldRole, newRole: user.role },
  });

  res.json({
    message: `Đã cập nhật vai trò của ${user.name} thành "${user.role}" thành công.`,
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

  const oldStatus = user.status;
  user.status = status;
  if (status !== "active") {
    // Invalidate sessions immediately if deactivated/blocked
    user.token_version = (user.token_version || 0) + 1;
  }
  await user.save();

  await recordAuditLog(req, {
    action: "USER_STATUS_UPDATED",
    targetType: "User",
    targetId: user._id,
    targetLabel: `${user.name} (${user.email})`,
    details: { oldStatus, newStatus: user.status },
  });

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

  // Record audit log
  await recordAuditLog(req, {
    action: "SUPPORT_TICKET_REPLIED",
    targetType: "SupportTicket",
    targetId: ticket._id,
    targetLabel: `#${ticket.ticket_code} - ${ticket.title}`,
    details: {
      messagePreview: message.trim().slice(0, 100),
      ticketStatus: ticket.status,
    },
  });

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

  const oldStatus = ticket.status;
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

  // Record audit log
  await recordAuditLog(req, {
    action: "SUPPORT_TICKET_STATUS_UPDATED",
    targetType: "SupportTicket",
    targetId: ticket._id,
    targetLabel: `#${ticket.ticket_code} - ${ticket.title}`,
    details: {
      oldStatus,
      newStatus: status,
      note: note ? note.trim() : "",
    },
  });

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
    equipment.membership_hidden = false;
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

  // Record audit log
  await recordAuditLog(req, {
    action: approval_status === "approved" ? "EQUIPMENT_APPROVED" : "EQUIPMENT_REJECTED",
    targetType: "Equipment",
    targetId: equipment._id,
    targetLabel: equipment.title,
    details: {
      approval_status,
      rejection_reason: approval_status === "rejected" ? rejection_reason : undefined,
    },
  });

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
  equipment.membership_hidden = false;
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

  // Record audit log
  await recordAuditLog(req, {
    action: visibility === "hidden" ? "EQUIPMENT_HIDDEN" : "EQUIPMENT_RESTORED",
    targetType: "Equipment",
    targetId: equipment._id,
    targetLabel: equipment.title,
    details: {
      visibility,
      reason: reason || "",
    },
  });

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

// ==========================================
// MODULE 2: TRANH CHẤP & BỒI THƯỜNG (UC_A15 & UC_A16)
// ==========================================

async function listDisputes(req, res) {
  const { status, search, page = 1, limit = 10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (status && status !== "all") {
    filter.status = status;
  }
  if (search && search.trim()) {
    const keyword = search.trim();
    filter.$or = [
      { dispute_code: { $regex: keyword, $options: "i" } },
      { title: { $regex: keyword, $options: "i" } },
      { reason: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }

  const [
    disputes,
    totalCount,
    totalAll,
    pendingReviewCount,
    investigatingCount,
    resolvedCount,
    dismissedCount,
  ] = await Promise.all([
    Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: "contract_id",
        select: "contract_code rental_price deposit_amount start_date end_date status equipment_id",
        populate: {
          path: "equipment_id",
          select: "title images price_per_day deposit_amount category",
        },
      })
      .populate("owner_id", "name email phone trust_score")
      .populate("renter_id", "name email phone trust_score")
      .populate("resolved_by", "name email role")
      .lean(),
    Dispute.countDocuments(filter),
    Dispute.countDocuments(),
    Dispute.countDocuments({ status: "pending_review" }),
    Dispute.countDocuments({ status: "investigating" }),
    Dispute.countDocuments({ status: "resolved" }),
    Dispute.countDocuments({ status: "dismissed" }),
  ]);

  res.json({
    disputes,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      totalCount,
      limit: limitNum,
    },
    stats: {
      total: totalAll,
      pending_review: pendingReviewCount,
      investigating: investigatingCount,
      resolved: resolvedCount,
      dismissed: dismissedCount,
    },
  });
}

async function getDisputeDetail(req, res) {
  const { id } = req.params;
  const dispute = await Dispute.findById(id)
    .populate({
      path: "contract_id",
      populate: [
        { path: "equipment_id", select: "title images price_per_day deposit_amount category description condition" },
        { path: "owner_id", select: "name email phone trust_score" },
        { path: "renter_id", select: "name email phone trust_score" },
      ],
    })
    .populate("owner_id", "name email phone trust_score")
    .populate("renter_id", "name email phone trust_score")
    .populate("resolved_by", "name email role")
    .lean();

  if (!dispute) {
    throw new AppError(404, "Không tìm thấy hồ sơ tranh chấp");
  }

  const contractId = dispute.contract_id?._id || dispute.contract_id;
  const [handovers, settlement] = await Promise.all([
    contractId
      ? HandoverRecord.find({ contract_id: contractId }).sort({ record_date: 1 }).lean()
      : [],
    contractId
      ? Settlement.findOne({ contract_id: contractId }).lean()
      : null,
  ]);

  res.json({
    dispute,
    handovers,
    settlement,
  });
}

async function resolveDispute(req, res) {
  const { id } = req.params;
  let { status, compensation_approved, resolution_note } = req.body;

  // Chuẩn hóa status
  if (status === "RESOLVED_REFUND_OWNER") status = "resolved";
  if (status === "REJECTED") status = "dismissed";

  if (!status || !["resolved", "dismissed", "investigating"].includes(status)) {
    throw new AppError(400, "Trạng thái phán quyết không hợp lệ ('resolved', 'dismissed', 'investigating', 'RESOLVED_REFUND_OWNER', 'REJECTED')");
  }

  const dispute = await Dispute.findById(id).populate("contract_id");
  if (!dispute) {
    throw new AppError(404, "Không tìm thấy hồ sơ tranh chấp");
  }

  const approvedAmount = status === "resolved" ? Math.max(0, Number(compensation_approved) || 0) : 0;

  dispute.status = status;
  if (status !== "investigating") {
    dispute.compensation_approved = approvedAmount;
    dispute.resolution_note = resolution_note ? resolution_note.trim() : "";
    dispute.resolved_by = req.user._id;
    dispute.resolved_at = new Date();
  } else {
    if (resolution_note) {
      dispute.resolution_note = resolution_note.trim();
    }
  }

  await dispute.save();

  // Cập nhật trạng thái đơn Rental liên quan (nếu có)
  const targetRentalId = dispute.rentalOrderId || dispute.rental_id;
  if (targetRentalId) {
    try {
      const rental = await Rental.findById(targetRentalId);
      if (rental) {
        rental.status = "COMPLETED";
        rental.dispute = rental.dispute || {};
        rental.dispute.status = status === "resolved" ? "RESOLVED_REFUND_OWNER" : "REJECTED";
        rental.dispute.compensationApproved = approvedAmount;
        rental.dispute.adminNote = resolution_note ? resolution_note.trim() : "";
        rental.dispute.isLocked = false;
        await rental.save();
      }
    } catch (rErr) {
      console.warn("Update rental on dispute resolve error:", rErr.message);
    }
  }

  // Cộng tiền bồi thường vào ví của Owner nếu phán quyết chấp thuận bồi thường
  if (status === "resolved" && approvedAmount > 0) {
    try {
      await User.findByIdAndUpdate(dispute.owner_id, {
        $inc: { walletBalance: approvedAmount },
      });
      const walletTransactionService = require("../services/walletTransactionService");
      if (typeof walletTransactionService?.createTransaction === "function") {
        await walletTransactionService.createTransaction({
          user_id: dispute.owner_id,
          type: "COMPENSATION",
          amount: approvedAmount,
          balance_after: 0,
          description: `Tiền bồi thường hư hỏng thiết bị phán quyết tranh chấp #${dispute.dispute_code}`,
          reference_code: dispute.dispute_code,
          status: "SUCCESS",
        });
      }
    } catch (walletErr) {
      console.warn("Credit owner wallet compensation error:", walletErr.message);
    }
  }

  // Tự động hoàn tiền cọc cho Renter vào Ví SmartEquip
  if (status === "resolved" || status === "dismissed") {
    const contract = dispute.contract_id;
    const depositPaid = Number(contract?.deposit_amount || dispute.deposit_paid || 0);
    const refundToRenter = Math.max(0, depositPaid - approvedAmount);
    if (refundToRenter > 0 && dispute.renter_id) {
      try {
        await User.findByIdAndUpdate(dispute.renter_id, {
          $inc: { walletBalance: refundToRenter },
        });
        const walletTransactionService = require("../services/walletTransactionService");
        if (typeof walletTransactionService?.createTransaction === "function") {
          await walletTransactionService.createTransaction({
            user_id: dispute.renter_id,
            type: "REFUND",
            amount: refundToRenter,
            balance_after: 0,
            description: status === "dismissed"
              ? `Hoàn 100% tiền cọc do bác bỏ khiếu nại tranh chấp #${dispute.dispute_code}`
              : `Hoàn trả phần tiền cọc còn lại sau phán quyết tranh chấp #${dispute.dispute_code}`,
            reference_code: dispute.dispute_code,
            status: "SUCCESS",
          });
        }
      } catch (rErr) {
        console.warn("Credit renter wallet deposit refund error:", rErr.message);
      }
    }
  }

  // If resolved or dismissed, handle financial settlement (UC_A16)
  let settlement = null;
  if (status === "resolved" || status === "dismissed") {
    const contract = dispute.contract_id;
    const contractId = contract?._id || dispute.contract_id;

    settlement = await Settlement.findOne({ contract_id: contractId });
    if (settlement) {
      settlement.damage_deduction = approvedAmount;
      settlement.deduction_reason = resolution_note || `Khấu trừ theo phán quyết tranh chấp ${dispute.dispute_code}`;
      settlement.deposit_refund_to_renter = Math.max(
        0,
        settlement.deposit_paid - (settlement.overtime_fee || 0) - approvedAmount
      );
      if (settlement.payout_status !== "paid") {
        settlement.owner_payout_amount =
          settlement.total_rental_fee -
          settlement.platform_fee +
          (settlement.overtime_fee || 0) +
          approvedAmount;
      }
      await settlement.save();
    } else if (contract) {
      const depositPaid = Number(contract.deposit_amount) || 0;
      const rentalFee = Number(contract.rental_price) || 0;
      const platformFee = Math.round(rentalFee * 0.1);
      const refundToRenter = Math.max(0, depositPaid - approvedAmount);
      const ownerPayout = rentalFee - platformFee + approvedAmount;

      try {
        settlement = await Settlement.create({
          settlement_code: `SETTLE-${Date.now().toString().slice(-6)}`,
          contract_id: contractId,
          owner_id: dispute.owner_id,
          renter_id: dispute.renter_id,
          total_rental_fee: rentalFee,
          overtime_fee: 0,
          damage_deduction: approvedAmount,
          deduction_reason: resolution_note || `Khấu trừ tranh chấp ${dispute.dispute_code}`,
          deposit_paid: depositPaid,
          deposit_refund_to_renter: refundToRenter,
          platform_fee: platformFee,
          owner_payout_amount: ownerPayout,
          payout_status: "pending_owner_confirmation",
        });
      } catch (err) {
        console.error("Failed to auto-create settlement for dispute:", err);
      }
    }

    // Send notifications to Owner & Renter
    try {
      const decisionText =
        status === "resolved"
          ? `Chấp thuận bồi thường ${approvedAmount.toLocaleString("vi-VN")} đ`
          : "Bác bỏ khiếu nại (Hoàn cọc nguyên vẹn)";

      await Promise.all([
        UserNotification.create({
          user_id: dispute.owner_id,
          title: `Phán quyết tranh chấp [${dispute.dispute_code}]`,
          message: `Admin đã kết luận tranh chấp: ${decisionText}. Ghi chú: ${resolution_note || "Không có"}`,
          related_record_id: dispute._id,
        }),
        UserNotification.create({
          user_id: dispute.renter_id,
          title: `Phán quyết tranh chấp [${dispute.dispute_code}]`,
          message: `Admin đã kết luận tranh chấp: ${decisionText}. Ghi chú: ${resolution_note || "Không có"}`,
          related_record_id: dispute._id,
        }),
      ]);
    } catch (err) {
      console.error("Failed to notify users about dispute resolution:", err);
    }
  }

  // Audit log
  await recordAuditLog(req, {
    action: status === "resolved" ? "DISPUTE_RESOLVED" : status === "dismissed" ? "DISPUTE_DISMISSED" : "DISPUTE_INVESTIGATING",
    targetType: "Dispute",
    targetId: dispute._id,
    targetLabel: dispute.dispute_code,
    details: {
      status,
      compensation_approved: approvedAmount,
      resolution_note,
      claimed_compensation: dispute.claimed_compensation,
    },
  });

  // Socket emit
  try {
    const { getIO } = require("../config/socket");
    getIO().emit("dispute:resolved", {
      disputeId: dispute._id.toString(),
      disputeCode: dispute.dispute_code,
      status,
      compensation_approved: approvedAmount,
      message: `Tranh chấp ${dispute.dispute_code} đã được xử lý: ${status === "resolved" ? "Chấp thuận bồi thường" : status === "dismissed" ? "Bác bỏ khiếu nại" : "Đang điều tra"}.`,
    });
  } catch (err) {
    console.error("Socket emit dispute:resolved failed:", err);
  }

  const populated = await Dispute.findById(id)
    .populate("contract_id")
    .populate("owner_id", "name email phone trust_score")
    .populate("renter_id", "name email phone trust_score")
    .populate("resolved_by", "name email role")
    .lean();

  res.json({
    message: status === "investigating"
      ? `Đã chuyển tranh chấp "${dispute.dispute_code}" sang trạng thái Đang điều tra.`
      : `Đã hoàn tất phân xử tranh chấp "${dispute.dispute_code}".`,
    dispute: populated,
    settlement,
  });
}

// ==========================================
// MODULE 4: XÉT DUYỆT KYC RENTER (UC_A06)
// ==========================================

async function listKycSubmissions(req, res) {
  const { status, search, page = 1, limit = 10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (status && status !== "all") {
    filter.kycStatus = status;
  } else if (!status) {
    filter.kycStatus = { $in: ["pending", "verified", "rejected"] };
  }

  if (search && search.trim()) {
    const keyword = search.trim();
    filter.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { email: { $regex: keyword, $options: "i" } },
      { "kycDocument.idNumber": { $regex: keyword, $options: "i" } },
    ];
  }

  const [
    users,
    totalCount,
    pendingCount,
    verifiedCount,
    rejectedCount,
    unverifiedCount,
  ] = await Promise.all([
    User.find(filter, { password_hash: 0, password_reset_token_hash: 0, google_id: 0 })
      .sort({ "kycDocument.submittedAt": -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("kycDocument.verifiedBy", "name email role")
      .lean(),
    User.countDocuments(filter),
    User.countDocuments({ kycStatus: "pending" }),
    User.countDocuments({ kycStatus: "verified" }),
    User.countDocuments({ kycStatus: "rejected" }),
    User.countDocuments({ kycStatus: "unverified" }),
  ]);

  res.json({
    submissions: users,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      totalCount,
      limit: limitNum,
    },
    stats: {
      pending: pendingCount,
      verified: verifiedCount,
      rejected: rejectedCount,
      unverified: unverifiedCount,
      total_active: pendingCount + verifiedCount + rejectedCount,
    },
  });
}

async function reviewKycSubmission(req, res) {
  const { userId } = req.params;
  const { status, rejectionReason, trustScoreBonus = 20 } = req.body;

  if (!status || !["verified", "rejected"].includes(status)) {
    throw new AppError(400, "Trạng thái xét duyệt KYC phải là 'verified' hoặc 'rejected'");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "Không tìm thấy người dùng");
  }

  if (status === "rejected" && (!rejectionReason || !rejectionReason.trim())) {
    throw new AppError(400, "Vui lòng nhập lý do từ chối hồ sơ KYC");
  }

  user.kycStatus = status;
  if (!user.kycDocument) {
    user.kycDocument = {};
  }

  if (status === "verified") {
    user.kycDocument.verifiedAt = new Date();
    user.kycDocument.verifiedBy = req.user._id;
    user.kycDocument.rejectionReason = "";
    user.trust_score = (user.trust_score || 0) + Number(trustScoreBonus);
  } else {
    user.kycDocument.rejectionReason = rejectionReason.trim();
    user.kycDocument.verifiedAt = undefined;
    user.kycDocument.verifiedBy = req.user._id;
  }

  await user.save();

  // Send notification to user
  try {
    await UserNotification.create({
      user_id: user._id,
      title: status === "verified"
        ? "Hồ sơ xác thực danh tính (KYC) đã được phê duyệt! 🎉"
        : "Hồ sơ xác thực danh tính (KYC) bị từ chối ⚠️",
      message: status === "verified"
        ? `Chúc mừng bạn! Hồ sơ định danh cá nhân đã được xác thực thành công. Bạn được cộng +${trustScoreBonus} điểm uy tín.`
        : `Hồ sơ định danh của bạn chưa được duyệt. Lý do: ${rejectionReason}. Vui lòng kiểm tra và gửi lại ảnh chụp rõ nét.`,
      related_record_id: user._id,
    });
  } catch (err) {
    console.error("Failed to notify user about KYC review:", err);
  }

  // Audit log
  await recordAuditLog(req, {
    action: status === "verified" ? "KYC_VERIFIED" : "KYC_REJECTED",
    targetType: "User",
    targetId: user._id,
    targetLabel: `${user.name} (${user.email})`,
    details: {
      status,
      rejectionReason: status === "rejected" ? rejectionReason : undefined,
      trustScoreBonus: status === "verified" ? trustScoreBonus : undefined,
      idNumber: user.kycDocument?.idNumber,
    },
  });

  // Socket realtime
  try {
    const { getIO } = require("../config/socket");
    getIO().emit("kyc:reviewed", {
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      status,
      message: status === "verified"
        ? `Hồ sơ KYC của ${user.name} đã được phê duyệt.`
        : `Hồ sơ KYC của ${user.name} đã bị từ chối.`,
    });
  } catch (err) {
    console.error("Socket emit kyc:reviewed failed:", err);
  }

  const updatedUser = await User.findById(userId, { password_hash: 0, password_reset_token_hash: 0, google_id: 0 })
    .populate("kycDocument.verifiedBy", "name email role")
    .lean();

  res.json({
    message: status === "verified"
      ? `Đã phê duyệt KYC thành công cho người dùng "${user.name}".`
      : `Đã từ chối hồ sơ KYC của người dùng "${user.name}".`,
    user: updatedUser,
  });
}

// ==========================================
// MODULE 3: AUDIT LOGS (UC_A21)
// ==========================================

async function listAuditLogs(req, res) {
  const { action, targetType, search, startDate, endDate, page = 1, limit = 15 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (action && action !== "all") {
    filter.action = action;
  }
  if (targetType && targetType !== "all") {
    filter.target_type = targetType;
  }
  if (search && search.trim()) {
    const keyword = search.trim();
    filter.$or = [
      { actor_name: { $regex: keyword, $options: "i" } },
      { actor_email: { $regex: keyword, $options: "i" } },
      { target_label: { $regex: keyword, $options: "i" } },
      { action: { $regex: keyword, $options: "i" } },
    ];
  }
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [logs, totalCount, logsToday] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("actor_id", "name email role")
      .lean(),
    AuditLog.countDocuments(filter),
    AuditLog.countDocuments({ createdAt: { $gte: todayStart } }),
  ]);

  res.json({
    logs,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      totalCount,
      limit: limitNum,
    },
    stats: {
      total: totalCount,
      today: logsToday,
    },
  });
}

// ==========================================
// UC_A26: Digital Contract Template Management
// ==========================================
async function listContractTemplates(req, res) {
  const { status, search } = req.query;
  const filter = {};

  if (status && ["draft", "published", "retired"].includes(status)) {
    filter.status = status;
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [{ template_code: regex }, { name: regex }];
  }

  const [templates, totalDraft, totalPublished, totalRetired] = await Promise.all([
    ContractTemplate.find(filter)
      .populate("created_by", "name email role")
      .populate("published_by", "name email role")
      .sort({ updatedAt: -1 })
      .lean(),
    ContractTemplate.countDocuments({ status: "draft" }),
    ContractTemplate.countDocuments({ status: "published" }),
    ContractTemplate.countDocuments({ status: "retired" }),
  ]);

  res.json({
    templates,
    stats: {
      total: templates.length,
      draft: totalDraft,
      published: totalPublished,
      retired: totalRetired,
    },
  });
}

async function createContractTemplate(req, res) {
  const { template_code, name, version, terms_content, fields, status } = req.body;

  if (!template_code || !name || !terms_content) {
    throw new AppError(400, "Mã mẫu, tên hợp đồng và điều khoản thuê là bắt buộc.");
  }

  const parsedVersion = Number(version) || 1;
  const existing = await ContractTemplate.findOne({
    template_code: template_code.trim().toUpperCase(),
    version: parsedVersion,
  });

  if (existing) {
    throw new AppError(409, `Mẫu hợp đồng ${template_code} phiên bản ${parsedVersion} đã tồn tại.`);
  }

  const newTemplate = new ContractTemplate({
    template_code: template_code.trim().toUpperCase(),
    name: name.trim(),
    version: parsedVersion,
    terms_content: terms_content.trim(),
    fields: Array.isArray(fields) ? fields : [],
    status: ["draft", "published"].includes(status) ? status : "draft",
    created_by: req.user._id,
    published_by: status === "published" ? req.user._id : undefined,
    published_at: status === "published" ? new Date() : undefined,
  });

  await newTemplate.save();

  await recordAuditLog(req, {
    action: "CONTRACT_TEMPLATE_CREATED",
    targetType: "ContractTemplate",
    targetId: newTemplate._id,
    details: { template_code: newTemplate.template_code, version: newTemplate.version, status: newTemplate.status },
  });

  res.status(201).json({
    message: "Tạo mẫu hợp đồng thành công.",
    template: newTemplate,
  });
}

async function updateContractTemplate(req, res) {
  const { id } = req.params;
  const { name, terms_content, fields, status } = req.body;

  const template = await ContractTemplate.findById(id);
  if (!template) {
    throw new AppError(404, "Không tìm thấy mẫu hợp đồng.");
  }

  if (name) template.name = name.trim();
  if (terms_content) template.terms_content = terms_content.trim();
  if (Array.isArray(fields)) template.fields = fields;

  if (status && ["draft", "published", "retired"].includes(status)) {
    if (status === "published" && template.status !== "published") {
      template.published_by = req.user._id;
      template.published_at = new Date();
    } else if (status === "retired" && template.status !== "retired") {
      template.retired_by = req.user._id;
      template.retired_at = new Date();
    }
    template.status = status;
  }

  await template.save();

  await recordAuditLog(req, {
    action: "CONTRACT_TEMPLATE_UPDATED",
    targetType: "ContractTemplate",
    targetId: template._id,
    details: { template_code: template.template_code, status: template.status },
  });

  res.json({
    message: "Cập nhật mẫu hợp đồng thành công.",
    template,
  });
}

async function updateContractTemplateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!["draft", "published", "retired"].includes(status)) {
    throw new AppError(400, "Trạng thái không hợp lệ (draft, published, retired).");
  }

  const template = await ContractTemplate.findById(id);
  if (!template) {
    throw new AppError(404, "Không tìm thấy mẫu hợp đồng.");
  }

  template.status = status;
  if (status === "published") {
    template.published_by = req.user._id;
    template.published_at = new Date();
  } else if (status === "retired") {
    template.retired_by = req.user._id;
    template.retired_at = new Date();
  }

  await template.save();

  await recordAuditLog(req, {
    action: "CONTRACT_TEMPLATE_STATUS_CHANGED",
    targetType: "ContractTemplate",
    targetId: template._id,
    details: { status },
  });

  res.json({
    message: `Đã chuyển trạng thái mẫu hợp đồng sang ${status}.`,
    template,
  });
}

// ==========================================
// UC_A27: Equipment Status & Maintenance Review
// ==========================================
async function listEquipmentStatusRequests(req, res) {
  const { status, target_status, search } = req.query;
  const filter = {};

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }
  if (target_status && ["available", "maintenance", "retired", "damaged", "hidden"].includes(target_status)) {
    filter.target_status = target_status;
  }

  const [requests, totalPending, totalApproved, totalRejected] = await Promise.all([
    EquipmentStatusRequest.find(filter)
      .populate("equipment_id", "title name images condition status visibility serial_number")
      .populate("owner_id", "name email phone")
      .populate("reviewed_by", "name email")
      .sort({ createdAt: -1 })
      .lean(),
    EquipmentStatusRequest.countDocuments({ status: "pending" }),
    EquipmentStatusRequest.countDocuments({ status: "approved" }),
    EquipmentStatusRequest.countDocuments({ status: "rejected" }),
  ]);

  let filteredRequests = requests;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filteredRequests = requests.filter((r) => {
      const eqTitle = (r.equipment_id?.title || r.equipment_id?.name || "").toLowerCase();
      const ownerName = (r.owner_id?.name || "").toLowerCase();
      const ownerEmail = (r.owner_id?.email || "").toLowerCase();
      return eqTitle.includes(q) || ownerName.includes(q) || ownerEmail.includes(q);
    });
  }

  res.json({
    requests: filteredRequests,
    stats: {
      total: requests.length,
      pending: totalPending,
      approved: totalApproved,
      rejected: totalRejected,
    },
  });
}

async function reviewEquipmentStatusRequest(req, res) {
  const { id } = req.params;
  const { status, moderator_note } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    throw new AppError(400, "Trạng thái thẩm định chỉ có thể là approved hoặc rejected.");
  }

  if (status === "rejected" && (!moderator_note || !moderator_note.trim())) {
    throw new AppError(400, "Vui lòng nhập lý do từ chối yêu cầu đổi trạng thái.");
  }

  const statusRequest = await EquipmentStatusRequest.findById(id);
  if (!statusRequest) {
    throw new AppError(404, "Không tìm thấy yêu cầu đổi trạng thái thiết bị.");
  }

  if (statusRequest.status !== "pending") {
    throw new AppError(400, "Yêu cầu này đã được xử lý trước đó.");
  }

  statusRequest.status = status;
  statusRequest.moderator_note = moderator_note ? moderator_note.trim() : "";
  statusRequest.reviewed_at = new Date();
  statusRequest.reviewed_by = req.user._id;

  if (status === "approved") {
    const equipment = await Equipment.findById(statusRequest.equipment_id);
    if (equipment) {
      if (statusRequest.target_status === "hidden") {
        equipment.visibility = "hidden";
        equipment.hidden_reason = statusRequest.reason || "Chủ máy yêu cầu tạm ẩn thiết bị";
      } else {
        equipment.status = statusRequest.target_status;
        if (statusRequest.target_status === "maintenance") {
          equipment.visibility = "hidden"; // Ẩn khỏi marketplace khi đang bảo trì
          equipment.hidden_reason = "Thiết bị đang trong kỳ bảo trì & bảo dưỡng định kỳ";
        } else if (statusRequest.target_status === "available") {
          equipment.visibility = "published";
          equipment.hidden_reason = "";
        }
      }
      await equipment.save();
    }
  }

  await statusRequest.save();

  // Create notification for Owner
  try {
    await UserNotification.create({
      user_id: statusRequest.owner_id,
      title: status === "approved" ? "Yêu cầu chuyển trạng thái thiết bị được chấp thuận" : "Yêu cầu chuyển trạng thái thiết bị bị từ chối",
      message: status === "approved"
        ? `Yêu cầu chuyển thiết bị sang trạng thái ${statusRequest.target_status.toUpperCase()} đã được Quản trị viên duyệt.`
        : `Yêu cầu chuyển thiết bị sang ${statusRequest.target_status.toUpperCase()} bị từ chối. Lý do: ${moderator_note}`,
      type: "equipment_status_review",
      read: false,
    });
  } catch (err) {
    // Non-fatal
  }

  await recordAuditLog(req, {
    action: status === "approved" ? "EQUIPMENT_STATUS_APPROVED" : "EQUIPMENT_STATUS_REJECTED",
    targetType: "EquipmentStatusRequest",
    targetId: statusRequest._id,
    details: {
      equipment_id: statusRequest.equipment_id,
      target_status: statusRequest.target_status,
      moderator_note: statusRequest.moderator_note,
    },
  });

  res.json({
    message: status === "approved" ? "Đã duyệt yêu cầu đổi trạng thái thiết bị." : "Đã từ chối yêu cầu đổi trạng thái thiết bị.",
    request: statusRequest,
  });
}

// ==========================================
// UC_A28: Owner Membership & Subscription Management
// ==========================================
async function listMemberships(req, res) {
  const { status, plan, search } = req.query;
  const filter = {};

  if (status && ["pending_payment", "active", "extended", "expired", "failed"].includes(status)) {
    filter.status = status;
  }
  if (plan && ["trial_7d", "month_1", "month_2", "month_3"].includes(plan)) {
    filter.plan = plan;
  }

  const [memberships, totalActive, totalExpired, totalPending, revenueAgg] = await Promise.all([
    OwnerMembership.find(filter)
      .populate("owner_id", "name email phone role")
      .sort({ createdAt: -1 })
      .lean(),
    OwnerMembership.countDocuments({ status: "active" }),
    OwnerMembership.countDocuments({ status: "expired" }),
    OwnerMembership.countDocuments({ status: "pending_payment" }),
    OwnerMembership.aggregate([
      { $match: { status: { $in: ["active", "extended", "expired"] }, is_trial: false } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]),
  ]);

  let filtered = memberships;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = memberships.filter((m) => {
      const name = (m.owner_id?.name || "").toLowerCase();
      const email = (m.owner_id?.email || "").toLowerCase();
      const ref = (m.payment_reference || "").toLowerCase();
      return name.includes(q) || email.includes(q) || ref.includes(q);
    });
  }

  const totalRevenue = revenueAgg[0]?.totalAmount || 0;

  res.json({
    memberships: filtered,
    stats: {
      total: memberships.length,
      active: totalActive,
      expired: totalExpired,
      pending: totalPending,
      totalRevenue,
    },
  });
}

async function grantOwnerMembership(req, res) {
  const { owner_id, plan, duration_months, note } = req.body;

  if (!owner_id) {
    throw new AppError(400, "Vui lòng chọn Chủ máy (Owner).");
  }

  const owner = await User.findById(owner_id);
  if (!owner) {
    throw new AppError(404, "Không tìm thấy người dùng.");
  }

  const months = Number(duration_months) || 1;
  const planKey = ["trial_7d", "month_1", "month_2", "month_3"].includes(plan) ? plan : `month_${months}`;

  // Find existing active membership
  const now = new Date();
  const existingActive = await OwnerMembership.findOne({
    owner_id,
    status: { $in: ["active", "extended"] },
    expires_at: { $gt: now },
  });

  let membership;
  if (existingActive) {
    // Extend expiry
    const newExpires = new Date(existingActive.expires_at);
    newExpires.setMonth(newExpires.getMonth() + months);
    existingActive.expires_at = newExpires;
    existingActive.status = "extended";
    existingActive.payment_reference = note || "Đặc cách gia hạn bởi Quản trị viên";
    await existingActive.save();
    membership = existingActive;
  } else {
    // Create new active membership
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    membership = new OwnerMembership({
      owner_id,
      plan: planKey,
      duration_months: months,
      amount: 0,
      payment_reference: note || "Cấp gói đặc cách bởi Quản trị viên",
      status: "active",
      is_trial: planKey === "trial_7d",
      started_at: now,
      expires_at: expiresAt,
      paid_at: now,
    });
    await membership.save();
  }

  // Auto unhide equipment if owner has active membership
  try {
    await Equipment.updateMany(
      { owner_id, hidden_reason: /hết hạn gói hội viên/i },
      { $set: { visibility: "published", hidden_reason: "" } }
    );
  } catch (err) {
    // Non-fatal
  }

  // Create notification
  try {
    await UserNotification.create({
      user_id: owner_id,
      title: "Gói Hội Viên Chủ Máy Đã Được Kích Hoạt",
      message: `Quản trị viên đã kích hoạt/gia hạn gói hội viên (${months} tháng) cho bạn. Hạn sử dụng đến ngày ${new Date(membership.expires_at).toLocaleDateString("vi-VN")}.`,
      type: "membership_granted",
      read: false,
    });
  } catch (err) {
    // Non-fatal
  }

  await recordAuditLog(req, {
    action: "OWNER_MEMBERSHIP_MANUAL_GRANT",
    targetType: "OwnerMembership",
    targetId: membership._id,
    details: { owner_id, months, expires_at: membership.expires_at, note },
  });

  res.status(201).json({
    message: "Kích hoạt/Gia hạn gói hội viên thành công.",
    membership,
  });
}

// ==========================================
// UC_A29: Rental Settlement & Escrow Release Audit
// ==========================================
async function listSettlements(req, res) {
  const { payout_status, search } = req.query;
  const filter = {};

  if (payout_status && ["pending_owner_confirmation", "pending_moderator_approval", "confirmed", "processing", "paid", "rejected"].includes(payout_status)) {
    filter.payout_status = payout_status;
  }

  const [settlements, totalPendingApproval, totalPaid, totalProcessing, statsAgg] = await Promise.all([
    Settlement.find(filter)
      .populate("owner_id", "name email phone")
      .populate("renter_id", "name email phone")
      .populate("contract_id", "contract_code")
      .populate("moderator_review.moderator_id", "name email")
      .sort({ createdAt: -1 })
      .lean(),
    Settlement.countDocuments({ payout_status: "pending_moderator_approval" }),
    Settlement.countDocuments({ payout_status: "paid" }),
    Settlement.countDocuments({ payout_status: "processing" }),
    Settlement.aggregate([
      {
        $group: {
          _id: null,
          totalDepositRefund: { $sum: "$deposit_refund_to_renter" },
          totalDamageDeduction: { $sum: "$damage_deduction" },
          totalPlatformFee: { $sum: "$platform_fee" },
          totalOwnerPayout: { $sum: "$owner_payout_amount" },
        },
      },
    ]),
  ]);

  let filtered = settlements;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = settlements.filter((s) => {
      const code = (s.settlement_code || "").toLowerCase();
      const ownerName = (s.owner_id?.name || "").toLowerCase();
      const renterName = (s.renter_id?.name || "").toLowerCase();
      const contractCode = (s.contract_id?.contract_code || "").toLowerCase();
      return code.includes(q) || ownerName.includes(q) || renterName.includes(q) || contractCode.includes(q);
    });
  }

  const agg = statsAgg[0] || {};

  res.json({
    settlements: filtered,
    stats: {
      total: settlements.length,
      pendingApproval: totalPendingApproval,
      paid: totalPaid,
      processing: totalProcessing,
      totalDepositRefund: agg.totalDepositRefund || 0,
      totalDamageDeduction: agg.totalDamageDeduction || 0,
      totalPlatformFee: agg.totalPlatformFee || 0,
      totalOwnerPayout: agg.totalOwnerPayout || 0,
    },
  });
}

async function approveSettlement(req, res) {
  const { id } = req.params;
  const { action, note, transaction_code } = req.body;

  if (!["approve", "reject"].includes(action)) {
    throw new AppError(400, "Hành động chỉ có thể là approve hoặc reject.");
  }

  const settlement = await Settlement.findById(id);
  if (!settlement) {
    throw new AppError(404, "Không tìm thấy bảng quyết toán hợp đồng.");
  }

  const isApproval = action === "approve";
  settlement.payout_status = isApproval ? "paid" : "rejected";
  if (isApproval) {
    settlement.paid_at = new Date();
  }

  settlement.moderator_review = {
    moderator_id: req.user._id,
    reviewed_at: new Date(),
    note: note ? note.trim() : (isApproval ? "Quản trị viên đã duyệt giải ngân và hoàn cọc" : "Bị từ chối quyết toán"),
    transaction_code: transaction_code ? transaction_code.trim() : "",
  };

  await settlement.save();

  // Create notifications for Owner and Renter
  try {
    if (isApproval) {
      const walletTransactionService = require("../services/walletTransactionService");

      // 1. Hoàn trả tiền cọc cho Renter vào Ví SmartEquip
      if (settlement.deposit_refund_to_renter > 0 && settlement.renter_id) {
        await User.findByIdAndUpdate(settlement.renter_id, {
          $inc: { walletBalance: settlement.deposit_refund_to_renter },
        });
        if (typeof walletTransactionService?.createTransaction === "function") {
          await walletTransactionService.createTransaction({
            user_id: settlement.renter_id,
            type: "REFUND",
            amount: settlement.deposit_refund_to_renter,
            balance_after: 0,
            description: `Hoàn tiền cọc quyết toán hợp đồng #${settlement.settlement_code}`,
            reference_code: settlement.settlement_code,
            status: "SUCCESS",
          });
        }
      }

      // 2. Giải ngân tiền cho thuê vào Ví của Owner
      if (settlement.owner_payout_amount > 0 && settlement.owner_id) {
        await User.findByIdAndUpdate(settlement.owner_id, {
          $inc: { walletBalance: settlement.owner_payout_amount },
        });
        if (typeof walletTransactionService?.createTransaction === "function") {
          await walletTransactionService.createTransaction({
            user_id: settlement.owner_id,
            type: "RENTAL_INCOME",
            amount: settlement.owner_payout_amount,
            balance_after: 0,
            description: `Giải ngân tiền cho thuê hợp đồng #${settlement.settlement_code}`,
            reference_code: settlement.settlement_code,
            status: "SUCCESS",
          });
        }
      }

      await Promise.all([
        UserNotification.create({
          user_id: settlement.owner_id,
          title: "Quyết Toán Thuê Máy Đã Được Giải Ngân",
          message: `Bảng quyết toán ${settlement.settlement_code} đã được duyệt. Số tiền ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(settlement.owner_payout_amount)} đã được giải ngân vào Ví SmartEquip.`,
          type: "settlement_paid",
          read: false,
        }),
        UserNotification.create({
          user_id: settlement.renter_id,
          title: "Tiền Cọc Thuê Máy Đã Được Hoàn Trả",
          message: `Hợp đồng thuê kết thúc. Số tiền cọc hoàn lại ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(settlement.deposit_refund_to_renter)} đã được hoàn về Ví SmartEquip an toàn.`,
          type: "deposit_refunded",
          read: false,
        }),
      ]);
    }
  } catch (err) {
    console.warn("Settlement wallet update / notification error:", err.message);
  }

  await recordAuditLog(req, {
    action: isApproval ? "SETTLEMENT_APPROVED" : "SETTLEMENT_REJECTED",
    targetType: "Settlement",
    targetId: settlement._id,
    details: {
      settlement_code: settlement.settlement_code,
      payout_status: settlement.payout_status,
      deposit_refund: settlement.deposit_refund_to_renter,
      damage_deduction: settlement.damage_deduction,
      transaction_code: settlement.moderator_review?.transaction_code,
    },
  });

  res.json({
    message: isApproval ? "Duyệt quyết toán & giải phóng tiền cọc thành công." : "Đã từ chối bảng quyết toán.",
    settlement,
  });
}

// ==========================================
// UC_A30: Handover & Return Records Inspection
// ==========================================
async function listHandoverRecords(req, res) {
  const { record_type, review_status, contract_id, search } = req.query;
  const filter = {};

  if (record_type && ["handover", "return"].includes(record_type)) {
    filter.record_type = record_type;
  }
  if (review_status && ["pending", "verified", "needs_changes"].includes(review_status)) {
    filter["moderator_review.status"] = review_status;
  }
  if (contract_id) {
    filter.contract_id = contract_id;
  }

  const [records, totalHandover, totalReturn, totalPendingReview, totalVerified] = await Promise.all([
    HandoverRecord.find(filter)
      .populate("equipment_id", "title name images serial_number condition")
      .populate("owner_id", "name email phone")
      .populate("renter_id", "name email phone")
      .populate("contract_id", "contract_code")
      .populate("moderator_review.moderator_id", "name email")
      .sort({ record_date: -1 })
      .lean(),
    HandoverRecord.countDocuments({ record_type: "handover" }),
    HandoverRecord.countDocuments({ record_type: "return" }),
    HandoverRecord.countDocuments({ "moderator_review.status": "pending" }),
    HandoverRecord.countDocuments({ "moderator_review.status": "verified" }),
  ]);

  let filtered = records;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = records.filter((r) => {
      const eqTitle = (r.equipment_id?.title || r.equipment_id?.name || "").toLowerCase();
      const ownerName = (r.owner_id?.name || "").toLowerCase();
      const renterName = (r.renter_id?.name || "").toLowerCase();
      const contractCode = (r.contract_id?.contract_code || "").toLowerCase();
      return eqTitle.includes(q) || ownerName.includes(q) || renterName.includes(q) || contractCode.includes(q);
    });
  }

  res.json({
    records: filtered,
    stats: {
      total: records.length,
      handover: totalHandover,
      return: totalReturn,
      pendingReview: totalPendingReview,
      verified: totalVerified,
    },
  });
}

async function reviewHandoverRecord(req, res) {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!["verified", "needs_changes"].includes(status)) {
    throw new AppError(400, "Trạng thái chỉ có thể là verified hoặc needs_changes.");
  }

  const record = await HandoverRecord.findById(id);
  if (!record) {
    throw new AppError(404, "Không tìm thấy biên bản bàn giao/hoàn trả.");
  }

  record.moderator_review = {
    status,
    note: note ? note.trim() : (status === "verified" ? "Đã đối soát tính toàn vẹn phụ kiện & tình trạng thiết bị" : "Cần bổ sung bằng chứng"),
    moderator_id: req.user._id,
    reviewed_at: new Date(),
  };

  if (!record.moderator_review_history) {
    record.moderator_review_history = [];
  }
  record.moderator_review_history.push({
    status,
    note: record.moderator_review.note,
    moderator_id: req.user._id,
    reviewed_at: new Date(),
  });

  await record.save();

  await recordAuditLog(req, {
    action: "HANDOVER_RECORD_REVIEWED",
    targetType: "HandoverRecord",
    targetId: record._id,
    details: {
      record_type: record.record_type,
      status: record.moderator_review.status,
      note: record.moderator_review.note,
    },
  });

  res.json({
    message: status === "verified" ? "Đã xác nhận kiểm tra biên bản thành công." : "Đã yêu cầu bổ sung bằng chứng biên bản.",
    record,
  });
}

// ==========================================
// UC_A31: Risk & Fraud Anomaly Detection Monitor
// ==========================================
async function getRiskMonitor(req, res) {
  const [users, openDisputes, pendingSettlements] = await Promise.all([
    User.find({}, { password_hash: 0, password_reset_token_hash: 0, google_id: 0 })
      .sort({ createdAt: -1 })
      .lean(),
    Dispute.find({ status: { $in: ["pending_review", "investigating"] } })
      .populate("renter_id", "name email phone")
      .populate("owner_id", "name email")
      .lean(),
    Settlement.find({ damage_deduction: { $gt: 0 } })
      .populate("renter_id", "name email")
      .lean(),
  ]);

  // Aggregate user risk scores based on disputes, damage deductions, and KYC status
  const flaggedUsers = [];
  let highRiskCount = 0;
  let mediumRiskCount = 0;

  for (const u of users) {
    let riskScore = 0;
    const reasons = [];

    // Check open disputes
    const userDisputes = openDisputes.filter(
      (d) => String(d.renter_id?._id || d.renter_id) === String(u._id)
    );
    if (userDisputes.length > 0) {
      riskScore += userDisputes.length * 40;
      reasons.push(`Đang dính ${userDisputes.length} vụ khiếu nại tranh chấp hư hại`);
    }

    // Check history of damage deductions
    const userDamages = pendingSettlements.filter(
      (s) => String(s.renter_id?._id || s.renter_id) === String(u._id)
    );
    if (userDamages.length > 0) {
      riskScore += userDamages.length * 25;
      reasons.push(`Từng bị khấu trừ tiền cọc do làm hỏng thiết bị (${userDamages.length} lần)`);
    }

    // Unverified KYC with account suspended or flagged
    if (u.status === "suspended") {
      riskScore += 50;
      reasons.push("Tài khoản đang bị đóng băng / tạm khóa");
    } else if (u.kycStatus !== "verified") {
      riskScore += 15;
      reasons.push("Chưa hoàn tất định danh công dân KYC");
    }

    if (riskScore >= 20) {
      const severity = riskScore >= 50 ? "high" : "medium";
      if (severity === "high") highRiskCount++;
      else mediumRiskCount++;

      flaggedUsers.push({
        user: u,
        riskScore,
        severity,
        reasons,
        disputeCount: userDisputes.length,
        damageIncidentCount: userDamages.length,
      });
    }
  }

  // Sort by highest risk score
  flaggedUsers.sort((a, b) => b.riskScore - a.riskScore);

  res.json({
    flaggedUsers,
    stats: {
      totalFlagged: flaggedUsers.length,
      highRiskCount,
      mediumRiskCount,
      activeDisputesCount: openDisputes.length,
      safetyIndex: Math.max(10, 100 - (highRiskCount * 5 + mediumRiskCount * 2)),
    },
  });
}

async function freezeRiskUser(req, res) {
  const { userId } = req.params;
  const { action, reason } = req.body; // action: "freeze" | "unfreeze"

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "Không tìm thấy người dùng.");
  }

  if (action === "freeze") {
    user.status = "suspended";
    await user.save();

    await recordAuditLog(req, {
      action: "USER_RISK_FROZEN",
      targetType: "User",
      targetId: user._id,
      details: { reason: reason || "Đóng băng tài khoản phòng ngừa rủi ro gian lận thiết bị" },
    });

    res.json({ message: `Đã đóng băng tài khoản ${user.name} thành công.`, user });
  } else {
    user.status = "active";
    await user.save();

    await recordAuditLog(req, {
      action: "USER_RISK_UNFROZEN",
      targetType: "User",
      targetId: user._id,
      details: { reason: reason || "Mở khóa tài khoản sau khi xác minh an toàn" },
    });

    res.json({ message: `Đã mở khóa tài khoản ${user.name} thành công.`, user });
  }
}

// ==========================================
// UC_A32: Standard Damage Compensation Tariffs
// ==========================================
const DEFAULT_TARIFFS = [
  {
    category: "Ống Kính & Thấu Kính",
    item_name: "Mất nắp che trước/sau ống kính (Lens Cap)",
    severity: "minor",
    standard_fee: 150000,
    fee_type: "fixed",
    description: "Khấu trừ chi phí mua nắp che ống kính chính hãng",
  },
  {
    category: "Ống Kính & Thấu Kính",
    item_name: "Vỡ / Nứt kính lọc bảo vệ (Filter UV/ND)",
    severity: "minor",
    standard_fee: 450000,
    fee_type: "fixed",
    description: "Đền bù kính lọc bảo vệ thay mới",
  },
  {
    category: "Ống Kính & Thấu Kính",
    item_name: "Trầy xước lớp tráng phủ thấu kính trước (Coating Scratch)",
    severity: "moderate",
    standard_fee: 2500000,
    fee_type: "fixed",
    description: "Thay cụm thấu kính ngoài tại trung tâm bảo hành hãng",
  },
  {
    category: "Thân Máy & Cảm Biến",
    item_name: "Bụi bẩn bám cảm biến Full-frame (Cần vệ sinh chuyên sâu)",
    severity: "minor",
    standard_fee: 300000,
    fee_type: "fixed",
    description: "Chi phí vệ sinh sensor chuyên nghiệp tại phòng Lab",
  },
  {
    category: "Thân Máy & Cảm Biến",
    item_name: "Xước / Cháy cảm biến do tia Laser (Sensor Burn)",
    severity: "severe",
    standard_fee: 12000000,
    fee_type: "fixed",
    description: "Thay thế toàn bộ cụm cảm biến CMOS chính hãng",
  },
  {
    category: "Phụ Kiện Điện Ảnh",
    item_name: "Mất Pin Zin máy ảnh (Sony NP-FZ100 / Canon LP-E6NH)",
    severity: "moderate",
    standard_fee: 1400000,
    fee_type: "fixed",
    description: "Bồi thường mua lại pin zin nguyên seal",
  },
  {
    category: "Phụ Kiện Điện Ảnh",
    item_name: "Mất Thẻ Nhớ Tốc Độ Cao CFexpress Type A / SD V90",
    severity: "moderate",
    standard_fee: 2200000,
    fee_type: "fixed",
    description: "Thay thế thẻ nhớ tốc độ cao chuẩn quay 4K/8K",
  },
];

async function listDamageTariffs(req, res) {
  const { category, severity, search } = req.query;

  // Auto seed default tariffs if table is empty
  const count = await DamageTariff.countDocuments();
  if (count === 0) {
    await DamageTariff.insertMany(
      DEFAULT_TARIFFS.map((t) => ({ ...t, updated_by: req.user._id }))
    );
  }

  const filter = {};
  if (category) filter.category = category;
  if (severity) filter.severity = severity;

  const tariffs = await DamageTariff.find(filter)
    .populate("updated_by", "name email")
    .sort({ category: 1, standard_fee: 1 })
    .lean();

  let filtered = tariffs;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = tariffs.filter(
      (t) => t.item_name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }

  const categories = [...new Set(tariffs.map((t) => t.category))];

  res.json({
    tariffs: filtered,
    categories,
    stats: {
      total: tariffs.length,
      active: tariffs.filter((t) => t.is_active).length,
    },
  });
}

async function createDamageTariff(req, res) {
  const { category, item_name, severity, standard_fee, fee_type, description } = req.body;

  if (!category || !item_name || standard_fee === undefined) {
    throw new AppError(400, "Danh mục, tên linh kiện và biểu phí đền bù là bắt buộc.");
  }

  const tariff = new DamageTariff({
    category: category.trim(),
    item_name: item_name.trim(),
    severity: ["minor", "moderate", "severe", "total_loss"].includes(severity) ? severity : "minor",
    standard_fee: Number(standard_fee) || 0,
    fee_type: fee_type === "percentage_of_value" ? "percentage_of_value" : "fixed",
    description: description ? description.trim() : "",
    is_active: true,
    updated_by: req.user._id,
  });

  await tariff.save();

  await recordAuditLog(req, {
    action: "DAMAGE_TARIFF_CREATED",
    targetType: "DamageTariff",
    targetId: tariff._id,
    details: { item_name: tariff.item_name, standard_fee: tariff.standard_fee },
  });

  res.status(201).json({ message: "Thêm biểu phí đền bù thành công.", tariff });
}

async function updateDamageTariff(req, res) {
  const { id } = req.params;
  const { standard_fee, is_active, description, severity } = req.body;

  const tariff = await DamageTariff.findById(id);
  if (!tariff) {
    throw new AppError(404, "Không tìm thấy biểu phí bồi thường.");
  }

  if (standard_fee !== undefined) tariff.standard_fee = Number(standard_fee);
  if (is_active !== undefined) tariff.is_active = Boolean(is_active);
  if (description !== undefined) tariff.description = description.trim();
  if (severity && ["minor", "moderate", "severe", "total_loss"].includes(severity)) {
    tariff.severity = severity;
  }
  tariff.updated_by = req.user._id;

  await tariff.save();

  await recordAuditLog(req, {
    action: "DAMAGE_TARIFF_UPDATED",
    targetType: "DamageTariff",
    targetId: tariff._id,
    details: { item_name: tariff.item_name, standard_fee: tariff.standard_fee, is_active: tariff.is_active },
  });

  res.json({ message: "Cập nhật biểu phí đền bù thành công.", tariff });
}

// ==========================================
// UC_A33: Equipment Periodic Maintenance & Shutter Count Tracking
// ==========================================
async function listMaintenanceLogs(req, res) {
  const { maintenance_type, status, search } = req.query;
  const filter = {};

  if (maintenance_type && ["sensor_cleaning", "shutter_replacement", "lens_calibration", "firmware_update", "periodic_inspection"].includes(maintenance_type)) {
    filter.maintenance_type = maintenance_type;
  }
  if (status && ["scheduled", "in_progress", "completed", "cancelled"].includes(status)) {
    filter.status = status;
  }

  const [logs, totalScheduled, totalInProgress, totalCompleted, costAgg] = await Promise.all([
    EquipmentMaintenanceLog.find(filter)
      .populate("equipment_id", "title name images serial_number condition status")
      .populate("owner_id", "name email phone")
      .populate("created_by", "name email")
      .sort({ scheduled_date: -1 })
      .lean(),
    EquipmentMaintenanceLog.countDocuments({ status: "scheduled" }),
    EquipmentMaintenanceLog.countDocuments({ status: "in_progress" }),
    EquipmentMaintenanceLog.countDocuments({ status: "completed" }),
    EquipmentMaintenanceLog.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, totalCost: { $sum: "$cost" } } },
    ]),
  ]);

  let filtered = logs;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = logs.filter((l) => {
      const title = (l.equipment_id?.title || l.equipment_id?.name || "").toLowerCase();
      const sn = (l.equipment_id?.serial_number || "").toLowerCase();
      const owner = (l.owner_id?.name || "").toLowerCase();
      const center = (l.service_center || "").toLowerCase();
      return title.includes(q) || sn.includes(q) || owner.includes(q) || center.includes(q);
    });
  }

  // Calculate shutter life warning count (> 75% max shutter)
  const shutterAlertsCount = logs.filter((l) => {
    if (!l.max_rated_shutter || !l.current_shutter_count) return false;
    return (l.current_shutter_count / l.max_rated_shutter) >= 0.75;
  }).length;

  res.json({
    logs: filtered,
    stats: {
      total: logs.length,
      scheduled: totalScheduled,
      inProgress: totalInProgress,
      completed: totalCompleted,
      shutterAlerts: shutterAlertsCount,
      totalCost: costAgg[0]?.totalCost || 0,
    },
  });
}

async function createMaintenanceLog(req, res) {
  const {
    equipment_id,
    maintenance_type,
    current_shutter_count,
    max_rated_shutter,
    service_center,
    cost,
    scheduled_date,
    next_due_date,
    technician_notes,
  } = req.body;

  if (!equipment_id) {
    throw new AppError(400, "Vui lòng chọn thiết bị bảo dưỡng.");
  }

  const equipment = await Equipment.findById(equipment_id);
  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị.");
  }

  const log = new EquipmentMaintenanceLog({
    equipment_id,
    owner_id: equipment.owner_id,
    maintenance_type: maintenance_type || "periodic_inspection",
    current_shutter_count: Number(current_shutter_count) || 0,
    max_rated_shutter: Number(max_rated_shutter) || 200000,
    service_center: service_center ? service_center.trim() : "Trung tâm dịch vụ kỹ thuật SmartEquip",
    cost: Number(cost) || 0,
    scheduled_date: scheduled_date ? new Date(scheduled_date) : new Date(),
    next_due_date: next_due_date ? new Date(next_due_date) : undefined,
    technician_notes: technician_notes ? technician_notes.trim() : "",
    status: "scheduled",
    created_by: req.user._id,
  });

  await log.save();

  await recordAuditLog(req, {
    action: "MAINTENANCE_LOG_CREATED",
    targetType: "EquipmentMaintenanceLog",
    targetId: log._id,
    details: {
      equipment_id,
      maintenance_type: log.maintenance_type,
      current_shutter: log.current_shutter_count,
    },
  });

  res.status(201).json({ message: "Tạo phiếu bảo dưỡng máy ảnh thành công.", log });
}

async function updateMaintenanceLogStatus(req, res) {
  const { id } = req.params;
  const { status, completed_date, cost, technician_notes } = req.body;

  const log = await EquipmentMaintenanceLog.findById(id);
  if (!log) {
    throw new AppError(404, "Không tìm thấy phiếu bảo dưỡng.");
  }

  if (status && ["scheduled", "in_progress", "completed", "cancelled"].includes(status)) {
    log.status = status;
    if (status === "completed") {
      log.completed_date = completed_date ? new Date(completed_date) : new Date();
    }
  }

  if (cost !== undefined) log.cost = Number(cost) || 0;
  if (technician_notes) log.technician_notes = technician_notes.trim();

  await log.save();

  await recordAuditLog(req, {
    action: "MAINTENANCE_LOG_STATUS_UPDATED",
    targetType: "EquipmentMaintenanceLog",
    targetId: log._id,
    details: { status: log.status, cost: log.cost },
  });

  res.json({ message: "Cập nhật tiến độ bảo dưỡng thành công.", log });
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
  listDisputes,
  getDisputeDetail,
  resolveDispute,
  listKycSubmissions,
  reviewKycSubmission,
  listAuditLogs,
  listContractTemplates,
  createContractTemplate,
  updateContractTemplate,
  updateContractTemplateStatus,
  listEquipmentStatusRequests,
  reviewEquipmentStatusRequest,
  listMemberships,
  grantOwnerMembership,
  listSettlements,
  approveSettlement,
  listHandoverRecords,
  reviewHandoverRecord,
  getRiskMonitor,
  freezeRiskUser,
  listDamageTariffs,
  createDamageTariff,
  updateDamageTariff,
  listMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLogStatus,
};
