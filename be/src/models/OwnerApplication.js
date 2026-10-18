const mongoose = require("mongoose");

const ownerApplicationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicant_name: {
      type: String,
      required: true,
      trim: true,
    },
    applicant_email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    identity_card: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    shop_name: {
      type: String,
      default: "",
      trim: true,
    },
    bank_name: {
      type: String,
      required: true,
      trim: true,
    },
    bank_account_number: {
      type: String,
      required: true,
      trim: true,
    },
    bank_account_holder: {
      type: String,
      required: true,
      trim: true,
    },
    identity_card_front: {
      type: String,
      default: "",
    },
    identity_card_back: {
      type: String,
      default: "",
    },
    business_license: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    admin_note: {
      type: String,
      default: "",
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewed_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "owner_applications",
  }
);

module.exports = mongoose.model("OwnerApplication", ownerApplicationSchema);
