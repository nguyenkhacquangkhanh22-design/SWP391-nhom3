const crypto = require("crypto");
const Equipment = require("../models/Equipment");
const RentalRequest = require("../models/RentalRequest");
const RentalContract = require("../models/RentalContract");
const Settlement = require("../models/Settlement");
const HandoverRecord = require("../models/HandoverRecord");
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
    visibility: { $in: ["published", "PUBLISHED", undefined] },
    approval_status: { $ne: "rejected" },
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

  const depositAmount = 0; // Không cần tiền cọc theo chính sách mới
  const totalEstimatedAmount = rentalFee;
  const deliveryAddress = req.body.delivery_address || req.body.deliveryAddress || "";

  const rentalReq = await RentalRequest.create({
    request_code: generateCode("YC"),
    equipment_id: equipment._id,
    owner_id: equipment.owner_id,
    renter_id: renter._id,
    renter_name: renter.name,
    renter_email: renter.email,
    renter_phone: req.body.renter_phone || "",
    delivery_address: deliveryAddress,
    rental_type: isHourly ? "hourly" : "daily",
    start_date: startDate,
    end_date: endDate,
    duration_days: diffDays,
    duration_hours: diffHours,
    rental_fee: rentalFee,
    deposit_amount: 0,
    total_estimated_amount: totalEstimatedAmount,
    renter_note: renter_note || "",
    status: "pending", // Gửi trực tiếp tới Owner theo sơ đồ luồng
  });

  // Gửi thông báo trực tiếp đến Người thuê và Chủ máy (Owner)
  try {
    await UserNotification.insertMany([
      {
        user_id: renter._id,
        title: `✅ Đã gửi yêu cầu thuê #${rentalReq.request_code}`,
        message: `Yêu cầu thuê "${equipment.title}" đã được gửi trực tiếp đến Chủ máy để kiểm tra & duyệt.`,
        related_record_id: rentalReq._id,
      },
      {
        user_id: equipment.owner_id,
        title: `📬 Yêu cầu thuê mới #${rentalReq.request_code} từ ${renter.name}`,
        message: `Khách thuê ${renter.name} vừa gửi yêu cầu thuê thiết bị "${equipment.title}". Vui lòng kiểm tra thiết bị và duyệt đơn.`,
        related_record_id: rentalReq._id,
      },
    ]);
  } catch (err) {
    console.error("Failed to notify users of rental request:", err);
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

  const handoverRecords = contracts.length > 0
    ? await HandoverRecord.find({
        contract_id: { $in: contracts.map((contract) => contract._id) },
      }).lean()
    : [];
  const recordsByContract = new Map();
  for (const record of handoverRecords) {
    const key = record.contract_id.toString();
    recordsByContract.set(key, [...(recordsByContract.get(key) || []), record]);
  }
  const contractsWithHandover = contracts.map((contract) => ({
    ...contract,
    handover_records: recordsByContract.get(contract._id.toString()) || [],
  }));

  res.json({ requests, contracts: contractsWithHandover });
}

async function confirmReceipt(req, res) {
  const contract = await RentalContract.findOne({
    _id: req.params.id,
    renter_id: req.user._id,
  });

  if (!contract) {
    throw new AppError(404, "Không tìm thấy hợp đồng thuê của bạn.");
  }
  if (contract.status !== "active") {
    throw new AppError(400, "Chỉ có thể xác nhận nhận thiết bị sau khi Owner đã bàn giao.");
  }

  const handover = await HandoverRecord.findOne({
    contract_id: contract._id,
    renter_id: req.user._id,
    record_type: "handover",
  });
  if (!handover) {
    throw new AppError(400, "Owner chưa lập biên bản bàn giao thiết bị.");
  }
  if (handover.renter_confirmed) {
    throw new AppError(400, "Bạn đã xác nhận nhận thiết bị cho hợp đồng này.");
  }

  const settlement = await Settlement.findOne({ contract_id: contract._id });
  if (!settlement) {
    throw new AppError(409, "Chưa có dữ liệu thanh toán cho hợp đồng này.");
  }

  const confirmedHandover = await HandoverRecord.findOneAndUpdate(
    { _id: handover._id, renter_confirmed: false },
    { $set: { renter_confirmed: true } },
    { new: true },
  );
  if (!confirmedHandover) {
    throw new AppError(409, "Bạn đã xác nhận nhận thiết bị cho hợp đồng này.");
  }

  try {
    await Promise.all([
      UserNotification.create({
        user_id: contract.owner_id,
        title: `✅ Khách đã xác nhận nhận thiết bị #${contract.contract_code}`,
        message: `Người thuê ${req.user.name} đã xác nhận nhận thiết bị thành công. Bạn có thể gửi yêu cầu giải ngân ${settlement.owner_payout_amount.toLocaleString("vi-VN")} đ lên Quản lý web.`,
        related_record_id: contract._id,
      }),
      UserNotification.create({
        user_id: req.user._id,
        title: `✅ Đã xác nhận nhận thiết bị #${contract.contract_code}`,
        message: `Bạn đã xác nhận nhận thiết bị. Owner có thể gửi yêu cầu giải ngân lên Quản lý web; việc chuyển tiền sẽ hoàn tất sau khi được duyệt.`,
        related_record_id: contract._id,
      }),
    ]);
  } catch (err) {
    console.error("Failed to notify users after renter confirmed receipt:", err);
  }

  res.json({
    message: "Đã xác nhận nhận thiết bị thành công. Owner có thể gửi yêu cầu giải ngân lên Quản lý web.",
    contract,
    settlement,
  });
}

// Step 5: Renter signs the contract after Web Manager approved & sent it to Renter
async function signMyContract(req, res) {
  const { id } = req.params;
  const { signature_note, signature_image, signature_data, payment_method } = req.body;

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

  const sigData = signature_image || signature_data || signature_note || `RENTER_HANDWRITTEN_SIG_${req.user._id}_${Date.now()}`;

  contract.renter_signature = {
    signed: true,
    signed_at: new Date(),
    signature_data: sigData,
    signer_name: req.user.name,
  };

  contract.status = "signed";
  contract.payment_method = payment_method || "vietqr";
  contract.payment_status = "paid";
  contract.payment_amount = contract.rental_price;
  contract.paid_at = new Date();
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
      deposit_paid: 0,
      deposit_refund_to_renter: 0,
      platform_fee: platformFee,
      owner_payout_amount: contract.rental_price - platformFee,
      payout_status: "processing",
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
  confirmReceipt,
};
