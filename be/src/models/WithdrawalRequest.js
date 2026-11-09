const mongoose = require("mongoose");

const withdrawalRequestSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1000,
    },
    bankInfoSnapshot: {
      bankName: { type: String, required: true, trim: true },
      accountNumber: { type: String, required: true, trim: true },
      accountHolderName: { type: String, required: true, trim: true },
      bankAccountId: { type: mongoose.Schema.Types.ObjectId },
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
      default: "",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);

