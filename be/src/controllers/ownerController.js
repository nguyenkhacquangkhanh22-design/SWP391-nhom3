const crypto = require("crypto");
const Equipment = require("../models/Equipment");
const RentalRequest = require("../models/RentalRequest");
const RentalContract = require("../models/RentalContract");
const HandoverRecord = require("../models/HandoverRecord");
const Settlement = require("../models/Settlement");
const EquipmentStatusRequest = require("../models/EquipmentStatusRequest");
const Dispute = require("../models/Dispute");
const SupportTicket = require("../models/SupportTicket");
const ContractTemplate = require("../models/ContractTemplate");
const { getIO } = require("../config/socket");
const User = require("../models/User");
const UserNotification = require("../models/UserNotification");
const AppError = require("../utils/AppError");

// Helper to generate short unique codes
function generateCode(prefix) {
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomPart}`;
}

async function notifyManagers(title, message, relatedRecordId) {
  try {
    const managers = await User.find({
      role: { $regex: /^(rental[_ -]?moderator|systemadmin|admin)$/i },
    })
      .select("_id")
      .lean();
    if (managers.length > 0) {
      await UserNotification.insertMany(
        managers.map((m) => ({
          user_id: m._id,
          title,
          message,
          related_record_id: relatedRecordId,
        }))
      );
    }
  } catch (err) {
    console.error("Failed to notify web managers:", err);
  }
}

// -----------------------------------------------------------------------------
// 1. Overview & Stats (UC_O01 / Dashboard)
// -----------------------------------------------------------------------------
async function getOverview(req, res) {
  const ownerId = req.user._id;

  const [
    totalEquipments,
    activeEquipments,
    pendingRequests,
    activeContracts,
    settlements,
    recentRequests,
  ] = await Promise.all([
    Equipment.countDocuments({ owner_id: ownerId }),
    Equipment.countDocuments({ owner_id: ownerId, visibility: "published", status: "available" }),
    RentalRequest.countDocuments({ owner_id: ownerId, status: "pending" }),
    RentalContract.countDocuments({
      owner_id: ownerId,
      status: { $in: ["signed", "active"] },
    }),
    Settlement.find({ owner_id: ownerId }).lean(),
    RentalRequest.find({ owner_id: ownerId })
      .populate("equipment_id", "title images pricing")
      .populate("moderator_id", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const totalRevenue = settlements
    .filter((s) => s.payout_status === "paid")
    .reduce((sum, s) => sum + (s.owner_payout_amount || 0), 0);

  const pendingPayout = settlements
    .filter((s) => s.payout_status !== "paid")
    .reduce((sum, s) => sum + (s.owner_payout_amount || 0), 0);

  res.json({
    stats: {
      totalEquipments,
      activeEquipments,
      pendingRequests,
      activeContracts,
      totalRevenue,
      pendingPayout,
      completedOrders: settlements.filter((s) => s.payout_status === "paid").length,
    },
    recentRequests,
  });
}

// -----------------------------------------------------------------------------
// 2. Equipment Listings (UC_O03, UC_O04, UC_O05, UC_O06, UC_O16)
// -----------------------------------------------------------------------------
async function getOwnerEquipments(req, res) {
  const ownerId = req.user._id;
  const equipments = await Equipment.find({ owner_id: ownerId })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ equipments });
}

async function getEquipmentDetail(req, res) {
  const { id } = req.params;
  const equipment = await Equipment.findOne({
    _id: id,
    owner_id: req.user._id,
  }).lean();

  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị hoặc bạn không có quyền truy cập");
  }

  res.json({ equipment });
}

// UC_O03: Upload Equipment Photos
async function uploadEquipmentPhoto(req, res) {
  if (!req.file) {
    throw new AppError(400, "Vui lòng chọn file ảnh để tải lên");
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
}

async function uploadEquipmentPhotos(req, res) {
  if (!req.files || req.files.length === 0) {
    throw new AppError(400, "Vui lòng chọn ít nhất một file ảnh");
  }
  const urls = req.files.map((file) => `/uploads/${file.filename}`);
  res.json({ urls });
}

// UC_O03: Create Equipment Listing (including photo uploads)
async function createEquipmentListing(req, res) {
  const ownerId = req.user._id;
  const {
    title,
    category,
    brand,
    model_name,
    serial_number,
    description,
    specifications,
    images,
    accessories,
    condition,
    pricing,
    rental_terms,
    cancellation_policy,
  } = req.body;

  if (!title || !category || !pricing || !pricing.price_per_day || !pricing.deposit_amount) {
    throw new AppError(400, "Vui lòng điền đầy đủ tên thiết bị, danh mục, giá thuê ngày và tiền cọc");
  }

  const equipment = await Equipment.create({
    owner_id: ownerId,
    title: title.trim(),
    category: category.trim(),
    brand: (brand || "").trim(),
    model_name: (model_name || "").trim(),
    serial_number: (serial_number || "").trim(),
    description: (description || "").trim(),
    specifications: Array.isArray(specifications) ? specifications : [],
    images: Array.isArray(images) && images.length > 0 ? images : [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
    ],
    accessories: Array.isArray(accessories) ? accessories : [],
    condition: condition || "Tốt (95%)",
    pricing: {
      price_per_hour: Number(pricing.price_per_hour) || 0,
      price_per_day: Number(pricing.price_per_day),
      deposit_amount: Number(pricing.deposit_amount),
      weekend_rate: Number(pricing.weekend_rate) || 0,
    },
    rental_terms: rental_terms || "Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị và hoàn trả đúng hẹn.",
    cancellation_policy: cancellation_policy || "Miễn phí hủy trước 24 giờ.",
    visibility: "published",
    approval_status: "pending",
    status: "available",
  });

  try {
    getIO().emit("equipment:created", {
      equipment,
      message: `Thiết bị mới "${equipment.title}" vừa được tạo và đang chờ xét duyệt!`,
    });
  } catch (err) {
    console.error("Socket emit equipment:created error:", err);
  }

  res.status(201).json({
    message: "Tạo bài đăng thiết bị thành công và đang chờ quản trị viên phê duyệt",
    equipment,
  });
}

// UC_O04 & UC_O06: Update Equipment Info, Visibility, Pricing & Rental Terms
async function updateEquipment(req, res) {
  const { id } = req.params;
  const ownerId = req.user._id;

  const equipment = await Equipment.findOne({ _id: id, owner_id: ownerId });
  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị");
  }

  const {
    title,
    category,
    brand,
    model_name,
    serial_number,
    description,
    specifications,
    images,
    accessories,
    condition,
    pricing,
    rental_terms,
    cancellation_policy,
    visibility,
  } = req.body;

  if (title) equipment.title = title.trim();
  if (category) equipment.category = category.trim();
  if (brand !== undefined) equipment.brand = brand.trim();
  if (model_name !== undefined) equipment.model_name = model_name.trim();
  if (serial_number !== undefined) equipment.serial_number = serial_number.trim();
  if (description !== undefined) equipment.description = description;
  if (Array.isArray(specifications)) equipment.specifications = specifications;
  if (Array.isArray(images)) equipment.images = images;
  if (Array.isArray(accessories)) equipment.accessories = accessories;
  if (condition) equipment.condition = condition;

  if (pricing) {
    if (pricing.price_per_day !== undefined) equipment.pricing.price_per_day = Number(pricing.price_per_day);
    if (pricing.deposit_amount !== undefined) equipment.pricing.deposit_amount = Number(pricing.deposit_amount);
    if (pricing.price_per_hour !== undefined) equipment.pricing.price_per_hour = Number(pricing.price_per_hour);
    if (pricing.weekend_rate !== undefined) equipment.pricing.weekend_rate = Number(pricing.weekend_rate);
  }

  if (rental_terms !== undefined) equipment.rental_terms = rental_terms;
  if (cancellation_policy !== undefined) equipment.cancellation_policy = cancellation_policy;
  if (visibility && ["published", "hidden", "draft"].includes(visibility)) {
    equipment.visibility = visibility;
  }

  await equipment.save();

  res.json({
    message: "Cập nhật thông tin thiết bị thành công",
    equipment,
  });
}

// UC_O04: Quick toggle visibility
async function toggleEquipmentVisibility(req, res) {
  const { id } = req.params;
  const { visibility } = req.body;

  if (!["published", "hidden", "draft"].includes(visibility)) {
    throw new AppError(400, "Trạng thái hiển thị không hợp lệ");
  }

  const equipment = await Equipment.findOne({ _id: id, owner_id: req.user._id });
  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị");
  }

  equipment.visibility = visibility;
  await equipment.save();

  res.json({
    message: `Đã chuyển trạng thái hiển thị sang: ${visibility}`,
    equipment,
  });
}

// UC_O05: Schedule Equipment Availability (Crucial: do not alter committed bookings!)
async function scheduleEquipmentAvailability(req, res) {
  const { id } = req.params;
  const { start_date, end_date, status, note } = req.body;

  if (!start_date || !end_date || !status) {
    throw new AppError(400, "Vui lòng chọn ngày bắt đầu, ngày kết thúc và trạng thái lịch");
  }

  const targetStart = new Date(start_date);
  const targetEnd = new Date(end_date);

  if (targetEnd < targetStart) {
    throw new AppError(400, "Ngày kết thúc phải sau ngày bắt đầu");
  }

  const equipment = await Equipment.findOne({ _id: id, owner_id: req.user._id });
  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị");
  }

  // Check if dates conflict with active/confirmed rental contracts
  const conflictingContracts = await RentalContract.find({
    equipment_id: equipment._id,
    status: { $in: ["signed", "active"] },
    $or: [
      { start_date: { $lte: targetEnd }, end_date: { $gte: targetStart } },
    ],
  });

  if (conflictingContracts.length > 0 && status !== "available") {
    throw new AppError(
      400,
      `Không thể thiết lập lịch không khả dụng! Khoảng thời gian này đã có ${conflictingContracts.length} hợp đồng thuê đã cam kết.`
    );
  }

  equipment.availability_schedule.push({
    start_date: targetStart,
    end_date: targetEnd,
    status,
    note: note || "",
  });

  await equipment.save();

  res.json({
    message: "Thiết lập lịch khả dụng thành công",
    equipment,
  });
}

// UC_O16: Submit Equipment Status Update Request
async function submitEquipmentStatusUpdateRequest(req, res) {
  const { id } = req.params;
  const { target_status, reason, evidence_photos } = req.body;

  if (!target_status || !reason) {
    throw new AppError(400, "Vui lòng nhập trạng thái cần đổi và lý do kèm minh chứng");
  }

  const equipment = await Equipment.findOne({ _id: id, owner_id: req.user._id });
  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị");
  }

  const statusRequest = await EquipmentStatusRequest.create({
    equipment_id: equipment._id,
    owner_id: req.user._id,
    current_status: equipment.status,
    target_status,
    reason: reason.trim(),
    evidence_photos: Array.isArray(evidence_photos) ? evidence_photos : [],
    status: "pending",
  });

  res.status(201).json({
    message: "Đã gửi yêu cầu cập nhật trạng thái thiết bị đến Rental Moderator kiểm duyệt",
    statusRequest,
  });
}

// -----------------------------------------------------------------------------
// 3. Rental Requests (UC_O07: Approve / Reject Rental Request forwarded by Web Manager)
// -----------------------------------------------------------------------------
async function getRentalRequests(req, res) {
  const ownerId = req.user._id;
  const requests = await RentalRequest.find({ owner_id: ownerId })
    .populate("equipment_id")
    .populate("renter_id", "name email phone")
    .populate("moderator_id", "name email")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ requests });
}

async function respondRentalRequest(req, res) {
  const { id } = req.params;
  const { action, rejection_reason } = req.body; // 'approve' | 'reject'

  if (!["approve", "reject"].includes(action)) {
    throw new AppError(400, "Hành động không hợp lệ (phải là approve hoặc reject)");
  }

  if (action === "reject" && (!rejection_reason || !rejection_reason.trim())) {
    throw new AppError(400, "Vui lòng ghi rõ lý do từ chối yêu cầu thuê");
  }

  const rentalReq = await RentalRequest.findOne({
    _id: id,
    owner_id: req.user._id,
  });

  if (!rentalReq) {
    throw new AppError(404, "Không tìm thấy yêu cầu thuê");
  }

  if (rentalReq.status === "pending_moderator") {
    throw new AppError(
      400,
      "Yêu cầu thuê này đang chờ Quản lý web kiểm tra và chuyển tiếp cho bạn. Chỉ khi Quản lý web gửi sang, Owner mới có thể duyệt."
    );
  }

  if (rentalReq.status !== "pending") {
    throw new AppError(400, `Yêu cầu này đã ở trạng thái: ${rentalReq.status}`);
  }

  if (action === "approve") {
    rentalReq.status = "approved";
  } else {
    rentalReq.status = "rejected";
    rentalReq.rejection_reason = rejection_reason.trim();
  }

  rentalReq.responded_at = new Date();
  await rentalReq.save();

  // Notify Renter and Web Manager
  try {
    if (rentalReq.renter_id) {
      await UserNotification.create({
        user_id: rentalReq.renter_id,
        title:
          action === "approve"
            ? `✅ Owner đã duyệt yêu cầu thuê #${rentalReq.request_code}`
            : `❌ Owner từ chối yêu cầu thuê #${rentalReq.request_code}`,
        message:
          action === "approve"
            ? `Chủ thiết bị (${req.user.name}) đã duyệt yêu cầu thuê #${rentalReq.request_code} và đang lập hợp đồng gửi Quản lý web duyệt.`
            : `Chủ thiết bị (${req.user.name}) đã từ chối yêu cầu thuê #${rentalReq.request_code}: ${rentalReq.rejection_reason}`,
        related_record_id: rentalReq._id,
      });
    }
    await notifyManagers(
      action === "approve"
        ? `✅ Owner đã duyệt yêu cầu #${rentalReq.request_code}`
        : `❌ Owner từ chối yêu cầu #${rentalReq.request_code}`,
      action === "approve"
        ? `Owner ${req.user.name} đã chấp thuận yêu cầu thuê #${rentalReq.request_code} và sẽ gửi hợp đồng lên để Quản lý web duyệt.`
        : `Owner ${req.user.name} từ chối yêu cầu thuê #${rentalReq.request_code}: ${rentalReq.rejection_reason}`,
      rentalReq._id
    );
  } catch (err) {
    console.error("Failed to notify renter/moderator on request response:", err);
  }

  res.json({
    message:
      action === "approve"
        ? "Đã chấp nhận yêu cầu thuê! Bây giờ bạn hãy lập Hợp đồng cho thuê và gửi cho Quản lý web duyệt."
        : "Đã từ chối yêu cầu thuê",
    request: rentalReq,
  });
}

// -----------------------------------------------------------------------------
// 4. Rental Contracts (UC_O12, UC_O13, UC_O14, UC_O15)
// -----------------------------------------------------------------------------
async function getContracts(req, res) {
  const ownerId = req.user._id;
  const contracts = await RentalContract.find({ owner_id: ownerId })
    .populate("equipment_id")
    .populate("renter_id", "name email phone")
    .populate("moderator_id", "name email")
    .populate("moderation_history.moderator_id", "name email")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ contracts });
}

async function getPublishedContractTemplates(_req, res) {
  const templates = await ContractTemplate.aggregate([
    { $match: { status: "published" } },
    { $sort: { version: -1 } },
    { $group: { _id: "$template_code", template: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$template" } },
    { $sort: { name: 1 } },
  ]);
  res.json({ templates });
}

async function getContractDetail(req, res) {
  const { id } = req.params;
  const contract = await RentalContract.findOne({
    _id: id,
    owner_id: req.user._id,
  })
    .populate("equipment_id")
    .populate("renter_id", "name email phone")
    .populate("moderator_id", "name email")
    .populate("moderation_history.moderator_id", "name email")
    .lean();

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng");
  }

  res.json({ contract });
}

// UC_O12: Owner creates Rental Contract from accepted request and sends to Web Manager (Moderator) for approval
async function createRentalContract(req, res) {
  const ownerId = req.user._id;
  const {
    request_id,
    special_conditions,
    custom_terms,
    template_id,
    template_values,
    submit_immediately,
  } = req.body;

  if (!request_id) {
    throw new AppError(400, "Vui lòng cung cấp mã yêu cầu thuê đã chấp thuận");
  }

  const rentalReq = await RentalRequest.findOne({
    _id: request_id,
    owner_id: ownerId,
  }).populate("equipment_id");

  if (!rentalReq) {
    throw new AppError(404, "Không tìm thấy yêu cầu thuê");
  }

  if (rentalReq.status !== "approved") {
    throw new AppError(400, "Chỉ có thể lập hợp đồng từ yêu cầu đã được Quản lý web gửi và Owner chấp nhận");
  }

  const equipment = rentalReq.equipment_id;
  const contractCode = generateCode("HD");
  const accessoriesText =
    Array.isArray(equipment.accessories) && equipment.accessories.length > 0
      ? equipment.accessories.join(", ")
      : "Theo tiêu chuẩn nhà sản xuất";

  let standardTerms =
    (typeof custom_terms === "string" && custom_terms.trim()) ||
    `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
--------------------------------------------------
HỢP ĐỒNG THUÊ THIẾT BỊ ĐIỆN TỬ CHUẨN
Mã hợp đồng: ${contractCode}

Căn cứ Bộ luật Dân sự nước CHXHCN Việt Nam hiện hành;
Căn cứ Quy chế hoạt động và Kiểm duyệt Hợp đồng của Nền tảng SWP391 Rental;
Hôm nay, ngày ${new Date().toLocaleDateString("vi-VN")}, chúng tôi gồm có:

I. BÊN CHO THUÊ THIẾT BỊ (BÊN A - OWNER):
- Họ và tên đại diện: ${req.user.name}
- Email liên hệ: ${req.user.email}
- Vai trò: Chủ sở hữu hợp pháp của thiết bị cho thuê trên nền tảng.

II. BÊN THUÊ THIẾT BỊ (BÊN B - RENTER):
- Họ và tên đại diện: ${rentalReq.renter_name}
- Email liên hệ: ${rentalReq.renter_email || "N/A"}
- Số điện thoại: ${rentalReq.renter_phone || "N/A"}
- Mã yêu cầu thuê gốc: ${rentalReq.request_code}

Hai bên thống nhất lập Hợp đồng thuê thiết bị chuẩn với các điều khoản dưới đây:

ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG & TÌNH TRẠNG THIẾT BỊ
1.1. Tên thiết bị: ${equipment.title}
1.2. Thương hiệu / Model: ${equipment.brand || "Chính hãng"} / ${equipment.model_name || "Tiêu chuẩn"}
1.3. Số Serial (S/N): ${equipment.serial_number || "Ghi nhận chi tiết tại Biên bản bàn giao"}
1.4. Tình trạng thiết bị khi lập hợp đồng: ${equipment.condition || "Tốt (95%)"}
1.5. Phụ kiện đi kèm: ${accessoriesText}

ĐIỀU 2: THỜI HẠN THUÊ THIẾT BỊ
2.1. Thời gian bắt đầu nhận máy: ${new Date(rentalReq.start_date).toLocaleString("vi-VN")}
2.2. Thời gian hoàn trả máy: ${new Date(rentalReq.end_date).toLocaleString("vi-VN")}
2.3. Hình thức tính thuê: ${rentalReq.rental_type === "hourly" ? "Thuê theo giờ" : `Thuê theo ngày (${rentalReq.duration_days || 1} ngày)`}

ĐIỀU 3: GIÁ TRỊ HỢP ĐỒNG, TIỀN ĐẶT CỌC & THANH TOÁN
3.1. Tổng tiền thuê thiết bị: ${rentalReq.rental_fee.toLocaleString("vi-VN")} VND
3.2. Khoản tiền đặt cọc bảo đảm: ${rentalReq.deposit_amount.toLocaleString("vi-VN")} VND
3.3. Tổng số tiền tạm tính (Tiền thuê + Tiền cọc): ${(rentalReq.rental_fee + rentalReq.deposit_amount).toLocaleString("vi-VN")} VND
3.4. Chính sách hủy đơn: ${equipment.cancellation_policy || "Miễn phí hủy trước 24 giờ."}

ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A (OWNER)
4.1. Bàn giao thiết bị đúng chủng loại, số serial, phụ kiện và tình trạng hoạt động tốt đúng thời gian đã thỏa thuận.
4.2. Lập Biên bản bàn giao (UC_O08) và Biên bản kiểm tra hoàn trả (UC_O09) có đầy đủ hình ảnh minh chứng.
4.3. Hoàn trả khoản tiền đặt cọc cho Bên B sau khi nghiệm thu thiết bị không phát sinh hư hại hoặc mất mát phụ kiện.

ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B (RENTER)
5.1. Kiểm tra kỹ tình trạng vật lý và hoạt động của thiết bị khi nhận bàn giao.
5.2. Sử dụng thiết bị đúng mục đích, tự bảo quản thiết bị, không tự ý tháo mở, sửa chữa hoặc cho bên thứ ba thuê lại.
5.3. Quy định của Owner: ${equipment.rental_terms || "Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị và hoàn trả đúng hẹn."}
5.4. Trường hợp trả trễ hạn hoặc phát sinh hư hỏng, mất mát linh kiện/phụ kiện, Bên B đồng ý khấu trừ chi phí khắc phục thực tế vào khoản tiền đặt cọc theo Biên bản hoàn trả được Quản lý web xác minh.

ĐIỀU 6: ĐIỀU KHOẢN BỔ SUNG CỦA OWNER
${special_conditions || "Không có điều khoản bổ sung đặc biệt."}

ĐIỀU 7: QUY TRÌNH PHÊ DUYỆT CỦA QUẢN LÝ WEB & CHỮ KÝ NGƯỜI THUÊ
7.1. Hợp đồng này được Bên A (Owner) lập sau khi duyệt yêu cầu thuê do Quản lý web chuyển tiếp, và gửi lên cho Quản lý web kiểm duyệt nội dung.
7.2. Sau khi Quản lý web phê duyệt hợp lệ, Quản lý web gửi Hợp đồng này tới Bên B (Người thuê) để Bên B ký tên điện tử xác nhận hiệu lực hợp đồng.`;

  let selectedTemplate;
  if (template_id) {
    selectedTemplate = await ContractTemplate.findOne({
      _id: template_id,
      status: "published",
    }).lean();
    if (!selectedTemplate) {
      throw new AppError(400, "Mẫu hợp đồng không còn được công bố. Vui lòng tải lại danh sách mẫu.");
    }
    const suppliedValues = {};
    for (const field of selectedTemplate.fields) {
      const supplied = template_values && typeof template_values === "object"
        ? template_values[field.key]
        : undefined;
      if (supplied !== undefined && typeof supplied !== "string") {
        throw new AppError(400, `Giá trị trường "${field.label}" không hợp lệ.`);
      }
      suppliedValues[field.key] = typeof supplied === "string" ? supplied.trim() : "";
    }
    const values = {
      ...suppliedValues,
      contract_code: contractCode,
      owner_name: req.user.name,
      owner_email: req.user.email,
      renter_name: rentalReq.renter_name,
      renter_email: rentalReq.renter_email || "",
      renter_phone: rentalReq.renter_phone || "",
      equipment_title: equipment.title,
      equipment_brand: equipment.brand || "",
      equipment_model: equipment.model_name || "",
      equipment_condition: equipment.condition || "",
      start_date: new Date(rentalReq.start_date).toLocaleString("vi-VN"),
      end_date: new Date(rentalReq.end_date).toLocaleString("vi-VN"),
      rental_price: rentalReq.rental_fee.toLocaleString("vi-VN"),
      deposit_amount: rentalReq.deposit_amount.toLocaleString("vi-VN"),
      special_conditions: special_conditions || "",
    };
    for (const field of selectedTemplate.fields) {
      if (field.required && !String(values[field.key] || "").trim()) {
        throw new AppError(400, `Vui lòng nhập trường bắt buộc: ${field.label}.`);
      }
    }
    standardTerms = selectedTemplate.terms_content.replace(
      /\{\{\s*([\w-]+)\s*\}\}/g,
      (_placeholder, key) => String(values[key] ?? "")
    );
  }

  const initialStatus = submit_immediately ? "pending_approval" : "draft";

  const contract = await RentalContract.create({
    contract_code: contractCode,
    request_id: rentalReq._id,
    equipment_id: equipment._id,
    owner_id: ownerId,
    renter_id: rentalReq.renter_id,
    title: `Hợp đồng thuê ${equipment.title} - ${rentalReq.renter_name}`,
    terms_content: standardTerms,
    rental_price: rentalReq.rental_fee,
    deposit_amount: rentalReq.deposit_amount,
    start_date: rentalReq.start_date,
    end_date: rentalReq.end_date,
    special_conditions: special_conditions || "",
    template_id: selectedTemplate?._id,
    template_version: selectedTemplate?.version,
    version: 1,
    version_history: [
      {
        version: 1,
        edited_at: new Date(),
        changes_summary: submit_immediately
          ? "Owner lập hợp đồng chuẩn v1 và gửi Quản lý web duyệt để chuyển cho Người thuê ký"
          : "Owner khởi tạo bản nháp hợp đồng chuẩn v1",
        terms_content: standardTerms,
      },
    ],
    owner_signature: {
      signed: true,
      signed_at: new Date(),
      signature_data: `OWNER_SIG_${ownerId}_${Date.now()}`,
      signer_name: req.user.name,
    },
    status: initialStatus,
  });

  rentalReq.status = "contract_created";
  await rentalReq.save();

  if (submit_immediately) {
    await notifyManagers(
      `📜 Hợp đồng mới #${contract.contract_code} chờ Quản lý web duyệt`,
      `Owner ${req.user.name} đã lập Hợp đồng ${contract.contract_code} cho khách ${rentalReq.renter_name}. Vui lòng duyệt để gửi cho Người thuê ký tên!`,
      contract._id
    );
  }

  res.status(201).json({
    message: submit_immediately
      ? "Đã lập hợp đồng chuẩn và gửi Quản lý web duyệt! Sau khi Quản lý web duyệt sẽ gửi cho Người thuê ký tên."
      : "Tạo bản nháp hợp đồng thuê chuẩn thành công",
    contract,
  });
}

// UC_O13: Update Draft Rental Contract (version tracking preserved)
async function updateDraftContract(req, res) {
  const { id } = req.params;
  const { terms_content, special_conditions, changes_summary, submit_immediately } = req.body;

  const contract = await RentalContract.findOne({
    _id: id,
    owner_id: req.user._id,
  });

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng");
  }

  if (!["draft", "moderator_rejected"].includes(contract.status)) {
    throw new AppError(
      400,
      `Không thể sửa hợp đồng ở trạng thái '${contract.status}'. Chỉ sửa được bản nháp hoặc hợp đồng bị Quản lý web trả về.`
    );
  }

  if (!terms_content || !terms_content.trim()) {
    throw new AppError(400, "Nội dung điều khoản hợp đồng không được để trống");
  }

  const nextVersion = contract.version + 1;
  contract.terms_content = terms_content.trim();
  if (special_conditions !== undefined) contract.special_conditions = special_conditions;
  contract.version = nextVersion;
  contract.version_history.push({
    version: nextVersion,
    edited_at: new Date(),
    changes_summary:
      changes_summary ||
      (submit_immediately
        ? `Cập nhật phiên bản v${nextVersion} và gửi Quản lý web duyệt lại`
        : `Cập nhật phiên bản v${nextVersion}`),
    terms_content: terms_content.trim(),
  });

  if (!contract.owner_signature?.signed) {
    contract.owner_signature = {
      signed: true,
      signed_at: new Date(),
      signature_data: `OWNER_SIG_${req.user._id}_${Date.now()}`,
      signer_name: req.user.name,
    };
  }

  if (submit_immediately) {
    contract.status = "pending_approval";
    contract.moderator_feedback = "";
  } else if (contract.status === "moderator_rejected") {
    contract.status = "draft";
  }

  await contract.save();

  if (submit_immediately) {
    await notifyManagers(
      `📜 Hợp đồng #${contract.contract_code} (v${nextVersion}) gửi duyệt lại`,
      `Owner ${req.user.name} đã cập nhật Hợp đồng ${contract.contract_code} (v${nextVersion}) và gửi Quản lý web duyệt.`,
      contract._id
    );
  }

  res.json({
    message: submit_immediately
      ? `Đã cập nhật phiên bản v${nextVersion} và gửi Quản lý web phê duyệt!`
      : `Cập nhật hợp đồng thành công (phiên bản v${nextVersion})`,
    contract,
  });
}

// UC_O14: Submit Rental Contract for Approval to Web Manager (Rental Moderator)
async function submitRentalContractForApproval(req, res) {
  const { id } = req.params;
  const contract = await RentalContract.findOne({
    _id: id,
    owner_id: req.user._id,
  });

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng");
  }

  if (!["draft", "moderator_rejected"].includes(contract.status)) {
    throw new AppError(
      400,
      "Chỉ có thể gửi phê duyệt đối với hợp đồng đang ở trạng thái Bản nháp (draft) hoặc cần gửi duyệt lại."
    );
  }

  if (!contract.owner_signature?.signed) {
    contract.owner_signature = {
      signed: true,
      signed_at: new Date(),
      signature_data: `OWNER_SIG_${req.user._id}_${Date.now()}`,
      signer_name: req.user.name,
    };
  }

  contract.status = "pending_approval";
  contract.moderator_feedback = "";
  await contract.save();

  await notifyManagers(
    `📜 Hợp đồng #${contract.contract_code} chờ Quản lý web duyệt`,
    `Owner ${req.user.name} đã gửi Hợp đồng ${contract.contract_code} lên Quản lý web duyệt để chuyển cho Người thuê ký tên.`,
    contract._id
  );

  res.json({
    message: "Đã gửi hợp đồng đến Quản lý web kiểm duyệt! Sau khi Quản lý web duyệt sẽ gửi cho Người thuê ký tên.",
    contract,
  });
}

// UC_O15: Confirm E-Contract (Owner confirms/signs if not yet signed)
async function confirmEContract(req, res) {
  const { id } = req.params;
  const { signature_note } = req.body;

  const contract = await RentalContract.findOne({
    _id: id,
    owner_id: req.user._id,
  });

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng");
  }

  contract.owner_signature = {
    signed: true,
    signed_at: new Date(),
    signature_data: signature_note
      ? `${signature_note} (DIGITAL_SIG_${req.user._id}_${Date.now()})`
      : `DIGITAL_SIG_${req.user._id}_${Date.now()}`,
    signer_name: req.user.name,
  };
  await contract.save();

  res.json({
    message: "Đã ghi nhận chữ ký điện tử của Owner trên hợp đồng.",
    contract,
  });
}

// -----------------------------------------------------------------------------
// 5. Handover & Return Inspection (UC_O08, UC_O09)
// -----------------------------------------------------------------------------
async function getContractHandoverRecords(req, res) {
  const { id } = req.params;
  const records = await HandoverRecord.find({
    contract_id: id,
    owner_id: req.user._id,
  }).sort({ createdAt: 1 }).lean();

  res.json({ records });
}

async function updateHandoverRecordAfterReview(req, res) {
  const { id } = req.params;
  const { physical_condition, working_status, accessories_checklist, evidence_photos, notes } = req.body;
  if (typeof physical_condition !== "string" || !physical_condition.trim()) {
    throw new AppError(400, "Vui lòng nhập tình trạng thiết bị đã cập nhật.");
  }
  const record = await HandoverRecord.findOneAndUpdate(
    {
      _id: id,
      owner_id: req.user._id,
      "moderator_review.status": "needs_changes",
    },
    {
      $set: {
        physical_condition: physical_condition.trim(),
        working_status: typeof working_status === "string" ? working_status.trim() : "",
        accessories_checklist: Array.isArray(accessories_checklist) ? accessories_checklist : [],
        evidence_photos: Array.isArray(evidence_photos) ? evidence_photos : [],
        notes: typeof notes === "string" ? notes.trim() : "",
        missing_items: Array.isArray(req.body.missing_items) ? req.body.missing_items : [],
        damage_detected: typeof req.body.damage_detected === "string" ? req.body.damage_detected.trim() : "",
        estimated_damage_cost: Math.max(0, Number(req.body.estimated_damage_cost) || 0),
        "moderator_review.status": "pending",
        "moderator_review.note": "",
      },
      $unset: {
        "moderator_review.moderator_id": 1,
        "moderator_review.reviewed_at": 1,
      },
    },
    { new: true, runValidators: true }
  );
  if (!record) {
    throw new AppError(404, "Không tìm thấy biên bản cần bổ sung của Owner này.");
  }
  res.json({ message: "Đã cập nhật biên bản và gửi lại để xác minh.", record });
}

// UC_O08: Handover Equipment (Biên bản bàn giao cho Renter)
async function createHandoverRecord(req, res) {
  const { id } = req.params;
  const {
    accessories_checklist,
    physical_condition,
    working_status,
    evidence_photos,
    notes,
  } = req.body;

  const contract = await RentalContract.findOne({
    _id: id,
    owner_id: req.user._id,
  });

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng");
  }

  if (!["signed", "active"].includes(contract.status)) {
    throw new AppError(
      400,
      "Chỉ có thể bàn giao thiết bị sau khi hợp đồng đã được Quản lý web phê duyệt và Người thuê đã ký tên xác nhận!"
    );
  }

  if (!physical_condition) {
    throw new AppError(400, "Vui lòng ghi nhận tình trạng vật lý thiết bị khi bàn giao");
  }

  const record = await HandoverRecord.create({
    contract_id: contract._id,
    equipment_id: contract.equipment_id,
    owner_id: req.user._id,
    renter_id: contract.renter_id,
    record_type: "handover",
    record_date: new Date(),
    accessories_checklist: Array.isArray(accessories_checklist) ? accessories_checklist : [],
    physical_condition: physical_condition.trim(),
    working_status: working_status || "Hoạt động bình thường",
    evidence_photos: Array.isArray(evidence_photos) ? evidence_photos : [],
    notes: notes || "",
    owner_confirmed: true,
    renter_confirmed: true,
  });

  contract.status = "active";
  await contract.save();

  // Update equipment status to rented
  await Equipment.findByIdAndUpdate(contract.equipment_id, { status: "rented" });

  res.status(201).json({
    message: "Lập biên bản bàn giao thiết bị thành công",
    record,
  });
}

// UC_O09: Inspect Returned Equipment (Biên bản kiểm tra trả, đối chiếu bàn giao)
async function createReturnInspectionRecord(req, res) {
  const { id } = req.params;
  const {
    accessories_checklist,
    physical_condition,
    working_status,
    missing_items,
    damage_detected,
    estimated_damage_cost,
    evidence_photos,
    notes,
  } = req.body;

  const contract = await RentalContract.findOne({
    _id: id,
    owner_id: req.user._id,
  });

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng");
  }

  const record = await HandoverRecord.create({
    contract_id: contract._id,
    equipment_id: contract.equipment_id,
    owner_id: req.user._id,
    renter_id: contract.renter_id,
    record_type: "return",
    record_date: new Date(),
    accessories_checklist: Array.isArray(accessories_checklist) ? accessories_checklist : [],
    physical_condition: physical_condition || "Đã qua sử dụng, có hao mòn bình thường",
    working_status: working_status || "Hoạt động ổn định",
    missing_items: Array.isArray(missing_items) ? missing_items : [],
    damage_detected: damage_detected || "",
    estimated_damage_cost: Number(estimated_damage_cost) || 0,
    evidence_photos: Array.isArray(evidence_photos) ? evidence_photos : [],
    notes: notes || "",
    owner_confirmed: true,
    renter_confirmed: false,
  });

  contract.status = "completed";
  await contract.save();

  // Update equipment status back to available
  await Equipment.findByIdAndUpdate(contract.equipment_id, { status: "available" });

  // Update settlement if damage deductions apply
  const damageCost = Number(estimated_damage_cost) || 0;
  let settlement = await Settlement.findOne({ contract_id: contract._id });
  if (settlement) {
    settlement.damage_deduction = damageCost;
    settlement.deduction_reason = damage_detected || "";
    settlement.deposit_refund_to_renter = Math.max(0, settlement.deposit_paid - damageCost);
    settlement.owner_payout_amount = settlement.total_rental_fee + damageCost - settlement.platform_fee;
    await settlement.save();
  }

  res.status(201).json({
    message: "Lập biên bản kiểm tra trả thiết bị thành công",
    record,
    settlement,
  });
}

// -----------------------------------------------------------------------------
// 6. Settlement & Payout (UC_O10, UC_O11)
// -----------------------------------------------------------------------------
async function getSettlements(req, res) {
  const ownerId = req.user._id;
  const settlements = await Settlement.find({ owner_id: ownerId })
    .populate("contract_id")
    .populate("renter_id", "name email phone")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ settlements });
}

async function getSettlementByContract(req, res) {
  const { contractId } = req.params;
  const settlement = await Settlement.findOne({
    contract_id: contractId,
    owner_id: req.user._id,
  })
    .populate("contract_id")
    .populate("renter_id", "name email phone")
    .lean();

  if (!settlement) {
    throw new AppError(404, "Không tìm thấy dữ liệu quyết toán");
  }

  res.json({ settlement });
}

// UC_O10: Confirm Settlement & Payout
async function confirmSettlementPayout(req, res) {
  const { contractId } = req.params;
  const { bank_info } = req.body;

  const settlement = await Settlement.findOne({
    contract_id: contractId,
    owner_id: req.user._id,
  });

  if (!settlement) {
    throw new AppError(404, "Không tìm thấy dữ liệu quyết toán");
  }

  settlement.owner_confirmed = true;
  settlement.owner_confirmed_at = new Date();
  settlement.payout_status = "confirmed";
  if (bank_info) {
    settlement.bank_info = bank_info;
  }
  await settlement.save();

  res.json({
    message: "Xác nhận dữ liệu quyết toán & yêu cầu giải ngân thành công",
    settlement,
  });
}

// UC_O11: Track Revenue & Rental History
async function getRevenueAndRentalHistory(req, res) {
  const ownerId = req.user._id;

  const [settlements, contracts, requests] = await Promise.all([
    Settlement.find({ owner_id: ownerId })
      .populate("contract_id")
      .populate("renter_id", "name email")
      .sort({ createdAt: -1 })
      .lean(),
    RentalContract.find({ owner_id: ownerId })
      .populate("equipment_id", "title images")
      .populate("renter_id", "name email")
      .sort({ createdAt: -1 })
      .lean(),
    RentalRequest.find({ owner_id: ownerId })
      .populate("equipment_id", "title")
      .populate("renter_id", "name email")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const totalEarned = settlements.reduce((acc, s) => acc + (s.owner_payout_amount || 0), 0);
  const paidOut = settlements
    .filter((s) => s.payout_status === "paid")
    .reduce((acc, s) => acc + (s.owner_payout_amount || 0), 0);
  const pendingPayout = settlements
    .filter((s) => s.payout_status !== "paid")
    .reduce((acc, s) => acc + (s.owner_payout_amount || 0), 0);
  const platformFees = settlements.reduce((acc, s) => acc + (s.platform_fee || 0), 0);

  res.json({
    analytics: {
      totalEarned,
      paidOut,
      pendingPayout,
      platformFees,
      totalContracts: contracts.length,
      totalRequests: requests.length,
    },
    settlements,
    contracts,
    requests,
  });
}

// -----------------------------------------------------------------------------
// 7. Disputes & Support Tickets (UC_O17, UC_O18)
// -----------------------------------------------------------------------------
// UC_O17: Submit Rental Dispute
async function submitRentalDispute(req, res) {
  const { contract_id, title, reason, description, evidence_urls, claimed_compensation } = req.body;

  if (!contract_id || !title || !reason || !description) {
    throw new AppError(400, "Vui lòng nhập đầy đủ hợp đồng, tiêu đề, lý do và mô tả khiếu nại");
  }

  const contract = await RentalContract.findOne({
    _id: contract_id,
    owner_id: req.user._id,
  });

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng liên quan");
  }

  const dispute = await Dispute.create({
    dispute_code: generateCode("KN"),
    contract_id: contract._id,
    owner_id: req.user._id,
    renter_id: contract.renter_id,
    title: title.trim(),
    reason: reason.trim(),
    description: description.trim(),
    evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : [],
    claimed_compensation: Number(claimed_compensation) || 0,
    status: "pending_review",
  });

  res.status(201).json({
    message: "Gửi khiếu nại thành công. Đội ngũ kiểm duyệt sẽ xử lý trong vòng 24 giờ.",
    dispute,
  });
}

async function getOwnerDisputes(req, res) {
  const disputes = await Dispute.find({ owner_id: req.user._id })
    .populate("contract_id", "contract_code title")
    .populate("renter_id", "name email phone")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ disputes });
}

// UC_O18: Submit Support Ticket
async function submitSupportTicket(req, res) {
  const { category, subject, message, priority } = req.body;

  if (!subject || !message) {
    throw new AppError(400, "Vui lòng nhập tiêu đề và nội dung yêu cầu hỗ trợ");
  }

  const ticket = await SupportTicket.create({
    ticket_code: generateCode("HT"),
    user_id: req.user._id,
    user_role: req.user.role || "owner",
    category: category || "Kỹ thuật hệ thống",
    subject: subject.trim(),
    message: message.trim(),
    priority: priority || "medium",
    status: "open",
  });

  const populatedTicket = await SupportTicket.findById(ticket._id)
    .populate("user_id", "name email role")
    .lean();

  try {
    const { getIO } = require("../config/socket");
    getIO().emit("ticket:created", {
      ticket: populatedTicket,
      message: `Yêu cầu hỗ trợ mới #${ticket.ticket_code} từ ${req.user.name || "Owner"}`,
    });
  } catch (err) {
    console.error("Socket emit ticket:created failed:", err.message);
  }

  res.status(201).json({
    message: "Gửi phiếu hỗ trợ thành công",
    ticket: populatedTicket,
  });
}

async function getOwnerSupportTickets(req, res) {
  const tickets = await SupportTicket.find({ user_id: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ tickets });
}

async function replySupportTicket(req, res) {
  const { id } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new AppError(400, "Nội dung phản hồi không được để trống");
  }

  const ticket = await SupportTicket.findOne({
    _id: id,
    user_id: req.user._id,
  });

  if (!ticket) {
    throw new AppError(404, "Không tìm thấy yêu cầu hỗ trợ");
  }

  ticket.replies.push({
    sender_id: req.user._id,
    sender_name: req.user.name,
    sender_role: req.user.role || "owner",
    message: message.trim(),
    created_at: new Date(),
  });

  await ticket.save();

  const updatedTicket = await SupportTicket.findById(id)
    .populate("user_id", "name email role")
    .populate("replies.sender_id", "name email role")
    .lean();

  try {
    const { getIO } = require("../config/socket");
    getIO().emit("ticket:replied", {
      ticketId: id.toString(),
      ticket: updatedTicket,
      reply: updatedTicket.replies[updatedTicket.replies.length - 1],
      senderRole: req.user.role || "owner",
    });
  } catch (err) {
    console.error("Socket emit ticket:replied failed:", err.message);
  }

  res.json({
    message: "Đã gửi phản hồi",
    ticket: updatedTicket,
  });
}

module.exports = {
  uploadEquipmentPhoto,
  uploadEquipmentPhotos,
  getOverview,
  getOwnerEquipments,
  getEquipmentDetail,
  createEquipmentListing,
  updateEquipment,
  toggleEquipmentVisibility,
  scheduleEquipmentAvailability,
  submitEquipmentStatusUpdateRequest,
  getRentalRequests,
  respondRentalRequest,
  getContracts,
  getPublishedContractTemplates,
  getContractDetail,
  createRentalContract,
  updateDraftContract,
  submitRentalContractForApproval,
  confirmEContract,
  getContractHandoverRecords,
  updateHandoverRecordAfterReview,
  createHandoverRecord,
  createReturnInspectionRecord,
  getSettlements,
  getSettlementByContract,
  confirmSettlementPayout,
  getRevenueAndRentalHistory,
  submitRentalDispute,
  getOwnerDisputes,
  submitSupportTicket,
  getOwnerSupportTickets,
  replySupportTicket,
};
