const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    rentalCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    rentalFee: {
      type: Number,
      required: true,
      min: 0,
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "pending",            // Vừa gửi yêu cầu thuê, chờ kiểm tra/xác nhận
        "contract_pending",   // Chờ người thuê ký hợp đồng điện tử
        "payment_pending",    // Chờ thanh toán tiền thuê & cọc
        "confirmed",          // Đã ký & thanh toán, chuẩn bị bàn giao
        "in_progress",        // Đang trong thời gian thuê
        "return_requested",   // Người thuê đã gửi yêu cầu trả máy (UC_R10)
        "completed",          // Đã kiểm tra trả máy & hoàn tất
        "cancelled",          // Đã hủy (UC_R13)
        "disputed",           // Đang có tranh chấp/khiếu nại (UC_R14)
      ],
      default: "contract_pending",
      index: true,
    },
    contract: {
      contractNumber: { type: String, trim: true },
      termsAccepted: { type: Boolean, default: false },
      signedAt: { type: Date },
      digitalSignature: { type: String, trim: true },
      contractUrl: { type: String, trim: true },
    },
    payment: {
      paymentStatus: {
        type: String,
        enum: ["unpaid", "paid", "refunded"],
        default: "unpaid",
      },
      paymentMethod: {
        type: String,
        enum: ["vnpay", "momo", "bank_transfer", "wallet"],
      },
      transactionId: { type: String, trim: true },
      paidAt: { type: Date },
      amountPaid: { type: Number, default: 0 },
    },
    returnRequest: {
      requestedAt: { type: Date },
      returnNotes: { type: String, trim: true },
      deviceConditionNote: { type: String, trim: true },
      returnImages: [{ type: String }],
    },
    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true },
      reviewedAt: { type: Date },
    },
    cancellation: {
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String, trim: true },
      cancelledAt: { type: Date },
    },
    dispute: {
      reason: { type: String, trim: true },
      evidenceImages: [{ type: String }],
      disputedAt: { type: Date },
      status: { type: String, enum: ["open", "investigating", "resolved"], default: "open" },
    },
    deliveryAddress: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "rentals",
  },
);

module.exports = mongoose.model("Rental", rentalSchema);
