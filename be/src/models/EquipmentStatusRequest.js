const mongoose = require("mongoose");

const equipmentStatusRequestSchema = new mongoose.Schema(
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
    current_status: {
      type: String,
      required: true,
    },
    target_status: {
      type: String,
      enum: ["available", "maintenance", "retired", "damaged", "hidden"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    evidence_photos: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    moderator_note: {
      type: String,
      default: "",
    },
    reviewed_at: {
      type: Date,
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "equipment_status_requests",
  }
);

module.exports = mongoose.model(
  "EquipmentStatusRequest",
  equipmentStatusRequestSchema
);
