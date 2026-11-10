const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      trim: true,
    },
    ticket_code: {
      type: String,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    user_role: {
      type: String,
      default: "user",
    },
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
    },
    contract_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalContract",
      index: true,
    },
    related_record_id: {
      type: mongoose.Schema.Types.ObjectId,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "general",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "medium", "high", "urgent"],
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

supportTicketSchema.pre("save", function (next) {
  if (this.ticketCode && !this.ticket_code) {
    this.ticket_code = this.ticketCode;
  } else if (this.ticket_code && !this.ticketCode) {
    this.ticketCode = this.ticket_code;
  }

  if (this.user && !this.user_id) {
    this.user_id = this.user;
  } else if (this.user_id && !this.user) {
    this.user = this.user_id;
  }

  if (this.rental && !this.related_record_id) {
    this.related_record_id = this.rental;
  } else if (this.related_record_id && !this.rental) {
    this.rental = this.related_record_id;
  }

  next();
});

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
