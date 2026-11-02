const crypto = require("crypto");
const Equipment = require("../models/Equipment");
const RentalRequest = require("../models/RentalRequest");
const RentalContract = require("../models/RentalContract");
const Settlement = require("../models/Settlement");
const User = require("../models/User");
const UserNotification = require("../models/UserNotification");
const AppError = require("../utils/AppError");

function generateCode(prefix) {
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomPart}`;
}

// UC_O19: Browse & Search Equipment (Public)
async function browseEquipments(req, res) {
  const { search, category, minPrice, maxPrice, status, sortBy } = req.query;

  const query = {
    visibility: "published",
    approval_status: { $in: ["approved", undefined] },
  };

  if (status) {
    query.status = status;
  }

  if (category && category !== "all") {
    query.category = { $regex: new RegExp(category, "i") };
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    query.$or = [
      { title: searchRegex },
      { brand: searchRegex },
      { model_name: searchRegex },
      { description: searchRegex },
      { category: searchRegex },
    ];
  }

  if (minPrice || maxPrice) {
    query["pricing.price_per_day"] = {};
    if (minPrice) query["pricing.price_per_day"].$gte = Number(minPrice);
    if (maxPrice) query["pricing.price_per_day"].$lte = Number(maxPrice);
  }

  let sort = { createdAt: -1 };
  if (sortBy === "price_asc") sort = { "pricing.price_per_day": 1 };
  if (sortBy === "price_desc") sort = { "pricing.price_per_day": -1 };
  if (sortBy === "rating") sort = { rating: -1 };

  const equipments = await Equipment.find(query)
    .populate("owner_id", "name email trust_score")
    .sort(sort)
    .lean();

  res.json({
    total: equipments.length,
    equipments,
  });
}

// UC_O20: View Equipment Details (Public)
async function getEquipmentPublicDetail(req, res) {
  const { id } = req.params;

  const equipment = await Equipment.findOne({
    _id: id,
    visibility: { $in: ["published", "maintenance"] },
  })
    .populate("owner_id", "name email trust_score createdAt")
    .lean();

  if (!equipment) {
    throw new AppError(404, "Không tìm thấy thiết bị hoặc bài đăng không còn công khai");
  }

  res.json({ equipment });
}

// Step 1: Authenticated Renter creates a rental request -> Sent to Web Manager (Moderator / Admin) first
async function requestRental(req, res) {
  const { id } = req.params;
  const renter = req.user;
  const { start_date, end_date, rental_type, renter_note } = req.body;

  if (!start_date || !end_date) {
    throw new AppError(400, "Vui lòng chọn thời gian bắt đầu và kết thúc thuê");
  }

  const equipment = await Equipment.findById(id);
  if (!equipment || equipment.visibility !== "published") {
    throw new AppError(404, "Thiết bị không khả dụng để thuê");
  }

  if (String(equipment.owner_id) === String(renter._id)) {
    throw new AppError(400, "Bạn không thể tự thuê thiết bị của chính mình");
  }

  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  if (endDate <= startDate) {
    throw new AppError(400, "Thời gian trả phải sau thời gian bắt đầu thuê");
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

  const isHourly = rental_type === "hourly" && equipment.pricing.price_per_hour > 0;
  const rentalFee = isHourly
    ? diffHours * equipment.pricing.price_per_hour
    : diffDays * equipment.pricing.price_per_day;

  const depositAmount = equipment.pricing.deposit_amount;
  const totalEstimatedAmount = rentalFee + depositAmount;

  const rentalReq = await RentalRequest.create({
    request_code: generateCode("YC"),
    equipment_id: equipment._id,
    owner_id: equipment.owner_id,
    renter_id: renter._id,
    renter_name: renter.name,
    renter_email: renter.email,
    renter_phone: req.body.renter_phone || "",
    rental_type: isHourly ? "hourly" : "daily",
    start_date: startDate,
    end_date: endDate,
    duration_days: diffDays,
    duration_hours: diffHours,
    rental_fee: rentalFee,
    deposit_amount: depositAmount,
    total_estimated_amount: totalEstimatedAmount,
    renter_note: renter_note || "",
    status: "pending_moderator", // Gửi tới Quản lý web đầu tiên
  });

  // Notify Web Managers (Moderators & Admins)
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
          title: `📬 Yêu cầu thuê mới #${rentalReq.request_code} cần gửi cho Owner`,
          message: `Người thuê ${renter.name} vừa gửi yêu cầu thuê "${equipment.title}". Vui lòng kiểm tra và chuyển tiếp cho Owner duyệt.`,
          related_record_id: rentalReq._id,
        }))
      );
    }
  } catch (err) {
    console.error("Failed to notify managers of rental request:", err);
  }

  res.status(201).json({
    message:
      "Đã gửi yêu cầu thuê tới Quản lý web! Quản lý web sẽ kiểm tra và gửi yêu cầu cho Chủ thiết bị (Owner) duyệt.",
    request: rentalReq,
  });
}

// Get logged-in Renter's rental requests & contracts
async function getMyRentals(req, res) {
  const renterId = req.user._id;
  const [requests, contracts] = await Promise.all([
    RentalRequest.find({ renter_id: renterId })
      .populate("equipment_id", "title images category brand model_name pricing")
      .populate("owner_id", "name email")
      .populate("moderator_id", "name email")
      .sort({ createdAt: -1 })
      .lean(),
    RentalContract.find({ renter_id: renterId })
      .populate("equipment_id", "title images category brand model_name serial_number condition accessories")
      .populate("owner_id", "name email")
      .populate("moderator_id", "name email")
      .populate("request_id", "request_code start_date end_date rental_fee deposit_amount")
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  res.json({ requests, contracts });
}

// Step 5: Renter signs the contract after Web Manager approved & sent it to Renter
async function signMyContract(req, res) {
  const { id } = req.params;
  const { signature_note } = req.body;

  const contract = await RentalContract.findOne({
    _id: id,
    renter_id: req.user._id,
  });

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng thuê của bạn.");
  }

  if (contract.status !== "moderator_approved") {
    throw new AppError(
      400,
      "Hợp đồng này chưa ở trạng thái chờ Người thuê ký tên (cần được Owner lập và Quản lý web duyệt gửi cho bạn)."
    );
  }

  if (contract.renter_signature?.signed) {
    throw new AppError(400, "Bạn đã ký tên vào hợp đồng này rồi.");
  }

  contract.renter_signature = {
    signed: true,
    signed_at: new Date(),
    signature_data: signature_note
      ? `${signature_note.trim()} (RENTER_SIG_${req.user._id}_${Date.now()})`
      : `RENTER_SIG_${req.user._id}_${Date.now()}`,
    signer_name: req.user.name,
  };

  // Ensure contract status transitions to 'signed' once Renter signs
  contract.status = "signed";
  await contract.save();

  // Also update related RentalRequest status if needed
  if (contract.request_id) {
    await RentalRequest.findByIdAndUpdate(contract.request_id, {
      $set: { status: "contract_created" },
    });
  }

  // Create initial settlement draft for tracking
  const existingSettlement = await Settlement.findOne({ contract_id: contract._id });
  if (!existingSettlement) {
    const platformFee = Math.round(contract.rental_price * 0.05);
    await Settlement.create({
      settlement_code: generateCode("QT"),
      contract_id: contract._id,
      owner_id: contract.owner_id,
      renter_id: contract.renter_id,
      total_rental_fee: contract.rental_price,
      deposit_paid: contract.deposit_amount,
      deposit_refund_to_renter: contract.deposit_amount,
      platform_fee: platformFee,
      owner_payout_amount: contract.rental_price - platformFee,
      payout_status: "pending_owner_confirmation",
    });
  }

  // Notify Owner and Web Manager
  try {
    const notifyTargets = [contract.owner_id, contract.moderator_id].filter(Boolean);
    if (notifyTargets.length > 0) {
      await UserNotification.insertMany(
        notifyTargets.map((uid) => ({
          user_id: uid,
          title: `✍️ Người thuê đã ký Hợp đồng #${contract.contract_code}`,
          message: `Người thuê ${req.user.name} đã ký tên xác nhận Hợp đồng ${contract.contract_code}. Hợp đồng đã có hiệu lực để tiến hành bàn giao thiết bị.`,
          related_record_id: contract._id,
        }))
      );
    }
  } catch (err) {
    console.error("Failed to notify owner/moderator after renter signature:", err);
  }

  const populated = await RentalContract.findById(contract._id)
    .populate("equipment_id", "title images category brand model_name serial_number condition accessories")
    .populate("owner_id", "name email")
    .populate("moderator_id", "name email")
    .lean();

  res.json({
    message: "Bạn đã ký tên Hợp đồng thuê thiết bị thành công! Hợp đồng đã chính thức có hiệu lực.",
    contract: populated,
  });
}

module.exports = {
  browseEquipments,
  getEquipmentPublicDetail,
  requestRental,
  getMyRentals,
  signMyContract,
};
