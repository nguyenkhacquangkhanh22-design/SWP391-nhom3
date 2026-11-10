const mongoose = require("mongoose");

const rentalContractSchema = new mongoose.Schema(
  {
    contract_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalRequest",
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
    title: {
      type: String,
      required: true,
    },
    terms_content: {
      type: String,
      required: true,
    },
    rental_price: {
      type: Number,
      required: true,
      min: 0,
    },
    deposit_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    delivery_address: {
      type: String,
      default: "",
    },
    delivery_time: {
      type: String,
      default: "09:00",
    },
    return_time: {
      type: String,
      default: "17:00",
    },
    delivery_method: {
      type: String,
      default: "motorcycle",
    },
    return_method: {
      type: String,
      default: "motorcycle",
    },
    shipping_fee: {
      type: Number,
      default: 0,
    },
    receipt_image: {
      type: String,
      default: "",
    },
    payment_method: {
      type: String,
      enum: ["vietqr", "bank_transfer", "vnpay", "cash", "wallet"],
      default: "vietqr",
    },
    payment_confirmed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    payment_rejection_reason: { type: String, default: "" },
    payment_status: {
      type: String,
      enum: ["unpaid", "pending_confirmation", "paid", "rejected", "refunded"],
      default: "unpaid",
    },
    payment_amount: {
      type: Number,
      default: 0,
    },
    paid_at: {
      type: Date,
    },
    special_conditions: {
      type: String,
      default: "",
    },
    version: {
      type: Number,
      default: 1,
    },
    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContractTemplate",
    },
    template_version: {
      type: Number,
    },
    version_history: [
      {
        version: { type: Number, required: true },
        edited_at: { type: Date, default: Date.now },
        changes_summary: { type: String, default: "" },
        terms_content: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      enum: [
        "draft",                 // Owner mới tạo nháp
        "pending_approval",      // Owner gửi Hợp đồng cho Quản lý web duyệt
        "moderator_rejected",    // Quản lý web từ chối / trả về chỉnh sửa
        "moderator_approved",    // Quản lý web đã duyệt & gửi cho Người thuê (Renter) ký tên
        "signed",                // Người thuê đã ký tên hoàn tất
        "contract_signed",
        "payment_pending",
        "paid",
        "active",                // Đang trong thời gian thuê (đã bàn giao)
        "returned",
        "completed",             // Đã kết thúc thuê
        "cancelled",             // Hủy
        "DRAFT",
        "SIGNED",
        "CONTRACT_SIGNED",
        "PAYMENT_PENDING",
        "PAID",
        "ACTIVE",
        "RETURNED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "draft",
      index: true,
    },
    moderator_feedback: {
      type: String,
      default: "",
    },
    moderator_approved_at: {
      type: Date,
    },
    moderator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderator_approved_version: {
      type: Number,
    },
    moderation_history: [
      {
        action: { type: String, enum: ["approved", "rejected"], required: true },
        moderator_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, default: "" },
        version: { type: Number, required: true },
        created_at: { type: Date, default: Date.now },
      },
    ],
    owner_signature: {
      signed: { type: Boolean, default: false },
      signed_at: { type: Date },
      signature_data: { type: String, default: "" },
      signer_name: { type: String, default: "" },
      signature_image: { type: String, default: "" },
      signature_type: { type: String, enum: ["drawn", "typed"], default: "typed" },
      certificate_code: { type: String, default: "" },
    },
    renter_signature: {
      signed: { type: Boolean, default: false },
      signed_at: { type: Date },
      signature_data: { type: String, default: "" },
      signer_name: { type: String, default: "" },
      signature_image: { type: String, default: "" },
      signature_type: { type: String, enum: ["drawn", "typed"], default: "typed" },
      certificate_code: { type: String, default: "" },
    },
    owner_review: {
      rating: { type: Number, min: 1, max: 5 },
      equipment_preservation: { type: String, default: "good" },
      on_time_return: { type: Boolean, default: true },
      comment: { type: String, default: "" },
      reviewed_at: { type: Date },
    },
    cancellation: {
      cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String, default: "" },
      cancelled_at: { type: Date },
      refund_amount: { type: Number, default: 0 },
      is_owner_cancelled: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: "rental_contracts",
  }
);

module.exports = mongoose.model("RentalContract", rentalContractSchema);
