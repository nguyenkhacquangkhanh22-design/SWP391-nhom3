const User = require("../models/User");
const Equipment = require("../models/Equipment");
const SupportTicket = require("../models/SupportTicket");
const UserNotification = require("../models/UserNotification");
const Dispute = require("../models/Dispute");
const Settlement = require("../models/Settlement");
const RentalContract = require("../models/RentalContract");
const HandoverRecord = require("../models/HandoverRecord");
const AuditLog = require("../models/AuditLog");
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

  const oldRole = user.role;
  user.role = role.trim();
  await user.save();

  await recordAuditLog(req, {
    action: "USER_ROLE_UPDATED",
    targetType: "User",
    targetId: user._id,
    targetLabel: `${user.name} (${user.email})`,
    details: { oldRole, newRole: user.role },
  });

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
  const { status, compensation_approved, resolution_note } = req.body;

  if (!status || !["resolved", "dismissed", "investigating"].includes(status)) {
    throw new AppError(400, "Trạng thái phán quyết không hợp lệ ('resolved', 'dismissed', 'investigating')");
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
      settlement.owner_payout_amount =
        settlement.total_rental_fee -
        settlement.platform_fee +
        (settlement.overtime_fee || 0) +
        approvedAmount;
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
};

