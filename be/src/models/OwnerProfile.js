const mongoose = require("mongoose");

const ownerProfileSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    shop_name: {
      type: String,
      default: "",
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
    identity_card_front: {
      type: String,
      default: "",
    },
    identity_card_back: {
      type: String,
      default: "",
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
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true,
    collection: "owner_profiles",
  }
);

module.exports = mongoose.model("OwnerProfile", ownerProfileSchema);
