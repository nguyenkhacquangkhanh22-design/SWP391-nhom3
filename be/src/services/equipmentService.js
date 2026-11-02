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

    // Mặc định hiển thị thiết bị có trạng thái APPROVED hoặc AVAILABLE
    if (status && typeof status === "string" && status.trim() && status !== "all") {
      filter.status = status.trim().toUpperCase();
    } else {
      filter.status = { $in: ["APPROVED", "AVAILABLE"] };
    }

    // Tìm kiếm theo từ khóa
    if (keyword && typeof keyword === "string" && keyword.trim()) {
      const trimmed = keyword.trim();
      filter.$or = [
        { title: { $regex: trimmed, $options: "i" } },
        { description: { $regex: trimmed, $options: "i" } },
        { brand: { $regex: trimmed, $options: "i" } },
      ];
    }

    // Lọc theo danh mục
    if (category && typeof category === "string" && category.trim() && category !== "all") {
      filter.category = { $regex: `^${category.trim()}$`, $options: "i" };
    }

    // Lọc theo khoảng giá
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.dailyRate = {};
      if (minPrice !== undefined && !Number.isNaN(Number(minPrice))) {
        filter.dailyRate.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && !Number.isNaN(Number(maxPrice))) {
        filter.dailyRate.$lte = Number(maxPrice);
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    sortOption[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [items, total] = await Promise.all([
      Equipment.find(filter)
        .populate("owner", "User_Id name email trust_score avatarUrl phone address kycStatus")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Equipment.countDocuments(filter),
    ]);

    return {
      equipments: items,
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
        .lean();
    } catch {
      throw new AppError(400, "Invalid Equipment ID format");
    }

    if (!equipment) {
      throw new AppError(404, "Equipment not found");
    }

    return equipment;
  }
}

module.exports = new EquipmentService();
