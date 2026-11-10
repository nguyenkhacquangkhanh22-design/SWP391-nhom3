const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    rental_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    message_type: {
      type: String,
      enum: ["text", "contract", "image"],
      default: "text",
    },
    file_url: {
      type: String,
      trim: true,
      default: "",
    },
    contract_data: {
      contract_number: { type: String, trim: true },
      rental_code: { type: String, trim: true },
      equipment_title: { type: String, trim: true },
      rental_id: { type: mongoose.Schema.Types.ObjectId, ref: "Rental" },
      total_amount: { type: Number, default: 0 },
      status: { type: String, trim: true },
      is_signed: { type: Boolean, default: false },
    },
    is_read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "chat_messages",
  }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);

