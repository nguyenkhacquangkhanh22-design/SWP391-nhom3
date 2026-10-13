const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    ticket_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    user_role: {
      type: String,
      default: "owner",
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Kỹ thuật hệ thống",
        "Quyết toán & Tiền cọc",
        "Hợp đồng & Pháp lý",
        "Xác minh danh tính",
        "Khác",
      ],
      default: "Kỹ thuật hệ thống",
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    related_record_id: {
      type: mongoose.Schema.Types.ObjectId,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    replies: [
      {
        sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        sender_name: { type: String, required: true },
        sender_role: { type: String, required: true },
        message: { type: String, required: true },
        created_at: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    collection: "support_tickets",
  }
);

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
