const crypto = require("crypto");
const mongoose = require("mongoose");
const ContractTemplate = require("../models/ContractTemplate");
const Equipment = require("../models/Equipment");
const EquipmentStatusRequest = require("../models/EquipmentStatusRequest");
const HandoverRecord = require("../models/HandoverRecord");
const RentalContract = require("../models/RentalContract");
const Rental = require("../models/Rental");
const RentalRequest = require("../models/RentalRequest");
const SupportTicket = require("../models/SupportTicket");
const UserNotification = require("../models/UserNotification");
const AppError = require("../utils/AppError");

const contractPopulate = [
  { path: "owner_id", select: "name email" },
  { path: "renter_id", select: "name email" },
  { path: "equipment_id", select: "title brand model_name serial_number condition accessories status" },
  { path: "request_id", select: "request_code renter_name renter_email renter_phone start_date end_date rental_fee deposit_amount renter_note" },
  { path: "moderation_history.moderator_id", select: "name email" },
];

function generateCode(prefix) {
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${new Date().getFullYear()}-${randomPart}`;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function notifyUsers(userIds, title, message, relatedRecordId) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map((id) => String(id)))];
  if (!uniqueIds.length) return "";
  try {
    await UserNotification.insertMany(
      uniqueIds.map((user_id) => ({ user_id, title, message, related_record_id: relatedRecordId }))
    );
    return "";
  } catch (error) {
    console.error("Failed to persist moderator decision notifications:", error);
    return "Quyết định đã được lưu nhưng không thể tạo thông báo cho người liên quan.";
  }
}

// -----------------------------------------------------------------------------
// Bước 2: Quản lý web xem Yêu cầu thuê từ Renter & Gửi cho Owner duyệt
// -----------------------------------------------------------------------------
async function listRentalRequests(req, res) {
  const status = cleanText(req.query.status);
  const filter = status ? { status } : {};
  const rentalRequests = await RentalRequest.find(filter)
    .populate("equipment_id", "title category brand model_name serial_number images pricing status")
    .populate("owner_id", "name email")
    .populate("renter_id", "name email")
    .populate("moderator_id", "name email")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ rentalRequests });
}

async function forwardRentalRequest(req, res) {
  const { action } = req.body; // 'forward' | 'reject'
  const note = cleanText(req.body.note);

  if (!["forward", "reject"].includes(action)) {
    throw new AppError(400, "Thao tác không hợp lệ (forward hoặc reject).");
  }
  if (action === "reject" && !note) {
    throw new AppError(400, "Vui lòng nhập lý do từ chối yêu cầu thuê.");
  }

  const rentalReq = await RentalRequest.findById(req.params.id)
    .populate("equipment_id", "title")
    .populate("owner_id", "name email")
    .populate("renter_id", "name email");

  if (!rentalReq) {
    throw new AppError(404, "Không tìm thấy yêu cầu thuê.");
  }

  if (rentalReq.status !== "pending_moderator") {
    throw new AppError(400, `Yêu cầu thuê này đã được xử lý (trạng thái hiện tại: ${rentalReq.status}).`);
  }

  if (action === "forward") {
    rentalReq.status = "pending"; // Chuyển sang chờ Owner duyệt
    rentalReq.moderator_id = req.user._id;
    rentalReq.moderator_note = note || "Quản lý web đã kiểm tra và chuyển yêu cầu cho Owner duyệt.";
    rentalReq.forwarded_to_owner_at = new Date();
    await rentalReq.save();

    await notifyUsers(
      [rentalReq.owner_id?._id],
      `📬 Yêu cầu thuê mới #${rentalReq.request_code} từ Quản lý web`,
      `Quản lý web đã gửi yêu cầu thuê thiết bị "${rentalReq.equipment_id?.title || ""}" của khách ${rentalReq.renter_name} cho bạn duyệt. Vui lòng vào Cổng Owner để duyệt và lập hợp đồng.`,
      rentalReq._id
    );

    await notifyUsers(
      [rentalReq.renter_id?._id],
      `✅ Yêu cầu thuê #${rentalReq.request_code} đã được chuyển cho Owner`,
      `Quản lý web đã tiếp nhận và gửi yêu cầu thuê của bạn tới Chủ thiết bị (${rentalReq.owner_id?.name || "Owner"}) để duyệt và lập hợp đồng.`,
      rentalReq._id
    );

    res.json({
      message: "Đã gửi yêu cầu thuê sang cho Owner duyệt thành công!",
      rentalRequest: rentalReq,
    });
  } else {
    rentalReq.status = "moderator_rejected";
    rentalReq.moderator_id = req.user._id;
    rentalReq.moderator_note = note;
    rentalReq.rejection_reason = note;
    rentalReq.responded_at = new Date();
    await rentalReq.save();

    await notifyUsers(
      [rentalReq.renter_id?._id],
      `❌ Yêu cầu thuê #${rentalReq.request_code} bị từ chối`,
      `Quản lý web đã từ chối yêu cầu thuê: ${note}`,
      rentalReq._id
    );

    res.json({
      message: "Đã từ chối yêu cầu thuê.",
      rentalRequest: rentalReq,
    });
  }
}

function validateTemplate(name, termsContent, fields) {
  if (!cleanText(name) || !cleanText(termsContent)) {
    throw new AppError(400, "Vui lòng nhập tên mẫu và nội dung điều khoản.");
  }
  if (!Array.isArray(fields)) {
    throw new AppError(400, "Danh sách trường thông tin không hợp lệ.");
  }
  const normalized = fields.map((field) => ({
    key: cleanText(field?.key).replace(/[^\w-]/g, "_"),
    label: cleanText(field?.label),
    required: field?.required !== false,
  }));
  if (
    normalized.some((field) => !field.key || !field.label) ||
    new Set(normalized.map((field) => field.key)).size !== normalized.length
  ) {
    throw new AppError(400, "Mỗi trường cần có mã và nhãn duy nhất.");
  }
  for (const field of normalized) {
    if (!new RegExp(`\\{\\{\\s*${field.key}\\s*\\}\\}`).test(termsContent)) {
      throw new AppError(400, `Nội dung mẫu cần chứa placeholder {{${field.key}}} cho trường "${field.label}".`);
    }
  }
  return normalized;
}

async function listContracts(req, res) {
  const status = cleanText(req.query.status);
  const filter = status
    ? { status }
    : { status: { $in: ["pending_approval", "moderator_rejected", "moderator_approved", "signed", "active", "completed"] } };
  const contracts = await RentalContract.find(filter)
    .populate(contractPopulate)
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ contracts });
}

// Bước 4: Quản lý web duyệt Hợp đồng của Owner và gửi cho Người thuê ký tên
async function reviewContract(req, res) {
  const { action } = req.body;
  const reason = cleanText(req.body.reason);
  if (!["approve", "reject"].includes(action)) {
    throw new AppError(400, "Thao tác kiểm duyệt không hợp lệ.");
  }
  if (action === "reject" && !reason) {
    throw new AppError(400, "Vui lòng ghi rõ lý do từ chối.");
  }

  const contract = await RentalContract.findOne({
    _id: req.params.id,
    status: "pending_approval",
  }).populate(contractPopulate);
  if (!contract) {
    throw new AppError(404, "Không tìm thấy hồ sơ đang chờ kiểm duyệt.");
  }
  const hasInvalidDossier = (
    !contract.contract_code ||
    !contract.title ||
    !contract.terms_content?.trim() ||
    !contract.owner_id ||
    !contract.renter_id ||
    !contract.equipment_id ||
    !Number.isFinite(contract.rental_price) ||
    contract.rental_price < 0 ||
    !Number.isFinite(contract.deposit_amount) ||
    contract.deposit_amount < 0 ||
    !contract.start_date ||
    !contract.end_date ||
    new Date(contract.end_date) <= new Date(contract.start_date)
  );
  if (action === "approve" && hasInvalidDossier) {
    throw new AppError(400, "Hồ sơ thiếu thông tin bắt buộc hoặc có dữ liệu không hợp lệ.");
  }

  const nextStatus = action === "approve" ? "moderator_approved" : "moderator_rejected";
  const reviewedAt = new Date();
  const updated = await RentalContract.findOneAndUpdate(
    { _id: contract._id, status: "pending_approval", version: contract.version },
    {
      $set: {
        status: nextStatus,
        moderator_feedback: action === "reject" ? reason : "",
        moderator_approved_at: action === "approve" ? reviewedAt : undefined,
        moderator_id: req.user._id,
        moderator_approved_version: action === "approve" ? contract.version : undefined,
      },
      $push: {
        moderation_history: {
          action: action === "approve" ? "approved" : "rejected",
          moderator_id: req.user._id,
          reason: action === "reject" ? reason : "",
          version: contract.version,
          created_at: reviewedAt,
        },
      },
    },
    { new: true, runValidators: true }
  ).populate(contractPopulate);
  if (!updated) {
    throw new AppError(409, "Hồ sơ đã thay đổi hoặc được xử lý. Vui lòng tải lại dữ liệu.");
  }

  let notificationWarning = "";
  if (action === "approve") {
    // Tự động đồng bộ trạng thái đơn thuê Rental thành APPROVED để Renter ký hợp đồng & thanh toán
    try {
      const Rental = require("../models/Rental");
      await Rental.updateMany(
        {
          $or: [
            { "contract.contractNumber": updated.contract_code },
            { rentalCode: updated.request_id?.request_code },
            {
              renter: updated.renter_id?._id,
              equipment: updated.equipment_id?._id,
              status: { $in: ["PENDING", "pending", "contract_pending"] },
            },
          ],
        },
        {
          $set: {
            status: "APPROVED",
            "contract.contractNumber": updated.contract_code,
          },
        }
      );
    } catch (err) {
      console.error("Failed to sync Rental status upon contract approval:", err);
    }

    const w1 = await notifyUsers(
      [updated.renter_id?._id],
      `✍️ Hợp đồng #${updated.contract_code} đã được gửi tới bạn để ký tên`,
      `Quản lý web đã phê duyệt Hợp đồng thuê "${updated.title}" (v${updated.version}) và gửi cho bạn. Vui lòng vào trang Hồ sơ cá nhân -> Đơn thuê & Hợp đồng để ký tên điện tử!`,
      updated._id
    );
    const w2 = await notifyUsers(
      [updated.owner_id?._id],
      `✅ Hợp đồng #${updated.contract_code} đã được duyệt & gửi cho Người thuê ký`,
      `Quản lý web đã phê duyệt Hợp đồng ${updated.contract_code} (v${updated.version}) và chuyển cho Người thuê (${updated.renter_id?.name || "Renter"}) ký tên.`,
      updated._id
    );
    notificationWarning = w1 || w2;
  } else {
    notificationWarning = await notifyUsers(
      [updated.owner_id?._id],
      "Hợp đồng cần chỉnh sửa lại",
      `Hợp đồng ${updated.contract_code} phiên bản v${updated.version} bị Quản lý web từ chối: ${reason}`,
      updated._id
    );
  }

  res.json({
    message:
      action === "approve"
        ? "Đã phê duyệt hợp đồng và gửi cho Người thuê (Renter) ký tên!"
        : "Đã từ chối hợp đồng và yêu cầu Owner chỉnh sửa.",
    notificationWarning,
    contract: updated,
  });
}

async function listEquipments(req, res) {
  const query = cleanText(req.query.q);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = query
    ? {
        $or: [
          { title: { $regex: escapedQuery, $options: "i" } },
          { serial_number: { $regex: escapedQuery, $options: "i" } },
          { category: { $regex: escapedQuery, $options: "i" } },
        ],
      }
    : {};
  const equipments = await Equipment.find(filter)
    .populate("owner_id", "name email")
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  const ids = equipments.map((equipment) => equipment._id);
  const [statusRequests, contracts] = await Promise.all([
    EquipmentStatusRequest.find({ equipment_id: { $in: ids } })
      .populate("reviewed_by", "name email")
      .sort({ createdAt: -1 })
      .lean(),
    RentalContract.find({ equipment_id: { $in: ids } })
      .select("equipment_id contract_code title status start_date end_date updatedAt")
      .sort({ updatedAt: -1 })
      .lean(),
  ]);
  const requestsByEquipment = new Map();
  const contractsByEquipment = new Map();
  for (const request of statusRequests) {
    const key = String(request.equipment_id);
    requestsByEquipment.set(key, [...(requestsByEquipment.get(key) || []), request]);
  }
  for (const contract of contracts) {
    const key = String(contract.equipment_id);
    contractsByEquipment.set(key, [...(contractsByEquipment.get(key) || []), contract]);
  }
  res.json({
    equipments: equipments.map((equipment) => ({
      ...equipment,
      status_history: requestsByEquipment.get(String(equipment._id)) || [],
      contracts: contractsByEquipment.get(String(equipment._id)) || [],
    })),
  });
}

async function listHandoverRecords(_req, res) {
  const records = await HandoverRecord.find()
    .populate("contract_id", "contract_code title status start_date end_date")
    .populate("equipment_id", "title status accessories")
    .populate("owner_id", "name email")
    .populate("renter_id", "name email")
    .populate("moderator_review.moderator_id", "name email")
    .populate("moderator_review_history.moderator_id", "name email")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ records });
}

async function reviewHandoverRecord(req, res) {
  const { action } = req.body;
  const note = cleanText(req.body.note);
  if (!["verify", "request_changes"].includes(action)) {
    throw new AppError(400, "Kết quả xác minh không hợp lệ.");
  }
  if (action === "request_changes" && !note) {
    throw new AppError(400, "Vui lòng nêu nội dung cần bổ sung.");
  }
  const status = action === "verify" ? "verified" : "needs_changes";
  const reviewedAt = new Date();
  const record = await HandoverRecord.findOneAndUpdate(
    { _id: req.params.id, "moderator_review.status": { $ne: "verified" } },
    {
      $set: {
        "moderator_review.status": status,
        "moderator_review.note": note,
        "moderator_review.moderator_id": req.user._id,
        "moderator_review.reviewed_at": reviewedAt,
      },
      $push: {
        moderator_review_history: {
          status,
          note,
          moderator_id: req.user._id,
          reviewed_at: reviewedAt,
        },
      },
    },
    { new: true, runValidators: true }
  )
    .populate("contract_id", "contract_code")
    .populate("owner_id", "_id")
    .populate("renter_id", "_id");
  if (!record) {
    throw new AppError(404, "Không tìm thấy biên bản hoặc biên bản đã được xác minh.");
  }
  const notificationWarning = await notifyUsers(
    [record.owner_id?._id, record.renter_id?._id],
    action === "verify" ? "Biên bản đã được xác minh" : "Biên bản cần bổ sung",
    action === "verify"
      ? `Biên bản ${record.record_type === "handover" ? "bàn giao" : "hoàn trả"} của hợp đồng ${record.contract_id?.contract_code || ""} đã được xác minh.`
      : `Biên bản của hợp đồng ${record.contract_id?.contract_code || ""} cần bổ sung: ${note}`,
    record._id
  );
  res.json({ message: "Đã lưu kết quả xác minh biên bản.", notificationWarning, record });
}

async function listStatusRequests(_req, res) {
  const requests = await EquipmentStatusRequest.find()
    .populate("equipment_id", "title status serial_number")
    .populate("owner_id", "name email")
    .populate("reviewed_by", "name email")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ requests });
}

async function reviewStatusRequest(req, res) {
  const { action } = req.body;
  const note = cleanText(req.body.note);
  if (!["approve", "reject"].includes(action)) {
    throw new AppError(400, "Thao tác xử lý yêu cầu không hợp lệ.");
  }
  if (action === "reject" && !note) {
    throw new AppError(400, "Vui lòng ghi rõ lý do từ chối.");
  }

  const request = await EquipmentStatusRequest.findOne({
    _id: req.params.id,
    status: "pending",
  });
  if (!request) {
    throw new AppError(404, "Không tìm thấy yêu cầu đang chờ xử lý.");
  }
  const equipment = await Equipment.findById(request.equipment_id);
  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị liên quan.");
  }
  if (equipment.status !== request.current_status) {
    throw new AppError(409, "Trạng thái thiết bị đã thay đổi. Cần kiểm tra lại yêu cầu.");
  }

  const reviewedAt = new Date();
  const updatedRequest = await EquipmentStatusRequest.findOneAndUpdate(
    { _id: request._id, status: "pending", current_status: equipment.status },
    {
      $set: {
        status: action === "approve" ? "approved" : "rejected",
        moderator_note: note,
        reviewed_at: reviewedAt,
        reviewed_by: req.user._id,
      },
    },
    { new: true, runValidators: true }
  );
  if (!updatedRequest) {
    throw new AppError(409, "Yêu cầu đã thay đổi hoặc được xử lý. Vui lòng tải lại.");
  }
  if (action === "approve") {
    const updatedEquipment = await Equipment.findOneAndUpdate(
      { _id: equipment._id, status: request.current_status },
      { $set: { status: request.target_status } },
      { new: true, runValidators: true }
    );
    if (!updatedEquipment) {
      await EquipmentStatusRequest.findByIdAndUpdate(request._id, {
        $set: { status: "pending", moderator_note: "", reviewed_at: null, reviewed_by: null },
      });
      throw new AppError(409, "Trạng thái thiết bị vừa thay đổi; yêu cầu chưa được áp dụng.");
    }
  }
  const notificationWarning = await notifyUsers(
    [request.owner_id],
    action === "approve" ? "Yêu cầu trạng thái đã được chấp thuận" : "Yêu cầu trạng thái bị từ chối",
    action === "approve"
      ? `Yêu cầu đổi trạng thái thiết bị đã được chấp thuận: ${request.target_status}.`
      : `Yêu cầu đổi trạng thái thiết bị bị từ chối: ${note}`,
    request._id
  );
  res.json({
    message: action === "approve" ? "Đã chấp thuận cập nhật trạng thái." : "Đã từ chối yêu cầu.",
    notificationWarning,
    request: updatedRequest,
  });
}

async function listTemplates(_req, res) {
  const templates = await ContractTemplate.find()
    .populate("created_by", "name email")
    .populate("published_by", "name email")
    .populate("retired_by", "name email")
    .sort({ template_code: 1, version: -1 })
    .lean();
  res.json({ templates });
}

async function createTemplate(req, res) {
  const name = cleanText(req.body.name);
  const termsContent = cleanText(req.body.terms_content);
  const fields = validateTemplate(name, termsContent, req.body.fields || []);
  const template = await ContractTemplate.create({
    template_code: `MHD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    name,
    version: 1,
    terms_content: termsContent,
    fields,
    status: "draft",
    created_by: req.user._id,
  });
  res.status(201).json({ message: "Đã tạo mẫu hợp đồng bản nháp.", template });
}

async function createTemplateVersion(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError(400, "Mã phiên bản mẫu không hợp lệ.");
  }
  const source = await ContractTemplate.findById(req.params.id);
  if (!source) throw new AppError(404, "Không tìm thấy phiên bản mẫu.");
  const name = cleanText(req.body.name || source.name);
  const termsContent = cleanText(req.body.terms_content);
  const fields = validateTemplate(name, termsContent, req.body.fields || source.fields);
  const latest = await ContractTemplate.findOne({ template_code: source.template_code })
    .sort({ version: -1 })
    .select("version")
    .lean();
  const template = await ContractTemplate.create({
    template_code: source.template_code,
    name,
    version: (latest?.version || source.version) + 1,
    terms_content: termsContent,
    fields,
    status: "draft",
    created_by: req.user._id,
  });
  res.status(201).json({ message: `Đã tạo phiên bản v${template.version} ở trạng thái bản nháp.`, template });
}

async function publishTemplate(req, res) {
  const draft = await ContractTemplate.findOne({ _id: req.params.id, status: "draft" });
  if (!draft) throw new AppError(404, "Không tìm thấy bản nháp hoặc bản mẫu đã được xử lý.");
  if (!draft.name.trim() || !draft.terms_content.trim()) {
    throw new AppError(400, "Mẫu hợp đồng cần có tên và nội dung trước khi công bố.");
  }
  const template = await ContractTemplate.findOneAndUpdate(
    { _id: req.params.id, status: "draft" },
    { $set: { status: "published", published_by: req.user._id, published_at: new Date() } },
    { new: true, runValidators: true }
  );
  if (!template) throw new AppError(404, "Không tìm thấy bản nháp hoặc bản mẫu đã được xử lý.");
  res.json({ message: "Đã công bố phiên bản mẫu hợp đồng.", template });
}

async function retireTemplate(req, res) {
  const template = await ContractTemplate.findOneAndUpdate(
    { _id: req.params.id, status: "published" },
    { $set: { status: "retired", retired_by: req.user._id, retired_at: new Date() } },
    { new: true, runValidators: true }
  );
  if (!template) throw new AppError(404, "Không tìm thấy phiên bản đang công bố.");
  res.json({ message: "Đã ngừng sử dụng phiên bản mẫu.", template });
}

async function listPublishedTemplates(_req, res) {
  const templates = await ContractTemplate.aggregate([
    { $match: { status: "published" } },
    { $sort: { version: -1 } },
    { $group: { _id: "$template_code", template: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$template" } },
    { $sort: { name: 1 } },
  ]);
  res.json({ templates });
}

async function submitSupportTicket(req, res) {
  const subject = cleanText(req.body.subject);
  const message = cleanText(req.body.message);
  const category = cleanText(req.body.category);
  if (!subject || !message) {
    throw new AppError(400, "Vui lòng nhập tiêu đề và nội dung yêu cầu hỗ trợ.");
  }
  if (!["Hợp đồng & Pháp lý", "Kỹ thuật hệ thống", "Khác"].includes(category)) {
    throw new AppError(400, "Danh mục yêu cầu hỗ trợ không hợp lệ.");
  }
  let relatedRecordId;
  if (req.body.related_record_id) {
    if (!mongoose.isValidObjectId(req.body.related_record_id)) {
      throw new AppError(400, "Mã hồ sơ liên quan không hợp lệ.");
    }
    relatedRecordId = req.body.related_record_id;
  }
  const ticket = await SupportTicket.create({
    ticket_code: generateCode("HT"),
    user_id: req.user._id,
    user_role: req.user.role,
    category,
    subject,
    message,
    related_record_id: relatedRecordId,
    priority: ["low", "medium", "high"].includes(req.body.priority) ? req.body.priority : "medium",
  });
  res.status(201).json({ message: "Đã gửi yêu cầu hỗ trợ.", ticket });
}

// -----------------------------------------------------------------------------
// Bước 5: Quản lý web xem và xác nhận giao dịch chuyển khoản VietQR MB Bank
// -----------------------------------------------------------------------------
async function listPayments(req, res) {
  const status = cleanText(req.query.status);
  const filter = {};
  if (status && status !== "all") {
    filter["payment.paymentStatus"] = status;
  } else {
    filter["$or"] = [
      { "payment.paymentStatus": { $in: ["pending_confirmation", "paid", "rejected"] } },
      { status: { $in: ["PAYMENT_PENDING", "payment_pending", "PAID"] } },
      { "payment.receiptImage": { $exists: true, $ne: "" } },
    ];
  }

  const rentals = await Rental.find(filter)
    .populate("renter", "name email phone")
    .populate("owner", "name email phone")
    .populate("equipment", "title brand modelNumber dailyRate depositAmount images")
    .sort({ "payment.transferNotifiedAt": -1, updatedAt: -1 })
    .lean();

  res.json({ payments: rentals });
}

async function reviewPayment(req, res) {
  const { id } = req.params;
  const { action, note } = req.body; // 'approve' | 'reject'

  if (!["approve", "reject"].includes(action)) {
    throw new AppError(400, "Hành động không hợp lệ (phải là approve hoặc reject)");
  }

  const rental = await Rental.findById(id)
    .populate("renter", "name email")
    .populate("owner", "name email")
    .populate("equipment", "title");

  if (!rental) {
    throw new AppError(404, "Không tìm thấy thông tin đơn thuê cần xác nhận thanh toán");
  }

  const isPending =
    rental.payment?.paymentStatus === "pending_confirmation" ||
    String(rental.status).toUpperCase() === "PAYMENT_PENDING" ||
    Boolean(rental.payment?.receiptImage);

  if (!isPending) {
    throw new AppError(400, `Giao dịch này không ở trạng thái chờ xác nhận (${rental.payment?.paymentStatus})`);
  }

  const reviewedAt = new Date();
  if (action === "approve") {
    rental.payment.isPaid = true;
    rental.payment.paymentStatus = "paid";
    rental.payment.paidAt = reviewedAt;
    rental.payment.confirmedBy = req.user._id;
    rental.status = "PAID";
    await rental.save();

    // Đồng bộ sang RentalContract nếu có
    await RentalContract.findOneAndUpdate(
      {
        $or: [
          { contract_code: rental.contract?.contractNumber },
          { renter_id: rental.renter?._id, equipment_id: rental.equipment?._id },
        ],
      },
      {
        $set: {
          payment_status: "paid",
          paid_at: reviewedAt,
          payment_confirmed_by: req.user._id,
        },
      }
    );

    // Gửi thông báo cho Renter & Owner
    await notifyUsers(
      [rental.renter?._id],
      "✅ Thanh toán chuyển khoản thành công!",
      `Quản lý web đã xác nhận giao dịch chuyển khoản ${(rental.payment?.amountPaid || rental.totalAmount).toLocaleString("vi-VN")} đ cho đơn thuê #${rental.rentalCode}. Chủ máy sẽ sớm bàn giao thiết bị.`,
      rental._id
    );

    await notifyUsers(
      [rental.owner?._id],
      "📦 Khách thuê đã hoàn tất thanh toán",
      `Quản lý web đã xác nhận tiền chuyển khoản cho đơn #${rental.rentalCode}. Chủ máy hãy chuẩn bị thiết bị để bàn giao cho khách thuê.`,
      rental._id
    );

    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      const toastData = {
        type: "payment_approved",
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        equipmentTitle: rental.equipment?.title || "Thiết bị",
        renterId: String(rental.renter?._id || rental.renter),
        ownerId: String(rental.owner?._id || rental.owner),
        title: "✅ Thanh toán thành công!",
        message: `Giao dịch thanh toán cho đơn #${rental.rentalCode} đã được phê duyệt! Sẵn sàng bàn giao thiết bị.`,
        link: "/rentals/history",
        createdAt: new Date(),
      };
      io.emit("payment:approved", toastData);
    } catch (socketErr) {
      console.warn("Socket emit error on moderator confirm payment:", socketErr?.message);
    }

    res.json({
      message: "Đã phê duyệt xác nhận thanh toán chuyển khoản thành công!",
      rental,
    });
  } else {
    // Reject payment
    const reason = cleanText(note) || "Chưa nhận được tiền chuyển khoản hoặc sai nội dung/số tiền";
    rental.payment.paymentStatus = "rejected";
    rental.payment.rejectionReason = reason;
    rental.status = "CONTRACT_SIGNED"; // Chờ khách thực hiện thanh toán lại
    await rental.save();

    await RentalContract.findOneAndUpdate(
      {
        $or: [
          { contract_code: rental.contract?.contractNumber },
          { renter_id: rental.renter?._id, equipment_id: rental.equipment?._id },
        ],
      },
      {
        $set: {
          payment_status: "rejected",
          payment_rejection_reason: reason,
        },
      }
    );

    await notifyUsers(
      [rental.renter?._id],
      "⚠️ Xác nhận chuyển khoản chưa thành công",
      `Quản lý web chưa thể xác nhận giao dịch chuyển khoản cho đơn #${rental.rentalCode}. Lý do: ${reason}. Vui lòng thử lại.`,
      rental._id
    );

    res.json({
      message: "Đã từ chối xác nhận thanh toán.",
      rental,
    });
  }
}

module.exports = {
  listPayments,
  reviewPayment,
  createTemplate,
  createTemplateVersion,
  forwardRentalRequest,
  listContracts,
  listEquipments,
  listHandoverRecords,
  listPublishedTemplates,
  listRentalRequests,
  listStatusRequests,
  listTemplates,
  publishTemplate,
  retireTemplate,
  reviewContract,
  reviewHandoverRecord,
  reviewStatusRequest,
  submitSupportTicket,
};
