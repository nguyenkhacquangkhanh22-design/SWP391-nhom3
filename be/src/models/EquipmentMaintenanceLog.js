const mongoose = require("mongoose");

const equipmentMaintenanceLogSchema = new mongoose.Schema(
  {
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
    maintenance_type: {
      type: String,
      enum: [
        "sensor_cleaning",       // Vệ sinh cảm biến sensor chống bụi/laser
        "shutter_replacement",   // Thay thế cụm màn trập khi hết số shot
        "lens_calibration",     // Căn chỉnh quang học thấu kính & lấy nét AF
        "firmware_update",      // Cập nhật phần mềm hệ thống chống lỗi
        "periodic_inspection",  // Kiểm tra ngoại quan định kỳ 3 tháng
      ],
      default: "periodic_inspection",
      index: true,
    },
    current_shutter_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_rated_shutter: {
      type: Number,
      default: 200000, // Định mức chuẩn màn trập (150k - 500k shots)
      min: 1000,
    },
    service_center: {
      type: String,
      default: "Trung tâm dịch vụ kỹ thuật SmartEquip",
      trim: true,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    scheduled_date: {
      type: Date,
      default: Date.now,
    },
    completed_date: {
      type: Date,
    },
    next_due_date: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    technician_notes: {
      type: String,
      default: "",
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "equipment_maintenance_logs",
  }
);

module.exports = mongoose.model(
  "EquipmentMaintenanceLog",
  equipmentMaintenanceLogSchema
);
