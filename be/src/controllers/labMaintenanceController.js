const LabMaintenanceWorkOrder = require("../models/LabMaintenanceWorkOrder");
const Equipment = require("../models/Equipment");
const User = require("../models/User");

// Mẫu 12 bước quy chuẩn kiểm tra phòng sạch ISO Class 5
const DEFAULT_ISO_STEPS = [
  { step_number: 1, title: "Kiểm tra ngoại quan thân vỏ và ống kính dưới đèn rọi cường độ cao 5000 lux", passed: true },
  { step_number: 2, title: "Đo đếm số hạt bụi cảm biến tại f/22 bằng bảng sáng đồng nhất chuẩn Imatest", passed: true },
  { step_number: 3, title: "Khử tĩnh điện bề mặt bằng súng ion hóa Ionizing Air Gun 30 PSI", passed: false },
  { step_number: 4, title: "Tẩy rửa siêu âm ngàm kim loại và vòng răng lấy nét (Ultrasonic Bath)", passed: false },
  { step_number: 5, title: "Đưa thiết bị vào buồng dòng chảy tầng Laminar Flow ISO Class 5", passed: false },
  { step_number: 6, title: "Vệ sinh ướt bề mặt kính bảo vệ cảm biến bằng dung dịch tinh khiết Eclipse E2", passed: false },
  { step_number: 7, title: "Lau khô bằng tăm lau cảm biến chuyên dụng vi sợi dệt không rơi bụi", passed: false },
  { step_number: 8, title: "Chụp ảnh macro kiểm tra 100% diện tích cảm biến dưới kính hiển vi quang học 50x", passed: false },
  { step_number: 9, title: "Đo khoảng cách buồng tối ngàm Flange Focal Distance bằng đồng hồ so Mitutoyo 0.001mm", passed: false },
  { step_number: 10, title: "Chêm lá đệm ngàm Shim Washer nếu sai số lệch trục vượt quá 2 micron", passed: false },
  { step_number: 11, title: "Hiệu chuẩn chống rung cảm biến IBIS 5 trục trên bàn rung đa tần", passed: false },
  { step_number: 12, title: "Kiểm định xuất xưởng, dán tem niêm phong chống bụi và cấp chứng thư ISO 5", passed: false },
];

/**
 * Lấy toàn bộ phiếu bảo dưỡng chia theo 5 cột bảng Kanban
 */
exports.getKanbanBoard = async (req, res, next) => {
  try {
    let orders = await LabMaintenanceWorkOrder.find({})
      .sort({ priority: -1, createdAt: -1 })
      .populate("equipment_id", "title brand model images")
      .populate("owner_id", "full_name email phone");

    if (orders.length === 0) {
      orders = await seedDefaultLabWorkOrders();
    }

    const kanban = {
      intake_inspection: [],
      ultrasonic_cleaning: [],
      iso_cleanroom_service: [],
      flange_depth_shimming: [],
      quality_certified_ready: [],
    };

    for (const order of orders) {
      const col = order.kanban_status || "intake_inspection";
      if (kanban[col]) {
        kanban[col].push(order);
      } else {
        kanban.intake_inspection.push(order);
      }
    }

    return res.json({
      success: true,
      data: kanban,
      totalCount: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy chi tiết một phiếu bảo dưỡng
 */
exports.getWorkOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await LabMaintenanceWorkOrder.findById(id)
      .populate("equipment_id")
      .populate("owner_id", "full_name email phone")
      .populate("assigned_technician_id", "full_name email");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy phiếu bảo dưỡng" });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tạo mới một phiếu bảo dưỡng phòng sạch
 */
exports.createWorkOrder = async (req, res, next) => {
  try {
    const {
      equipment_id,
      service_type,
      priority,
      technician_name,
      equipment_name,
      serial_number,
      total_service_cost,
    } = req.body;

    const equip = await Equipment.findById(equipment_id);
    const ownerId = equip ? equip.owner_id : req.user ? req.user.id : null;

    const newOrder = new LabMaintenanceWorkOrder({
      equipment_id,
      owner_id: ownerId,
      assigned_technician_id: req.user ? req.user.id : null,
      technician_name: technician_name || "Kỹ sư quang học SmartEquip Lab",
      equipment_name: equipment_name || (equip ? equip.title : "Thiết bị quay phim"),
      serial_number: serial_number || (equip && equip.serial_number ? equip.serial_number : "SN-" + Math.floor(100000 + Math.random() * 900000)),
      service_type: service_type || "iso5_sensor_decontamination",
      priority: priority || "normal",
      kanban_status: "intake_inspection",
      total_service_cost: total_service_cost || 450000,
      iso_checklist: JSON.parse(JSON.stringify(DEFAULT_ISO_STEPS)),
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      message: "Tạo phiếu bảo dưỡng phòng sạch thành công",
      data: newOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cập nhật cột trạng thái Kanban (Kéo thả thẻ bảo dưỡng)
 */
exports.updateKanbanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { next_status } = req.body;

    const validStatuses = [
      "intake_inspection",
      "ultrasonic_cleaning",
      "iso_cleanroom_service",
      "flange_depth_shimming",
      "quality_certified_ready",
    ];

    if (!validStatuses.includes(next_status)) {
      return res.status(400).json({ message: "Trạng thái cột Kanban không hợp lệ" });
    }

    const order = await LabMaintenanceWorkOrder.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy phiếu bảo dưỡng" });
    }

    order.kanban_status = next_status;
    if (next_status === "quality_certified_ready" && !order.completed_at) {
      order.completed_at = new Date();
      // Đánh dấu hoàn thành toàn bộ checklist
      if (order.iso_checklist && order.iso_checklist.length > 0) {
        order.iso_checklist.forEach((item) => {
          item.passed = true;
        });
      }
    }

    await order.save();

    return res.json({
      success: true,
      message: `Đã chuyển phiếu ${order.work_order_code} sang cột ${next_status}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cập nhật tiến độ từng bước kiểm tra trong checklist 12 bước ISO 5
 */
exports.updateChecklistStep = async (req, res, next) => {
  try {
    const { id, stepNumber } = req.params;
    const { passed, notes } = req.body;

    const order = await LabMaintenanceWorkOrder.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy phiếu" });
    }

    const step = order.iso_checklist.find((s) => s.step_number === parseInt(stepNumber, 10));
    if (!step) {
      return res.status(404).json({ message: "Không tìm thấy bước kiểm tra tương ứng" });
    }

    if (passed !== undefined) step.passed = Boolean(passed);
    if (notes !== undefined) step.notes = String(notes);

    await order.save();

    return res.json({
      success: true,
      message: `Cập nhật bước ${stepNumber} thành công`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Xuất Chứng chỉ kiểm định phòng sạch ISO 5 kỹ thuật số
 */
exports.generateQualityCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await LabMaintenanceWorkOrder.findById(id)
      .populate("equipment_id")
      .populate("owner_id", "full_name email");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy phiếu bảo dưỡng" });
    }

    const certificate = {
      certificate_id: order.quality_certificate_qr,
      work_order_code: order.work_order_code,
      issued_at: order.completed_at || order.updatedAt,
      equipment_name: order.equipment_name,
      serial_number: order.serial_number,
      cleanroom_class: order.cleanroom_environment.cleanroom_class,
      particle_count_achieved: `${order.cleanroom_environment.particle_count_per_m3} hạt 0.5µm/m³ (Chuẩn ISO 5: <= 3520)`,
      sensor_dust_before: order.metrics_log.initial_sensor_dust_spots,
      sensor_dust_after: order.metrics_log.final_sensor_dust_spots,
      flange_focal_error: `${order.metrics_log.corrected_flange_error_microns} µm`,
      sharpness_score: `${order.metrics_log.collimator_sharpness_score}/100`,
      technician: order.technician_name,
      verdict: order.technician_final_verdict,
      laboratory: "SmartEquip Cleanroom Metrology Lab - ISO 14644-1 Certified",
    };

    return res.json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Thống kê các chỉ số vận hành buồng phòng sạch Lab
 */
exports.getLabMetricsOverview = async (_req, res, next) => {
  try {
    const totalOrders = await LabMaintenanceWorkOrder.countDocuments();
    const completedOrders = await LabMaintenanceWorkOrder.countDocuments({ kanban_status: "quality_certified_ready" });
    const inProgressOrders = await LabMaintenanceWorkOrder.countDocuments({ kanban_status: { $ne: "quality_certified_ready" } });

    return res.json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        inProgressOrders,
        cleanroomStatus: "Optimal (ISO Class 5 Active)",
        currentParticleCount: "2,820 particles / m³",
        ambientTemperature: "21.4°C",
        relativeHumidity: "44.5%",
        hepaFilterEfficiency: "99.997% at 0.3 micron",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper sinh phiếu bảo dưỡng mẫu nếu hệ thống chưa có
 */
async function seedDefaultLabWorkOrders() {
  const adminUser = await User.findOne({});
  const equip = await Equipment.findOne({});
  if (!equip || !adminUser) return [];

  const sampleOrders = [
    {
      work_order_code: "LAB-WO-882103",
      equipment_id: equip._id,
      owner_id: equip.owner_id || adminUser._id,
      assigned_technician_id: adminUser._id,
      technician_name: "Kỹ sư Trần Đức Thắng (Chuyên viên Quang học)",
      equipment_name: "Sony FX6 Cinema Line (Ngàm Sony E)",
      serial_number: "FX6-VN-908124",
      service_type: "iso5_sensor_decontamination",
      kanban_status: "iso_cleanroom_service",
      priority: "high",
      cleanroom_environment: {
        cleanroom_class: "ISO Class 5 (Fed Std 209E Class 100)",
        particle_count_per_m3: 2750,
        temperature_celsius: 21.2,
        relativeHumidity_percent: 44,
        laminar_flow_velocity_mps: 0.46,
      },
      iso_checklist: JSON.parse(JSON.stringify(DEFAULT_ISO_STEPS)),
      metrics_log: {
        initial_sensor_dust_spots: 14,
        final_sensor_dust_spots: 0,
        flange_focal_error_microns: 3.8,
        corrected_flange_error_microns: 0.2,
        collimator_sharpness_score: 99,
      },
      total_service_cost: 650000,
    },
    {
      work_order_code: "LAB-WO-771904",
      equipment_id: equip._id,
      owner_id: equip.owner_id || adminUser._id,
      assigned_technician_id: adminUser._id,
      technician_name: "Kỹ sư Lê Hoàng Nam (Cân chỉnh Flange & Ngàm)",
      equipment_name: "Sony FE 50mm f/1.2 GM Thấu Kính Khẩu Lớn",
      serial_number: "SEL50F12-7721",
      service_type: "flange_focal_shimming",
      kanban_status: "flange_depth_shimming",
      priority: "emergency_urgent",
      iso_checklist: JSON.parse(JSON.stringify(DEFAULT_ISO_STEPS)),
      total_service_cost: 850000,
    },
    {
      work_order_code: "LAB-WO-552011",
      equipment_id: equip._id,
      owner_id: equip.owner_id || adminUser._id,
      assigned_technician_id: adminUser._id,
      technician_name: "Kỹ sư Trần Đức Thắng",
      equipment_name: "Canon EOS R5 Thân Máy 8K RAW",
      serial_number: "R5-BODY-3341",
      service_type: "periodic_full_service",
      kanban_status: "quality_certified_ready",
      completed_at: new Date(),
      priority: "normal",
      iso_checklist: JSON.parse(JSON.stringify(DEFAULT_ISO_STEPS)).map((s) => ({ ...s, passed: true })),
      total_service_cost: 750000,
    },
    {
      work_order_code: "LAB-WO-441098",
      equipment_id: equip._id,
      owner_id: equip.owner_id || adminUser._id,
      assigned_technician_id: adminUser._id,
      technician_name: "Kỹ sư Hoàng Minh Tuấn",
      equipment_name: "RED V-Raptor 8K VV Cinema Camera",
      serial_number: "RED-VRAP-1029",
      service_type: "ultrasonic_lens_cleaning",
      kanban_status: "ultrasonic_cleaning",
      priority: "high",
      iso_checklist: JSON.parse(JSON.stringify(DEFAULT_ISO_STEPS)),
      total_service_cost: 1200000,
    },
  ];

  return await LabMaintenanceWorkOrder.insertMany(sampleOrders);
}
