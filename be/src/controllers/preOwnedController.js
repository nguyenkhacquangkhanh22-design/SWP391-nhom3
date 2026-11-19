const PreOwnedListing = require("../models/PreOwnedListing");
const {
  CAMERA_BASE_VALUATION_DATABASE,
  calculateTradeInQuote,
} = require("../utils/tradeInValuationEngine");

/**
 * Lấy danh sách thiết bị máy cũ thanh lý đã qua kiểm định
 */
exports.getListings = async (req, res, next) => {
  try {
    const {
      category,
      brand,
      condition_grade,
      min_price,
      max_price,
      search,
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const query = { status: "available" };

    if (category) query.category = category;
    if (brand) query.brand = new RegExp(brand, "i");
    if (condition_grade) query.condition_grade = condition_grade;

    if (min_price || max_price) {
      query.listing_price = {};
      if (min_price) query.listing_price.$gte = Number(min_price);
      if (max_price) query.listing_price.$lte = Number(max_price);
    }

    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { model: new RegExp(search, "i") },
        { brand: new RegExp(search, "i") },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { listing_price: 1 };
    else if (sort === "price_desc") sortOption = { listing_price: -1 };
    else if (sort === "shutter_asc") sortOption = { shutter_count: 1 };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await PreOwnedListing.countDocuments(query);
    let items = await PreOwnedListing.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate("seller_id", "full_name email phone");

    // Nếu chưa có thiết bị máy cũ nào trong DB, tự động seed danh sách thiết bị mẫu
    if (items.length === 0 && total === 0) {
      items = await seedInitialPreOwnedListings();
    }

    return res.json({
      success: true,
      total: total || items.length,
      page: parseInt(page, 10),
      totalPages: Math.ceil((total || items.length) / parseInt(limit, 10)) || 1,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy chi tiết một thiết bị thanh lý
 */
exports.getListingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await PreOwnedListing.findById(id).populate("seller_id", "full_name email phone");
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị thanh lý" });
    }

    item.views_count = (item.views_count || 0) + 1;
    await item.save();

    return res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Đăng bán thiết bị thanh lý mới
 */
exports.createListing = async (req, res, next) => {
  try {
    const sellerId = req.user ? req.user.id : req.body.seller_id;
    if (!sellerId) {
      return res.status(401).json({ message: "Yêu cầu đăng nhập để đăng bán máy" });
    }

    const listing = new PreOwnedListing({
      seller_id: sellerId,
      ...req.body,
    });

    await listing.save();

    return res.status(201).json({
      success: true,
      message: "Đăng bán máy cũ thành công",
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Công cụ định giá máy cũ tự động (Trade-In Valuation Calculator)
 */
exports.calculateValuation = async (req, res, next) => {
  try {
    const {
      cameraKey,
      customOriginalPriceVnd,
      yearsUsed,
      shutterCount,
      conditionGrade,
      sensorCondition,
    } = req.body;

    const quote = calculateTradeInQuote({
      cameraKey,
      customOriginalPriceVnd: customOriginalPriceVnd ? Number(customOriginalPriceVnd) : undefined,
      yearsUsed: yearsUsed ? Number(yearsUsed) : 1,
      shutterCount: shutterCount ? Number(shutterCount) : 15000,
      conditionGrade: conditionGrade || "excellent_95",
      sensorCondition: sensorCondition || "flawless_clean",
    });

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy danh mục các dòng máy ảnh hỗ trợ định giá sẵn
 */
exports.getSupportedValuationModels = async (_req, res, next) => {
  try {
    return res.json({
      success: true,
      data: CAMERA_BASE_VALUATION_DATABASE,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper sinh danh sách thiết bị thanh lý mẫu nếu DB trống
 */
async function seedInitialPreOwnedListings() {
  const User = require("../models/User");
  const adminUser = await User.findOne({});
  const sellerId = adminUser ? adminUser._id : null;
  if (!sellerId) return [];

  const initialListings = [
    {
      seller_id: sellerId,
      title: "Sony Alpha A7 IV (Body) - Like New 99% 12k Shot",
      category: "Camera",
      brand: "Sony",
      model: "Alpha A7 IV",
      serial_number: "SN-SNY-883910",
      condition_grade: "like_new_99",
      shutter_count: 12450,
      max_rated_shutter: 200000,
      sensor_condition: "flawless_clean",
      original_price: 55000000,
      listing_price: 39500000,
      smart_equip_warranty_months: 6,
      accessories_included: ["Pin zin NP-FZ100", "Sạc đôi nhanh", "Dây đeo da xịn", "Nắp body", "Hộp trùng seri"],
      inspection_notes: "Cảm biến sạch 100%, không hạt bụi, ngoại quan hoàn hảo không vết trầy, cao su chắc nịch.",
      images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"],
      is_certified: true,
      status: "available",
    },
    {
      seller_id: sellerId,
      title: "Sony FX3 Cinema Line Full-Frame - 95% Tuyệt Đẹp",
      category: "Camera",
      brand: "Sony",
      model: "FX3",
      serial_number: "SN-FX3-991204",
      condition_grade: "excellent_95",
      shutter_count: 8200,
      max_rated_shutter: 300000,
      sensor_condition: "flawless_clean",
      original_price: 89000000,
      listing_price: 68000000,
      smart_equip_warranty_months: 6,
      accessories_included: ["XLR Top Handle zin", "2 Pin FZ100", "Lồng SmallRig Full Cage"],
      inspection_notes: "Quạt tản nhiệt êm ái, cổng HDMI Full-size chắc chắn, cảm biến sạch bong đạt chuẩn quay rạp.",
      images: ["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80"],
      is_certified: true,
      status: "available",
    },
    {
      seller_id: sellerId,
      title: "Canon EOS R5 (Body) - 8K RAW - 95% Hoàn Hảo",
      category: "Camera",
      brand: "Canon",
      model: "EOS R5",
      serial_number: "SN-CAN-440219",
      condition_grade: "excellent_95",
      shutter_count: 32000,
      max_rated_shutter: 500000,
      sensor_condition: "cleaned_certified",
      original_price: 79000000,
      listing_price: 49000000,
      smart_equip_warranty_months: 6,
      accessories_included: ["Pin LP-E6NH", "Sạc Canon LC-E6", "Thẻ CFexpress Type B 128GB"],
      inspection_notes: "Màn trập hoạt động mới 6.4% định mức tuổi thọ 500k shot, chống rung IBIS 8 stop cực mượt.",
      images: ["https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=800&auto=format&fit=crop&q=80"],
      is_certified: true,
      status: "available",
    },
    {
      seller_id: sellerId,
      title: "Sony FE 24-70mm f/2.8 GM II - Thấu Kính Trong Vắt",
      category: "Lens",
      brand: "Sony",
      model: "FE 24-70mm f/2.8 GM II",
      serial_number: "SN-LNS-771023",
      condition_grade: "like_new_99",
      shutter_count: 0,
      sensor_condition: "flawless_clean",
      lens_optics_condition: "pristine_no_dust",
      original_price: 49900000,
      listing_price: 39000000,
      smart_equip_warranty_months: 6,
      accessories_included: ["Hood zin chống lóa", "Túi nhung bảo vệ", "Filter B+W Nano 82mm"],
      inspection_notes: "Thấu kính phủ nano AR kháng chói hoàn hảo, MTF đạt 96/100 chuẩn Lab.",
      images: ["https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&auto=format&fit=crop&q=80"],
      is_certified: true,
      status: "available",
    },
  ];

  return await PreOwnedListing.insertMany(initialListings);
}
