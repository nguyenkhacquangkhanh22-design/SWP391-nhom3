const mongoose = require("mongoose");

/**
 * LabMaintenanceWorkOrder Schema
 * Quản lý phiếu điều phối bảo dưỡng và hiệu chuẩn thiết bị trong buồng phòng sạch ISO Class 5
 */
const labMaintenanceWorkOrderSchema = new mongoose.Schema(
  {
    work_order_code: {
      type: String,
      required: true,
      unique: true,
      default: () => "LAB-WO-" + Math.floor(100000 + Math.random() * 900000),
    },
    equipment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
      index: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assigned_technician_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    technician_name: {
      type: String,
      default: "Kỹ sư quang học cao cấp SmartEquip",
    },
    equipment_name: {
      type: String,
      required: true,
      trim: true,
    },
    serial_number: {
      type: String,
      default: "",
    },
    service_type: {
      type: String,
      enum: [
        "iso5_sensor_decontamination", // Vệ sinh cảm biến buồng sạch vô trùng ISO 5
        "flange_focal_shimming",        // Cân chỉnh khoảng cách ngàm & FFD (Flange Focal Depth)
        "ultrasonic_lens_cleaning",     // Tẩy rửa sóng siêu âm cụm thấu kính
        "shutter_mechanism_overhaul",   // Đại tu cụm màn trập cơ học
        "firmware_board_calibration",   // Hiệu chuẩn vi mạch và nạp firmware chống brick
        "periodic_full_service",        // Bảo dưỡng toàn diện 36 bước
      ],
      default: "iso5_sensor_decontamination",
      index: true,
    },
    kanban_status: {
      type: String,
      enum: [
        "intake_inspection",          // 1. Tiếp nhận & Chẩn đoán sơ bộ
        "ultrasonic_cleaning",        // 2. Làm sạch sóng siêu âm & Thổi khí ion
        "iso_cleanroom_service",      // 3. Xử lý trong phòng sạch ISO 5
        "flange_depth_shimming",      // 4. Cân chỉnh quang sai & Ngàm FFD
        "quality_certified_ready",    // 5. Hoàn tất & Cấp chứng thư xuất xưởng
      ],
      default: "intake_inspection",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "emergency_urgent"],
      default: "normal",
      index: true,
    },
    // Tiêu chuẩn môi trường phòng sạch tại thời điểm thực hiện
    cleanroom_environment: {
      cleanroom_class: { type: String, default: "ISO Class 5 (Fed Std 209E Class 100)" },
      particle_count_per_m3: { type: Number, default: 2850 }, // Chuẩn ISO 5: <= 3520 hạt 0.5µm/m³
      temperature_celsius: { type: Number, default: 21.5 },
      relative_humidity_percent: { type: Number, default: 45 },
      laminar_flow_velocity_mps: { type: Number, default: 0.45 },
    },
    // Danh mục kiểm tra 12 bước quy chuẩn ISO
    iso_checklist: [
      {
        step_number: { type: Number, required: true },
        title: { type: String, required: true },
        passed: { type: Boolean, default: false },
        notes: { type: String, default: "" },
      },
    ],
    // Đo lường trước và sau khi bảo dưỡng
    metrics_log: {
      initial_sensor_dust_spots: { type: Number, default: 18 },
      final_sensor_dust_spots: { type: Number, default: 0 },
      flange_focal_error_microns: { type: Number, default: 4.5 },
      corrected_flange_error_microns: { type: Number, default: 0.2 },
      collimator_sharpness_score: { type: Number, default: 98 },
    },
    parts_replaced: [
      {
        part_name: { type: String, required: true },
        cost: { type: Number, default: 0 },
        serial: { type: String, default: "" },
      },
    ],
    total_service_cost: {
      type: Number,
      default: 500000,
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    completed_at: {
      type: Date,
    },
    quality_certificate_qr: {
      type: String,
      default: () => "ISO5-CERT-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
    },
    technician_final_verdict: {
      type: String,
      default: "Thiết bị đạt 100% tiêu chuẩn xuất xưởng, độ sạch cảm biến tuyệt đối chuẩn rạp chiếu phim.",
    },
  },
  {
    timestamps: true,
  }
);

labMaintenanceWorkOrderSchema.index({ kanban_status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model("LabMaintenanceWorkOrder", labMaintenanceWorkOrderSchema);
