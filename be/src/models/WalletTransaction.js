const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    transactionCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "RENTAL_INCOME",     // Tiền nhận từ đơn thuê thiết bị
        "PLATFORM_FEE",     // Phí hoa hồng sàn nền tảng
        "WITHDRAWAL",       // Tiền rút về tài khoản ngân hàng
        "REFUND",           // Tiền hoàn trả khách hoặc bồi thường
        "WITHDRAWAL_REFUND" // Hoàn lại tiền ví do lệnh rút bị Admin từ chối
      ],
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ["IN", "OUT"], // IN: Tiền vào (+), OUT: Tiền ra (-)
      required: true,
      default: "IN",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceBefore: {
      type: Number,
      required: true,
      default: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      default: 0,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    referenceModel: {
      type: String,
      enum: ["Rental", "WithdrawalRequest", "Settlement", "Other"],
      default: "Other",
    },
    referenceCode: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "PENDING", "FAILED", "REJECTED"],
      default: "SUCCESS",
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

walletTransactionSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
