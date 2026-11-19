const mongoose = require("mongoose");

const damageTariffSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    item_name: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["minor", "moderate", "severe", "total_loss"],
      default: "minor",
      index: true,
    },
    standard_fee: {
      type: Number,
      required: true,
      min: 0,
    },
    fee_type: {
      type: String,
      enum: ["fixed", "percentage_of_value"],
      default: "fixed",
    },
    description: {
      type: String,
      default: "",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "damage_tariffs",
  }
);

module.exports = mongoose.model("DamageTariff", damageTariffSchema);
