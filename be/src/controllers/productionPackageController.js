const ProductionProjectPackage = require("../models/ProductionProjectPackage");
const Equipment = require("../models/Equipment");
const {
  CINEMA_POWER_DRAW_TABLE,
  calculateBatteryRuntimeHours,
  estimateBatteriesNeeded,
  generatePowerStrategy,
} = require("../utils/productionPowerBudgetEngine");

/**
 * Tạo mới một gói thuê dự án đoàn phim
 */
exports.createPackage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : req.body.creator_id;
    if (!userId) {
      return res.status(401).json({ message: "Yêu cầu đăng nhập để tạo gói dự án" });
    }

    const {
      project_title,
      production_type,
      client_name,
      director_of_photography,
      start_date,
      end_date,
      shooting_days,
      daily_shooting_hours,
      departments,
      logistics,
    } = req.body;

    const newPkg = new ProductionProjectPackage({
      creator_id: userId,
      project_title: project_title || "Dự án quay phim mới",
      production_type: production_type || "commercial_tvc",
      client_name: client_name || "Đoàn sản xuất",
      director_of_photography: director_of_photography || "",
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : new Date(Date.now() + 86400000),
      shooting_days: parseInt(shooting_days, 10) || 1,
      daily_shooting_hours: parseInt(daily_shooting_hours, 10) || 12,
      departments: departments || {
        camera_a: [],
        camera_b: [],
        lighting: [],
        sound: [],
        grip_stabilizer: [],
      },
      logistics: logistics || {},
    });

    newPkg.calculateTotals();
    await newPkg.save();

    return res.status(201).json({
      success: true,
      message: "Tạo gói dự án đoàn phim thành công",
      data: newPkg,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy danh sách gói dự án của người dùng hiện tại
 */
exports.getMyPackages = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : req.query.userId;
    const packages = await ProductionProjectPackage.find({ creator_id: userId })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: packages.length,
      data: packages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy chi tiết gói dự án theo ID
 */
exports.getPackageById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pkg = await ProductionProjectPackage.findById(id)
      .populate("creator_id", "full_name email phone");

    if (!pkg) {
      return res.status(404).json({ message: "Không tìm thấy gói dự án" });
    }

    return res.json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cập nhật gói dự án
 */
exports.updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pkg = await ProductionProjectPackage.findById(id);

    if (!pkg) {
      return res.status(404).json({ message: "Không tìm thấy gói dự án" });
    }

    const fields = [
      "project_title",
      "production_type",
      "client_name",
      "director_of_photography",
      "start_date",
      "end_date",
      "shooting_days",
      "daily_shooting_hours",
      "departments",
      "logistics",
      "status",
    ];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        pkg[f] = req.body[f];
      }
    }

    pkg.calculateTotals();
    await pkg.save();

    return res.json({
      success: true,
      message: "Cập nhật gói dự án thành công",
      data: pkg,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Giả lập và tính toán công suất pin trường quay trực tiếp (Battery Simulator Tool)
 */
exports.calculatePowerBudgetSimulator = async (req, res, next) => {
  try {
    const {
      cameraRigWatts = 55,
      lightingWatts = 600,
      audioWatts = 15,
      shootingHours = 12,
      batteryType = 150, // Wh
    } = req.body;

    const totalWatts = parseFloat(cameraRigWatts) + parseFloat(lightingWatts) + parseFloat(audioWatts);
    const hours = parseFloat(shootingHours) || 12;
    const batWh = parseFloat(batteryType) || 150;

    const singleBatteryRuntime = calculateBatteryRuntimeHours(batWh, cameraRigWatts);
    const batteriesNeeded = estimateBatteriesNeeded(cameraRigWatts, hours, batWh);
    const powerStrategy = generatePowerStrategy({
      totalWatts,
      shootingHours: hours,
      hasHighWattLighting: lightingWatts >= 1000,
    });

    return res.json({
      success: true,
      data: {
        totalWatts,
        singleBatteryRuntimeHours: singleBatteryRuntime,
        recommendedBatteryCount: batteriesNeeded,
        powerStrategy,
        powerPresets: CINEMA_POWER_DRAW_TABLE,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy các mẫu gói dự án quay phim chuyên nghiệp dựng sẵn (Templates)
 */
exports.getSampleTemplates = async (_req, res, next) => {
  try {
    const templates = [
      {
        template_id: "commercial_tvc_standard",
        title: "Gói Quay TVC Quảng Cáo / Music Video Chuẩn (Sony FX6 + FX3 Dual-Cam)",
        description: "Bộ đôi máy quay FX6 làm A-Cam & FX3 làm B-Cam Gimbal, hệ thống đèn Aputure 600d + 300c và âm thanh Sound Devices.",
        estimated_daily_price: 6500000,
        departments: {
          camera_a: [
            { item_name: "Sony FX6 Cinema Line Body", quantity: 1, daily_price: 1800000, power_draw_watts: 20 },
            { item_name: "Sony FE 24-70mm f/2.8 GM II", quantity: 1, daily_price: 500000, power_draw_watts: 0 },
            { item_name: "SmallHD Cine 7 Touchscreen Monitor", quantity: 1, daily_price: 450000, power_draw_watts: 15 },
          ],
          camera_b: [
            { item_name: "Sony FX3 Cinema Line Body", quantity: 1, daily_price: 1200000, power_draw_watts: 10 },
            { item_name: "Sony FE 50mm f/1.2 GM", quantity: 1, daily_price: 450000, power_draw_watts: 0 },
          ],
          lighting: [
            { item_name: "Aputure LS 600d Pro LED Light Storm", quantity: 1, daily_price: 900000, power_draw_watts: 720 },
            { item_name: "Aputure 300c RGB Color LED", quantity: 1, daily_price: 600000, power_draw_watts: 360 },
            { item_name: "Bộ 3 chân đèn C-Stand Kupo Master High", quantity: 1, daily_price: 250000, power_draw_watts: 0 },
          ],
          sound: [
            { item_name: "Sound Devices 833 8-Channel Field Recorder", quantity: 1, daily_price: 900000, power_draw_watts: 18 },
            { item_name: "Sennheiser MKH 416 Shotgun Mic & Boom Pole", quantity: 1, daily_price: 350000, power_draw_watts: 0 },
          ],
          grip_stabilizer: [
            { item_name: "DJI RS 3 Pro Gimbal Combo", quantity: 1, daily_price: 450000, power_draw_watts: 15 },
          ],
        },
      },
      {
        template_id: "indie_feature_film",
        title: "Gói Điện Ảnh Độc Lập / Phim Ngắn (ARRI / RED Large Format)",
        description: "Dành cho các đoàn phim điện ảnh yêu cầu dải màu sâu 16-bit RAW, dàn thấu kính Cine Prime PL Mount và kiểm soát ánh sáng mạnh.",
        estimated_daily_price: 12500000,
        departments: {
          camera_a: [
            { item_name: "RED V-Raptor 8K VV Cinema Body", quantity: 1, daily_price: 4500000, power_draw_watts: 60 },
            { item_name: "Bộ 3 ống kính DZOFilm Vespid Prime PL Mount (25, 50, 85mm)", quantity: 1, daily_price: 1800000, power_draw_watts: 0 },
            { item_name: "Teradek Bolt 6 750 Wireless Video Transmitter", quantity: 1, daily_price: 1200000, power_draw_watts: 11 },
          ],
          camera_b: [],
          lighting: [
            { item_name: "Aputure LS 1200d Pro Cinema LED", quantity: 1, daily_price: 1800000, power_draw_watts: 1200 },
            { item_name: "Aputure LS 600c Pro Full Color", quantity: 1, daily_price: 1100000, power_draw_watts: 720 },
          ],
          sound: [
            { item_name: "Zoom F8n Pro 32-bit Float Audio Recorder", quantity: 1, daily_price: 600000, power_draw_watts: 12 },
          ],
          grip_stabilizer: [
            { item_name: "Sachtler Video 18 S2 Carbon Fiber Heavy-Duty Tripod", quantity: 1, daily_price: 700000, power_draw_watts: 0 },
          ],
        },
      },
    ];

    return res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};
