const mongoose = require("mongoose");

const equipmentBlackoutSchema = new mongoose.Schema(
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
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      default: "Lịch bận chụp riêng của Chủ máy",
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

equipmentBlackoutSchema.index({ equipment_id: 1, start_date: 1, end_date: 1 });

module.exports = mongoose.model("EquipmentBlackout", equipmentBlackoutSchema);
