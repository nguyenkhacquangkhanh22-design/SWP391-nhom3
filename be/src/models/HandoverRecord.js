const mongoose = require("mongoose");

const handoverRecordSchema = new mongoose.Schema(
  {
    contract_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalContract",
      required: true,
      index: true,
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
    renter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    record_type: {
      type: String,
      enum: ["handover", "return"], // UC_O08: bàn giao; UC_O09: kiểm tra trả
      required: true,
      index: true,
    },
    record_date: {
      type: Date,
      default: Date.now,
    },
    accessories_checklist: [
      {
        item: { type: String, required: true },
        checked: { type: Boolean, default: true },
        notes: { type: String, default: "" },
      },
    ],
    physical_condition: {
      type: String,
      required: true,
    },
    working_status: {
      type: String,
      default: "Hoạt động bình thường",
    },
    evidence_photos: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: "",
    },
    // Dành cho biên bản kiểm tra trả thiết bị (UC_O09)
    missing_items: {
      type: [String],
      default: [],
    },
    damage_detected: {
      type: String,
      default: "",
    },
    estimated_damage_cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    owner_confirmed: {
      type: Boolean,
      default: true,
    },
    renter_confirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "handover_records",
  }
);

module.exports = mongoose.model("HandoverRecord", handoverRecordSchema);
