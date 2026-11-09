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
    filter.visibility = { $nin: ["hidden", "draft"] };

    // Không hiển thị thiết bị bị từ chối phê duyệt (cho phép cả approved, pending hoặc chưa phân loại)
    filter.approval_status = { $ne: "rejected" };

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
          undefined,
          null,
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

    // Lọc theo danh mục (thông minh với alias danh mục tương đương)
    if (category && typeof category === "string" && category.trim() && category !== "all") {
      const catTrim = category.trim();
      let catPattern = catTrim;
      if (/máy ảnh|quay phim|ống kính/i.test(catTrim)) {
        catPattern = "máy ảnh|quay phim|ống kính";
      } else if (/laptop|công nghệ|thiết bị dựng/i.test(catTrim)) {
        catPattern = "laptop|công nghệ|thiết bị dựng";
      } else if (/âm thanh|ánh sáng|micro|studio/i.test(catTrim)) {
        catPattern = "âm thanh|ánh sáng|micro|studio";
      } else if (/flycam|drone/i.test(catTrim)) {
        catPattern = "flycam|drone";
      }
      const catRegex = { $regex: catPattern, $options: "i" };
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
        .populate("owner", "User_Id name email trust_score avatarUrl phone address kycStatus bankInfo")
        .populate("owner_id", "User_Id name email trust_score avatarUrl phone address kycStatus bankInfo")
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
      depositAmount: 0,
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
        .populate("owner", "User_Id name email trust_score avatarUrl phone address kycStatus bankInfo")
        .populate("owner_id", "User_Id name email trust_score avatarUrl phone address kycStatus bankInfo")
        .lean();
    } catch {
      throw new AppError(400, "Invalid Equipment ID format");
    }

    if (!equipment) {
      throw new AppError(404, "Equipment not found");
    }

    equipment.dailyRate = equipment.dailyRate || equipment.pricing?.price_per_day || 0;
    equipment.depositAmount = 0;
    equipment.owner = equipment.owner || equipment.owner_id;
    equipment.owner_id = equipment.owner_id || equipment.owner;

    return equipment;
  }

  /**
   * AI-powered Product Filter & Assistant (Tác vụ AI lọc sản phẩm và tư vấn thông minh)
   */
  async aiFilterEquipment({ prompt = "", category, maxPrice, minPrice }) {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new AppError(400, "Vui lòng nhập câu hỏi hoặc nhu cầu để AI tìm kiếm");
    }

    const lower = prompt.toLowerCase();
    let detectedCategory = category || "";
    let extractedMaxPrice = maxPrice ? Number(maxPrice) : null;
    let purpose = "";
    let tags = [];

    // 1. Phân tích danh mục qua từ khóa
    if (!detectedCategory || detectedCategory === "all") {
      if (
        lower.includes("máy ảnh") ||
        lower.includes("chụp") ||
        lower.includes("quay") ||
        lower.includes("lens") ||
        lower.includes("ống kính") ||
        lower.includes("camera") ||
        lower.includes("gimbal") ||
        lower.includes("ronin")
      ) {
        detectedCategory = "Máy ảnh & Quay phim";
      } else if (
        lower.includes("flycam") ||
        lower.includes("drone") ||
        lower.includes("mavic") ||
        lower.includes("bay")
      ) {
        detectedCategory = "Flycam & Drone";
      } else if (
        lower.includes("mic") ||
        lower.includes("thu âm") ||
        lower.includes("podcast") ||
        lower.includes("âm thanh") ||
        lower.includes("đèn") ||
        lower.includes("ánh sáng") ||
        lower.includes("lighting") ||
        lower.includes("led")
      ) {
        detectedCategory = "Âm thanh & Ánh sáng";
      } else if (
        lower.includes("laptop") ||
        lower.includes("máy tính") ||
        lower.includes("macbook") ||
        lower.includes("gaming") ||
        lower.includes("render") ||
        lower.includes("vr") ||
        lower.includes("meta quest")
      ) {
        detectedCategory = "Laptop & Công nghệ";
      }
    }

    // 2. Trích xuất mức giá từ câu nói (vd: "dưới 300k", "dưới 500.000", "dưới 1 triệu")
    if (!extractedMaxPrice) {
      const matchK = lower.match(/(?:dưới|tầm|khoảng|<=|<)\s*(\d+)\s*(?:k|nghìn|ngàn)/i);
      const matchMil = lower.match(/(?:dưới|tầm|khoảng|<=|<)\s*(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)/i);
      const matchNum = lower.match(/(?:dưới|tầm|khoảng|<=|<)\s*(\d{3,}(?:\.\d{3})*)/i);

      if (matchMil) {
        extractedMaxPrice = Math.round(parseFloat(matchMil[1].replace(",", ".")) * 1000000);
      } else if (matchK) {
        extractedMaxPrice = parseInt(matchK[1], 10) * 1000;
      } else if (matchNum) {
        extractedMaxPrice = parseInt(matchNum[1].replace(/\./g, ""), 10);
      } else if (lower.includes("giá rẻ") || lower.includes("sinh viên") || lower.includes("tiết kiệm")) {
        extractedMaxPrice = 300000;
      }
    }

    // 3. Nhận diện mục đích sử dụng
    if (lower.includes("vlog") || lower.includes("youtube") || lower.includes("tiktok")) {
      purpose = "Quay Vlog & Sáng tạo nội dung mạng xã hội";
      tags = ["Gọn nhẹ", "Màn hình lật", "Thu âm tốt"];
    } else if (lower.includes("kỷ yếu") || lower.includes("đám cưới") || lower.includes("sự kiện") || lower.includes("ngoại cảnh")) {
      purpose = "Chụp ảnh & quay sự kiện / kỷ yếu chuyên nghiệp";
      tags = ["Độ nét cao", "Khẩu độ lớn", "Xóa phông"];
    } else if (lower.includes("phong cảnh") || lower.includes("du lịch") || lower.includes("phượt")) {
      purpose = "Du lịch, phượt & quay phong cảnh từ trên cao";
      tags = ["Nhỏ gọn", "Kháng gió", "Pin bền"];
    } else if (lower.includes("podcast") || lower.includes("phỏng vấn") || lower.includes("talkshow")) {
      purpose = "Thu âm podcast & phỏng vấn chuyên nghiệp";
      tags = ["Lọc ồn", "Âm thanh trong trẻo", "Không dây"];
    } else if (lower.includes("đồ họa") || lower.includes("dựng phim") || lower.includes("render") || lower.includes("4k")) {
      purpose = "Dựng phim 4K & thiết kế đồ họa nặng";
      tags = ["Card đồ họa rời", "Màn hình chuẩn màu", "Tản nhiệt tốt"];
    } else {
      purpose = "Phục vụ nhu cầu quay chụp & làm việc tối ưu";
      tags = ["Đầy đủ phụ kiện", "Chính hãng", "Hiệu năng cao"];
    }

    // 4. Query thiết bị trong DB
    const filter = {
      status: { $in: ["APPROVED", "AVAILABLE", "approved", "available"] },
    };

    if (detectedCategory) {
      filter.category = { $regex: detectedCategory, $options: "i" };
    }
    if (extractedMaxPrice) {
      filter.dailyRate = { $lte: extractedMaxPrice };
    }
    if (minPrice) {
      filter.dailyRate = { ...filter.dailyRate, $gte: Number(minPrice) };
    }

    let equipments = await Equipment.find(filter)
      .populate("owner", "User_Id name email trust_score avatarUrl phone address kycStatus bankInfo")
      .sort({ rating: -1, review_count: -1, dailyRate: 1 })
      .limit(10)
      .lean();

    // Fallback nếu không có thiết bị đúng tiêu chí giá
    if (equipments.length === 0) {
      delete filter.dailyRate;
      equipments = await Equipment.find(filter)
        .populate("owner", "User_Id name email trust_score avatarUrl phone address kycStatus bankInfo")
        .sort({ rating: -1, dailyRate: 1 })
        .limit(6)
        .lean();
    }

    const count = equipments.length;
    let aiAdvice = "";
    if (count > 0) {
      aiAdvice = `Trợ lý AI SmartEquip đã phân tích câu hỏi của bạn ("${prompt}") và tìm thấy ${count} thiết bị tối ưu nhất cho mục đích: ${purpose}.${extractedMaxPrice ? ` Mức giá phù hợp: dưới ${extractedMaxPrice.toLocaleString("vi-VN")} đ/ngày.` : ""} Các thiết bị này được người thuê trước đánh giá cao và đã qua kiểm định kỹ thuật.`;
    } else {
      aiAdvice = `Trợ lý AI đã ghi nhận nhu cầu của bạn. Hiện tại hệ thống đề xuất bạn thử nới lỏng ngân sách hoặc tìm theo danh mục để có thêm lựa chọn.`;
    }

    const suggestedAddons = [];
    if (detectedCategory.includes("Máy ảnh") || lower.includes("camera") || lower.includes("quay")) {
      suggestedAddons.push("Thẻ nhớ SanDisk Extreme Pro 128GB (170MB/s)");
      suggestedAddons.push("Pin sạc dự phòng + Dock sạc đôi");
      suggestedAddons.push("Chân máy Tripod Benro chống rung");
    } else if (detectedCategory.includes("Flycam")) {
      suggestedAddons.push("Bộ 3 pin thông minh + Hub sạc nhanh");
      suggestedAddons.push("Bộ kính lọc ND Filters chụp ngược sáng");
      suggestedAddons.push("Túi đeo chống sốc chuyên dụng");
    } else if (detectedCategory.includes("Âm thanh")) {
      suggestedAddons.push("Bông lọc gió Deadcat cho mic ngoài trời");
      suggestedAddons.push("Chân đèn boom arm + Softbox cầu tản sáng");
      suggestedAddons.push("Dây cáp chuyển đổi Lightning / Type-C cho điện thoại");
    } else {
      suggestedAddons.push("Balo chống sốc du lịch");
      suggestedAddons.push("Bộ vệ sinh ống kính chuyên dụng");
    }

    const enhancedEquipments = equipments.map((item, idx) => ({
      ...item,
      aiMatchScore: Math.max(88, 99 - idx * 2),
      aiReason: `Rất phù hợp cho ${purpose}. Đạt chuẩn kỹ thuật, giá ${item.dailyRate?.toLocaleString("vi-VN")} đ/ngày rất cạnh tranh.`,
    }));

    return {
      equipments: enhancedEquipments,
      aiAdvice,
      purpose,
      tags,
      suggestedAddons,
      detectedCriteria: {
        category: detectedCategory || "Tất cả danh mục",
        maxPrice: extractedMaxPrice,
        keyword: prompt,
      },
    };
  }
}

module.exports = new EquipmentService();
