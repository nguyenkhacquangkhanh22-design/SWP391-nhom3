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
    RentalRequest.countDocuments({
      owner_id: ownerId,
      status: { $in: ["pending", "pending_moderator"] },
    }),
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

  if (!title || !category || !pricing || !pricing.price_per_day) {
    throw new AppError(400, "Vui lòng điền đầy đủ tên thiết bị, danh mục và giá thuê ngày");
  }

  if (
    Number(pricing.price_per_day) < 0 ||
    Number(pricing.price_per_hour || 0) < 0 ||
    Number(pricing.deposit_amount || 0) < 0 ||
    Number(pricing.weekend_rate || 0) < 0
  ) {
    throw new AppError(400, "Số tiền giá thuê và tiền cọc không được là số âm (phải ≥ 0)");
  }

  const equipment = await Equipment.create({
    owner_id: ownerId,
    owner: ownerId,
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
    dailyRate: Number(pricing.price_per_day) || 0,
    depositAmount: 0,
    pricing: {
      price_per_hour: Number(pricing.price_per_hour) || 0,
      price_per_day: Number(pricing.price_per_day) || 0,
      deposit_amount: 0,
      weekend_rate: Number(pricing.weekend_rate) || 0,
    },
    rental_terms: rental_terms || "Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị và hoàn trả đúng hẹn.",
    cancellation_policy: cancellation_policy || "Miễn phí hủy trước 24 giờ.",
    visibility: "published",
    approval_status: "approved",
    status: "available",
  });

  try {
    getIO().emit("equipment:created", {
      equipment,
      message: `Thiết bị mới "${equipment.title}" vừa được đăng và sẵn sàng cho thuê!`,
    });
  } catch (err) {
    console.error("Socket emit equipment:created error:", err);
  }

  res.status(201).json({
    message: "Tạo bài đăng thiết bị thành công",
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
    if (
      (pricing.price_per_day !== undefined && Number(pricing.price_per_day) < 0) ||
      (pricing.price_per_hour !== undefined && Number(pricing.price_per_hour) < 0) ||
      (pricing.deposit_amount !== undefined && Number(pricing.deposit_amount) < 0) ||
      (pricing.weekend_rate !== undefined && Number(pricing.weekend_rate) < 0)
    ) {
      throw new AppError(400, "Số tiền giá thuê và tiền cọc không được là số âm (phải ≥ 0)");
    }
    if (pricing.price_per_day !== undefined) {
      equipment.pricing.price_per_day = Number(pricing.price_per_day);
      equipment.dailyRate = Number(pricing.price_per_day);
    }
    if (pricing.deposit_amount !== undefined) equipment.pricing.deposit_amount = 0;
    if (pricing.price_per_hour !== undefined) equipment.pricing.price_per_hour = Number(pricing.price_per_hour);
    if (pricing.weekend_rate !== undefined) equipment.pricing.weekend_rate = Number(pricing.weekend_rate);
  }

  if (!equipment.owner) {
    equipment.owner = ownerId;
  }
  if (equipment.approval_status === "pending") {
    equipment.approval_status = "approved";
  }

  if (rental_terms !== undefined) equipment.rental_terms = rental_terms;
  if (cancellation_policy !== undefined) equipment.cancellation_policy = cancellation_policy;
  if (visibility && ["published", "hidden", "draft"].includes(visibility)) {
    equipment.visibility = visibility;
    equipment.membership_hidden = false;
    if (visibility === "published") {
      equipment.hidden_reason = "";
    }
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
  equipment.membership_hidden = false;
  if (visibility === "published") {
    equipment.hidden_reason = "";
  }
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
// 3. Rental Requests (UC_O07: Approve / Reject requests sent directly by renters)
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

  if (!["pending", "pending_moderator"].includes(rentalReq.status)) {
    throw new AppError(400, `Yêu cầu này đã ở trạng thái: ${rentalReq.status}`);
  }

  if (action === "approve") {
    rentalReq.status = "approved";
    try {
      const Rental = require("../models/Rental");
      await Rental.updateMany(
        {
          $or: [
            { rentalCode: rentalReq.request_code },
            { renter: rentalReq.renter_id, equipment: rentalReq.equipment_id, status: "PENDING" },
          ],
        },
        { status: "APPROVED" }
      );
    } catch (rErr) {
      console.warn("Lỗi đồng bộ Rental:", rErr.message);
    }
  } else {
    rentalReq.status = "rejected";
    rentalReq.rejection_reason = rejection_reason.trim();
    try {
      const Rental = require("../models/Rental");
      await Rental.updateMany(
        {
          $or: [
            { rentalCode: rentalReq.request_code },
            { renter: rentalReq.renter_id, equipment: rentalReq.equipment_id, status: "PENDING" },
          ],
        },
        { status: "CANCELLED", cancelReason: rejection_reason.trim() }
      );
    } catch (rErr) {
      console.warn("Lỗi đồng bộ Rental:", rErr.message);
    }
  }

  rentalReq.responded_at = new Date();
  await rentalReq.save();

  // Notify the renter about the Owner's decision.
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
            ? `Chủ thiết bị (${req.user.name}) đã duyệt yêu cầu thuê #${rentalReq.request_code}. Owner sẽ lập hợp đồng và gửi trực tiếp cho bạn ký.`
            : `Chủ thiết bị (${req.user.name}) đã từ chối yêu cầu thuê #${rentalReq.request_code}: ${rentalReq.rejection_reason}`,
        related_record_id: rentalReq._id,
      });
    }
  } catch (err) {
    console.error("Failed to notify renter about request response:", err);
  }

  res.json({
    message:
      action === "approve"
        ? "Đã chấp nhận yêu cầu thuê! Bây giờ bạn có thể lập hợp đồng và gửi trực tiếp cho Người thuê."
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

  if (estimated_damage_cost !== undefined && Number(estimated_damage_cost) < 0) {
    throw new AppError(400, "Chi phí khấu trừ hư hại không được là số âm (phải ≥ 0)");
  }

  res.json({ contract });
}

// UC_O12: Owner creates a rental contract from an accepted request
async function createRentalContract(req, res) {
  const ownerId = req.user._id;
  const {
    request_id,
    special_conditions,
    custom_terms,
    template_id,
    template_values,
    submit_immediately,
    digital_signature,
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
    throw new AppError(400, "Chỉ có thể lập hợp đồng từ yêu cầu đã được Owner chấp nhận");
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

ĐIỀU 3: GIÁ TRỊ HỢP ĐỒNG & THANH TOÁN
3.1. Tổng phí thuê thiết bị: ${rentalReq.rental_fee.toLocaleString("vi-VN")} VND (Miễn tiền đặt cọc)
3.2. Chính sách hủy đơn: ${equipment.cancellation_policy || "Miễn phí hủy trước 24 giờ."}

ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A (OWNER)
4.1. Bàn giao thiết bị đúng chủng loại, số serial, phụ kiện và tình trạng hoạt động tốt đúng thời gian đã thỏa thuận.
4.2. Lập Biên bản bàn giao (UC_O08) và Biên bản kiểm tra hoàn trả (UC_O09) có đầy đủ hình ảnh minh chứng.
4.3. Xác nhận hoàn tất hợp đồng cho Bên B sau khi nghiệm thu thiết bị không phát sinh hư hại hoặc mất mát phụ kiện.

ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B (RENTER)
5.1. Kiểm tra kỹ tình trạng vật lý và hoạt động của thiết bị khi nhận bàn giao.
5.2. Sử dụng thiết bị đúng mục đích, tự bảo quản thiết bị, không tự ý tháo mở, sửa chữa hoặc cho bên thứ ba thuê lại.
5.3. Quy định của Owner: ${equipment.rental_terms || "Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị và hoàn trả đúng hẹn."}
5.4. Trường hợp trả trễ hạn hoặc phát sinh hư hỏng, mất mát linh kiện/phụ kiện, Bên B đồng ý thanh toán chi phí khắc phục thực tế theo Biên bản hoàn trả được Quản lý web xác minh.

ĐIỀU 6: ĐIỀU KHOẢN BỔ SUNG CỦA OWNER
${special_conditions || "Không có điều khoản bổ sung đặc biệt."}

ĐIỀU 7: LẬP HỢP ĐỒNG VÀ CHỮ KÝ ĐIỆN TỬ
7.1. Hợp đồng này được Bên A (Owner) lập sau khi chấp nhận yêu cầu thuê.
7.2. Owner gửi hợp đồng trực tiếp tới Bên B (Người thuê) để Bên B xem xét và ký tên điện tử.`;

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
      deposit_amount: "0",
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

  const initialStatus = submit_immediately ? "pending_renter_signature" : "draft";

  const contract = await RentalContract.create({
    contract_code: contractCode,
    request_id: rentalReq._id,
    equipment_id: equipment._id,
    owner_id: ownerId,
    renter_id: rentalReq.renter_id,
    title: `Hợp đồng thuê ${equipment.title} - ${rentalReq.renter_name}`,
    terms_content: standardTerms,
    rental_price: rentalReq.rental_fee,
    deposit_amount: 0,
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
          ? "Owner lập hợp đồng chuẩn v1 và gửi trực tiếp cho Người thuê ký"
          : "Owner khởi tạo bản nháp hợp đồng chuẩn v1",
        terms_content: standardTerms,
      },
    ],
    owner_signature: (() => {
      const certCode = `CERT-OWNER-${ownerId.toString().slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const signerName = (digital_signature && digital_signature.signer_name && digital_signature.signer_name.trim()) || req.user.name;
      const signatureType = (digital_signature && digital_signature.signature_type) || "typed";
      const signatureImage = (digital_signature && digital_signature.signature_image) || "";
      const signatureNote = (digital_signature && digital_signature.signature_note) || "";
      return {
        signed: true,
        signed_at: new Date(),
        signature_data: signatureNote
          ? `${signatureNote} [${certCode}]`
          : `E-SIGNED BY ${signerName} [${certCode}]`,
        signer_name: signerName,
        signature_image: signatureImage,
        signature_type: signatureType,
        certificate_code: certCode,
      };
    })(),
    status: initialStatus,
  });

  rentalReq.status = "contract_created";
  await rentalReq.save();

  // Keep the renter's rental history in sync with the contract sent by the Owner.
  try {
    const Rental = require("../models/Rental");
    const updateRes = await Rental.updateMany(
      {
        $or: [
          { rentalCode: rentalReq.request_code },
          { renter: rentalReq.renter_id, equipment: rentalReq.equipment_id, status: { $in: ["APPROVED", "approved", "PENDING", "CONTRACT_PENDING", "contract_pending"] } },
        ],
      },
      {
        $set: {
          status: "CONTRACT_PENDING",
          "contract.contractNumber": contract.contract_code,
          "contract.contractTerms": contract.terms_content,
          "contract.moderatorApproved": false,
          "contract.moderatorStatus": submit_immediately ? "pending_renter_signature" : "draft",
          "contract.ownerSigned": true,
        },
      }
    );

    if (updateRes.matchedCount === 0) {
      await Rental.create({
        rentalCode: rentalReq.request_code,
        renter: rentalReq.renter_id,
        equipment: rentalReq.equipment_id,
        owner: ownerId,
        startDate: rentalReq.start_date,
        endDate: rentalReq.end_date,
        totalDays: rentalReq.duration_days || 1,
        dailyRate: Math.round((rentalReq.rental_fee || 0) / (rentalReq.duration_days || 1)) || 0,
        rentalFee: rentalReq.rental_fee || 0,
        depositAmount: 0,
        totalAmount: rentalReq.rental_fee || 0,
        status: "APPROVED",
        contract: {
          contractNumber: contract.contract_code,
          termsAccepted: false,
          contractTerms: contract.terms_content,
          moderatorApproved: false,
          moderatorStatus: submit_immediately ? "pending_approval" : "draft",
          ownerSigned: true,
        },
      });
    }
  } catch (syncErr) {
    console.error("Failed to sync created contract to Rental:", syncErr);
  }

  if (submit_immediately) {
    try {
      await UserNotification.create({
        user_id: rentalReq.renter_id,
        title: `📜 Hợp đồng thuê #${contract.contract_code} đang chờ bạn ký`,
        message: `Owner ${req.user.name} đã gửi hợp đồng thuê thiết bị trực tiếp cho bạn. Vui lòng xem và ký trong lịch sử thuê.`,
        related_record_id: contract._id,
      });
    } catch (notificationError) {
      console.error("Failed to notify renter about contract:", notificationError);
    }
  }

  res.status(201).json({
    message: submit_immediately
      ? "Đã lập hợp đồng chuẩn và gửi trực tiếp cho Người thuê ký tên."
      : "Tạo bản nháp hợp đồng thuê chuẩn thành công",
    contract,
  });
}

// UC_O13: Update Draft Rental Contract (version tracking preserved)
async function updateDraftContract(req, res) {
  const { id } = req.params;
  const { terms_content, special_conditions, changes_summary, submit_immediately, digital_signature } = req.body;

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
        ? `Cập nhật phiên bản v${nextVersion} và gửi trực tiếp cho Người thuê ký`
        : `Cập nhật phiên bản v${nextVersion}`),
    terms_content: terms_content.trim(),
  });

  if (digital_signature) {
    const certCode = `CERT-OWNER-${req.user._id.toString().slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const signerName = (digital_signature.signer_name && digital_signature.signer_name.trim()) || req.user.name;
    contract.owner_signature = {
      signed: true,
      signed_at: new Date(),
      signature_data: digital_signature.signature_note
        ? `${digital_signature.signature_note} [${certCode}]`
        : `E-SIGNED BY ${signerName} [${certCode}]`,
      signer_name: signerName,
      signature_image: digital_signature.signature_image || "",
      signature_type: digital_signature.signature_type || "typed",
      certificate_code: certCode,
    };
  } else if (!contract.owner_signature?.signed) {
    const certCode = `CERT-OWNER-${req.user._id.toString().slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    contract.owner_signature = {
      signed: true,
      signed_at: new Date(),
      signature_data: `E-SIGNED BY ${req.user.name} [${certCode}]`,
      signer_name: req.user.name,
      signature_image: "",
      signature_type: "typed",
      certificate_code: certCode,
    };
  }

  if (submit_immediately) {
    contract.status = "pending_renter_signature";
    contract.moderator_feedback = "";
  } else if (contract.status === "moderator_rejected") {
    contract.status = "draft";
  }

  await contract.save();

  if (submit_immediately) {
    try {
      const Rental = require("../models/Rental");
      const RentalRequest = require("../models/RentalRequest");
      const rentalReq = await RentalRequest.findById(contract.request_id);
      if (rentalReq) {
        await Rental.updateMany(
          {
            $or: [
              { rentalCode: rentalReq.request_code },
              {
                renter: rentalReq.renter_id,
                equipment: rentalReq.equipment_id,
                status: { $in: ["APPROVED", "approved", "PENDING", "CONTRACT_PENDING", "contract_pending"] },
              },
            ],
          },
          {
            $set: {
              status: "CONTRACT_PENDING",
              "contract.contractNumber": contract.contract_code,
              "contract.contractTerms": contract.terms_content,
              "contract.moderatorApproved": false,
              "contract.moderatorStatus": "pending_renter_signature",
              "contract.ownerSigned": true,
            },
          },
        );
      }
      await UserNotification.create({
        user_id: contract.renter_id,
        title: `📜 Hợp đồng thuê #${contract.contract_code} đang chờ bạn ký`,
        message: `Owner ${req.user.name} đã cập nhật và gửi hợp đồng trực tiếp cho bạn. Vui lòng xem và ký trong lịch sử thuê.`,
        related_record_id: contract._id,
      });
    } catch (notificationError) {
      console.error("Failed to sync or notify renter about updated contract:", notificationError);
    }
  }

  res.json({
    message: submit_immediately
      ? `Đã cập nhật phiên bản v${nextVersion} và gửi trực tiếp cho Người thuê ký.`
      : `Cập nhật hợp đồng thành công (phiên bản v${nextVersion})`,
    contract,
  });
}

// UC_O14: Owner sends a rental contract directly to the renter
async function sendRentalContractToRenter(req, res) {
  const { id } = req.params;
  const { digital_signature } = req.body;
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

  if (digital_signature) {
    const certCode = `CERT-OWNER-${req.user._id.toString().slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const signerName = (digital_signature.signer_name && digital_signature.signer_name.trim()) || req.user.name;
    contract.owner_signature = {
      signed: true,
      signed_at: new Date(),
      signature_data: digital_signature.signature_note
        ? `${digital_signature.signature_note} [${certCode}]`
        : `E-SIGNED BY ${signerName} [${certCode}]`,
      signer_name: signerName,
      signature_image: digital_signature.signature_image || "",
      signature_type: digital_signature.signature_type || "typed",
      certificate_code: certCode,
    };
  } else if (!contract.owner_signature?.signed) {
    const certCode = `CERT-OWNER-${req.user._id.toString().slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    contract.owner_signature = {
      signed: true,
      signed_at: new Date(),
      signature_data: `E-SIGNED BY ${req.user.name} [${certCode}]`,
      signer_name: req.user.name,
      signature_image: "",
      signature_type: "typed",
      certificate_code: certCode,
    };
  }

  contract.status = "pending_renter_signature";
  contract.moderator_feedback = "";
  await contract.save();

  // Sync the contract state for the renter's rental history.
  try {
    const Rental = require("../models/Rental");
    const RentalRequest = require("../models/RentalRequest");
    const rReq = await RentalRequest.findById(contract.request_id);
    if (rReq) {
      await Rental.updateMany(
        {
          $or: [
            { rentalCode: rReq.request_code },
            { renter: rReq.renter_id, equipment: rReq.equipment_id, status: { $in: ["APPROVED", "approved", "PENDING", "CONTRACT_PENDING", "contract_pending"] } },
          ],
        },
        {
          $set: {
            status: "CONTRACT_PENDING",
            "contract.contractNumber": contract.contract_code,
            "contract.contractTerms": contract.terms_content,
            "contract.moderatorApproved": false,
            "contract.moderatorStatus": "pending_renter_signature",
            "contract.ownerSigned": true,
          },
        }
      );
    }
  } catch (syncErr) {
    console.error("Failed to sync submitted contract to Rental:", syncErr);
  }

  try {
    await UserNotification.create({
      user_id: contract.renter_id,
      title: `📜 Hợp đồng thuê #${contract.contract_code} đang chờ bạn ký`,
      message: `Owner ${req.user.name} đã gửi hợp đồng thuê thiết bị trực tiếp cho bạn. Vui lòng xem và ký trong lịch sử thuê.`,
      related_record_id: contract._id,
    });
  } catch (notificationError) {
    console.error("Failed to notify renter about contract:", notificationError);
  }

  res.json({
    message: "Đã gửi hợp đồng trực tiếp cho Người thuê ký tên.",
    contract,
  });
}

// UC_O15: Confirm E-Contract (Owner confirms/signs if not yet signed)
async function confirmEContract(req, res) {
  const { id } = req.params;
  const { signature_note, signer_name, signature_image, signature_type, digital_signature } = req.body;

  const contract = await RentalContract.findOne({
    _id: id,
    owner_id: req.user._id,
  });

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng");
  }

  const certCode = `CERT-OWNER-${req.user._id.toString().slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const finalSigner =
    (digital_signature && digital_signature.signer_name && digital_signature.signer_name.trim()) ||
    (signer_name && signer_name.trim()) ||
    req.user.name;
  const finalImage = (digital_signature && digital_signature.signature_image) || signature_image || "";
  const finalType = (digital_signature && digital_signature.signature_type) || signature_type || "typed";
  const finalNote = (digital_signature && digital_signature.signature_note) || signature_note || "";

  contract.owner_signature = {
    signed: true,
    signed_at: new Date(),
    signature_data: finalNote
      ? `${finalNote} [${certCode}]`
      : `E-SIGNED BY ${finalSigner} [${certCode}]`,
    signer_name: finalSigner,
    signature_image: finalImage,
    signature_type: finalType,
    certificate_code: certCode,
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
  if (req.body.estimated_damage_cost !== undefined && Number(req.body.estimated_damage_cost) < 0) {
    throw new AppError(400, "Chi phí khấu trừ hư hại không được là số âm (phải ≥ 0)");
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
      "Chỉ có thể bàn giao thiết bị sau khi Người thuê đã ký tên xác nhận hợp đồng."
    );
  }

  if (!physical_condition) {
    throw new AppError(400, "Vui lòng ghi nhận tình trạng vật lý thiết bị khi bàn giao");
  }

  const existingHandover = await HandoverRecord.findOne({
    contract_id: contract._id,
    record_type: "handover",
  });
  if (existingHandover) {
    throw new AppError(409, "Biên bản bàn giao đã được lập cho hợp đồng này.");
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
    renter_confirmed: false,
  });

  contract.status = "active";
  await contract.save();

  // Update equipment status to rented
  await Equipment.findByIdAndUpdate(contract.equipment_id, { status: "rented" });

  // Ensure a settlement exists before the renter confirms receipt.
  const existingSettlement = await Settlement.findOne({ contract_id: contract._id });
  if (!existingSettlement) {
    const platformFee = Math.round((contract.rental_price || 0) * 0.05);
    await Settlement.create({
      settlement_code: generateCode("QT"),
      contract_id: contract._id,
      owner_id: contract.owner_id,
      renter_id: contract.renter_id,
      total_rental_fee: contract.rental_price || 0,
      deposit_paid: contract.deposit_amount || 0,
      deposit_refund_to_renter: contract.deposit_amount || 0,
      platform_fee: platformFee,
      owner_payout_amount: Math.max(0, (contract.rental_price || 0) - platformFee),
      payout_status: "pending_owner_confirmation",
    });
  }

  try {
    await UserNotification.create({
      user_id: contract.renter_id,
      title: `📦 Owner đã bàn giao thiết bị #${contract.contract_code}`,
      message: `Owner đã lập biên bản bàn giao. Vui lòng kiểm tra thiết bị và xác nhận đã nhận hàng trong mục Lịch sử thuê để hoàn tất giải ngân.`,
      related_record_id: record._id,
    });
  } catch (err) {
    console.error("Failed to notify renter about equipment handover:", err);
  }

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

  const [handoverRecord, existingReturnRecord] = await Promise.all([
    HandoverRecord.findOne({
      contract_id: contract._id,
      record_type: "handover",
    }),
    HandoverRecord.findOne({
      contract_id: contract._id,
      record_type: "return",
    }),
  ]);
  if (!handoverRecord) {
    throw new AppError(400, "Cần có biên bản bàn giao trước khi nghiệm thu thiết bị hoàn trả.");
  }
  if (existingReturnRecord) {
    throw new AppError(409, "Thiết bị đã được nghiệm thu hoàn trả cho hợp đồng này.");
  }

  const damageCost = estimated_damage_cost === undefined ? 0 : Number(estimated_damage_cost);
  if (!Number.isFinite(damageCost) || damageCost < 0 || damageCost > contract.deposit_amount) {
    throw new AppError(400, "Chi phí hư hại phải nằm trong khoảng từ 0 đến tiền đặt cọc.");
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
    estimated_damage_cost: damageCost,
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
  let settlement = await Settlement.findOne({ contract_id: contract._id });
  if (settlement) {
    settlement.damage_deduction = damageCost;
    settlement.deduction_reason = damage_detected || "";
    settlement.deposit_refund_to_renter = Math.max(0, settlement.deposit_paid - damageCost);
    if (settlement.payout_status !== "paid") {
      settlement.owner_payout_amount = settlement.total_rental_fee + damageCost - settlement.platform_fee;
    }
    await settlement.save();
  }

  try {
    const hasDamage = damageCost > 0 || Boolean(damage_detected) ||
      (Array.isArray(missing_items) && missing_items.length > 0);
    const damageSummary = [
      damage_detected,
      ...(Array.isArray(missing_items) ? missing_items.map((item) => `Thiếu: ${item}`) : []),
    ].filter(Boolean).join("; ");
    await UserNotification.create({
      user_id: contract.renter_id,
      title: hasDamage
        ? `⚠️ Đã nghiệm thu trả thiết bị #${contract.contract_code}: có ghi nhận hư hại`
        : `✅ Đã xác nhận nhận thiết bị hoàn trả #${contract.contract_code}`,
      message: hasDamage
        ? `Owner đã nhận và kiểm tra thiết bị hoàn trả. Ghi nhận: ${damageSummary || "Có hư hại/mất phụ kiện"}. Khoản khấu trừ đề xuất: ${damageCost.toLocaleString("vi-VN")} đ.`
        : "Owner đã xác nhận nhận lại thiết bị. Không ghi nhận hư hại hoặc phụ kiện thiếu; tiền cọc được hoàn theo quyết toán.",
      related_record_id: record._id,
    });
  } catch (err) {
    console.error("Failed to notify renter about return inspection:", err);
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

// UC_O10: Confirm Settlement & Request Payout to Moderator
async function confirmSettlementPayout(req, res) {
  const { contractId } = req.params;
  const { bank_info, qr_code_url, request_note } = req.body;

  let settlement = await Settlement.findOne({
    contract_id: contractId,
    owner_id: req.user._id,
  });

  if (!settlement) {
    settlement = await Settlement.findOne({
      _id: contractId,
      owner_id: req.user._id,
    });
  }

  if (!settlement) {
    const contract = await RentalContract.findOne({
      _id: contractId,
      owner_id: req.user._id,
    });
    if (!contract) {
      throw new AppError(404, "Không tìm thấy dữ liệu hợp đồng hoặc quyết toán");
    }
    const platformFee = Math.round((contract.rental_price || 0) * 0.05);
    settlement = await Settlement.create({
      settlement_code: generateCode("QT"),
      contract_id: contract._id,
      owner_id: contract.owner_id,
      renter_id: contract.renter_id,
      total_rental_fee: contract.rental_price || 0,
      deposit_paid: contract.deposit_amount || 0,
      deposit_refund_to_renter: contract.deposit_amount || 0,
      platform_fee: platformFee,
      owner_payout_amount: Math.max(0, (contract.rental_price || 0) - platformFee),
      payout_status: "pending_owner_confirmation",
    });
  }

  if (!bank_info || !bank_info.bank_name || !bank_info.account_number || !bank_info.account_holder) {
    throw new AppError(400, "Vui lòng cung cấp đầy đủ tên ngân hàng, số tài khoản và tên chủ tài khoản");
  }

  if (settlement.payout_status === "paid") {
    throw new AppError(409, "Khoản thanh toán cho hợp đồng này đã được giải ngân.");
  }

  const confirmedHandover = await HandoverRecord.findOne({
    contract_id: settlement.contract_id,
    record_type: "handover",
    renter_confirmed: true,
  });
  if (!confirmedHandover) {
    throw new AppError(409, "Chỉ có thể giải ngân sau khi người thuê xác nhận đã nhận thiết bị.");
  }

  settlement.owner_confirmed = true;
  settlement.owner_confirmed_at = new Date();
  settlement.requested_at = new Date();
  settlement.payout_status = "pending_moderator_approval";
  settlement.bank_info = {
    bank_name: bank_info.bank_name.trim(),
    bank_code: (bank_info.bank_code || "").trim(),
    account_number: bank_info.account_number.trim(),
    account_holder: bank_info.account_holder.trim().toUpperCase(),
  };
  if (qr_code_url !== undefined) {
    settlement.qr_code_url = qr_code_url.trim();
  }
  if (request_note !== undefined) {
    settlement.request_note = request_note.trim();
  }

  await settlement.save();

  const contract = await RentalContract.findById(settlement.contract_id);
  await notifyManagers(
    `💸 Yêu cầu thanh toán tiền thuê từ Owner ${req.user.name}`,
    `Owner ${req.user.name} đã gửi yêu cầu thanh toán giải ngân số tiền ${settlement.owner_payout_amount.toLocaleString("vi-VN")} đ cho Hợp đồng #${contract?.contract_code || ""}. Vui lòng kiểm tra thông tin ngân hàng, mã QR và xác nhận giải ngân.`,
    settlement._id
  );

  try {
    getIO().emit("payout:requested", {
      settlementId: settlement._id.toString(),
      settlementCode: settlement.settlement_code,
      ownerName: req.user.name,
      amount: settlement.owner_payout_amount,
    });
  } catch (err) {}

  res.json({
    message: "Đã gửi yêu cầu thanh toán tiền lên Quản lý web (Moderator) thành công!",
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

  if (claimed_compensation !== undefined && Number(claimed_compensation) < 0) {
    throw new AppError(400, "Số tiền yêu cầu bồi thường không được là số âm (phải ≥ 0)");
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
  sendRentalContractToRenter,
  submitRentalContractForApproval: sendRentalContractToRenter,
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
