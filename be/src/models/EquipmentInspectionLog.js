const mongoose = require("mongoose");

const scratchPointSchema = new mongoose.Schema(
  {
    part: {
      type: String,
      enum: ["lens_front", "lens_rear", "sensor", "body_top", "body_bottom", "screen", "grip"],
      required: true,
    },
    part_label: {
      type: String,
      default: "",
    },
    severity: {
      type: String,
      enum: ["none", "light_scratch", "deep_scratch", "dent", "broken"],
      default: "none",
    },
    description: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const equipmentInspectionLogSchema = new mongoose.Schema(
  {
    rental_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    equipment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      index: true,
    },
    inspection_type: {
      type: String,
      enum: ["handover", "return"],
      default: "return",
    },
    overall_condition: {
      type: String,
      enum: ["flawless", "acceptable", "damaged", "disputed"],
      default: "flawless",
    },
    sensor_clean: {
      type: Boolean,
      default: true,
    },
    lens_clean: {
      type: Boolean,
      default: true,
    },
    shutter_working: {
      type: Boolean,
      default: true,
    },
    scratches: [scratchPointSchema],
    photo_evidences: [
      {
        type: String,
      },
    ],
    deposit_action: {
      type: String,
      enum: ["full_refund", "partial_deduction", "hold_dispute"],
      default: "full_refund",
    },
    deduction_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    inspection_notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

equipmentInspectionLogSchema.index({ rental_id: 1, owner_id: 1 });

module.exports = mongoose.model("EquipmentInspectionLog", equipmentInspectionLogSchema);
