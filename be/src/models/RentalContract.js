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
      required: true,
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
    special_conditions: {
      type: String,
      default: "",
    },
    version: {
      type: Number,
      default: 1,
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
        "draft",                 // UC_O12: Mới tạo nháp
        "pending_approval",      // UC_O14: Gửi Rental Moderator duyệt
        "moderator_rejected",    // Moderator từ chối / trả về chỉnh sửa (UC_O13)
        "moderator_approved",    // Moderator phê duyệt
        "signed",                // UC_O15: Owner đã xác nhận/ký e-contract
        "active",                // Đang trong thời gian thuê
        "completed",             // Đã kết thúc thuê
        "cancelled",             // Hủy
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
    owner_signature: {
      signed: { type: Boolean, default: false },
      signed_at: { type: Date },
      signature_data: { type: String, default: "" },
      signer_name: { type: String, default: "" },
    },
    renter_signature: {
      signed: { type: Boolean, default: false },
      signed_at: { type: Date },
    },
  },
  {
    timestamps: true,
    collection: "rental_contracts",
  }
);

module.exports = mongoose.model("RentalContract", rentalContractSchema);
