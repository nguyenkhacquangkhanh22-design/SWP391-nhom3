const mongoose = require("mongoose");

const equipmentMaintenanceLogSchema = new mongoose.Schema(
  {
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    equipmentName: {
      type: String,
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    maintenanceType: {
      type: String,
      enum: ["sensor_cleaning", "desiccant_bake", "firmware_update", "flange_inspect", "shutter_check"],
      default: "sensor_cleaning",
    },
    servicedBy: {
      type: String,
      default: "Chủ máy tự bảo dưỡng định kỳ",
    },
    rentalsSinceLastService: {
      type: Number,
      default: 0,
    },
    cost: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "Vệ sinh cảm biến bằng tăm bông chuyên dụng, kiểm tra độ ẩm tủ chống ẩm < 45%",
    },
    servicedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EquipmentMaintenanceLog", equipmentMaintenanceLogSchema);
