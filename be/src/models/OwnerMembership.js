const mongoose = require("mongoose");

const ownerMembershipSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["trial_7d", "month_1", "month_2", "month_3"],
      required: true,
    },
    duration_months: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    order_code: {
      type: Number,
      unique: true,
      sparse: true,
    },
    payment_link_id: {
      type: String,
      default: "",
    },
    checkout_url: {
      type: String,
      default: "",
    },
    payment_reference: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending_payment", "active", "extended", "expired", "failed"],
      default: "pending_payment",
      index: true,
    },
    is_trial: {
      type: Boolean,
      default: false,
    },
    started_at: Date,
    expires_at: Date,
    paid_at: Date,
  },
  {
    timestamps: true,
    collection: "owner_memberships",
  },
);

ownerMembershipSchema.index(
  { owner_id: 1 },
  { unique: true, partialFilterExpression: { is_trial: true } },
);

module.exports = mongoose.model("OwnerMembership", ownerMembershipSchema);
