const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
  {
    settlement_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    contract_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalContract",
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
    total_rental_fee: {
      type: Number,
      required: true,
      min: 0,
    },
    overtime_fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    damage_deduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    deduction_reason: {
      type: String,
      default: "",
    },
    deposit_paid: {
      type: Number,
      required: true,
      min: 0,
    },
    deposit_refund_to_renter: {
      type: Number,
      required: true,
      min: 0,
    },
    platform_fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    owner_payout_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    owner_confirmed: {
      type: Boolean,
      default: false,
    },
    owner_confirmed_at: {
      type: Date,
    },
    payout_status: {
      type: String,
      enum: [
        "pending_owner_confirmation", // Chờ Owner xác nhận số liệu
        "pending_moderator_approval", // Chờ Quản lý web duyệt giải ngân
        "confirmed",                  // Owner đã xác nhận
        "processing",                 // Đang xử lý chuyển khoản
        "paid",                       // Đã giải ngân thành công
        "rejected",                   // Bị từ chối / cần sửa thông tin
      ],
      default: "pending_owner_confirmation",
      index: true,
    },
    requested_at: {
      type: Date,
    },
    request_note: {
      type: String,
      default: "",
    },
    qr_code_url: {
      type: String,
      default: "",
    },
    paid_at: {
      type: Date,
    },
    bank_info: {
      bank_name: { type: String, default: "" },
      bank_code: { type: String, default: "" },
      account_number: { type: String, default: "" },
      account_holder: { type: String, default: "" },
    },
    moderator_review: {
      moderator_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewed_at: { type: Date },
      note: { type: String, default: "" },
      transaction_code: { type: String, default: "" },
      receipt_image: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
    collection: "settlements",
  }
);

module.exports = mongoose.model("Settlement", settlementSchema);
