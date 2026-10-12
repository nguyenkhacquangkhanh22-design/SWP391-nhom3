const crypto = require("crypto");
const Equipment = require("../models/Equipment");
const RentalRequest = require("../models/RentalRequest");
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

// Authenticated user creates a rental request for this equipment
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
    status: "pending",
  });

  res.status(201).json({
    message: "Gửi yêu cầu thuê thiết bị thành công. Vui lòng chờ Owner phê duyệt.",
    request: rentalReq,
  });
}

module.exports = {
  browseEquipments,
  getEquipmentPublicDetail,
  requestRental,
};
