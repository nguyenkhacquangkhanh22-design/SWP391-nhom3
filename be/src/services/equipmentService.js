const Equipment = require("../models/Equipment");
const AppError = require("../utils/AppError");

class EquipmentService {
  /**
   * UC_G02 & UC_R04, UC_R05: Tìm kiếm và lọc thiết bị
   * query: keyword, category, minPrice, maxPrice, status, page, limit
   */
  async searchEquipment(query) {
    const {
      keyword,
      category,
      minPrice,
      maxPrice,
      status,
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter = {};

    // Chỉ hiển thị thiết bị công khai (không bị ẩn hoặc nháp)
    filter.visibility = { $ne: "hidden" };

    // Chỉ hiển thị thiết bị đã được duyệt hoặc chưa phân loại duyệt
    filter.approval_status = { $in: ["approved", "APPROVED", undefined] };

    // Trạng thái khả dụng (hỗ trợ cả chữ thường và chữ hoa)
    if (status && typeof status === "string" && status.trim() && status !== "all") {
      filter.status = { $regex: new RegExp(`^${status.trim()}$`, "i") };
    } else {
      filter.status = {
        $in: [
          "available",
          "AVAILABLE",
          "approved",
          "APPROVED",
          "active",
          "ACTIVE",
          "published",
          "PUBLISHED",
        ],
      };
    }

    // Tìm kiếm theo từ khóa
    if (keyword && typeof keyword === "string" && keyword.trim()) {
      const trimmed = keyword.trim();
      const kwRegex = { $regex: trimmed, $options: "i" };
      const kwCond = [
        { title: kwRegex },
        { description: kwRegex },
        { brand: kwRegex },
        { model_name: kwRegex },
        { modelNumber: kwRegex },
        { category: kwRegex },
      ];
      filter.$or = kwCond;
    }

    // Lọc theo danh mục
    if (category && typeof category === "string" && category.trim() && category !== "all") {
      const catRegex = { $regex: category.trim(), $options: "i" };
      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or });
        delete filter.$or;
        filter.$and.push({ category: catRegex });
      } else {
        filter.category = catRegex;
      }
    }

    // Lọc theo khoảng giá (hỗ trợ cả dailyRate và pricing.price_per_day)
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter = {};
      if (minPrice !== undefined && !Number.isNaN(Number(minPrice))) {
        priceFilter.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && !Number.isNaN(Number(maxPrice))) {
        priceFilter.$lte = Number(maxPrice);
      }
      const priceCondition = {
        $or: [
          { dailyRate: priceFilter },
          { "pricing.price_per_day": priceFilter },
        ],
      };
      if (filter.$and) {
        filter.$and.push(priceCondition);
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, priceCondition];
        delete filter.$or;
      } else {
        filter.$and = [priceCondition];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    if (sortBy === "price_asc") {
      sortOption.dailyRate = 1;
      sortOption["pricing.price_per_day"] = 1;
    } else if (sortBy === "price_desc") {
      sortOption.dailyRate = -1;
      sortOption["pricing.price_per_day"] = -1;
    } else {
      sortOption[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    const [items, total] = await Promise.all([
      Equipment.find(filter)
        .populate("owner", "User_Id name email trust_score avatarUrl phone address kycStatus")
        .populate("owner_id", "User_Id name email trust_score avatarUrl phone address kycStatus")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Equipment.countDocuments(filter),
    ]);

    // Đồng bộ các trường dữ liệu cho frontend
    const normalizedEquipments = items.map((item) => ({
      ...item,
      dailyRate: item.dailyRate || item.pricing?.price_per_day || 0,
      depositAmount: item.depositAmount || item.pricing?.deposit_amount || 0,
      owner: item.owner || item.owner_id,
      owner_id: item.owner_id || item.owner,
    }));

    return {
      equipments: normalizedEquipments,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * UC_G03 & UC_R06: Xem chi tiết thiết bị, tiền cọc, thông tin Owner
   */
  async getEquipmentById(id) {
    if (!id || typeof id !== "string") {
      throw new AppError(400, "Equipment ID is required");
    }

    let equipment;
    try {
      equipment = await Equipment.findById(id)
        .populate("owner", "User_Id name email trust_score avatarUrl phone address kycStatus")
        .populate("owner_id", "User_Id name email trust_score avatarUrl phone address kycStatus")
        .lean();
    } catch {
      throw new AppError(400, "Invalid Equipment ID format");
    }

    if (!equipment) {
      throw new AppError(404, "Equipment not found");
    }

    equipment.dailyRate = equipment.dailyRate || equipment.pricing?.price_per_day || 0;
    equipment.depositAmount = equipment.depositAmount || equipment.pricing?.deposit_amount || 0;
    equipment.owner = equipment.owner || equipment.owner_id;
    equipment.owner_id = equipment.owner_id || equipment.owner;

    return equipment;
  }
}

module.exports = new EquipmentService();
