const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor_name: {
      type: String,
      required: true,
      trim: true,
    },
    actor_email: {
      type: String,
      required: true,
      trim: true,
    },
    actor_role: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    target_type: {
      type: String,
      required: true,
      enum: ["Equipment", "Dispute", "User", "SupportTicket", "OwnerApplication", "Settlement", "System"],
      index: true,
    },
    target_id: {
      type: String,
      default: "",
      index: true,
    },
    target_label: {
      type: String,
      default: "",
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip_address: {
      type: String,
      default: "",
    },
    user_agent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "audit_logs",
  }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
